const prisma = require('../config/database');
const pdf = require('pdf-parse');
const { cloudinary } = require('../config/cloudinary');
const WorkTimeService = require('../services/WorkTimeService');
const NotifService = require('../services/NotifService');
const crypto = require('crypto');

class SuratController {
  // --- FUNGSI HELPER (UTUH) ---
  generateTrackingId() { return crypto.randomBytes(5).toString('hex').toUpperCase(); }
  cleanQuotes(val) { return val ? val.toString().replace(/['"]+/g, '').trim() : ""; }
  getPublicId(url) {
    if (!url) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      const publicIdWithExt = parts[1].split('/').slice(1).join('/'); 
      return publicIdWithExt.split('.')[0];
    } catch (e) { return null; }
  }

  // --- 1. SUBMIT SURAT (OCR & CLOUDINARY) ---
  async submit(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: "File PDF wajib ada!" });
      const trackingId = this.generateTrackingId();

      const [scan, upload] = await Promise.all([
        pdf(req.file.buffer),
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'disposisi/surat', resource_type: 'raw' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(req.file.buffer);
        })
      ]);

      const text = scan.text;
      const noSuratOCR = text.match(/(?:Nomor|No)\s*:\s*([^\n]+)/i)?.[1]?.trim() || "Manual";
      const pengirimOCR = text.match(/(?:Dari|Oleh)\s*:\s*([^\n]+)/i)?.[1]?.trim() || "Tidak Terdeteksi";

      const result = await prisma.surat.create({
        data: {
          trackingId,
          namaPengirim: this.cleanQuotes(req.body.namaPengirim) || pengirimOCR,
          emailPengirim: this.cleanQuotes(req.body.emailPengirim),
          waPengirim: this.cleanQuotes(req.body.waPengirim),
          instansi: this.cleanQuotes(req.body.instansi),
          fileUrl: upload.secure_url,
          nomorSurat: noSuratOCR,
          tglSurat: new Date().toLocaleDateString('id-ID'),
          officialEntry: WorkTimeService.calculateOfficialTime(new Date())
        }
      });
      res.status(201).json({ success: true, trackingId, data: result });
    } catch (e) { res.status(500).json({ error: "Gagal: " + e.message }); }
  }

  // --- 2. ALUR BIROKRASI (DENGAN UPDATE DATA) ---
  
  // Endpoint ini sekarang bisa menerima Body JSON untuk update data
  async forwardToKATU(req, res) {
    try {
      const { id } = req.params;
      const { nomorSurat, namaPengirim, instansi, emailPengirim, waPengirim } = req.body;

      await prisma.surat.update({
        where: { id },
        data: { 
          status: 'AWAITING_KATU_REVIEW',
          // Jika data ada di body, maka diupdate. Jika tidak, tetap pakai data lama.
          nomorSurat: nomorSurat ? this.cleanQuotes(nomorSurat) : undefined,
          namaPengirim: namaPengirim ? this.cleanQuotes(namaPengirim) : undefined,
          instansi: instansi ? this.cleanQuotes(instansi) : undefined,
          emailPengirim: emailPengirim ? this.cleanQuotes(emailPengirim) : undefined,
          waPengirim: waPengirim ? this.cleanQuotes(waPengirim) : undefined
        }
      });
      res.json({ success: true, message: "Surat diperbarui dan diteruskan ke KATU" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async forwardToKamad(req, res) {
    try {
      const { id } = req.params;
      const { catatanKATU } = req.body;
      if (!req.file) return res.status(400).json({ error: "KATU wajib mengunggah TTD!" });

      const upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'disposisi/ttd_katu', resource_type: 'raw' }, (err, result) => (err ? reject(err) : resolve(result)));
        stream.end(req.file.buffer);
      });

      await prisma.surat.update({
        where: { id },
        data: { 
          status: 'AWAITING_KAMAD_APPROVAL', 
          catatanKATU, 
          ttdKATU: upload.secure_url 
        }
      });
      res.json({ success: true, message: "Diteruskan ke Kamad" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async disposisiKamad(req, res) {
    try {
      const { id } = req.params;
      const { instruksi, penerusId, butuhFileBalasan } = req.body;
      let statusBaru = penerusId ? 'DISPATCHED_TO_STAFF' : 'AWAITING_REPLY_KHUSUS';

      await prisma.surat.update({
        where: { id },
        data: {
          isiDisposisi: instruksi,
          penerusId: penerusId || null,
          isNeedReplyFile: butuhFileBalasan ?? true,
          status: statusBaru,
          approverId: req.user.id
        }
      });
      res.json({ success: true, message: "Disposisi Berhasil" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 3. STAFF & BALASAN ---
  async staffReview(req, res) {
    try {
      const { id } = req.params;
      let ttdUrl = null;
      if (req.file) {
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: 'disposisi/ttd_staff', resource_type: 'raw' }, (err, res) => (err ? reject(err) : resolve(res)));
          stream.end(req.file.buffer);
        });
        ttdUrl = upload.secure_url;
      }
      await prisma.surat.update({
        where: { id },
        data: { catatanStaff: req.body.catatanStaff, ttdStaff: ttdUrl, status: 'AWAITING_REPLY_UMUM' }
      });
      res.json({ success: true, message: "Review Staff Berhasil" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async sendFinalReply(req, res) {
    try {
      const { id } = req.params;
      const { pesan } = req.body;
      const surat = await prisma.surat.findUnique({ where: { id } });

      if (!surat.isNeedReplyFile) {
        await NotifService.sendInternalNotif(surat.emailPengirim, "Tanggapan Surat", pesan);
      } else {
        if (!req.file) return res.status(400).json({ error: "Wajib upload PDF balasan!" });
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: 'disposisi/balasan', resource_type: 'raw' }, (err, res) => (err ? reject(err) : resolve(res)));
          stream.end(req.file.buffer);
        });
        await NotifService.sendPrettyReplyEmail(surat.emailPengirim, surat.namaPengirim, surat.nomorSurat, pesan, upload.secure_url, req.file.originalname);
        await prisma.surat.update({ where: { id }, data: { fileReplyUrl: upload.secure_url, fileReplyName: req.file.originalname } });
      }

      await prisma.surat.update({ where: { id }, data: { status: 'COMPLETED' } });
      res.json({ success: true, message: "Balasan Terkirim!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 4. OPERASIONAL (TRACK, HISTORY, DELETE) ---
  async track(req, res) {
    const data = await prisma.surat.findUnique({ where: { trackingId: req.params.id }, select: { trackingId: true, status: true, nomorSurat: true, instansi: true, updatedAt: true } });
    if (!data) return res.status(404).json({ error: "Antrean tidak ditemukan" });
    res.json({ success: true, data });
  }

  async getHistory(req, res) {
    const { role, id } = req.user;
    let whereClause = {};
    if (role === 'STAFF') whereClause = { penerusId: id };
    const history = await prisma.surat.findMany({ where: whereClause, orderBy: { updatedAt: 'desc' } });
    res.json({ success: true, data: history });
  }

  async deleteSurat(req, res) {
    try {
      const { id } = req.params;
      const surat = await prisma.surat.findUnique({ where: { id } });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });

      const deletePromises = [];
      [surat.fileUrl, surat.ttdKATU, surat.ttdStaff, surat.fileReplyUrl].forEach(url => {
        const pId = this.getPublicId(url);
        if (pId) deletePromises.push(cloudinary.uploader.destroy(pId, { resource_type: 'raw' }));
      });

      await Promise.allSettled(deletePromises);
      await prisma.surat.delete({ where: { id } });
      res.json({ success: true, message: "Hapus berhasil" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
}

module.exports = new SuratController();
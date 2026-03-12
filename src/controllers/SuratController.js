const prisma = require('../config/database');
const pdf = require('pdf-parse');
const { cloudinary } = require('../config/cloudinary');
const WorkTimeService = require('../services/WorkTimeService');
const NotifService = require('../services/NotifService');
const crypto = require('crypto');

class SuratController {
  // --- FUNGSI HELPER ---

  generateTrackingId() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
  }

  cleanQuotes(val) {
    return val ? val.toString().replace(/['"]+/g, '').trim() : "";
  }

  getPublicId(url) {
    if (!url) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      const publicIdWithExt = parts[1].split('/').slice(1).join('/'); 
      return publicIdWithExt.split('.')[0];
    } catch (e) {
      return null;
    }
  }

  // --- 1. SUBMIT SURAT (PUBLIK) ---

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
          isiDisposisi: this.cleanQuotes(req.body.isiDisposisi) || "Diterima via Sistem",
          officialEntry: WorkTimeService.calculateOfficialTime(new Date())
        }
      });
      res.status(201).json({ success: true, trackingId, data: result });
    } catch (e) {
      res.status(500).json({ error: "Gagal memproses surat: " + e.message });
    }
  }

  // --- 2. DETAIL SURAT (INTERNAL) ---

  async getDetail(req, res) {
    try {
      const { id } = req.params;
      const data = await prisma.surat.findUnique({
        where: { id },
        include: { 
          handler: { select: { username: true, jabatan: true } },
          approver: { select: { username: true, jabatan: true } }
        }
      });
      if (!data) return res.status(404).json({ error: "Surat tidak ditemukan" });
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 3. DISPATCH (VALIDATOR -> STAFF) ---

  async dispatch(req, res) {
    try {
      const { id } = req.params;
      const { penerusId, jabatanPenerus, nomorSurat, namaPengirim, instansi } = req.body;
      const result = await prisma.surat.update({
        where: { id },
        data: { 
          nomorSurat: nomorSurat ? this.cleanQuotes(nomorSurat) : undefined,
          namaPengirim: namaPengirim ? this.cleanQuotes(namaPengirim) : undefined,
          instansi: instansi ? this.cleanQuotes(instansi) : undefined,
          penerusId, 
          jabatanPenerus, 
          status: 'DISPATCHED_TO_STAFF' 
        }
      });
      res.json({ success: true, message: "Surat berhasil didisposisikan", data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 4. TRACKING (PUBLIK) ---

  async track(req, res) {
    try {
      const data = await prisma.surat.findUnique({
        where: { trackingId: req.params.id },
        select: { trackingId: true, status: true, nomorSurat: true, instansi: true, updatedAt: true }
      });
      if (!data) return res.status(404).json({ error: "Nomor antrean salah" });
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 5. GET HISTORY (INTERNAL) ---

  async getHistory(req, res) {
    try {
      const { role, id } = req.user;
      let whereClause = {};
      if (role === 'STAFF') whereClause = { penerusId: id };
      else if (role === 'APPROVER') whereClause = { status: { in: ['AWAITING_APPROVAL', 'COMPLETED'] } };

      const history = await prisma.surat.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        include: { 
          handler: { select: { username: true, jabatan: true } },
          approver: { select: { username: true, jabatan: true } }
        }
      });
      res.json({ success: true, data: history });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 6. STAFF REVIEW (STAFF) ---

  async staffReview(req, res) {
    try {
      const { id } = req.params;
      const { catatanStaff } = req.body;
      let ttdUrl = null;

      if (req.file) {
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'disposisi/ttd', resource_type: 'raw' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(req.file.buffer);
        });
        ttdUrl = upload.secure_url;
      }

      const result = await prisma.surat.update({
        where: { id },
        data: { catatanStaff, ttdStaff: ttdUrl, status: 'AWAITING_APPROVAL' }
      });
      res.json({ success: true, message: "Review berhasil dikirim", data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 7. APPROVE (APPROVER) ---

  async approve(req, res) {
    try {
      const { id } = req.params;
      const { catatanApprover } = req.body;
      let ttdUrl = null;

      if (req.file) {
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'disposisi/ttd_final', resource_type: 'raw' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(req.file.buffer);
        });
        ttdUrl = upload.secure_url;
      }

      const result = await prisma.surat.update({
        where: { id },
        data: { 
          catatanApprover, 
          ttdApprover: ttdUrl, 
          status: 'COMPLETED',
          approverId: req.user.id 
        }
      });
      res.json({ success: true, message: "Surat disetujui", data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 8. SEND FINAL REPLY (VALIDATOR) ---

  async sendFinalReply(req, res) {
    try {
      const { id } = req.params;
      const { pesan } = req.body;
      if (!req.file) return res.status(400).json({ error: "Wajib upload PDF balasan!" });

      const surat = await prisma.surat.findUnique({ where: { id } });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });

      const originalFileName = req.file.originalname.split('.').slice(0, -1).join('.');
      const uploadReply = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'disposisi/balasan', public_id: originalFileName, resource_type: 'raw' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

      await prisma.surat.update({
        where: { id },
        data: { fileReplyUrl: uploadReply.secure_url, fileReplyName: req.file.originalname }
      });

      await NotifService.sendPrettyReplyEmail(
        surat.emailPengirim, 
        surat.namaPengirim, 
        surat.nomorSurat, 
        pesan, 
        uploadReply.secure_url, 
        req.file.originalname
      );
      res.json({ success: true, message: "Balasan berhasil dikirim!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 9. DELETE SURAT (ADMIN & VALIDATOR) ---

  async deleteSurat(req, res) {
    try {
      const { id } = req.params;
      const surat = await prisma.surat.findUnique({ where: { id } });

      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });

      const deletePromises = [];

      if (surat.fileUrl) {
        const pId = this.getPublicId(surat.fileUrl);
        if (pId) deletePromises.push(cloudinary.uploader.destroy(pId, { resource_type: 'raw' }));
      }
      if (surat.ttdStaff) {
        const pId = this.getPublicId(surat.ttdStaff);
        if (pId) deletePromises.push(cloudinary.uploader.destroy(pId, { resource_type: 'raw' }));
      }
      if (surat.ttdApprover) {
        const pId = this.getPublicId(surat.ttdApprover);
        if (pId) deletePromises.push(cloudinary.uploader.destroy(pId, { resource_type: 'raw' }));
      }

      await Promise.allSettled(deletePromises);
      await prisma.surat.delete({ where: { id } });

      res.json({ success: true, message: "Surat dan file terkait berhasil dihapus!" });
    } catch (e) { 
      console.error("Delete Error:", e);
      res.status(500).json({ error: "Gagal menghapus: " + e.message }); 
    }
  }
}

module.exports = new SuratController();
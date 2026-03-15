const prisma = require('../config/database');
const pdf = require('pdf-parse');
const { cloudinary } = require('../config/cloudinary');
const WorkTimeService = require('../services/WorkTimeService');
const NotifService = require('../services/NotifService');
const crypto = require('crypto');

class SuratController {
  // --- FUNGSI HELPER ---
  generateTrackingId() { return crypto.randomBytes(5).toString('hex').toUpperCase(); }
  
  cleanQuotes(val) { return val ? val.toString().replace(/['"]+/g, '').trim() : ""; }
  
  getPublicId(url) {
    if (!url) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      // Menyesuaikan jika ada fl_attachment atau format folder lain
      let publicIdWithExt = parts[1].split('/').slice(1).join('/'); 
      if (parts[1].includes('fl_attachment')) {
        publicIdWithExt = parts[1].split('/').slice(2).join('/');
      }
      return publicIdWithExt.split('.')[0];
    } catch (e) { return null; }
  }

  // --- 1. SUBMIT SURAT (OCR & CLOUDINARY FIXED NAME & EXTENSION) ---
  async submit(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: "File PDF wajib ada!" });
      const trackingId = this.generateTrackingId();

      // Ambil nama file asli (hilangkan ekstensi .pdf dan ganti spasi jadi underscore)
      const safeName = req.file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');

      const [scan, upload] = await Promise.all([
        pdf(req.file.buffer),
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'disposisi/surat', 
              resource_type: 'image', // Agar bisa di-view inline
              format: 'pdf',          // WAJIB: Memaksa file memiliki ekstensi .pdf
              public_id: `${safeName}_${trackingId}` // Nama file gabungan asli + tracking ID
            },
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

  // --- 2. ALUR BIROKRASI & UPDATE DATA ---

  // FITUR BARU: Update Surat Khusus Validator Khusus (Tanpa tglSurat)
  async updateSurat(req, res) {
    try {
      const { id } = req.params;
      const { nomorSurat, namaPengirim, instansi, emailPengirim, waPengirim } = req.body;

      const surat = await prisma.surat.findUnique({ where: { id } });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });

      const updated = await prisma.surat.update({
        where: { id },
        data: {
          nomorSurat: nomorSurat ? this.cleanQuotes(nomorSurat) : undefined,
          namaPengirim: namaPengirim ? this.cleanQuotes(namaPengirim) : undefined,
          instansi: instansi ? this.cleanQuotes(instansi) : undefined,
          emailPengirim: emailPengirim ? this.cleanQuotes(emailPengirim) : undefined,
          waPengirim: waPengirim ? this.cleanQuotes(waPengirim) : undefined
        }
      });
      res.json({ success: true, message: "Data surat berhasil diperbarui!", data: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async forwardToKATU(req, res) {
    try {
      const { id } = req.params;
      const { nomorSurat, namaPengirim, instansi, emailPengirim, waPengirim } = req.body;

      await prisma.surat.update({
        where: { id },
        data: { 
          status: 'AWAITING_KATU_REVIEW',
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
        const stream = cloudinary.uploader.upload_stream({ folder: 'disposisi/ttd_katu', resource_type: 'image' }, (err, result) => (err ? reject(err) : resolve(result)));
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
          const stream = cloudinary.uploader.upload_stream({ folder: 'disposisi/ttd_staff', resource_type: 'image' }, (err, res) => (err ? reject(err) : resolve(res)));
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
        
        // Ambil nama file balasan asli
        const safeName = req.file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');

        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'disposisi/balasan', 
              resource_type: 'image',
              format: 'pdf', // WAJIB
              public_id: `Balasan_${safeName}_${id.substring(0,5)}` // Hasilnya misal: Balasan_Surat_Izin_abcde.pdf
            }, 
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(req.file.buffer);
        });
        await NotifService.sendPrettyReplyEmail(surat.emailPengirim, surat.namaPengirim, surat.nomorSurat, pesan, upload.secure_url, req.file.originalname);
        await prisma.surat.update({ where: { id }, data: { fileReplyUrl: upload.secure_url, fileReplyName: req.file.originalname } });
      }

      await prisma.surat.update({ where: { id }, data: { status: 'COMPLETED' } });
      res.json({ success: true, message: "Balasan Terkirim!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 4. OPERASIONAL (TRACK, HISTORY, DETAIL, DELETE, REJECT) ---
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

  async getDetail(req, res) {
    try {
      const { id } = req.params;
      const surat = await prisma.surat.findUnique({ 
        where: { id },
        include: { handler: { select: { username: true, jabatan: true } }, approver: { select: { username: true, jabatan: true } } }
      });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });
      res.json({ success: true, data: surat });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async deleteSurat(req, res) {
    try {
      const { id } = req.params;
      const surat = await prisma.surat.findUnique({ where: { id } });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan" });

      const deletePromises = [];
      [surat.fileUrl, surat.ttdKATU, surat.ttdStaff, surat.fileReplyUrl].forEach(url => {
        const pId = this.getPublicId(url);
        if (pId) deletePromises.push(cloudinary.uploader.destroy(pId, { resource_type: 'image' }));
      });

      await Promise.allSettled(deletePromises);
      await prisma.surat.delete({ where: { id } });
      res.json({ success: true, message: "Hapus berhasil" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async rejectSurat(req, res) {
    try {
      const { id } = req.params;
      const { alasan } = req.body;

      if (!alasan) return res.status(400).json({ error: "Alasan penolakan wajib diisi!" });

      const surat = await prisma.surat.findUnique({ where: { id } });
      if (!surat) return res.status(404).json({ error: "Surat tidak ditemukan!" });

      // Memanggil fungsi email penolakan dengan desain cantik!
      await NotifService.sendPrettyRejectEmail(
        surat.emailPengirim, 
        surat.namaPengirim, 
        surat.nomorSurat, 
        alasan
      );

      const result = await prisma.surat.update({
        where: { id },
        data: { status: 'REJECTED', catatanKATU: `[DITOLAK]: ${alasan}` }
      });

      res.json({ success: true, message: "Surat berhasil ditolak dan email pemberitahuan telah terkirim!", data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // --- 5. DASHBOARD (CHART & KALENDER) ---
  async getDashboardStats(req, res) {
    try {
      const statusCounts = await prisma.surat.groupBy({
        by: ['status'],
        _count: { id: true }
      });

      const suratMasuk = await prisma.surat.findMany({
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ success: true, data: { persentaseStatus: statusCounts, timelineSurat: suratMasuk } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async getCalendarSummary(req, res) {
    try {
      const { date } = req.query; 
      if (!date) return res.status(400).json({ error: "Parameter tanggal (date) wajib dikirim! Format: YYYY-MM-DD" });

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const suratsOnDate = await prisma.surat.findMany({
        where: { updatedAt: { gte: startDate, lte: endDate } },
        select: { id: true, trackingId: true, nomorSurat: true, instansi: true, status: true, updatedAt: true }
      });

      const akumulasiStatus = suratsOnDate.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          tanggal: date,
          totalSuratDikerjakan: suratsOnDate.length,
          akumulasiStatus: akumulasiStatus,
          detailSurat: suratsOnDate
        }
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
}

module.exports = new SuratController();
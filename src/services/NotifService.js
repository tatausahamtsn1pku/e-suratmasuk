const axios = require('axios');

class NotifService {
    constructor() {
        this.apiKey = process.env.BREVO_API_KEY;
        this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    }

    async sendInternalNotif(to, subject, message) {
        if (!to) throw new Error("Email tujuan tidak boleh kosong!");
        const payload = {
            sender: { name: "Sistem Disposisi MTsN 1", email: process.env.EMAIL_USER },
            to: [{ email: to }],
            subject: subject || "Notifikasi Sistem",
            htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h3 style="color: #004d40;">Notifikasi Sistem Disposisi</h3>
                <p style="color: #333; line-height: 1.5;">${message}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">Ini adalah email otomatis, mohon tidak membalas.</p>
            </div>
            `
        };
        try {
            const response = await axios.post(this.apiUrl, payload, { headers: { 'accept': 'application/json', 'api-key': this.apiKey, 'content-type': 'application/json' } });
            return response.data;
        } catch (error) {
            throw new Error(`Brevo Error: ${error.response?.data?.message || error.message}`);
        }
    }

    // --- FUNGSI BARU: EMAIL PENOLAKAN SURAT YANG CANTIK ---
    async sendPrettyRejectEmail(to, nama, nomor, alasan) {
        if (!to) throw new Error("Email tujuan pengirim surat tidak ditemukan!");
        if (!process.env.EMAIL_USER) throw new Error("EMAIL_USER di file .env belum diisi!");

        const payload = {
            sender: { name: "Tata Usaha MTsN 1 Pekanbaru", email: process.env.EMAIL_USER },
            to: [{ email: to, name: nama || "Pengirim Surat" }],
            subject: `Pemberitahuan Penolakan Surat - ${nomor || 'Tanpa Nomor'}`,
            htmlContent: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background-color: #004d40; color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">MTsN 1 KOTA PEKANBARU</h1>
                    <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">Sistem Informasi Disposisi E-Surat</p>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333; background-color: #ffffff;">
                    <p>Yth. <strong>${nama || "Pengirim"}</strong>,</p>
                    <p>Mohon maaf, berdasarkan hasil verifikasi terhadap pengajuan surat Anda dengan nomor: <strong>${nomor || '-'}</strong>, kami harus menolak pengajuan tersebut.</p>
                    
                    <p><strong>Alasan Penolakan:</strong></p>
                    <div style="background: #ffebee; padding: 20px; border-left: 5px solid #d32f2f; margin: 15px 0; border-radius: 4px; color: #b71c1c;">
                        ${alasan}
                    </div>
                    
                    <p>Silakan perbaiki dokumen Anda sesuai dengan catatan di atas dan ajukan kembali melalui sistem kami. Terima kasih atas pengertian dan kerjasamanya.</p>
                    
                    <p style="margin-top: 40px; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; color: #777;">
                        Hormat kami,<br>
                        <strong>Bagian Tata Usaha</strong><br>
                        MTsN 1 Kota Pekanbaru
                    </p>
                </div>
                <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #999;">
                    Ini adalah email otomatis. Mohon tidak membalas langsung ke alamat email ini.
                </div>
            </div>
            `
        };

        try {
            const response = await axios.post(this.apiUrl, payload, { headers: { 'accept': 'application/json', 'api-key': this.apiKey, 'content-type': 'application/json' } });
            return response.data;
        } catch (error) {
            throw new Error(`Brevo Error: ${error.response?.data?.message || error.message}`);
        }
    }

    // --- FUNGSI LAMA: EMAIL BALASAN SURAT ---
    async sendPrettyReplyEmail(to, nama, nomor, pesan, fileUrl, fileName) {
        if (!to) throw new Error("Email tujuan pengirim surat tidak ditemukan di database!");
        if (!process.env.EMAIL_USER) throw new Error("EMAIL_USER di file .env belum diisi!");

        const payload = {
            sender: { name: "Tata Usaha MTsN 1 Pekanbaru", email: process.env.EMAIL_USER },
            to: [{ email: to, name: nama || "Pengirim Surat" }],
            subject: `Tanggapan Resmi Surat - ${nomor || 'Tanpa Nomor'}`,
            htmlContent: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background-color: #004d40; color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">MTsN 1 KOTA PEKANBARU</h1>
                    <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">Sistem Informasi Disposisi E-Surat</p>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333; background-color: #ffffff;">
                    <p>Yth. <strong>${nama || "Pengirim"}</strong>,</p>
                    <p>Terima kasih telah mengajukan permohonan/surat kepada kami. Berdasarkan verifikasi terhadap surat Anda dengan nomor: <strong>${nomor || '-'}</strong>, berikut adalah tanggapan resmi dari kami:</p>
                    
                    <div style="background: #f1f8f7; padding: 20px; border-left: 5px solid #004d40; margin: 25px 0; border-radius: 4px; font-style: italic; color: #004d40;">
                        "${pesan}"
                    </div>
                    
                    <p>Dokumen balasan resmi dalam format PDF telah kami lampirkan pada email ini. Anda juga dapat mengunduhnya secara langsung melalui tautan di bawah ini:</p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${fileUrl}" style="background-color: #004d40; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Unduh Surat Balasan (PDF)</a>
                    </div>
                    
                    <p style="margin-top: 40px; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; color: #777;">
                        Hormat kami,<br>
                        <strong>Bagian Tata Usaha</strong><br>
                        MTsN 1 Kota Pekanbaru
                    </p>
                </div>
                <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #999;">
                    Ini adalah email otomatis. Mohon tidak membalas langsung ke alamat email ini.
                </div>
            </div>
            `
        };

        if (fileUrl && fileUrl.startsWith('http')) {
            try {
                const fileResp = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const base64Content = Buffer.from(fileResp.data).toString('base64');
                payload.attachment = [{ content: base64Content, name: fileName || 'Surat_Balasan.pdf' }];
            } catch (err) {
                payload.attachment = [{ url: fileUrl, name: fileName || 'Surat_Balasan.pdf' }];
            }
        }

        try {
            const response = await axios.post(this.apiUrl, payload, { headers: { 'accept': 'application/json', 'api-key': this.apiKey, 'content-type': 'application/json' } });
            return response.data;
        } catch (error) {
            throw new Error(`Brevo Error: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = new NotifService();
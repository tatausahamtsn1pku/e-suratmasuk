const axios = require('axios');

class NotifService {
    constructor() {
        this.apiKey = process.env.BREVO_API_KEY;
        this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    }

    async sendInternalNotif(to, subject, message) {
        const payload = {
            sender: { name: "Sistem Disposisi MTsN 1", email: process.env.EMAIL_USER },
            to: [{ email: to }],
            subject: subject,
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
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Gagal kirim email internal:", error.response?.data || error.message);
            throw error;
        }
    }

    async sendPrettyReplyEmail(to, nama, nomor, pesan, fileUrl, fileName) {
        const payload = {
            sender: { name: "Tata Usaha MTsN 1 Pekanbaru", email: process.env.EMAIL_USER },
            to: [{ email: to, name: nama }],
            subject: `Tanggapan Resmi Surat - ${nomor}`,
            htmlContent: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background-color: #004d40; color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">MTsN 1 KOTA PEKANBARU</h1>
                    <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">Sistem Informasi Disposisi E-Surat</p>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333; background-color: #ffffff;">
                    <p>Yth. <strong>${nama}</strong>,</p>
                    <p>Terima kasih telah mengajukan permohonan/surat kepada kami. Berdasarkan verifikasi terhadap surat Anda dengan nomor: <strong>${nomor}</strong>, berikut adalah tanggapan resmi dari kami:</p>
                    
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

        if (fileUrl && fileName) {
            payload.attachment = [{ url: fileUrl, name: fileName }];
        }

        try {
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Gagal kirim email balasan resmi:", error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new NotifService();
const nodemailer = require('nodemailer');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

class NotifService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Menggunakan SSL
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            },
            // Tetap pasang opsi ini untuk keamanan ekstra
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            tls: {
                servername: 'smtp.gmail.com',
                rejectUnauthorized: false
            }
        });
    }

    /**
     * Mengirim notifikasi email internal untuk alur sistem disposisi
     */
    async sendInternalNotif(to, subject, message) {
        const mailOptions = {
            from: `"Sistem Disposisi MTsN 1" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h3 style="color: #004d40;">Notifikasi Sistem Disposisi</h3>
                <p style="color: #333; line-height: 1.5;">${message}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">Ini adalah email otomatis, mohon tidak membalas.</p>
            </div>
            `
        };
        try {
            return await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("❌ Gagal kirim email internal:", error.message);
            throw error;
        }
    }

    /**
     * Mengirim balasan resmi kepada pengirim surat dengan desain profesional dan lampiran PDF
     */
    async sendPrettyReplyEmail(to, nama, nomor, pesan, fileUrl, fileName) {
        const mailOptions = {
            from: `"Tata Usaha MTsN 1 Pekanbaru" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: `Tanggapan Resmi Surat - ${nomor}`,
            html: `
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
            `,
            attachments: [
                {
                    filename: fileName,
                    path: fileUrl 
                }
            ]
        };
        try {
            return await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("❌ Gagal kirim email balasan resmi:", error.message);
            throw error;
        }
    }
}

module.exports = new NotifService();
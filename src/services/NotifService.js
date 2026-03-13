const nodemailer = require('nodemailer');

class NotifService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            // Menggunakan host eksplisit smtp.gmail.com untuk kontrol lebih detail
            host: 'smtp.gmail.com',
            port: 465, // Menggunakan port SSL/TLS
            secure: true, 
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            },
            // Opsi penting untuk mengatasi ENETUNREACH di cloud
            connectionTimeout: 10000, // Menambah batas waktu koneksi
            greetingTimeout: 10000,
            tls: {
                // Memaksa penggunaan IPv4 dengan menyediakan servername
                servername: 'smtp.gmail.com',
                rejectUnauthorized: false // Menghindari kegagalan jabat tangan SSL pada jaringan tertentu
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
            console.error("Email Error:", error);
            throw error;
        }
    }

    /**
     * Mengirim balasan resmi kepada pengirim surat dengan lampiran PDF
     */
    async sendPrettyReplyEmail(to, nama, nomor, pesan, fileUrl, fileName) {
        const mailOptions = {
            from: `"Tata Usaha MTsN 1 Pekanbaru" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: `Tanggapan Resmi Surat - ${nomor}`,
            html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #004d40; color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px;">MTsN 1 KOTA PEKANBARU</h1>
                    <p style="margin: 5px 0 0; opacity: 0.8;">Sistem Informasi Disposisi E-Surat</p>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333;">
                    <p>Yth. <strong>${nama}</strong>,</p>
                    <p>Berikut adalah tanggapan resmi kami terkait surat nomor: <strong>${nomor}</strong>:</p>
                    <div style="background: #f1f8f7; padding: 20px; border-left: 5px solid #004d40; margin: 25px 0; border-radius: 4px; color: #004d40;">
                        "${pesan}"
                    </div>
                    <p>Dokumen balasan telah kami lampirkan. Anda juga dapat mengunduhnya melalui tombol di bawah:</p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${fileUrl}" style="background-color: #004d40; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Unduh Balasan (PDF)</a>
                    </div>
                </div>
            </div>
            `,
            attachments: [{ filename: fileName, path: fileUrl }]
        };
        try {
            return await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("Email Error:", error);
            throw error;
        }
    }
}

module.exports = new NotifService();
const multer = require('multer');

// Menggunakan memory storage karena kita akan langsung meneruskannya ke Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // Kita naikkan batasnya menjadi 2MB agar lebih aman untuk gambar berkualitas tinggi
    },
    fileFilter: (req, file, cb) => {
        // Daftar tipe file yang diizinkan (PDF untuk surat, PNG/JPG/JPEG untuk TTD)
        const allowedMimeTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Memberikan pesan error yang lebih informatif
            cb(new Error('Format file tidak didukung! Gunakan PDF untuk surat atau PNG/JPG untuk tanda tangan.'), false);
        }
    }
});
module.exports = { upload };
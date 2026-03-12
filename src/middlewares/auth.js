const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: "Akses Ditolak! Anda belum login." });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Cek apakah Role user sesuai dengan yang diizinkan
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Anda tidak memiliki izin akses untuk fitur ini!" });
            }

            req.user = decoded;
            next();
        } catch (err) {
            res.status(401).json({ message: "Sesi habis atau token tidak valid!" });
        }
    };
};

module.exports = auth;
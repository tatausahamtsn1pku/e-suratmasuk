const prisma = require('../config/database'); // Ambil dari config pusat
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await prisma.user.findUnique({ where: { username } });

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ message: "Username atau Password salah!" });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role, jabatan: user.jabatan },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.json({ success: true, token, role: user.role, jabatan: user.jabatan });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = new AuthController();
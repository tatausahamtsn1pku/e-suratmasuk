const prisma = require('../config/database');
const bcrypt = require('bcryptjs');

class UserController {
    // CREATE - Menambahkan user baru (Admin Only)
    async createUser(req, res) {
        try {
            const { username, password, role, jabatan, waNumber } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: { username, password: hashedPassword, role, jabatan, waNumber }
            });
            res.status(201).json({ success: true, message: "User berhasil dibuat!" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // READ ALL - Mengambil semua daftar user
    async getAllUsers(req, res) {
        try {
            const users = await prisma.user.findMany({
                select: { id: true, username: true, role: true, jabatan: true, waNumber: true }
            });
            res.json({ success: true, data: users });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // READ ONE - Mengambil detail satu user berdasarkan ID
    async getUserById(req, res) {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.params.id } });
            if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
            res.json({ success: true, data: user });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // UPDATE - Mengupdate data user
    async updateUser(req, res) {
        try {
            const { password, ...updateData } = req.body;
            if (password) updateData.password = await bcrypt.hash(password, 10);
            await prisma.user.update({ where: { id: req.params.id }, data: updateData });
            res.json({ success: true, message: "User diperbarui!" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // DELETE - Menghapus user
    async deleteUser(req, res) {
        try {
            await prisma.user.delete({ where: { id: req.params.id } });
            res.json({ success: true, message: "User dihapus!" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // GET PENERUS LIST - Mengambil daftar user dengan role STAFF untuk tujuan disposisi
    async getPenerusList(req, res) {
        try {
            const staff = await prisma.user.findMany({
                where: { role: 'STAFF' },
                select: { id: true, username: true, jabatan: true }
            });
            res.json({ success: true, data: staff });
        } catch (e) {
            res.status(500).json({ error: "Gagal mengambil daftar staff: " + e.message });
        }
    }
}

module.exports = new UserController();
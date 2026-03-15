require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { upload } = require('./config/multer');
const auth = require('./middlewares/auth');
const SuratController = require('./controllers/SuratController');
const UserController = require('./controllers/UserController');
const AuthController = require('./controllers/AuthController');

const app = express();
app.use(cors());
app.use(express.json());

// 1. PUBLIC & AUTH
app.post('/api/auth/login', (req, res) => AuthController.login(req, res));
app.post('/api/surat/submit', upload.single('file'), (req, res) => SuratController.submit(req, res));
app.get('/api/surat/track/:id', (req, res) => SuratController.track(req, res));

// 2. USER MANAGEMENT (ADMIN ONLY)
app.post('/api/admin/users', auth(['ADMIN']), (req, res) => UserController.createUser(req, res));
app.get('/api/admin/users', auth(['ADMIN']), (req, res) => UserController.getAllUsers(req, res));
app.get('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.getUserById(req, res));
app.put('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.updateUser(req, res));
app.delete('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.deleteUser(req, res));
app.get('/api/admin/penerus', auth(['ADMIN', 'VALIDATOR_KHUSUS', 'APPROVER']), (req, res) => UserController.getPenerusList(req, res));

// 3. OPERASIONAL SURAT
app.get('/api/surat/history', auth(['ADMIN', 'VALIDATOR_KHUSUS', 'VALIDATOR_UMUM', 'KATU', 'APPROVER', 'STAFF']), (req, res) => SuratController.getHistory(req, res));
app.get('/api/surat/detail/:id', auth(['ADMIN', 'VALIDATOR_KHUSUS', 'VALIDATOR_UMUM', 'KATU', 'APPROVER', 'STAFF']), (req, res) => SuratController.getDetail(req, res));
app.patch('/api/surat/update/:id', auth(['VALIDATOR_KHUSUS']), (req, res) => SuratController.updateSurat(req, res));
app.delete('/api/surat/:id', auth(['ADMIN', 'VALIDATOR_KHUSUS']), (req, res) => SuratController.deleteSurat(req, res));

// --- BUKU AGENDA SURAT ---
app.post('/api/surat/agenda/:id', auth(['VALIDATOR_KHUSUS']), (req, res) => SuratController.createAgenda(req, res));
app.patch('/api/surat/agenda/approve/:id', auth(['KATU']), (req, res) => SuratController.approveAgendaKATU(req, res));

// --- ALUR BIROKRASI ---
app.patch('/api/surat/forward-to-katu/:id', auth(['VALIDATOR_KHUSUS']), (req, res) => SuratController.forwardToKATU(req, res));
app.patch('/api/surat/forward-to-kamad/:id', auth(['KATU']), upload.single('file'), (req, res) => SuratController.forwardToKamad(req, res));
app.patch('/api/surat/disposisi-kamad/:id', auth(['APPROVER']), (req, res) => SuratController.disposisiKamad(req, res));
app.patch('/api/surat/staff-review/:id', auth(['STAFF']), upload.single('file'), (req, res) => SuratController.staffReview(req, res));
app.post('/api/surat/reply/:id', auth(['VALIDATOR_KHUSUS', 'VALIDATOR_UMUM']), upload.single('file'), (req, res) => SuratController.sendFinalReply(req, res));

// --- ALUR PENOLAKAN ---
app.patch('/api/surat/kamad-reject/:id', auth(['APPROVER']), (req, res) => SuratController.rejectByKamad(req, res));
app.patch('/api/surat/execute-reject/:id', auth(['VALIDATOR_KHUSUS']), (req, res) => SuratController.executeRejectByValidator(req, res));

// 4. DASHBOARD (CHART & KALENDER)
app.get('/api/dashboard/stats', auth(['ADMIN', 'VALIDATOR_KHUSUS', 'VALIDATOR_UMUM', 'KATU', 'APPROVER', 'STAFF']), (req, res) => SuratController.getDashboardStats(req, res));
app.get('/api/dashboard/calendar', auth(['ADMIN', 'VALIDATOR_KHUSUS', 'VALIDATOR_UMUM', 'KATU', 'APPROVER', 'STAFF']), (req, res) => SuratController.getCalendarSummary(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sistem Disposisi E-Surat Berjalan di Port ${PORT} 🚀`));
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

// --- PUBLIC ROUTES ---
app.post('/api/auth/login', (req, res) => AuthController.login(req, res));
app.post('/api/surat/submit', upload.single('file'), (req, res) => SuratController.submit(req, res));
app.get('/api/surat/track/:id', (req, res) => SuratController.track(req, res));

// --- ADMIN ROUTES ---
app.post('/api/admin/users', auth(['ADMIN']), (req, res) => UserController.createUser(req, res));
app.get('/api/admin/users', auth(['ADMIN']), (req, res) => UserController.getAllUsers(req, res));
app.get('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.getUserById(req, res));
app.put('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.updateUser(req, res));
app.delete('/api/admin/users/:id', auth(['ADMIN']), (req, res) => UserController.deleteUser(req, res));

// --- OPERASIONAL ROUTES ---
app.get('/api/admin/penerus', auth(['ADMIN', 'VALIDATOR']), (req, res) => UserController.getPenerusList(req, res));
app.get('/api/surat/history', auth(['ADMIN', 'VALIDATOR', 'APPROVER', 'STAFF']), (req, res) => SuratController.getHistory(req, res));

// Alur Disposisi
app.patch('/api/surat/dispatch/:id', auth(['VALIDATOR']), (req, res) => SuratController.dispatch(req, res));
app.patch('/api/surat/staff-review/:id', auth(['STAFF']), upload.single('file'), (req, res) => SuratController.staffReview(req, res));
app.patch('/api/surat/approve/:id', auth(['APPROVER']), upload.single('file'), (req, res) => SuratController.approve(req, res));

// Balasan & Hapus (Fitur Baru)
app.post('/api/surat/reply/:id', auth(['VALIDATOR']), upload.single('file'), (req, res) => SuratController.sendFinalReply(req, res));
app.delete('/api/surat/:id', auth(['ADMIN', 'VALIDATOR']), (req, res) => SuratController.deleteSurat(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Running on Port ${PORT} 🚀`));
const { PrismaClient } = require('@prisma/client');

// Versi 6 otomatis membaca DATABASE_URL dari file .env
const prisma = new PrismaClient();

module.exports = prisma;
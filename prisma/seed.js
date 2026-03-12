const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); //

const prisma = new PrismaClient();

async function main() {
  const adminPassword = 'adminkitabisa01';
  // WAJIB melakukan hashing agar bisa dibaca oleh AuthController
  const hashedPassword = await bcrypt.hash(adminPassword, 10); 

  const admin = await prisma.user.upsert({
    where: { username: 'admintatausaha' },
    update: {
        password: hashedPassword // Pastikan update juga jika seed dijalankan ulang
    },
    create: {
      username: 'admintatausaha',
      password: hashedPassword,
      role: 'ADMIN',
      jabatan: 'Administrator Utama',
      waNumber: '081276051073',
    },
  });

  console.log('✅ Akun Admin berhasil diperbarui dengan password terenkripsi!');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
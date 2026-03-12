-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VALIDATOR', 'PENULIS', 'APPROVER', 'STAFF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "jabatan" TEXT,
    "waNumber" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surat" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "namaPengirim" TEXT NOT NULL,
    "emailPengirim" TEXT NOT NULL,
    "waPengirim" TEXT NOT NULL,
    "instansi" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "nomorSurat" TEXT,
    "tglSurat" TEXT,
    "isiDisposisi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "officialEntry" TIMESTAMP(3) NOT NULL,
    "penerusId" TEXT,
    "approverId" TEXT,
    "jabatanPenerus" TEXT,
    "catatanStaff" TEXT,
    "ttdStaff" TEXT,
    "catatanApprover" TEXT,
    "ttdApprover" TEXT,
    "fileReplyUrl" TEXT,
    "fileReplyName" TEXT,

    CONSTRAINT "Surat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Surat_trackingId_key" ON "Surat"("trackingId");

-- AddForeignKey
ALTER TABLE "Surat" ADD CONSTRAINT "Surat_penerusId_fkey" FOREIGN KEY ("penerusId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surat" ADD CONSTRAINT "Surat_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

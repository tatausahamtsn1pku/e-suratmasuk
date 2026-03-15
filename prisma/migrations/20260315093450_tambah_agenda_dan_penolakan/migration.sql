-- AlterTable
ALTER TABLE "Surat" ADD COLUMN     "alasanPenolakan" TEXT,
ADD COLUMN     "isAgendaDisetujuiKATU" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nomorAgenda" TEXT,
ADD COLUMN     "tglAgenda" TIMESTAMP(3);

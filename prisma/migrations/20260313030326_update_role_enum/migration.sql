/*
  Warnings:

  - The values [VALIDATOR,PENULIS] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `jabatanPenerus` on the `Surat` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'VALIDATOR_KHUSUS', 'VALIDATOR_UMUM', 'KATU', 'APPROVER', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "Surat" DROP COLUMN "jabatanPenerus",
ADD COLUMN     "catatanKATU" TEXT,
ADD COLUMN     "isNeedReplyFile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ttdKATU" TEXT;

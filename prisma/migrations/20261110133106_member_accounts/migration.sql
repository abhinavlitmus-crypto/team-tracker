-- CreateEnum
CREATE TYPE "Access" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "access" "Access" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

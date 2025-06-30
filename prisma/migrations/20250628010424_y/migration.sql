-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rememberToken" BOOLEAN DEFAULT false,
ADD COLUMN     "rememberTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "termsAgreed" BOOLEAN NOT NULL DEFAULT false;

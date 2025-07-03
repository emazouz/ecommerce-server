/*
  Warnings:

  - The `type` column on the `Banner` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('MAIN', 'PRODUCT', 'SALE', 'CATEGORY', 'BRAND', 'COUPON', 'OTHER');

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "type",
ADD COLUMN     "type" "BannerType";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "productVariantId" INTEGER;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

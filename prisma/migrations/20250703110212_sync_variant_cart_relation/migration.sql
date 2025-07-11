/*
  Warnings:

  - You are about to drop the column `productVariantId` on the `CartItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productVariantId_fkey";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "productVariantId",
ADD COLUMN     "variantId" INTEGER;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

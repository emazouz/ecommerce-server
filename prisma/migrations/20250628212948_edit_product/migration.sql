-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lowStockThreshold" INTEGER;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "thumbImage" SET NOT NULL,
ALTER COLUMN "thumbImage" SET DATA TYPE TEXT;

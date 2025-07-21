import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // إنشاء أنواع المنتجات
  const productTypes = await prisma.productType.createMany({
    data: [
      { name: "Electronics" },
      { name: "Clothing" },
      { name: "Books" },
      { name: "Home & Garden" },
      { name: "Sports" },
      { name: "Beauty" },
      { name: "Toys" },
      { name: "Automotive" },
      { name: "Food & Beverages" },
      { name: "Health" },
    ]
  });

  console.log("Creating Categories...");

  // إنشاء فئات المنتجات
  const categories = await prisma.category.createMany({
    data: [
      { name: "Top" },
      { name: "Shirt-T" },
      { name: "Men's Clothing" },
      { name: "Women's Clothing" },
    ]
  });
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

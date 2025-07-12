import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // حذف البيانات القديمة
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.productType.deleteMany();

  console.log("Creating Product Types...");

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
    ],
    skipDuplicates: true,
  });

  console.log("Creating Categories...");

  // إنشاء فئات المنتجات
  const categories = await prisma.category.createMany({
    data: [
      { name: "Smartphones" },
      { name: "Laptops" },
      { name: "Men's Clothing" },
      { name: "Women's Clothing" },
      { name: "Fiction Books" },
      { name: "Non-Fiction Books" },
      { name: "Furniture" },
      { name: "Kitchen" },
      { name: "Football" },
      { name: "Basketball" },
    ],
    skipDuplicates: true,
  });

  console.log("Creating Admin User...");

  // إنشاء مستخدم إداري
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: "password"
      username: "admin",
      role: "ADMIN",
      termsAgreed: true,
    },
  });

  console.log("✅ Seed data created successfully!");
  console.log(`Created ${productTypes.count} product types`);
  console.log(`Created ${categories.count} categories`);
  console.log(`Created admin user: ${adminUser.email}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

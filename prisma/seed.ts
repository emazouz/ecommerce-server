import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.productType.createMany({
    data: [
     {name: "top"},
     {name: "t-shirt"},
     {name: "dress"},
     {name: "sets"},
     {name: "shirt"},
     {name: "bottom"},
     {name: "pants"},
    ],
  });
  console.log("Product Types created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

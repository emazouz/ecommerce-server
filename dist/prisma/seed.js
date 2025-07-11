"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.productType.createMany({
        data: [
            { name: "top" },
            { name: "t-shirt" },
            { name: "dress" },
            { name: "sets" },
            { name: "shirt" },
            { name: "bottom" },
            { name: "pants" },
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

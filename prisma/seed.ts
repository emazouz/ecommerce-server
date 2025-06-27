import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"
const prisma = new PrismaClient();

async function main() {
   const email = "admin@gmail.com";
   const password = "123456";
   const name: string = "Admin";

   const hashPassword = await bcrypt.hash(password, 10);
   const user = await prisma.user.create({
    data: {
        email,
        password: hashPassword,
        name,
        role: "ADMIN",
    }
   })
   console.log("User created: ", user);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
})
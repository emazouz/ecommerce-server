import { PrismaClient } from "@prisma/client";
import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute";
import cors from "cors";
import cookieParser from "cookie-parser";




dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();




const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
export const prisma = new PrismaClient();


app.use("/api/auth", authRoute);

app.get("/", (req, res) => {
    res.send("Hello from E-commerce API");
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
    console.log("Server is shutting down...");
    await prisma.$disconnect();
    process.exit(0);
});

    
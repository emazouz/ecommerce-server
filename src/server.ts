import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute";
import cors from "cors";
import cookieParser from "cookie-parser";
import { testEmailConfig } from "./utils/email";
import productRoute from "./routes/productRoute";
import { prisma } from "./utils/prisma";
import categoryRoute from "./routes/categoryRoute";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/products", productRoute);
app.use("/api/categories", categoryRoute);

app.get("/", (req, res) => {
  res.send("Hello from E-commerce API");
});

testEmailConfig().then((isValid) => {
  if (isValid) {
    console.log("Email service is ready");
  } else {
    console.log("Email service configuration failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Server is shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

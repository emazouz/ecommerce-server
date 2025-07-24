import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute";
import cors from "cors";
import cookieParser from "cookie-parser";
import { testEmailConfig } from "./utils/email";
import productRoute from "./routes/productRoute";
import { prisma } from "./utils/prisma";
import categoryRoute from "./routes/categoryRoute";
import productTypeRoute from "./routes/productTypeRoute";
import profileRoute from "./routes/profileRoute";
import path from "path";
import couponRoute from "./routes/couponRoute";
import bannerRoute from "./routes/bannerRoute";
import cartRoute from "./routes/cartRoute";
import wishlistRoute from "./routes/wishlistRoute";
import compareRoute from "./routes/compareRoute";
import orderRoute from "./routes/orderRoute";
import paymentRoute from "./routes/paymentRoutes";
import notificationRoute from "./routes/notificationRoute";
import reportRoute from "./routes/reportRoute";
import flashSaleRouter from "./routes/flashSaleRoute";
import shipmentRoute from "./routes/shipmentRoute"
import { scheduleCleanup } from "./scripts/cleanupReports";

dotenv.config();

const PORT = process.env.PORT || 3001;

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Type", "Authorization"],
};

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(cors(corsOptions));
app.use(cookieParser());

// Clean up - remove debug middleware

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoute);
app.use("/api/products", productRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/product-types", productTypeRoute);
app.use("/api/profile", profileRoute);
app.use("/api/coupons", couponRoute);
app.use("/api/banners", bannerRoute);
app.use("/api/cart", cartRoute);
app.use("/api/wishlist", wishlistRoute);
app.use("/api/compare", compareRoute);
app.use("/api/orders", orderRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/reports", reportRoute);
app.use("/api/flash-sales", flashSaleRouter);
app.use("/api/shipments", shipmentRoute);

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

// تفعيل جدولة تنظيف التقارير
scheduleCleanup();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Server is shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

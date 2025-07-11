"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const email_1 = require("./utils/email");
const productRoute_1 = __importDefault(require("./routes/productRoute"));
const prisma_1 = require("./utils/prisma");
const categoryRoute_1 = __importDefault(require("./routes/categoryRoute"));
const productTypeRoute_1 = __importDefault(require("./routes/productTypeRoute"));
const profileRoute_1 = __importDefault(require("./routes/profileRoute"));
const path_1 = __importDefault(require("path"));
const couponRoute_1 = __importDefault(require("./routes/couponRoute"));
const bannerRoute_1 = __importDefault(require("./routes/bannerRoute"));
const cartRoute_1 = __importDefault(require("./routes/cartRoute"));
const wishlistRoute_1 = __importDefault(require("./routes/wishlistRoute"));
const compareRoute_1 = __importDefault(require("./routes/compareRoute"));
const orderRoute_1 = __importDefault(require("./routes/orderRoute"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(express_1.default.json());
app.use((0, cors_1.default)(corsOptions));
app.use((0, cookie_parser_1.default)());
// Serve static files from the 'uploads' directory
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app.use("/api/auth", authRoute_1.default);
app.use("/api/products", productRoute_1.default);
app.use("/api/categories", categoryRoute_1.default);
app.use("/api/product-types", productTypeRoute_1.default);
app.use("/api/profile", profileRoute_1.default);
app.use("/api/coupons", couponRoute_1.default);
app.use("/api/banners", bannerRoute_1.default);
app.use("/api/cart", cartRoute_1.default);
app.use("/api/wishlist", wishlistRoute_1.default);
app.use("/api/compare", compareRoute_1.default);
app.use("/api/orders", orderRoute_1.default);
app.get("/", (req, res) => {
    res.send("Hello from E-commerce API");
});
(0, email_1.testEmailConfig)().then((isValid) => {
    if (isValid) {
        console.log("Email service is ready");
    }
    else {
        console.log("Email service configuration failed");
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
process.on("SIGINT", async () => {
    console.log("Server is shutting down...");
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});

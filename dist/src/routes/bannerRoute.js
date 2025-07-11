"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bannerController_1 = require("../controllers/bannerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// --- Public Route ---
// Fetch all active banners
router.route("/").get(bannerController_1.fetchAllBanners);
// --- Admin Routes (Protected) ---
router
    .route("/")
    .post(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, uploadMiddleware_1.default, bannerController_1.createBanner);
router
    .route("/:id")
    .put(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, uploadMiddleware_1.default, bannerController_1.updateBanner)
    .delete(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, bannerController_1.deleteBanner);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// --- Admin Routes (Protected by isAdmin) ---
router
    .route("/")
    .get(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, couponController_1.fetchAllCoupons)
    .post(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, couponController_1.createCoupon);
router
    .route("/:id")
    .put(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, couponController_1.updateCoupon)
    .delete(authMiddleware_1.authenticateJwt, authMiddleware_1.isAdmin, couponController_1.deleteCoupon);
// --- User Route ---
router.route("/apply").post(authMiddleware_1.authenticateJwt, couponController_1.applyCoupon);
exports.default = router;

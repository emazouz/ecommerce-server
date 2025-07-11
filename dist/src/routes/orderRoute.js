"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All routes are protected
router.use(authMiddleware_1.authenticateJwt);
router.route("/").post(orderController_1.createOrder).get(orderController_1.getOrders);
router.route("/:id").get(orderController_1.getOrderById);
router.route("/:id/cancel").put(orderController_1.cancelOrder);
exports.default = router;

import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/orderController";
import { authenticateJwt } from "../middleware/authMiddleware";

const router = Router();

// All routes are protected
router.use(authenticateJwt);

router.route("/").post(createOrder).get(getOrders);
router.route("/:id").get(getOrderById);
router.route("/:id/cancel").put(cancelOrder);

export default router;

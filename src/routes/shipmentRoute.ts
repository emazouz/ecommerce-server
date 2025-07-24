import express from "express";
import {
  createShipment,
  deleteShipment,
  getAllShipment,
  getShipmentById,
  updateShipment,
} from "../controllers/shipmentController";

const router = express.Router();

router.post("/", createShipment);
router.get("/", getAllShipment);
router.get("/:id", getShipmentById);
router.post("/:id", updateShipment);
router.delete("/:id", deleteShipment);

export default router;

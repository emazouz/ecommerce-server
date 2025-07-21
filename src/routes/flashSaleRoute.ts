import { Router } from "express";
import { createFlashSale, deleteFlashSale, getAllFlashSales, getFlashSaleById, updateFlashSale } from "../controllers/flashSaleController";
import { authenticateJwt } from "../middleware/authMiddleware";
import express from "express";

const flashSaleRouter = Router();
flashSaleRouter.use(express.json());
flashSaleRouter.use(authenticateJwt);
// Route to create a flash sale
flashSaleRouter.post("/", createFlashSale);

// get flash sale by ID
flashSaleRouter.get("/:id", getFlashSaleById);

// update flash sale route
flashSaleRouter.put("/:id", updateFlashSale); // Uncomment and implement if needed

// get all flash sales
flashSaleRouter.get("/", getAllFlashSales); // Implement logic to fetch all flash sales


// delete flash sale route
flashSaleRouter.delete("/:id", deleteFlashSale);    // Implement delete logic here if needed;
// Add more routes as needed, e.g., for fetching, updating, or deleting flash sales
export default flashSaleRouter;

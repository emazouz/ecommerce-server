// Product Type Route


import { Router } from "express";
import { ProductTypeController } from "../controllers/productTypeController";


const router = Router();

router.get("/", ProductTypeController.getAllProductTypes);
router.get("/:id", ProductTypeController.getProductTypeById);
router.post("/", ProductTypeController.createProductType);
router.put("/:id", ProductTypeController.updateProductType);
router.delete("/:id", ProductTypeController.deleteProductType);


export default router;
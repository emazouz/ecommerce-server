"use strict";
// Product Type Route
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productTypeController_1 = require("../controllers/productTypeController");
const router = (0, express_1.Router)();
router.get("/", productTypeController_1.ProductTypeController.getAllProductTypes);
router.get("/:id", productTypeController_1.ProductTypeController.getProductTypeById);
router.post("/", productTypeController_1.ProductTypeController.createProductType);
router.put("/:id", productTypeController_1.ProductTypeController.updateProductType);
router.delete("/:id", productTypeController_1.ProductTypeController.deleteProductType);
exports.default = router;

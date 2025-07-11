"use strict";
// Category Route
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CategoryController_1 = require("../controllers/CategoryController");
const router = (0, express_1.Router)();
router.get("/", CategoryController_1.CategoryController.getAllCategories);
router.get("/:id", CategoryController_1.CategoryController.getCategoryById);
router.post("/", CategoryController_1.CategoryController.createCategory);
router.put("/:id", CategoryController_1.CategoryController.updateCategory);
router.delete("/:id", CategoryController_1.CategoryController.deleteCategory);
exports.default = router;

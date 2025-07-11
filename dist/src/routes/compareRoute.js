"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const compareController_1 = require("../controllers/compareController");
const router = (0, express_1.Router)();
// All compare routes require authentication
router.use(authMiddleware_1.authenticateJwt);
// Add product to compare list
router.post("/", compareController_1.addToCompare);
// Get user's compare list
router.get("/", compareController_1.getUserCompareList);
// Get detailed comparison data
router.get("/comparison", compareController_1.getComparisonData);
// Remove product from compare list
router.delete("/:productId", compareController_1.removeFromCompare);
// Clear entire compare list
router.delete("/", compareController_1.clearCompareList);
exports.default = router;

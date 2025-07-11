"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// All profile routes are protected
router.use(authMiddleware_1.authenticateJwt);
router.route("/").get(profileController_1.getProfile);
router.route("/").put(profileController_1.updateProfile);
router
    .route("/update-user-information")
    .post(uploadMiddleware_1.default, profileController_1.updateUserInformation);
router.route("/test-address").post(profileController_1.testUpdateAddress);
exports.default = router;

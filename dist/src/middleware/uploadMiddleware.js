"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
// Configure storage to use memory
const storage = multer_1.default.memoryStorage();
// File filter
const fileFilter = (req, file, cb) => {
    // Allow all file types for now, you might want to restrict this
    cb(null, true);
};
// Create multer instance
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now, you might want to restrict this
        cb(null, true);
    },
});
// Export middleware
// We use .any() to accept all files regardless of the field name.
// This is more flexible for handling main images, thumb images, and variant images.
const uploadMiddleware = upload.any();
exports.default = uploadMiddleware;

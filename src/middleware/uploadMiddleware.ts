import multer from "multer";
import { Request } from "express";

// Configure storage to use memory
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allow all file types for now, you might want to restrict this
  cb(null, true);
};

// Create multer instance
const upload = multer({
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

export default uploadMiddleware;

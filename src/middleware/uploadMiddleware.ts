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
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // Maximum 10 files
  },
});

// Export middleware
// We use .any() to accept all files regardless of the field name.
// This is more flexible for handling main images, thumb images, and variant images.
export const uploadMiddleware = upload.any();

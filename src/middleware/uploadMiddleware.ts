// import multer from "multer";
// import { Request } from "express";

// // Configure storage to use memory
// const storage = multer.memoryStorage();

// // File filter
// const fileFilter = (
//   req: Request,
//   file: Express.Multer.File,
//   cb: multer.FileFilterCallback
// ) => {
//   // Allow all file types for now, you might want to restrict this
//   cb(null, true);
// };

// // Create multer instance
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10 MB
//   },
//   fileFilter: (req, file, cb) => {
//     // Allow all file types for now, you might want to restrict this
//     cb(null, true);
//   },
// });

// // Export middleware
// // We use .any() to accept all files regardless of the field name.
// // This is more flexible for handling main images, thumb images, and variant images.
// const uploadMiddleware = upload.any();

// export default uploadMiddleware;

import multer from "multer";
import { Request } from "express";

// Configure storage to use memory (you can change to disk if needed)
const storage = multer.memoryStorage();

// Optional: Add file type filtering here
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Example: only accept images
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Create multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max per file
  },
  fileFilter,
});

// Export middleware to accept specific file fields
const uploadMiddleware = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

export default uploadMiddleware;

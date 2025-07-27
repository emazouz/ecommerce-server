import { Router } from "express";
const router = Router();

import { BlogPostController } from "../controllers/blogController";
import { authenticateJwt } from "../middleware/authMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";

// All routes after this middleware are protected
router.use(authenticateJwt);

// Blog operations
router.get("/:id", BlogPostController.getBlogPostById);
router.get("/", BlogPostController.listBlogPosts);
router.get("/slug/:slug", BlogPostController.getBlogPostBySlug);
router.post("/:id/view", BlogPostController.incrementViews);

// ✅ إنشاء منشور جديد (مع middleware لرفع الصور)
router.post(
  "/",
  uploadMiddleware,
  BlogPostController.createBlogPost as unknown as import("express").RequestHandler
);

// ✅ تحديث منشور
router.put(
  "/:id",
  uploadMiddleware,
  BlogPostController.updateBlogPost as unknown as import("express").RequestHandler
);

// ✅ حذف منشور
router.delete(
  "/:id",
  BlogPostController.deleteBlogPost as unknown as import("express").RequestHandler
);

// ✅ تحديث جزئي (يمكنك حذفه إذا لم يكن مستخدمًا)
router.patch(
  "/:id",
  BlogPostController.updateBlogPost as unknown as import("express").RequestHandler
);

export default router;

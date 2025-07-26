import { Router } from "express";
const router = Router();
import { BlogPostController } from "../controllers/blogController";

import { authenticateJwt } from "../middleware/authMiddleware";

// All routes after this middleware are protected
router.use(authenticateJwt);
// Blog operations
// router.route("/").get(getAllBlogs);
router
  .route("/")
  .post(
    BlogPostController.createBlogPost as unknown as import("express").RequestHandler
  ); // Create a new blog
router.route("/").get(BlogPostController.listBlogPosts);
// router.route("/:id").get(getBlogById); // Get a blog by ID
// router.route("/:id").put(updateBlog); // Update a blog by ID
// router.route("/:id").delete(deleteBlog); // Delete a blog by ID
// router.route("/category/:categoryId").get(getBlogsByCategory); // Get blogs by category
// router.route("/author/:authorId").get(getBlogsByAuthor); // Get blogs by author
// router.route("/tag/:tagId").get(getBlogsByTag); // Get blogs by  tag
// router.route("/date").get(getBlogsByDateRange); // Get blogs by date range
// router.route("/search").get(searchBlogs); // Search blogs by title or content

export default router;

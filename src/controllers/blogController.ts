/////////////////////////////////////////////////////////////////////
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import fs from "fs";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary";
import { prisma } from "../utils/prisma";
import { PostStatus, Prisma, UserRole } from "@prisma/client";
interface FileRequest extends AuthenticatedRequest {
  files?: {
    featuredImage?: Express.Multer.File[];
    thumbnail?: Express.Multer.File[];
    gallery?: Express.Multer.File[];
  };
}

interface BlogPostImages {
  [key: string]: string | string[] | undefined;
  featured?: string;
  thumbnail?: string;
  gallery?: string[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
const safeJSON = <T>(raw: unknown, fallback: T): T => {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON format");
  }
};

const generateSlug = async (title: string, postId?: string) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = base;
  let n = 1;

  // If we're editing, allow collision with the same record
  const notId = postId ? { NOT: { id: postId } } : undefined;
  while (await prisma.blogPost.findFirst({ where: { slug, ...notId } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
};

// const parseTags = (tags: unknown): string[] =>
//   Array.isArray(tags)
//     ? (tags as string[])
//     : typeof tags === "string"
//     ? tags.split(",").map((t) => t.trim())
//     : [];

const parseTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return tags as string[];
  }

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed;
      // fallback: treat as comma-separated string
      return tags.split(",").map((t) => t.trim());
    } catch {
      // fallback: treat as comma-separated string
      return tags.split(",").map((t) => t.trim());
    }
  }

  return [];
};

/* -------------------------------------------------------------------------- */
/*  Controller                                                                */
/* -------------------------------------------------------------------------- */
export const BlogPostController = {
  /* ------------------------------ Create ---------------------------------- */
  async createBlogPost(req: FileRequest, res: Response, next: NextFunction) {
    const user = req.user!;
    const files = req.files || {};
    const uploaded: Record<string, string | string[]> = {};

    try {
      const {
        title,
        categoryId,
        tags,
        content,
        excerpt,
        featured,
        status,
        seoTitle,
        seoDesc,
        seoKeywords,
        images: imagesJson,
      } = req.body;

      console.log("Creating blog post:", { title, categoryId, tags, status });

      if (!title || !content) {
        throw new ApiError(400, "Title and content are required");
      }

      /* ---------- Upload new files ---------- */
      // Handle featured image
      if (files.featuredImage && files.featuredImage[0]) {
        const result = await uploadToCloudinary(
          files.featuredImage[0],
          "blog/featured"
        );
        uploaded.featured = result.url;
      }

      // Handle thumbnail
      if (files.thumbnail && files.thumbnail[0]) {
        const result = await uploadToCloudinary(
          files.thumbnail[0],
          "blog/thumbnails"
        );
        uploaded.thumbnail = result.url;
      }

      // Handle gallery images
      if (files.gallery && files.gallery.length > 0) {
        const galleryResults = await Promise.all(
          files.gallery.map((file) => uploadToCloudinary(file, "blog/gallery"))
        );
        uploaded.gallery = galleryResults.map((result) => result.url);
      }

      /* ---------- Merge images ---------- */
      const finalImages: BlogPostImages = {
        ...safeJSON<BlogPostImages | {}>(imagesJson, {}),
        ...uploaded,
      };

      /* ---------- Persist ---------- */
      const post = await prisma.blogPost.create({
        data: {
          title,
          slug: await generateSlug(title),
          authorId: user.userId,
          categoryId: categoryId ? Number(categoryId) : undefined,
          tags: parseTags(tags),
          content: typeof content === "string" ? JSON.parse(content) : content,
          excerpt:
            excerpt ||
            (typeof content === "string" ? content.slice(0, 150) : ""),
          featured: featured === "true",
          status,
          seoTitle: seoTitle || title,
          seoDesc:
            seoDesc ||
            excerpt ||
            (typeof content === "string" ? content.slice(0, 150) : ""),
          seoKeywords: seoKeywords || parseTags(tags).join(", "),
          images: finalImages,
          publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined,
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true, email: true },
          },
          category: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json({ success: true, data: post });
    } catch (err) {
      /* rollback uploads on error */
      const allUploaded = [
        ...(typeof uploaded.featured === "string" ? [uploaded.featured] : []),
        ...(typeof uploaded.thumbnail === "string" ? [uploaded.thumbnail] : []),
        ...(Array.isArray(uploaded.gallery) ? uploaded.gallery : []),
      ];

      if (allUploaded.length) {
        await Promise.all(allUploaded.map(deleteFromCloudinary));
      }
      return next(err);
    }
  },

  /* -------------------------------- Read ---------------------------------- */
  async getBlogPostBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const post = await prisma.blogPost.update({
        where: { slug },
        data: { views: { increment: 1 } },
        include: {
          author: {
            select: { id: true, username: true, avatar: true, email: true },
          },
          category: { select: { id: true, name: true } },
        },
      });
      if (!post) throw new ApiError(404, "Blog post not found");
      res.json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  },

  async getBlogPostById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const post = await prisma.blogPost.findUnique({
        where: { id },
        include: {
          author: {
            select: { id: true, username: true, avatar: true, email: true },
          },
          category: { select: { id: true, name: true } },
        },
      });
      if (!post) throw new ApiError(404, "Blog post not found");
      res.json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  },

  /* ------------------------------ Update ---------------------------------- */
  async updateBlogPost(req: FileRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const user = req.user!;
    const files = req.files || {};
    const uploaded: Record<string, string | string[]> = {};
    const removeQueue: string[] = [];

    try {
      const current = await prisma.blogPost.findUnique({ where: { id } });
      if (!current) throw new ApiError(404, "Blog post not found");
      if (current.authorId !== user?.userId && user.role !== UserRole.ADMIN) {
        throw new ApiError(403, "Forbidden");
      }

      /* ---------- Upload new files ---------- */
      // Handle featured image
      if (files.featuredImage && files.featuredImage[0]) {
        const result = await uploadToCloudinary(
          files.featuredImage[0],
          "blog/featured"
        );
        uploaded.featured = result.url;
      }

      // Handle thumbnail
      if (files.thumbnail && files.thumbnail[0]) {
        const result = await uploadToCloudinary(
          files.thumbnail[0],
          "blog/thumbnails"
        );
        uploaded.thumbnail = result.url;
      }

      // Handle gallery images
      if (files.gallery && files.gallery.length > 0) {
        const galleryResults = await Promise.all(
          files.gallery.map((file) => uploadToCloudinary(file, "blog/gallery"))
        );
        uploaded.gallery = galleryResults.map((result) => result.url);
      }

      /* ---------- Handle deletions ---------- */
      const pendingDeletion: string[] = safeJSON<string[]>(
        req.body.deleteImages,
        []
      );
      const existingImages = current.images as BlogPostImages;
      pendingDeletion.forEach((field) => {
        const url = existingImages?.[field as keyof BlogPostImages];
        if (url) {
          if (Array.isArray(url)) {
            removeQueue.push(...url);
          } else {
            removeQueue.push(url as string);
          }
          delete existingImages[field as keyof BlogPostImages];
        }
      });

      const finalImages: BlogPostImages = {
        ...existingImages,
        ...safeJSON<BlogPostImages | {}>(req.body.images, {}),
        ...uploaded,
      };

      /* ---------- Persist ---------- */
      const newSlug =
        req.body.title && req.body.title !== current.title
          ? await generateSlug(req.body.title, id)
          : current.slug;

      const updated = await prisma.blogPost.update({
        where: { id },
        data: {
          title: req.body.title ?? current.title,
          slug: newSlug,
          categoryId: req.body.categoryId
            ? Number(req.body.categoryId)
            : current.categoryId,
          tags: req.body.tags ? parseTags(req.body.tags) : current.tags,
          content: req.body.content
            ? typeof req.body.content === "string"
              ? JSON.parse(req.body.content)
              : req.body.content
            : current.content,
          excerpt: req.body.excerpt ?? current.excerpt,
          featured:
            req.body.featured !== undefined
              ? req.body.featured === "true"
              : current.featured,
          status: (req.body.status as PostStatus) ?? current.status,
          seoTitle: req.body.seoTitle ?? current.seoTitle,
          seoDesc: req.body.seoDesc ?? current.seoDesc,
          seoKeywords: req.body.seoKeywords ?? current.seoKeywords,
          images: finalImages,
          publishedAt:
            req.body.status === PostStatus.PUBLISHED &&
            current.status !== PostStatus.PUBLISHED
              ? new Date()
              : current.publishedAt,
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true, email: true },
          },
          category: { select: { id: true, name: true } },
        },
      });

      /* ---------- Cloudinary cleanup ---------- */
      if (removeQueue.length) {
        await Promise.all(removeQueue.map(deleteFromCloudinary));
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      const allUploaded = [
        ...(typeof uploaded.featured === "string" ? [uploaded.featured] : []),
        ...(typeof uploaded.thumbnail === "string" ? [uploaded.thumbnail] : []),
        ...(Array.isArray(uploaded.gallery) ? uploaded.gallery : []),
      ];

      if (allUploaded.length) {
        await Promise.all(allUploaded.map(deleteFromCloudinary));
      }
      next(err);
    }
  },

  /* ------------------------------ Delete ---------------------------------- */
  async deleteBlogPost(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    const { id } = req.params;
    const user = req.user!;
    try {
      const post = await prisma.blogPost.findUnique({ where: { id } });
      if (!post) throw new ApiError(404, "Blog post not found");
      if (post.authorId !== user?.userId && user.role !== UserRole.ADMIN) {
        throw new ApiError(403, "Forbidden");
      }

      const imgs = post.images as BlogPostImages;
      const urls = [
        imgs?.featured,
        imgs?.thumbnail,
        ...(imgs?.gallery ?? []),
      ].filter(Boolean) as string[];

      await prisma.blogPost.delete({ where: { id } });
      if (urls.length) {
        await Promise.all(urls.map(deleteFromCloudinary));
      }

      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  /* ------------------------------- List ----------------------------------- */
  async listBlogPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = "1",
        limit = "10",
        status,
        category,
        featured,
        search,
      } = req.query;

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const filters: Prisma.BlogPostWhereInput = {};

      if (status) filters.status = status as PostStatus;
      if (category) filters.categoryId = Number(category);
      if (featured !== undefined) filters.featured = featured === "true";
      if (search) {
        filters.OR = [
          { title: { contains: search as string, mode: "insensitive" } },
          { excerpt: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where: filters,
          skip,
          take,
          orderBy: { publishedAt: "desc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.blogPost.count({ where: filters }),
      ]);

      res.json({
        success: true,
        data: posts,
        meta: {
          total,
          page: Number(page),
          limit: take,
          pages: Math.ceil(total / take),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /* ------------------------------- View Increment ------------------------- */
  async incrementViews(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await prisma.blogPost.update({
        where: { id },
        data: { views: { increment: 1 } },
      });

      res.json({ success: true, message: "View count incremented" });
    } catch (err) {
      next(err);
    }
  },
};

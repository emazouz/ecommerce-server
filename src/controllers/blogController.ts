// import { Prisma } from '@prisma/client';
// import { Request, Response, NextFunction } from 'express';
// import { prisma } from '../utils/prisma';
// import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
// import { ApiError } from '../utils/ApiError';
// import { AuthenticatedRequest } from '../middleware/authMiddleware';
// import uploadMiddleware from '../middleware/uploadMiddleware';
// import fs from 'fs';

// interface FileRequest extends AuthenticatedRequest {
//   files?: Express.Multer.File[];
// }

// interface BlogPostImages {
//   featured?: string;
//   thumbnail?: string;
//   gallery?: string[];
// }

// // Helper functions
// const cleanupFiles = (files: Express.Multer.File[]) => {
//   files.forEach(file => {
//     try {
//       fs.unlinkSync(file.path);
//     } catch (err) {
//       console.error(`Failed to delete file: ${file.path}`, err);
//     }
//   });
// };

// const parseImages = (images?: string): BlogPostImages | null => {
//   if (!images) return null;
//   try {
//     return JSON.parse(images);
//   } catch (error) {
//     throw new ApiError(400, 'Invalid images JSON format');
//   }
// };

// const generateSlug = (title: string): string => {
//   return title
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-')
//     .replace(/(^-|-$)/g, '');
// };

// // Controller
// export const BlogPostController = {
//   // Create Blog Post
//   async createBlogPost(req: FileRequest, res: Response, next: NextFunction) {
//     const { user } = req;
//     const rawFiles = req.files || [];
//     let uploadedImages: { [key: string]: string } = {};

//     try {
//       // Parse and validate input
//       const {
//         title,
//         categoryId,
//         tags,
//         content,
//         excerpt,
//         featured,
//         status,
//         seoTitle,
//         seoDesc,
//         seoKeywords,
//         images: imagesJson,
//       } = req.body;

//       if (!title || !content) {
//         throw new ApiError(400, 'Title and content are required');
//       }

//       // Handle file uploads
//       if (rawFiles.length > 0) {
//         const uploadResults = await Promise.all(
//           rawFiles.map(file => uploadToCloudinary(file, 'blog'))
//         );

//         rawFiles.forEach((file, index) => {
//           uploadedImages[file.fieldname] = uploadResults[index].url;
//         });

//         // Cleanup temp files
//         cleanupFiles(rawFiles);
//       }

//       // Parse and merge images
//       const parsedImages = parseImages(imagesJson);
//       const finalImages = {
//         ...parsedImages,
//         ...uploadedImages,
//       };

//       // Generate slug
//       let slug = generateSlug(title);
//       let slugExists = await prisma.blogPost.findUnique({ where: { slug } });
//       let counter = 1;
      
//       while (slugExists) {
//         slug = `${generateSlug(title)}-${counter}`;
//         slugExists = await prisma.blogPost.findUnique({ where: { slug } });
//         counter++;
//       }

//       // Create blog post
//       const blogPost = await prisma.blogPost.create({
//         data: {
//           title,
//           slug,
//           author: { connect: { id: user.id } },
//           category: categoryId ? { connect: { id: categoryId } } : undefined,
//           tags: Array.isArray(tags) ? tags : tags?.split(',').map(t => t.trim()) || [],
//           content: typeof content === 'string' ? JSON.parse(content) : content,
//           excerpt: excerpt || `${content.substring(0, 150)}...`,
//           featured: featured === 'true',
//           status: status || 'DRAFT',
//           seoTitle: seoTitle || title,
//           seoDesc: seoDesc || excerpt || `${content.substring(0, 150)}...`,
//           seoKeywords: seoKeywords || tags?.join(', ') || '',
//           images: finalImages,
//           publishedAt: status === 'PUBLISHED' ? new Date() : null,
//         },
//         include: {
//           author: {
//             select: {
//               id: true,
//               name: true,
//               avatar: true,
//             },
//           },
//           category: {
//             select: {
//               id: true,
//               name: true,
//               slug: true,
//             },
//           },
//         },
//       });

//       res.status(201).json({
//         success: true,
//         data: blogPost,
//       });
//     } catch (error) {
//       // Cleanup uploaded images if error occurs
//       if (Object.keys(uploadedImages).length > 0) {
//         await Promise.all(
//           Object.values(uploadedImages).map(url => 
//             deleteFromCloudinary(url))
//         );
//       }
//       next(error);
//     }
//   },

//   // Get Blog Post by Slug
//   async getBlogPostBySlug(req: Request, res: Response, next: NextFunction) {
//     try {
//       const { slug } = req.params;

//       const blogPost = await prisma.blogPost.update({
//         where: { slug },
//         data: {
//           views: { increment: 1 },
//         },
//         include: {
//           author: {
//             select: {
//               id: true,
//               username: true,
//               avatar: true,
//             },
//           },
//           category: {
//             select: {
//               id: true,
//               name: true,
//             },
//           },
//         },
//       });

//       if (!blogPost) {
//         throw new ApiError(404, 'Blog post not found');
//       }

//       res.json({
//         success: true,
//         data: blogPost,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   // Update Blog Post
//   // async updateBlogPost(req: FileRequest, res: Response, next: NextFunction) {
//   //   const { id } = req.params;
//   //   const { user } = (req as AuthenticatedRequest);
//   //   const rawFiles = req.files || [];
//   //   let uploadedImages: { [key: string]: string } = {};
//   //   let imagesToDelete: string[] = [];

//   //   try {
//   //     // Get existing post
//   //     const existingPost = await prisma.blogPost.findUnique({
//   //       where: { id },
//   //     });

//   //     if (!existingPost) {
//   //       throw new ApiError(404, 'Blog post not found');
//   //     }

//   //     // Check authorization
//   //     if (existingPost.authorId !== user.id && !user.role === 'ADMIN') {
//   //       throw new ApiError(403, 'Not authorized to update this post');
//   //     }

//   //     // Parse input
//   //     const {
//   //       title,
//   //       categoryId,
//   //       tags,
//   //       content,
//   //       excerpt,
//   //       featured,
//   //       status,
//   //       seoTitle,
//   //       seoDesc,
//   //       seoKeywords,
//   //       images: imagesJson,
//   //       deleteImages,
//   //     } = req.body;

//   //     // Handle file uploads
//   //     if (rawFiles.length > 0) {
//   //       const uploadResults = await Promise.all(
//   //         rawFiles.map(file => uploadToCloudinary(file, 'blog'))
//   //       );

//   //       rawFiles.forEach((file, index) => {
//   //         uploadedImages[file.fieldname] = uploadResults[index].url;
//   //       });

//   //       // Cleanup temp files
//   //       cleanupFiles(rawFiles);
//   //     }

//   //     // Handle image deletions
//   //     const parsedDeleteImages = deleteImages 
//   //       ? JSON.parse(deleteImages) 
//   //       : [];
      
//   //     const existingImages = existingPost.images as unknown as BlogPostImages || {};
//   //     const updatedImages = { ...existingImages };

//   //     parsedDeleteImages.forEach((imageField: string) => {
//   //       if (updatedImages[imageField as keyof BlogPostImages]) {
//   //         imagesToDelete.push(updatedImages[imageField as keyof BlogPostImages] as string);
//   //         delete updatedImages[imageField as keyof BlogPostImages];
//   //       }
//   //     });

//   //     // Merge with new images
//   //     const parsedImages = parseImages(imagesJson);
//   //     const finalImages = {
//   //       ...updatedImages,
//   //       ...parsedImages,
//   //       ...uploadedImages,
//   //     };

//   //     // Generate new slug if title changed
//   //     let slug = existingPost.slug;
//   //     if (title && title !== existingPost.title) {
//   //       slug = generateSlug(title);
//   //       const slugExists = await prisma.blogPost.findFirst({
//   //         where: {
//   //           slug,
//   //           NOT: { id },
//   //         },
//   //       });

//   //       if (slugExists) {
//   //         let counter = 1;
//   //         while (slugExists) {
//   //           slug = `${generateSlug(title)}-${counter}`;
//   //           const tempExists = await prisma.blogPost.findFirst({
//   //             where: {
//   //               slug,
//   //               NOT: { id },
//   //             },
//   //           });
//   //           if (!tempExists) break;
//   //           counter++;
//   //         }
//   //       }
//   //     }

//   //     // Update blog post
//   //     const updatedPost = await prisma.blogPost.update({
//   //       where: { id },
//   //       data: {
//   //         title: title || existingPost.title,
//   //         slug,
//   //         category: categoryId 
//   //           ? { connect: { id: categoryId } } 
//   //           : existingPost.categoryId 
//   //             ? { disconnect: true } 
//   //             : undefined,
//   //         tags: tags 
//   //           ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) 
//   //           : existingPost.tags,
//   //         content: content 
//   //           ? (typeof content === 'string' ? JSON.parse(content) : content) 
//   //           : existingPost.content,
//   //         excerpt: excerpt || existingPost.excerpt,
//   //         featured: featured !== undefined ? featured === 'true' : existingPost.featured,
//   //         status: status || existingPost.status,
//   //         seoTitle: seoTitle || existingPost.seoTitle,
//   //         seoDesc: seoDesc || existingPost.seoDesc,
//   //         seoKeywords: seoKeywords || existingPost.seoKeywords,
//   //         images: finalImages,
//   //         publishedAt: status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED' 
//   //           ? new Date() 
//   //           : existingPost.publishedAt,
//   //       },
//   //       include: {
//   //         author: {
//   //           select: {
//   //             id: true,
//   //             name: true,
//   //             avatar: true,
//   //           },
//   //         },
//   //         category: {
//   //           select: {
//   //             id: true,
//   //             name: true,
//   //             slug: true,
//   //           },
//   //         },
//   //       },
//   //     });

//   //     // Delete old images from Cloudinary
//   //     if (imagesToDelete.length > 0) {
//   //       await Promise.all(
//   //         imagesToDelete.map(url => deleteFromCloudinary(url))
//   //       );
//   //     }

//   //     res.json({
//   //       success: true,
//   //       data: updatedPost,
//   //     });
//   //   } catch (error) {
//   //     // Cleanup uploaded images if error occurs
//   //     if (Object.keys(uploadedImages).length > 0) {
//   //       await Promise.all(
//   //         Object.values(uploadedImages).map(url => 
//   //           deleteFromCloudinary(url))
//   //       );
//   //     }
//   //     next(error);
//   //   }
//   // },

//   // Delete Blog Post
//   // async deleteBlogPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
//   //   const { id } = req.params;
//   //   const { user } = req;

//   //   try {
//   //     const post = await prisma.blogPost.findUnique({
//   //       where: { id },
//   //     });

//   //     if (!post) {
//   //       throw new ApiError(404, 'Blog post not found');
//   //     }

//   //     // Check authorization
//   //     if (post.authorId !== user.id && !user.isAdmin) {
//   //       throw new ApiError(403, 'Not authorized to delete this post');
//   //     }

//   //     // Get images to delete
//   //     const images = post.images as unknown as BlogPostImages || {};
//   //     const imageUrls = [
//   //       images.featured,
//   //       images.thumbnail,
//   //       ...(images.gallery || []),
//   //     ].filter(Boolean) as string[];

//   //     // Delete post
//   //     await prisma.blogPost.delete({
//   //       where: { id },
//   //     });

//   //     // Delete images from Cloudinary
//   //     if (imageUrls.length > 0) {
//   //       await Promise.all(
//   //         imageUrls.map(url => deleteFromCloudinary(url))
//   //       );
//   //     }

//   //     res.json({
//   //       success: true,
//   //       message: 'Blog post deleted successfully',
//   //     });
//   //   } catch (error) {
//   //     next(error);
//   //   }
//   // },

//   // List Blog Posts
//   // async listBlogPosts(req: Request, res: Response, next: NextFunction) {
//   //   try {
//   //     const { 
//   //       page = 1, 
//   //       limit = 10, 
//   //       status, 
//   //       category, 
//   //       featured, 
//   //       search 
//   //     } = req.query;

//   //     const skip = (Number(page) - 1) * Number(limit);
//   //     const where: Prisma.BlogPostWhereInput = {};

//   //     if (status) where.status = status as string;
//   //     if (category) where.categoryId = category as string;
//   //     if (featured) where.featured = featured === 'true';
//   //     if (search) {
//   //       where.OR = [
//   //         { title: { contains: search as string, mode: 'insensitive' } },
//   //         { excerpt: { contains: search as string, mode: 'insensitive' } },
//   //         { content: { path: ['text'], string_contains: search as string } },
//   //       ];
//   //     }

//   //     const [posts, total] = await Promise.all([
//   //       prisma.blogPost.findMany({
//   //         where,
//   //         skip,
//   //         take: Number(limit),
//   //         orderBy: {
//   //           publishedAt: 'desc',
//   //         },
//   //         include: {
//   //           author: {
//   //             select: {
//   //               id: true,
//   //               name: true,
//   //               avatar: true,
//   //             },
//   //           },
//   //           category: {
//   //             select: {
//   //               id: true,
//   //               name: true,
//   //               slug: true,
//   //             },
//   //           },
//   //         },
//   //       }),
//   //       prisma.blogPost.count({ where }),
//   //     ]);

//   //     res.json({
//   //       success: true,
//   //       data: posts,
//   //       meta: {
//   //         total,
//   //         page: Number(page),
//   //         limit: Number(limit),
//   //         pages: Math.ceil(total / Number(limit)),
//   //       },
//   //     });
//   //   } catch (error) {
//   //     next(error);
//   //   }
//   // },
// };
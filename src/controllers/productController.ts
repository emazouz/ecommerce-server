import { Request, Response, NextFunction, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { ApiError } from "../utils/ApiError";
import {
  validateProduct,
  validateVariant,
  validateFlashSale,
} from "../validators/productValidator";
import { CloudinaryResponse } from "../types/cloudinary";
import {
  AuthenticatedRequest,
  authenticateJwt as authMiddleware,
} from "../middleware/authMiddleware";
import fs from "fs";
import { ProductFilters, ProductVariantInput } from "../types/productTypes";
import { Router } from "express";
import uploadMiddleware from "../middleware/uploadMiddleware";

// Update the FileRequest interface to handle an array of files from upload.any()
interface FileRequest extends AuthenticatedRequest {
  files?: Express.Multer.File[];
}

// Enhanced product creation interface with better type safety
interface ProductCreationData {
  name: string;
  description: string;
  aboutProduct: string[];
  price: number;
  originPrice: number;
  categoryId: number;
  typeId?: number;
  weight?: number;
  gender: string;
  brand: string;
  sizes: string[];
  colors: { name: string; code: string }[];
  inventory: {
    quantity: number;
    lowStockThreshold?: number;
  };
  isSale?: boolean;
  isFlashSale?: boolean;
  isNew?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  sku?: string;
  minimumOrderQty?: number;
  maximumOrderQty?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  variants: ProductVariantInput[];
}

// Helper function to handle file uploads
const handleFileUploads = async (
  files: Express.Multer.File[],
  folder: string
): Promise<CloudinaryResponse[]> => {
  const uploaded = await Promise.all(
    files.map((file) => uploadToCloudinary(file, folder))
  );
  await cleanupFiles(files);
  return uploaded;
};

// Helper function to handle image cleanup
const cleanupCloudinaryImages = async (
  images: CloudinaryResponse[]
): Promise<void> => {
  if (images?.length) {
    await Promise.all(images.map((img) => deleteFromCloudinary(img.url)));
  }
};

// Add this helper function alongside the other helpers
const cleanupFiles = async (files: Express.Multer.File[]): Promise<void> => {
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
};

// Helper function to parse multipart form data
const parseMultipartFormData = (body: any) => {
  const parsedData: { [key: string]: any } = {};
  const variantsData: { [key: number]: any } = {};

  // Parse JSON fields and separate variant fields
  for (const key in body) {
    if (key.startsWith("variants[")) {
      const match = key.match(/variants\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const [, indexStr, field] = match;
        const index = parseInt(indexStr, 10);
        if (!variantsData[index]) {
          variantsData[index] = {};
        }
        variantsData[index][field] = body[key];
      }
    } else {
      try {
        if (
          [
            "aboutProduct",
            "sizes",
            "colors",
            "inventory",
            "flashSale",
            "tags",
            "metaKeywords",
          ].includes(key) &&
          typeof body[key] === "string"
        ) {
          const parsed = JSON.parse(body[key]);
          // Convert colors array of objects to array of JSON strings
          if (key === "colors" && Array.isArray(parsed)) {
            parsedData[key] = parsed.map((c) =>
              typeof c === "object" ? JSON.stringify(c) : c
            );
          } else {
            parsedData[key] = parsed;
          }
        } else {
          parsedData[key] = body[key];
        }
      } catch (e) {
        parsedData[key] = body[key];
      }
    }
  }

  // Convert boolean strings to booleans
  const booleanFields = [
    "isSale",
    "isFlashSale",
    "isNew",
    "isActive",
    "isFeatured",
  ];
  booleanFields.forEach((field) => {
    if (parsedData[field]) {
      parsedData[field] = parsedData[field] === "true";
    }
  });

  // Convert numeric strings to numbers
  const numberFields = [
    "price",
    "originPrice",
    "weight",
    "minimumOrderQty",
    "maximumOrderQty",
  ];
  numberFields.forEach((field) => {
    if (parsedData[field]) {
      parsedData[field] = parseFloat(parsedData[field]);
    }
  });

  // Convert ID fields to numbers
  const idFields = ["categoryId", "typeId"];
  idFields.forEach((field) => {
    if (parsedData[field]) {
      parsedData[field] = parseInt(parsedData[field], 10);
    }
  });

  return { parsedData, variantsData };
};

// Enhanced slug generation
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
};

// Enhanced error handling wrapper
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

class ProductController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes
    this.router.get("/", asyncHandler(this.getAllProducts));
    this.router.get("/search", asyncHandler(this.searchProducts));
    this.router.get("/featured", asyncHandler(this.getFeaturedProducts));
    this.router.get(
      "/by-category/:categoryId",
      asyncHandler(this.getProductsByCategory)
    );
    this.router.get("/:id", asyncHandler(this.getProduct));
    this.router.get("/:id/reviews", asyncHandler(this.getProductReviews));
    this.router.get("/:id/variants", asyncHandler(this.getProductVariants));
    this.router.post(
      "/:id/increment-views",
      asyncHandler(this.incrementProductViews)
    );

    // Protected routes - require authentication
    this.router.use(authMiddleware);

    // Product CRUD operations
    this.router.post("/", uploadMiddleware, asyncHandler(this.createProduct));
    this.router.put("/:id", uploadMiddleware, asyncHandler(this.updateProduct));
    this.router.delete("/:id", asyncHandler(this.deleteProduct));

    // Product variants and inventory
    this.router.post("/:id/variants", asyncHandler(this.manageProductVariants));
    this.router.post("/:id/inventory", asyncHandler(this.manageInventory));

    // Product sales and promotions
    this.router.post("/:id/flash-sale", asyncHandler(this.manageFlashSale));
    this.router.put("/:id/status", asyncHandler(this.updateProductStatus));
    this.router.post("/:id/sales", asyncHandler(this.updateProductSales));
    this.router.post("/:id/reviews", asyncHandler(this.addProductReview));
    this.router.post(
      "/:id/reviews/:reviewId/reply",
      asyncHandler(this.addReplyToReview)
    );

    // Admin only routes
    this.router.get("/admin/analytics", asyncHandler(this.getProductAnalytics));
    this.router.post(
      "/admin/bulk-update",
      asyncHandler(this.bulkUpdateProducts)
    );
  }

  // New method for getting featured products
  public getFeaturedProducts: RequestHandler = async (req, res) => {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const products = await prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
      },
      include: {
        category: true,
        type: true,
        inventory: true,
        flashSale: true,
      },
      take: limitNum,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: products,
      total: products.length,
    });
  };

  // New method for getting products by category
  public getProductsByCategory: RequestHandler = async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: {
          categoryId: parseInt(categoryId, 10),
          isActive: true,
        },
        include: {
          category: true,
          type: true,
          inventory: true,
          flashSale: true,
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({
        where: {
          categoryId: parseInt(categoryId, 10),
          isActive: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  };

  // New method for incrementing product views
  public incrementProductViews: RequestHandler = async (req, res) => {
    const { id } = req.params;

    await prisma.product.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: "Product view incremented successfully",
    });
  };

  // New method for product analytics
  public getProductAnalytics: RequestHandler = async (req, res) => {
    const analytics = await prisma.$transaction([
      // Total products
      prisma.product.count(),
      // Active products
      prisma.product.count({ where: { isActive: true } }),
      // Featured products
      prisma.product.count({ where: { isFeatured: true } }),
      // Products on sale
      prisma.product.count({ where: { isSale: true } }),
      // Low stock products
      prisma.inventory.count({ where: { quantity: { lte: 10 } } }),
      // Top selling products
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sold: true,
          views: true,
        },
        orderBy: { sold: "desc" },
        take: 10,
      }),
      // Recently added products
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts: analytics[0],
        activeProducts: analytics[1],
        featuredProducts: analytics[2],
        saleProducts: analytics[3],
        lowStockProducts: analytics[4],
        topSellingProducts: analytics[5],
        recentProducts: analytics[6],
      },
    });
  };

  // New method for bulk product updates
  public bulkUpdateProducts: RequestHandler = async (req, res) => {
    const { productIds, updateData } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError(400, "Product IDs array is required");
    }

    const validUpdateFields = [
      "isActive",
      "isFeatured",
      "isSale",
      "isNew",
      "categoryId",
      "typeId",
    ];
    const filteredUpdateData = Object.keys(updateData)
      .filter((key) => validUpdateFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);

    if (Object.keys(filteredUpdateData).length === 0) {
      throw new ApiError(400, "No valid update fields provided");
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data: filteredUpdateData,
    });

    res.json({
      success: true,
      message: `${result.count} products updated successfully`,
      updatedCount: result.count,
    });
  };

  // Create Product - Enhanced version with better error handling
  private async createProductHandler(
    req: FileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const rawFiles = req.files || [];
    let allUploadedFiles: CloudinaryResponse[] = [];

    try {
      // Step 1: Parse and validate form data
      const { parsedData, variantsData } = parseMultipartFormData(req.body);

      // Step 2: Validate product type if provided
      if (parsedData.typeId) {
        const productType = await prisma.productType.findUnique({
          where: { id: parsedData.typeId },
        });
        if (!productType) {
          throw new ApiError(404, "Product type not found");
        }
        // Add type name for validation
        parsedData.type = productType.name;
      } else {
        // Set default type if typeId not provided
        parsedData.type = "default";
      }

      // Step 3: Handle file uploads
      const imagesToUpload: Express.Multer.File[] = [];
      const thumbImageToUpload: Express.Multer.File[] = [];
      const variantImagesToUpload: { [key: string]: Express.Multer.File } = {};

      for (const file of rawFiles) {
        if (file.fieldname === "images") {
          imagesToUpload.push(file);
        } else if (file.fieldname === "thumbImage") {
          thumbImageToUpload.push(file);
        } else if (file.fieldname.startsWith("variantImage_")) {
          variantImagesToUpload[file.fieldname] = file;
        }
      }

      if (imagesToUpload.length === 0 || thumbImageToUpload.length === 0) {
        throw new ApiError(
          400,
          "Product main images and thumbnail are required."
        );
      }

      // Step 4: Upload all files
      const allFiles = [
        ...imagesToUpload,
        ...thumbImageToUpload,
        ...Object.values(variantImagesToUpload),
      ];
      allUploadedFiles = await handleFileUploads(allFiles, "products");

      // Step 5: Map URLs back to data structure
      const urlMap = new Map<string, string>();
      allUploadedFiles.forEach((uploadedFile, index) => {
        urlMap.set(allFiles[index].fieldname, uploadedFile.url);
      });

      const imageUrls = imagesToUpload
        .map((f) => urlMap.get(f.fieldname))
        .filter(Boolean) as string[];
      const thumbImageUrl = urlMap.get("thumbImage");

      // Step 6: Process variants
      let variants: ProductVariantInput[] = [];

      // Handle variants from variantsData (form field format)
      if (Object.keys(variantsData).length > 0) {
        variants = Object.keys(variantsData).map((key) => {
          const index = parseInt(key, 10);
          const variant = variantsData[index];
          const variantImageUrl = urlMap.get(`variantImage_${index}`);
          return {
            ...variant,
            id: variant.id || undefined,
            quantity: parseInt(variant.quantity, 10) || 0,
            image: variantImageUrl || "",
          };
        });
      }
      // Handle variants from parsedData.variants (JSON format)
      else if (parsedData.variants && Array.isArray(parsedData.variants)) {
        variants = parsedData.variants.map((variant: any, index: number) => {
          const variantImageUrl = urlMap.get(`variantImage_${index}`);
          return {
            ...variant,
            id: variant.id || undefined,
            quantity: parseInt(variant.quantity, 10) || 0,
            image: variantImageUrl || "",
          };
        });
      }

      // Step 7: Auto-derive colors and sizes from variants
      if (variants.length > 0) {
        const variantColors = variants
          .map((v) => ({ name: v.colorName, code: v.colorCode }))
          .filter((v) => v.name && v.code);
        const variantSizes = variants.map((v) => v.size).filter(Boolean);

        const uniqueColors = Array.from(
          new Set(variantColors.map((c) => JSON.stringify(c)))
        ).map((s) => JSON.parse(s));
        // Convert color objects to JSON strings for database storage
        parsedData.colors = uniqueColors.map((c) => JSON.stringify(c));
        parsedData.sizes = [...new Set(variantSizes)];
      }

      // Step 8: Generate unique SKU if not provided
      if (!parsedData.sku) {
        const timestamp = Date.now().toString().slice(-6);
        const brandPrefix = parsedData.brand.substring(0, 3).toUpperCase();
        parsedData.sku = `${brandPrefix}-${timestamp}`;
      }

      // Step 9: Generate slug
      const baseSlug = generateSlug(parsedData.name);
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Step 10: Validate final data
      const { variants: _, ...validationData } = {
        ...parsedData,
        variants,
        type: parsedData.type || "default", // Use the type from product type lookup
      };
      const validationError = validateProduct(validationData);
      if (validationError) {
        throw new ApiError(400, validationError);
      }

      for (const variant of variants) {
        // Make sure image field exists (can be empty string)
        if (!variant.image) {
          variant.image = "";
        }
        const variantError = validateVariant(variant);
        if (variantError) {
          throw new ApiError(400, `Invalid variant data: ${variantError}`);
        }
      }

      // Step 11: Create product
      const productPayload = {
        ...parsedData,
        slug,
        images: imageUrls,
        thumbImage: thumbImageUrl,
        variants: variants,
        isActive: parsedData.isActive !== false, // Default to true
      };

      const product = await this.createProductTransaction(productPayload);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      // Cleanup uploaded files on error
      await cleanupCloudinaryImages(allUploadedFiles);
      if (error instanceof Error) {
        await cleanupFiles(rawFiles);
      }
      next(error);
    }
  }

  // Private helper methods
  private async createProductTransaction(productPayload: any) {
    const {
      name,
      description,
      aboutProduct,
      price,
      originPrice,
      typeId,
      weight,
      gender,
      brand,
      categoryId,
      sizes,
      colors,
      images,
      thumbImage,
      inventory,
      isSale,
      isFlashSale,
      isNew,
      variants,
    } = productPayload;

    const type = await prisma.productType.findUnique({
      where: { id: typeId },
    });
    if (!type) {
      throw new ApiError(404, "Product type not found");
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          description,
          aboutProduct,
          price: new Prisma.Decimal(price),
          originPrice: new Prisma.Decimal(originPrice),
          typeId,
          weight,
          gender,
          brand,
          categoryId,
          sizes,
          colors,
          isSale,
          isFlashSale,
          isNew,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          images: images,
          thumbImage: thumbImage,
          inventory: {
            create: {
              quantity: inventory?.quantity || 0,
              lowStockThreshold: inventory?.lowStockThreshold || 5,
            },
          },
          variants: {
            create: variants.map(
              (variant: ProductVariantInput & { image: string }) => ({
                color: variant.color,
                colorCode: variant.colorCode,
                colorName: variant.colorName || "",
                size: variant.size,
                quantity: Number(variant.quantity) || 0,
                image: variant.image || "",
              })
            ),
          },
        },
        include: {
          category: true,
          inventory: true,
          variants: true,
        },
      });

      return product;
    });
  }

  private async updateProductHandler(
    req: FileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    const rawFiles = req.files || [];
    let allUploadedFiles: CloudinaryResponse[] = [];
    const oldImageUrlsToDelete: string[] = [];

    try {
      // Step 1: Fetch existing product
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { variants: true },
      });

      if (!existingProduct) {
        throw new ApiError(404, "Product not found");
      }

      // Step 2: Parse and reconstruct data from the multipart form (same as create)
      const body = req.body;
      const parsedData: { [key: string]: any } = {};
      const variantsData: { [key: number]: any } = {};

      for (const key in body) {
        if (key.startsWith("variants[")) {
          const match = key.match(/variants\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const [, indexStr, field] = match;
            const index = parseInt(indexStr, 10);
            if (!variantsData[index]) {
              variantsData[index] = {};
            }
            variantsData[index][field] = body[key];
          }
        } else {
          try {
            if (
              [
                "aboutProduct",
                "sizes",
                "colors",
                "inventory",
                "flashSale",
              ].includes(key) &&
              typeof body[key] === "string"
            ) {
              const parsed = JSON.parse(body[key]);
              // Convert colors array of objects to array of JSON strings
              if (key === "colors" && Array.isArray(parsed)) {
                parsedData[key] = parsed.map((c) =>
                  typeof c === "object" ? JSON.stringify(c) : c
                );
              } else {
                parsedData[key] = parsed;
              }
            } else {
              parsedData[key] = body[key];
            }
          } catch (e) {
            parsedData[key] = body[key];
          }
        }
      }

      // Convert boolean and numeric strings
      if (parsedData.isSale) parsedData.isSale = parsedData.isSale === "true";
      if (parsedData.isFlashSale)
        parsedData.isFlashSale = parsedData.isFlashSale === "true";
      if (parsedData.isNew) parsedData.isNew = parsedData.isNew === "true";
      if (parsedData.price) parsedData.price = parseFloat(parsedData.price);
      if (parsedData.originPrice)
        parsedData.originPrice = parseFloat(parsedData.originPrice);
      if (parsedData.categoryId)
        parsedData.categoryId = parseInt(parsedData.categoryId, 10);

      if (parsedData.typeId) {
        parsedData.typeId = parseInt(parsedData.typeId, 10);
        const productType = await prisma.productType.findUnique({
          where: { id: parsedData.typeId },
        });
        if (!productType) {
          throw new ApiError(404, "Product type not found");
        }
        parsedData.type = productType.name;
      }

      // Step 3: Separate new files
      const imagesToUpload: Express.Multer.File[] = [];
      const thumbImageToUpload: Express.Multer.File[] = [];
      const variantImagesToUpload: { [key: string]: Express.Multer.File } = {};

      for (const file of rawFiles) {
        if (file.fieldname === "images") {
          imagesToUpload.push(file);
        } else if (file.fieldname === "thumbImage") {
          thumbImageToUpload.push(file);
        } else if (file.fieldname.startsWith("variantImage_")) {
          variantImagesToUpload[file.fieldname] = file;
        }
      }

      // Step 4: Upload new files if any
      const allNewFilesToUpload = [
        ...imagesToUpload,
        ...thumbImageToUpload,
        ...Object.values(variantImagesToUpload),
      ];

      if (allNewFilesToUpload.length > 0) {
        allUploadedFiles = await handleFileUploads(
          allNewFilesToUpload,
          "products"
        );
      }

      const urlMap = new Map<string, string>();
      allUploadedFiles.forEach((uploadedFile, index) => {
        urlMap.set(allNewFilesToUpload[index].fieldname, uploadedFile.url);
      });

      // Step 5: Construct the final payload for update
      const newImageUrls =
        imagesToUpload.length > 0
          ? (imagesToUpload
              .map((f) => urlMap.get(f.fieldname))
              .filter(Boolean) as string[])
          : existingProduct.images;
      if (imagesToUpload.length > 0) {
        oldImageUrlsToDelete.push(...existingProduct.images);
      }

      const newThumbImageUrl =
        thumbImageToUpload.length > 0
          ? urlMap.get("thumbImage")
          : existingProduct.thumbImage;
      if (thumbImageToUpload.length > 0 && existingProduct.thumbImage) {
        oldImageUrlsToDelete.push(existingProduct.thumbImage);
      }

      // Reconstruct variants with correct image URLs
      const newVariants: (ProductVariantInput & { id?: any })[] = Object.keys(
        variantsData
      ).map((key) => {
        const index = parseInt(key, 10);
        const variantData = variantsData[index];
        const newVariantImageUrl = urlMap.get(`variantImage_${index}`);
        const oldVariant = existingProduct.variants.find(
          (v) => v.id.toString() === variantData.id
        );

        // If a new image is uploaded for a variant, mark the old one for deletion
        if (oldVariant?.image && newVariantImageUrl) {
          oldImageUrlsToDelete.push(oldVariant.image);
        }

        return {
          id: variantData.id || undefined,
          colorName: variantData.colorName,
          color: variantData.color,
          colorCode: variantData.colorCode,
          size: variantData.size,
          quantity: parseInt(variantData.quantity, 10) || 0,
          image: newVariantImageUrl || oldVariant?.image || "",
        };
      });

      // Identify variants that were completely removed to delete their images
      const incomingVariantIds = new Set(newVariants.map((v) => v.id));
      existingProduct.variants.forEach((oldVariant: any) => {
        if (!incomingVariantIds.has(oldVariant.id) && oldVariant.image) {
          oldImageUrlsToDelete.push(oldVariant.image);
        }
      });

      // Step 6: Validate data
      for (const variant of newVariants) {
        const variantError = validateVariant(variant);
        if (variantError) {
          throw new ApiError(400, `Invalid variant data: ${variantError}`);
        }
      }

      const finalProductPayload = {
        ...parsedData,
        images: newImageUrls,
        thumbImage: newThumbImageUrl,
        variants: newVariants,
      };

      // Step 7: Execute update transaction
      const updatedProduct = await this.updateProductTransaction(
        id,
        finalProductPayload,
        existingProduct
      );

      // Step 8: Cleanup old images from Cloudinary after transaction is successful
      await cleanupCloudinaryImages(
        oldImageUrlsToDelete.map((url) => ({ url, public_id: "" }))
      );

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      // Cleanup any newly uploaded files if an error occurs
      await cleanupCloudinaryImages(allUploadedFiles);
      if (error instanceof Error) {
        await cleanupFiles(rawFiles);
      }
      next(error);
    }
  }

  // Helper for update transaction
  private async updateProductTransaction(
    id: string,
    productPayload: any,
    existingProduct: any
  ) {
    const {
      name,
      description,
      aboutProduct,
      price,
      originPrice,
      typeId,
      weight,
      gender,
      brand,
      categoryId,
      sizes,
      colors,
      images,
      thumbImage,
      inventory,
      isSale,
      isFlashSale,
      isNew,
      variants,
    } = productPayload;

    const type = await prisma.productType.findUnique({
      where: { id: typeId },
    });
    if (!type) {
      throw new ApiError(404, "Product type not found");
    }

    return await prisma.$transaction(async (tx) => {
      // Use a single, powerful update query with nested writes
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name,
          description,
          aboutProduct,
          price: price ? new Prisma.Decimal(price) : undefined,
          originPrice: originPrice
            ? new Prisma.Decimal(originPrice)
            : undefined,
          typeId,
          weight,
          gender,
          brand,
          categoryId,
          sizes,
          colors,
          type: type.name as any,
          isSale,
          isFlashSale,
          isNew,
          slug: name
            ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            : undefined,
          images,
          thumbImage,
          inventory: {
            update: {
              quantity: parseInt(inventory?.quantity, 10) || 0,
              lowStockThreshold: inventory?.lowStockThreshold,
            },
          },
          variants: {
            // Delete variants that are no longer in the payload
            deleteMany: {
              productId: id,
              id: {
                notIn: variants
                  .map((v: any) => (v.id ? parseInt(v.id, 10) : undefined))
                  .filter(Boolean),
              },
            },
            // Update existing variants or create new ones
            upsert: variants.map(
              (variant: ProductVariantInput & { id?: any; image: string }) => ({
                where: { id: Number(variant.id) || -1 }, // Use a non-existent ID for creation
                update: {
                  color: variant.color,
                  colorCode: variant.colorCode,
                  colorName: variant.colorName || "",
                  size: variant.size,
                  quantity: Number(variant.quantity) || 0,
                  image: variant.image,
                },
                create: {
                  color: variant.color,
                  colorCode: variant.colorCode,
                  colorName: variant.colorName || "",
                  size: variant.size,
                  quantity: Number(variant.quantity) || 0,
                  image: variant.image,
                },
              })
            ),
          },
        },
        include: {
          category: true,
          inventory: true,
          variants: true,
        },
      });

      return updatedProduct;
    });
  }

  // Public controller methods
  public createProduct: RequestHandler = (req, res, next) =>
    this.createProductHandler(req as FileRequest, res, next);

  public updateProduct: RequestHandler = (req, res, next) =>
    this.updateProductHandler(req as FileRequest, res, next);

  public getProduct: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, "Product ID is required");
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          type: true,
          variants: true,
          inventory: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
              reply: true,
            },
          },
          flashSale: true,
        },
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((acc, review) => acc + review.rate, 0) /
            product.reviews.length
          : 0;

      res.json({
        success: true,
        data: {
          ...product,
          avgRating,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllProducts: RequestHandler = async (req, res, next) => {
    try {
      const {
        category,
        gender,
        brand,
        isNew,
        isSale,
        minPrice,
        maxPrice,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
      } = req.query as unknown as ProductFilters;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));

      const where: Prisma.ProductWhereInput = {};

      if (category) where.categoryId = category;
      if (gender) where.gender = gender;
      if (brand) where.brand = brand;
      if (isNew !== undefined) where.isNew = isNew;
      if (isSale !== undefined) where.isSale = isSale;
      if (minPrice || maxPrice) {
        where.price = {
          gte: minPrice ? new Prisma.Decimal(minPrice) : undefined,
          lte: maxPrice ? new Prisma.Decimal(maxPrice) : undefined,
        };
      }

      const allowedSortFields = ["createdAt", "price", "name", "sold"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

      const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            type: true,
            inventory: true,
            flashSale: true,
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { [validSortBy]: "desc" },
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteProduct: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          variants: true,
          reviews: true,
          flashSale: true,
        },
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      await prisma.$transaction(async (prisma) => {
        if (product.flashSale) {
          await prisma.flashSale.delete({ where: { productId: id } });
        }
        await prisma.review.deleteMany({ where: { productId: id } });
        await prisma.productVariant.deleteMany({ where: { productId: id } });
        await prisma.inventory.delete({ where: { productId: id } });
        await prisma.product.delete({ where: { id } });

        await Promise.all([
          ...product.images.map((img: string) => deleteFromCloudinary(img)),
          deleteFromCloudinary(product.thumbImage),
          ...product.variants.map((variant) =>
            deleteFromCloudinary(variant.image)
          ),
        ]);
      });

      res.json({
        success: true,
        message: "Product and all related data deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  public manageProductVariants: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { variants } = req.body;

      const product = await prisma.product.findUnique({
        where: { id },
        include: { variants: true },
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      if (!Array.isArray(variants)) {
        throw new ApiError(400, "Variants must be an array");
      }

      for (const variant of variants as ProductVariantInput[]) {
        const variantError = validateVariant(variant);
        if (variantError) {
          throw new ApiError(400, variantError);
        }
      }

      const result = await prisma.$transaction(async (prisma) => {
        await Promise.all(
          product.variants.map((variant) => deleteFromCloudinary(variant.image))
        );

        await prisma.productVariant.deleteMany({
          where: { productId: id },
        });

        return await prisma.productVariant.createMany({
          data: variants.map((variant: ProductVariantInput) => ({
            ...variant,
            productId: id,
          })),
        });
      });

      res.json({
        success: true,
        message: "Product variants updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public manageInventory: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== "number" || quantity < 0) {
        throw new ApiError(400, "Invalid quantity value");
      }

      const inventory = await prisma.inventory.upsert({
        where: { productId: id },
        update: { quantity },
        create: {
          productId: id,
          quantity,
        },
      });

      res.json({
        success: true,
        message: "Inventory updated successfully",
        data: inventory,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        next(new ApiError(404, "Product not found"));
      } else {
        next(error);
      }
    }
  };

  public manageFlashSale: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const flashSaleData = req.body;

      const validationError = validateFlashSale(flashSaleData);
      if (validationError) {
        throw new ApiError(400, validationError);
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: { flashSale: true },
      });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const { discount, startDate, endDate, price } = flashSaleData;
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new ApiError(400, "End date must be after start date");
      }

      if (start < new Date()) {
        throw new ApiError(400, "Start date cannot be in the past");
      }

      const flashSale = await prisma.flashSale.upsert({
        where: { productId: id },
        update: {
          discount: new Prisma.Decimal(discount),
          startDate: start,
          endDate: end,
          price: new Prisma.Decimal(price),
        },
        create: {
          productId: id,
          discount: new Prisma.Decimal(discount),
          startDate: start,
          endDate: end,
          price: new Prisma.Decimal(price),
        },
      });

      await prisma.product.update({
        where: { id },
        data: {
          isFlashSale: true,
          isSale: true,
        },
      });

      res.json({
        success: true,
        message: "Flash sale updated successfully",
        data: flashSale,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProductStatus: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const statusUpdate = req.body;

      if (!Object.keys(statusUpdate).length) {
        throw new ApiError(400, "No status updates provided");
      }

      const validStatuses = ["isNew", "isSale", "isFlashSale"];
      const invalidStatus = Object.keys(statusUpdate).find(
        (key) => !validStatuses.includes(key)
      );

      if (invalidStatus) {
        throw new ApiError(400, `Invalid status field: ${invalidStatus}`);
      }

      const product = await prisma.product.update({
        where: { id },
        data: statusUpdate,
      });

      res.json({
        success: true,
        message: "Product status updated successfully",
        data: product,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        next(new ApiError(404, "Product not found"));
      } else {
        next(error);
      }
    }
  };

  public updateProductSales: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { sold, quantityPurchase } = req.body;

      if (
        (sold !== undefined && (typeof sold !== "number" || sold < 0)) ||
        (quantityPurchase !== undefined &&
          (typeof quantityPurchase !== "number" || quantityPurchase < 0))
      ) {
        throw new ApiError(400, "Invalid sales update values");
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          sold: sold ? { increment: sold } : undefined,
          quantityPurchase: quantityPurchase
            ? { increment: quantityPurchase }
            : undefined,
        },
      });

      res.json({
        success: true,
        message: "Product sales updated successfully",
        data: product,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        next(new ApiError(404, "Product not found"));
      } else {
        next(error);
      }
    }
  };

  public getProductReviews: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));

      const [reviews, total] = await prisma.$transaction([
        prisma.review.findMany({
          where: { productId: id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            reply: true,
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.review.count({
          where: { productId: id },
        }),
      ]);

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((acc, review) => acc + review.rate, 0) /
            reviews.length
          : 0;

      res.json({
        success: true,
        likes: reviews.reduce((acc, review) => acc + review.likes, 0),
        data: reviews,
        avgRating,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public addProductReview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rate, message, color, size, likes } = req.body;
      const userId = (req as AuthenticatedRequest).user?.userId;

      if (!userId) {
        throw new ApiError(401, "Authentication required");
      }
      if (!parseInt(rate) || parseInt(rate) < 1 || parseInt(rate) > 5) {
        throw new ApiError(400, "Rate must be between 1 and 5");
      }

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const review = await prisma.review.create({
        data: {
          rate: parseInt(rate, 10),
          message,
          color,
          size,
          product: {
            connect: { id },
          },
          user: {
            connect: { id: userId },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Review added successfully",
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  public addReplyToReview: RequestHandler = async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const { message } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!user?.userId) {
        throw new ApiError(401, "Authentication required");
      }

      // It's good practice to ensure only admins can reply.
      const authUser = await prisma.user.findUnique({
        where: { id: user.userId },
      });
      if (authUser?.role !== "ADMIN") {
        throw new ApiError(403, "Forbidden: Only admins can reply to reviews.");
      }

      if (!message || typeof message !== "string" || message.trim() === "") {
        throw new ApiError(
          400,
          "Reply message is required and must be a non-empty string."
        );
      }

      const reviewIdInt = parseInt(reviewId, 10);
      if (isNaN(reviewIdInt)) {
        throw new ApiError(400, "Invalid Review ID format.");
      }

      // Using upsert to either create a new reply or update an existing one
      const reply = await prisma.reply.upsert({
        where: { reviewId: reviewIdInt },
        update: {
          message,
          userId: user.userId,
        },
        create: {
          message,
          reviewId: reviewIdInt,
          userId: user.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Reply added or updated successfully",
        data: reply,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return next(new ApiError(404, "Review not found."));
      }
      next(error);
    }
  };

  // gel variant by product id
  public getProductVariants: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const variants = await prisma.productVariant.findMany({
        where: { productId: id },
      });
      res.json({
        success: true,
        data: variants,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
      next(error);
    }
  };

  public searchProducts: RequestHandler = async (req, res, next) => {
    try {
      const { q } = req.query;
      const { page = 1, limit = 10 } = req.query;

      if (!q || typeof q !== "string") {
        throw new ApiError(400, "Search query is required");
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));

      const searchQuery = q.trim();
      const searchCondition: Prisma.ProductWhereInput = {
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            brand: {
              contains: searchQuery,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      };

      const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where: searchCondition,
          include: {
            category: true,
            inventory: true,
            flashSale: true,
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { name: "desc" },
        }),
        prisma.product.count({
          where: searchCondition,
        }),
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const productController = new ProductController();

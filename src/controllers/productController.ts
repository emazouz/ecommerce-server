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
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import fs from "fs";
import { ProductFilters, ProductVariantInput } from "../types/productTypes";
import { Router } from "express";
import { authenticateJwt as authMiddleware } from "../middleware/authMiddleware";
import { uploadMiddleware } from "../middleware/uploadMiddleware";

// Update the FileRequest interface to handle an array of files from upload.any()
interface FileRequest extends AuthenticatedRequest {
  files?: Express.Multer.File[];
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

class ProductController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes
    this.router.get("/", this.getAllProducts);
    this.router.get("/search", this.searchProducts);
    this.router.get("/:id", this.getProduct);
    this.router.get("/:id/reviews", this.getProductReviews);

    // Protected routes - require authentication
    this.router.use(authMiddleware);

    // Product CRUD operations
    this.router.post("/", uploadMiddleware, this.createProduct);
    this.router.put("/:id", uploadMiddleware, this.updateProduct);
    this.router.delete("/:id", this.deleteProduct);

    // Product variants and inventory
    this.router.post("/:id/variants", this.manageProductVariants);
    this.router.post("/:id/inventory", this.manageInventory);

    // Product sales and promotions
    this.router.post("/:id/flash-sale", this.manageFlashSale);
    this.router.put("/:id/status", this.updateProductStatus);
    this.router.post("/:id/sales", this.updateProductSales);
    this.router.post("/:id/reviews", this.addProductReview);
  }

  // Create Product - Rewritten to handle complex form data
  private async createProductHandler(
    req: FileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const rawFiles = req.files || [];
    let allUploadedFiles: CloudinaryResponse[] = [];

    try {
      // Step 1: Parse and reconstruct data from the multipart form
      const body = req.body;
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
              ].includes(key) &&
              typeof body[key] === "string"
            ) {
              parsedData[key] = JSON.parse(body[key]);
            } else {
              parsedData[key] = body[key];
            }
          } catch (e) {
            parsedData[key] = body[key];
          }
        }
      }

      // Convert boolean strings to booleans
      if (parsedData.isSale) parsedData.isSale = parsedData.isSale === "true";
      if (parsedData.isFlashSale)
        parsedData.isFlashSale = parsedData.isFlashSale === "true";
      if (parsedData.isNew) parsedData.isNew = parsedData.isNew === "true";

      // Convert price fields to numbers
      if (parsedData.price) parsedData.price = parseFloat(parsedData.price);
      if (parsedData.originPrice)
        parsedData.originPrice = parseFloat(parsedData.originPrice);

      // Convert ID field to number
      if (parsedData.categoryId)
        parsedData.categoryId = parseInt(parsedData.categoryId, 10);

      // Step 2: Separate files
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

      // Step 3: Upload all files
      const allFiles = [
        ...imagesToUpload,
        ...thumbImageToUpload,
        ...Object.values(variantImagesToUpload),
      ];
      allUploadedFiles = await handleFileUploads(allFiles, "products");

      // Create a map of original fieldname to Cloudinary URL
      const urlMap = new Map<string, string>();
      allUploadedFiles.forEach((uploadedFile, index) => {
        urlMap.set(allFiles[index].fieldname, uploadedFile.url);
      });

      // Step 4: Map URLs back to our data structure
      const imageUrls = imagesToUpload
        .map((f) => urlMap.get(f.fieldname))
        .filter(Boolean) as string[];
      const thumbImageUrl = urlMap.get("thumbImage");

      // Reconstruct variants with their image URLs
      const variants: ProductVariantInput[] = Object.keys(variantsData).map(
        (key) => {
          const index = parseInt(key, 10);
          const variant = variantsData[index];
          const variantImageUrl = urlMap.get(`variantImage_${index}`);
          return {
            ...variant,
            quantity: parseInt(variant.quantity, 10) || 0,
            image: variantImageUrl || "",
          };
        }
      );

      // Step 5: Assemble final data and create product
      const productPayload = {
        ...parsedData,
        images: imageUrls,
        thumbImage: thumbImageUrl,
        variants: variants,
      };

      const {
        variants: _,
        images: __,
        thumbImage: ___,
        ...validationData
      } = productPayload;
      const validationError = validateProduct(validationData);
      if (validationError) {
        throw new ApiError(400, validationError);
      }

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
      variants, // Reconstructed variants with image URLs
    } = productPayload;

    return await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          description,
          aboutProduct,
          price: new Prisma.Decimal(price),
          originPrice: new Prisma.Decimal(originPrice),
          typeId,
          gender,
          brand,
          categoryId,
          sizes,
          colors,
          isSale,
          isFlashSale,
          isNew,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          images: images,
          thumbImage: thumbImage,
          inventory: {
            create: {
              quantity: inventory?.quantity || 0,
              lowStockThreshold: inventory?.lowStockThreshold || 5,
            },
          },
        },
        include: {
          category: true,
          inventory: true,
        },
      });

      if (variants?.length) {
        await this.createProductVariants(tx, newProduct.id, variants);
      }

      return newProduct;
    });
  }

  private async createProductVariants(
    prisma: Prisma.TransactionClient,
    productId: string,
    variants: (ProductVariantInput & { image?: string })[]
  ) {
    for (const variant of variants) {
      const variantError = validateVariant(variant);
      if (variantError) {
        throw new ApiError(400, `Invalid variant data: ${variantError}`);
      }
    }

    const variantsToCreate = variants.map((variant) => ({
      productId,
      color: variant.color,
      colorCode: variant.colorCode,
      colorName: variant.colorName,
      size: variant.size,
      quantity: Number(variant.quantity) || 0,
      image: variant.image || "", // Ensure image field is included
    }));

    await prisma.productVariant.createMany({
      data: variantsToCreate,
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
              parsedData[key] = JSON.parse(body[key]);
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

      const newThumbImageUrl =
        thumbImageToUpload.length > 0
          ? urlMap.get("thumbImage")
          : existingProduct.thumbImage;

      const newVariants: ProductVariantInput[] = Object.keys(variantsData).map(
        (key) => {
          const index = parseInt(key, 10);
          const variantData = variantsData[index];
          const newVariantImageUrl = urlMap.get(`variantImage_${index}`);
          const oldVariant = existingProduct.variants.find(
            (v) => v.id === variantData.id
          );

          return {
            ...variantData,
            quantity: parseInt(variantData.quantity, 10) || 0,
            image: newVariantImageUrl || oldVariant?.image || "",
          };
        }
      );

      const productPayload = {
        ...parsedData,
        images: newImageUrls,
        thumbImage: newThumbImageUrl,
        variants: newVariants,
      };

      // Step 6: Execute update transaction
      const updatedProduct = await this.updateProductTransaction(
        id,
        productPayload,
        existingProduct
      );

      // Step 7: Cleanup old images from Cloudinary after transaction is successful
      const oldImageUrlsToDelete: string[] = [];
      if (imagesToUpload.length > 0) {
        oldImageUrlsToDelete.push(...existingProduct.images);
      }
      if (thumbImageToUpload.length > 0) {
        oldImageUrlsToDelete.push(existingProduct.thumbImage);
      }
      // Delete all old variant images as we replace them entirely
      oldImageUrlsToDelete.push(
        ...existingProduct.variants.map((v) => v.image).filter(Boolean)
      );

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

    return await prisma.$transaction(async (tx) => {
      // 1. Delete old variants
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      // 2. Update the product
      const product = await tx.product.update({
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
          gender,
          brand,
          categoryId,
          sizes,
          colors,
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
        },
        include: {
          category: true,
          inventory: true,
        },
      });

      // 3. Create new variants
      if (variants?.length) {
        await this.createProductVariants(tx, id, variants);
      }

      // Return the updated product with its new variants
      return await tx.product.findUnique({
        where: { id },
        include: { variants: true, inventory: true, category: true },
      });
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
          variants: true,
          inventory: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: true,
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
                profile: true,
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
      if (!rate || rate < 1 || rate > 5) {
        throw new ApiError(400, "Rate must be between 1 and 5");
      }

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const review = await prisma.review.create({
        data: {
          productId: id,
          userId,
          rate,
          message,
          color,
          size,
          likes,
        },
        include: {
          user: {
            select: { id: true, username: true, profile: true },
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
              profile: {
                select: {
                  avatar: true,
                },
              },
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

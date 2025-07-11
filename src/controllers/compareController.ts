import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";

const MAX_COMPARE_PRODUCTS = 3;

// Add product to compare list
export const addToCompare = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is already in compare list
    const existingCompareItem = await prisma.compare.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingCompareItem) {
      return res.status(400).json({
        success: false,
        message: "Product already in compare list",
      });
    }

    // Check if user has reached the maximum compare limit
    const currentCompareCount = await prisma.compare.count({
      where: { userId },
    });



    if (currentCompareCount >= MAX_COMPARE_PRODUCTS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_COMPARE_PRODUCTS} products allowed in compare list`,
        maxLimit: MAX_COMPARE_PRODUCTS,
      });
    }

    // Add to compare list
    const compareItem = await prisma.compare.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            category: true,
            flashSale: true,
            inventory: true,
            variants: true,
            reviews: {
              select: {
                rate: true,
              },
            },
          },
        },
      },
    });


    
    await prisma.product.update({
      where: { id: productId },
      data: { isCompare: true },
    });


    // Calculate average rating
    const avgRating =
      compareItem.product.reviews.length > 0
        ? compareItem.product.reviews.reduce(
            (sum, review) => sum + review.rate,
            0
          ) / compareItem.product.reviews.length
        : 0;

    res.status(201).json({
      success: true,
      message: "Product added to compare list successfully",
      data: {
        ...compareItem,
        product: {
          ...compareItem.product,
          avgRating,
        },
      },
      remainingSlots: MAX_COMPARE_PRODUCTS - (currentCompareCount + 1),
    });
  } catch (error: any) {
    console.error("Add to compare error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product to compare list",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


























// Remove product from compare list
export const removeFromCompare = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Remove from compare list
    const deletedItem = await prisma.compare.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    if (deletedItem.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found in compare list",
      });
    }

    // Get remaining count
    const remainingCount = await prisma.compare.count({
      where: { userId },
    });


    await prisma.product.update({
      where: { id: productId },
      data: { isCompare: false },
    });



    res.status(200).json({
      success: true,
      message: "Product removed from compare list successfully",
      remainingSlots: MAX_COMPARE_PRODUCTS - remainingCount,
    });
  } catch (error: any) {
    console.error("Remove from compare error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove product from compare list",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get user's compare list
export const getUserCompareList = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const compareItems = await prisma.compare.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            flashSale: true,
            inventory: true,
            variants: true,
            reviews: {
              select: {
                rate: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    // Calculate average rating for each product
    const compareWithRatings = compareItems.map((item) => {
      const avgRating =
        item.product.reviews.length > 0
          ? item.product.reviews.reduce((sum, review) => sum + review.rate, 0) /
            item.product.reviews.length
          : 0;

      return {
        ...item,
        product: {
          ...item.product,
          avgRating,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: compareWithRatings,
      total: compareItems.length,
      maxLimit: MAX_COMPARE_PRODUCTS,
      remainingSlots: MAX_COMPARE_PRODUCTS - compareItems.length,
    });
  } catch (error: any) {
    console.error("Get compare list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get compare list",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Clear entire compare list
export const clearCompareList = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const deletedCount = await prisma.compare.deleteMany({
      where: { userId },
    });

    await prisma.product.updateMany({
      where: { isCompare: true },
      data: { isCompare: false },
    });


    res.status(200).json({
      success: true,
      message: "Compare list cleared successfully",
      deletedCount: deletedCount.count,
      remainingSlots: MAX_COMPARE_PRODUCTS,
    });
  } catch (error: any) {
    console.error("Clear compare list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear compare list",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// Get comparison data for products (detailed comparison)
export const getComparisonData = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const compareItems = await prisma.compare.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            flashSale: true,
            inventory: true,
            variants: {
              select: {
                id: true,
                colorName: true,
                color: true,
                colorCode: true,
                size: true,
                quantity: true,
                image: true,
              },
            },
            reviews: {
              select: {
                rate: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    if (compareItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No products in compare list",
        data: [],
        comparisonMatrix: {},
      });
    }

    // Create detailed comparison matrix
    const comparisonMatrix = {
      products: compareItems.map((item) => {
        const avgRating =
          item.product.reviews.length > 0
            ? item.product.reviews.reduce(
                (sum, review) => sum + review.rate,
                0
              ) / item.product.reviews.length
            : 0;

        return {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          originPrice: item.product.originPrice,
          brand: item.product.brand,
          category: item.product.category.name,
          avgRating,
          totalReviews: item.product.reviews.length,
          isSale: item.product.isSale,
          isFlashSale: item.product.isFlashSale,
          isNew: item.product.isNew,
          thumbImage: item.product.thumbImage,
          images: item.product.images,
          sizes: item.product.sizes,
          colors: item.product.colors,
          variants: item.product.variants,
          inventory: item.product.inventory,
          flashSale: item.product.flashSale,
          weight: item.product.weight,
          aboutProduct: item.product.aboutProduct,
        };
      }),
      comparisonFields: [
        "name",
        "price",
        "originPrice",
        "brand",
        "category",
        "avgRating",
        "totalReviews",
        "isSale",
        "isFlashSale",
        "isNew",
        "sizes",
        "colors",
        "weight",
      ],
    };

    res.status(200).json({
      success: true,
      data: compareItems,
      comparisonMatrix,
      total: compareItems.length,
      maxLimit: MAX_COMPARE_PRODUCTS,
    });
  } catch (error: any) {
    console.error("Get comparison data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get comparison data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

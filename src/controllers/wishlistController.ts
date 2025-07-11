import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";

// Add product to wishlist
export const addToWishlist = async (
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

    // Check if product is already in wishlist
    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingWishlistItem) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            category: true,
            flashSale: true,
            wishlists: true,
            compares: true,
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
      data: { isWishlist: true },
    });

    // Calculate average rating
    const avgRating =
      wishlistItem.product.reviews.length > 0
        ? wishlistItem.product.reviews.reduce(
            (sum, review) => sum + review.rate,
            0
          ) / wishlistItem.product.reviews.length
        : 0;

    res.status(201).json({
      success: true,
      message: "Product added to wishlist successfully",
      data: {
        ...wishlistItem,
        product: {
          ...wishlistItem.product,
          avgRating,
        },
      },
    });
  } catch (error: any) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (
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

    // Check if item exists in wishlist
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove from wishlist
    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { isWishlist: false },
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully",
    });
  } catch (error: any) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get user's wishlist
export const getUserWishlist = async (
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

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            flashSale: true,
            inventory: true,
            reviews: {
              select: {
                rate: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "desc", // Most recently added first
      },
    });

    // Calculate average rating for each product
    const wishlistWithRatings = wishlistItems.map((item) => {
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
      data: wishlistWithRatings,
      total: wishlistItems.length,
    });
  } catch (error: any) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get wishlist",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Clear entire wishlist
export const clearWishlist = async (
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

    const deletedCount = await prisma.wishlist.deleteMany({
      where: { userId },
    });

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      deletedCount: deletedCount.count,
    });
  } catch (error: any) {
    console.error("Clear wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Check if product is in user's wishlist
export const isInWishlist = async (
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

    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    res.status(200).json({
      success: true,
      isInWishlist: !!wishlistItem,
    });
  } catch (error: any) {
    console.error("Check wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check wishlist status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

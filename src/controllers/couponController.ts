import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

// --- Validation Helper ---
const validateCouponData = (data: any): string[] => {
  const errors: string[] = [];

  if (!data.code || data.code.trim().length < 3) {
    errors.push("Coupon code must be at least 3 characters long.");
  }

  if (
    !data.discountType ||
    !["PERCENTAGE", "FIXED"].includes(data.discountType)
  ) {
    errors.push("Invalid discount type. Must be PERCENTAGE or FIXED.");
  }

  if (
    data.discountValue === undefined ||
    isNaN(parseFloat(data.discountValue)) ||
    parseFloat(data.discountValue) <= 0
  ) {
    errors.push("Discount value must be a positive number.");
  }

  if (
    data.discountType === "PERCENTAGE" &&
    parseFloat(data.discountValue) > 100
  ) {
    errors.push("Percentage discount cannot exceed 100%.");
  }

  if (
    data.maxDiscount !== undefined &&
    (isNaN(parseFloat(data.maxDiscount)) || parseFloat(data.maxDiscount) < 0)
  ) {
    errors.push("Maximum discount must be a non-negative number.");
  }

  if (!data.startDate || isNaN(new Date(data.startDate).getTime())) {
    errors.push("Invalid start date.");
  }

  if (!data.endDate || isNaN(new Date(data.endDate).getTime())) {
    errors.push("Invalid end date.");
  }

  if (new Date(data.endDate) <= new Date(data.startDate)) {
    errors.push("End date must be after start date.");
  }

  if (
    data.maxUsage !== undefined &&
    (isNaN(parseInt(data.maxUsage)) || parseInt(data.maxUsage) < 0)
  ) {
    errors.push("Max usage must be a non-negative integer.");
  }

  if (
    data.maxUsagePerUser !== undefined &&
    (isNaN(parseInt(data.maxUsagePerUser)) ||
      parseInt(data.maxUsagePerUser) < 0)
  ) {
    errors.push("Max usage per user must be a non-negative integer.");
  }

  if (
    data.minOrderValue !== undefined &&
    (isNaN(parseFloat(data.minOrderValue)) ||
      parseFloat(data.minOrderValue) < 0)
  ) {
    errors.push("Minimum order value must be a non-negative number.");
  }

  return errors;
};

// --- CRUD Operations ---

/**
 * @desc    Create a new coupon
 * @route   POST /api/coupons
 * @access  Private (Admin only)
 */
export const createCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }
    console.log("1");
    const validationErrors = validateCouponData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }
    console.log("2");

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      startDate,
      endDate,
      isActive,
      isPublic,
      maxUsage,
      maxUsagePerUser,
      minOrderValue,
      productTypeId,
      categoryIds,
      excludedProductIds,
      userIds,
    } = req.body;

    // Create coupon with relationships
    const newCoupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== undefined ? isActive : true,
        isPublic: isPublic !== undefined ? isPublic : true,
        maxUsage: maxUsage !== undefined ? parseInt(maxUsage) : null,
        maxUsagePerUser:
          maxUsagePerUser !== undefined ? parseInt(maxUsagePerUser) : 1,
        usedCount: 0,
        minOrderValue:
          minOrderValue !== undefined ? parseFloat(minOrderValue) : 0,
        productTypeId: productTypeId || null,
        // Connect categories
        categories:
          categoryIds && categoryIds.length > 0
            ? {
                connect: categoryIds.map((id: number) => ({ id })),
              }
            : undefined,
        // Connect excluded products
        excludedProducts:
          excludedProductIds && excludedProductIds.length > 0
            ? {
                connect: excludedProductIds.map((id: string) => ({ id })),
              }
            : undefined,
        // Connect specific users (for private coupons)
        users:
          userIds && userIds.length > 0
            ? {
                connect: userIds.map((id: string) => ({ id })),
              }
            : undefined,
      },
      include: {
        applicableTo: true,
        categories: true,
        excludedProducts: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    console.log("3");
    res.status(201).json({
      success: true,
      message: "Coupon created successfully!",
      data: newCoupon,
    });
  } catch (error: any) {
    console.log("4");
    if (error.code === "P2002" && error.meta?.target?.includes("code")) {
      return res.status(409).json({
        success: false,
        message: "A coupon with this code already exists.",
      });
    }
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
    });
  }
};

/**
 * @desc    Get all coupons
 * @route   GET /api/coupons
 * @access  Private (Admin only)
 */
export const fetchAllCoupons = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { page = 1, limit = 10, active, expired } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter conditions
    const whereConditions: any = {};
    if (active !== undefined) {
      whereConditions.isActive = active === "true";
    }
    if (expired !== undefined) {
      const now = new Date();
      if (expired === "true") {
        whereConditions.endDate = { lt: now };
      } else {
        whereConditions.endDate = { gte: now };
      }
    }

    const coupons = await prisma.coupon.findMany({
      where: whereConditions,
      include: {
        applicableTo: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        excludedProducts: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalCoupons = await prisma.coupon.count({
      where: whereConditions,
    });

    res.status(200).json({
      success: true,
      data: coupons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCoupons,
        pages: Math.ceil(totalCoupons / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
    });
  }
};

/**
 * @desc    Get public coupons for users
 * @route   GET /api/coupons/public
 * @access  Public
 */
export const getPublicCoupons = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        isPublic: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { maxUsage: null },
          { maxUsage: { gt: prisma.coupon.fields.usedCount } },
        ],
      },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
        endDate: true,
        usedCount: true,
        maxUsage: true,
        applicableTo: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (error: any) {
    console.error("Error fetching public coupons:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch public coupons",
    });
  }
};

/**
 * @desc    Get coupon by ID
 * @route   GET /api/coupons/:id
 * @access  Private (Admin only)
 */
export const getCouponById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        applicableTo: true,
        categories: true,
        excludedProducts: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbImage: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error: any) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupon",
    });
  }
};

/**
 * @desc    Update a coupon
 * @route   PUT /api/coupons/:id
 * @access  Private (Admin only)
 */
export const updateCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { id } = req.params;

    // Create a temporary object for validation, as some fields may not be present
    const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const dataToValidate = { ...existingCoupon, ...req.body };
    const validationErrors = validateCouponData(dataToValidate);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      startDate,
      endDate,
      isActive,
      isPublic,
      maxUsage,
      maxUsagePerUser,
      minOrderValue,
      productTypeId,
      categoryIds,
      excludedProductIds,
      userIds,
    } = req.body;

    // Prepare update data
    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined)
      updateData.discountValue = parseFloat(discountValue);
    if (maxDiscount !== undefined)
      updateData.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (maxUsage !== undefined)
      updateData.maxUsage = maxUsage ? parseInt(maxUsage) : null;
    if (maxUsagePerUser !== undefined)
      updateData.maxUsagePerUser = parseInt(maxUsagePerUser);
    if (minOrderValue !== undefined)
      updateData.minOrderValue = parseFloat(minOrderValue);
    if (productTypeId !== undefined) updateData.productTypeId = productTypeId;

    // Handle relationship updates
    if (categoryIds !== undefined) {
      updateData.categories = {
        set: categoryIds.map((id: number) => ({ id })),
      };
    }

    if (excludedProductIds !== undefined) {
      updateData.excludedProducts = {
        set: excludedProductIds.map((id: string) => ({ id })),
      };
    }

    if (userIds !== undefined) {
      updateData.users = {
        set: userIds.map((id: string) => ({ id })),
      };
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
      include: {
        applicableTo: true,
        categories: true,
        excludedProducts: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully!",
      data: updatedCoupon,
    });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("code")) {
      return res.status(409).json({
        success: false,
        message: "A coupon with this code already exists.",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    console.error("Error updating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
};

/**
 * @desc    Delete a coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private (Admin only)
 */
export const deleteCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { id } = req.params;

    // Check if coupon is currently being used in any orders
    const activeOrders = await prisma.order.findMany({
      where: {
        couponId: id,
        orderStatus: { in: ["PENDING", "CONFIRMED", "SHIPPED"] },
      },
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete coupon. It is currently being used in active orders.",
      });
    }

    await prisma.coupon.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully!",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
    });
  }
};

// --- Business Logic ---

/**
 * @desc    Validate and apply coupon
 * @route   POST /api/coupons/validate
 * @access  Private
 */
export const validateCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { code, totalAmount, cartItems } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    if (!code || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and total amount are required.",
      });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        applicableTo: true,
        categories: true,
        excludedProducts: true,
        users: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not active.",
      });
    }

    // Check date validity
    const now = new Date();
    if (now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not yet valid.",
      });
    }
    if (now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired.",
      });
    }

    // Check usage limits
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit.",
      });
    }

    // Check if coupon is public or user-specific
    if (!coupon.isPublic) {
      const isUserAuthorized = coupon.users.some((user) => user.id === userId);
      if (!isUserAuthorized) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to use this coupon.",
        });
      }
    }

    // Check per-user usage limit
    if (coupon.maxUsagePerUser > 0) {
      const userUsage = await prisma.order.count({
        where: {
          userId,
          couponId: coupon.id,
          orderStatus: { not: "CANCELLED" },
        },
      });

      if (userUsage >= coupon.maxUsagePerUser) {
        return res.status(400).json({
          success: false,
          message: "You have reached the usage limit for this coupon.",
        });
      }
    }

    // Check minimum order value
    if (new Prisma.Decimal(totalAmount).lessThan(coupon.minOrderValue)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of $${coupon.minOrderValue} is required.`,
      });
    }

    // Check product/category restrictions
    if (cartItems && cartItems.length > 0) {
      const productIds = cartItems.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true, type: true },
      });

      // Check if any products are excluded
      const hasExcludedProducts = products.some((product) =>
        coupon.excludedProducts.some((excluded) => excluded.id === product.id)
      );

      if (hasExcludedProducts) {
        return res.status(400).json({
          success: false,
          message:
            "Some products in your cart are not eligible for this coupon.",
        });
      }

      // Check category restrictions
      if (coupon.categories.length > 0) {
        const hasValidCategory = products.some((product) =>
          coupon.categories.some(
            (category) => category.id === product.categoryId
          )
        );

        if (!hasValidCategory) {
          return res.status(400).json({
            success: false,
            message:
              "This coupon is not applicable to the products in your cart.",
          });
        }
      }

      // Check product type restrictions
      if (coupon.productTypeId) {
        const hasValidType = products.some(
          (product) => product.typeId === coupon.productTypeId
        );

        if (!hasValidType) {
          return res.status(400).json({
            success: false,
            message:
              "This coupon is not applicable to the product types in your cart.",
          });
        }
      }
    }

    // Calculate discount
    let discountAmount = new Prisma.Decimal(0);
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = new Prisma.Decimal(totalAmount)
        .mul(coupon.discountValue)
        .div(100);

      // Apply max discount limit if set
      if (
        coupon.maxDiscount &&
        discountAmount.greaterThan(coupon.maxDiscount)
      ) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "FIXED") {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed total amount
    if (discountAmount.greaterThan(totalAmount)) {
      discountAmount = new Prisma.Decimal(totalAmount);
    }

    const finalAmount = new Prisma.Decimal(totalAmount).minus(discountAmount);

    res.status(200).json({
      success: true,
      message: "Coupon is valid!",
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
        },
        discountAmount: discountAmount.toNumber(),
        finalAmount: finalAmount.toNumber(),
        savings: discountAmount.toNumber(),
      },
    });
  } catch (error: any) {
    console.error("Error validating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate coupon",
    });
  }
};

/**
 * @desc    Apply coupon (legacy endpoint for backward compatibility)
 * @route   POST /api/coupons/apply
 * @access  Private
 */
export const applyCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and total amount are required.",
      });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not active.",
      });
    }

    const now = new Date();
    if (now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not yet valid.",
      });
    }
    if (now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired.",
      });
    }

    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit.",
      });
    }

    if (new Prisma.Decimal(totalAmount).lessThan(coupon.minOrderValue)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of $${coupon.minOrderValue} is required.`,
      });
    }

    // Calculate discount
    let discountAmount = new Prisma.Decimal(0);
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = new Prisma.Decimal(totalAmount)
        .mul(coupon.discountValue)
        .div(100);

      if (
        coupon.maxDiscount &&
        discountAmount.greaterThan(coupon.maxDiscount)
      ) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "FIXED") {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = new Prisma.Decimal(totalAmount).minus(discountAmount);

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      discountAmount: discountAmount.toNumber(),
      finalAmount: finalAmount.isNegative() ? 0 : finalAmount.toNumber(),
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error: any) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
    });
  }
};

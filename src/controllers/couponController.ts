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
    data.minOrderValue !== undefined &&
    (isNaN(parseFloat(data.minOrderValue)) ||
      parseFloat(data.minOrderValue) < 0)
  ) {
    errors.push("Minimum order value must be a non-negative number.");
  }
  return errors;
};

// --- CRUD Operations ---

export const createCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const validationErrors = validateCouponData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const {
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      maxUsage,
      minOrderValue,
    } = req.body;
    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== undefined ? isActive : true,
        maxUsage: maxUsage !== undefined ? parseInt(maxUsage) : 1,
        usedCount: 0,
        minOrderValue:
          minOrderValue !== undefined ? parseFloat(minOrderValue) : 0,
      },
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully!",
      coupon: newCoupon,
    });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("code")) {
      return res.status(409).json({
        success: false,
        message: "A coupon with this code already exists.",
      });
    }
    console.error("Error creating coupon:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create coupon" });
  }
};

export const fetchAllCoupons = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error: any) {
    console.error("Error fetching coupons:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch coupons" });
  }
};

export const updateCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    // Create a temporary object for validation, as some fields may not be present
    const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
    if (!existingCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
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
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      maxUsage,
      minOrderValue,
    } = req.body;

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined)
      updateData.discountValue = parseFloat(discountValue);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (maxUsage !== undefined) updateData.maxUsage = parseInt(maxUsage);
    if (minOrderValue !== undefined)
      updateData.minOrderValue = parseFloat(minOrderValue);

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully!",
      coupon: updatedCoupon,
    });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("code")) {
      return res.status(409).json({
        success: false,
        message: "A coupon with this code already exists.",
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }
    console.error("Error updating coupon:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update coupon" });
  }
};

export const deleteCoupon = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    res
      .status(200)
      .json({ success: true, message: "Coupon deleted successfully!" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }
    console.error("Error deleting coupon:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete coupon" });
  }
};

// --- Business Logic ---

export const applyCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and total amount are required.",
      });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }

    if (coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit.",
      });
    }

    if (!coupon.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "This coupon is not active." });
    }
    const now = new Date();
    if (now < coupon.startDate) {
      return res
        .status(400)
        .json({ success: false, message: "This coupon is not yet valid." });
    }
    if (now > coupon.endDate) {
      return res
        .status(400)
        .json({ success: false, message: "This coupon has expired." });
    }
    if (coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit.",
      });
    }
    if (new Prisma.Decimal(totalAmount).lessThan(coupon.minOrderValue)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ${coupon.minOrderValue} is required.`,
      });
    }

    // Calculate discount
    let discountAmount = new Prisma.Decimal(0);
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = new Prisma.Decimal(totalAmount)
        .mul(coupon.discountValue)
        .div(100);
    } else if (coupon.discountType === "FIXED") {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = new Prisma.Decimal(totalAmount).minus(discountAmount);

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: coupon.usedCount + 1 },
    });

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      discountAmount: discountAmount.toNumber(),
      finalAmount: finalAmount.isNegative() ? 0 : finalAmount.toNumber(),
      coupon,
    });
  } catch (error: any) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ success: false, message: "Failed to apply coupon" });
  }
};

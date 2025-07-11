import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";
import { uploadToCloudinary } from "../utils/cloudinary";
import { AddressType } from "@prisma/client";

// Validation helpers
const validateUserData = (data: any): string[] => {
  const errors: string[] = [];

  if (data.email && (!data.email.includes("@") || !data.email.includes("."))) {
    errors.push("Email is not valid");
  }

  if (data.birthDate && new Date(data.birthDate) > new Date()) {
    errors.push("Birth date cannot be in the future");
  }

  if (
    data.username &&
    (data.username.trim().length < 2 || data.username.trim().length > 50)
  ) {
    errors.push("Username must be between 2 and 50 characters");
  }

  if (data.gender && !["MEN", "WOMEN", "UNISEX"].includes(data.gender)) {
    errors.push("Gender must be MEN, WOMEN, or UNISEX");
  }

  return errors;
};

const validateAddressData = (data: any): string[] => {
  const errors: string[] = [];

  if (
    data.phone &&
    !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ""))
  ) {
    errors.push("Phone number is not valid");
  }

  if (
    data.fullName &&
    (data.fullName.trim().length < 2 || data.fullName.trim().length > 100)
  ) {
    errors.push("Full name must be between 2 and 100 characters");
  }

  if (
    data.addressLineOne &&
    (data.addressLineOne.trim().length < 5 ||
      data.addressLineOne.trim().length > 200)
  ) {
    errors.push("Address line one must be between 5 and 200 characters");
  }

  if (data.addressLineTwo && data.addressLineTwo.trim().length > 200) {
    errors.push("Address line two cannot exceed 200 characters");
  }

  if (
    data.city &&
    (data.city.trim().length < 2 || data.city.trim().length > 50)
  ) {
    errors.push("City must be between 2 and 50 characters");
  }

  if (
    data.zipCode &&
    (data.zipCode.trim().length < 3 || data.zipCode.trim().length > 20)
  ) {
    errors.push("Zip code must be between 3 and 20 characters");
  }

  if (
    data.country &&
    (data.country.trim().length < 2 || data.country.trim().length > 50)
  ) {
    errors.push("Country must be between 2 and 50 characters");
  }

  if (
    data.addressType &&
    !["HOME", "OFFICE", "OTHER"].includes(data.addressType)
  ) {
    errors.push("Address type must be HOME, OFFICE, or OTHER");
  }

  return errors;
};

/**
 * @desc    Get user profile with address
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user data with address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        gender: true,
        birthDate: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        Address: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format response for frontend compatibility
    const profile = {
      id: user.id,
      userId: user.id,
      username: user.username || "",
      firstName: user.username || "", // For backward compatibility
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      birthDate: user.birthDate,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Address data (flattened for backward compatibility)
      fullName: user.Address?.fullName,
      phone: user.Address?.phone,
      addressLineOne: user.Address?.addressLineOne,
      addressLineTwo: user.Address?.addressLineTwo,
      city: user.Address?.city,
      zipCode: user.Address?.zipCode,
      country: user.Address?.country,
      addressType: user.Address?.addressType,
      isDefault: user.Address?.isDefault,
      // Nested structure for new frontend
      address: user.Address,
    };

    res.status(200).json({
      success: true,
      data: profile,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        birthDate: user.birthDate,
        role: user.role,
      },
      address: user.Address,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user profile and address
 * @route   PUT /api/profile
 * @access  Private
 */
export const updateProfile = async (
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

    const {
      // User data
      username,
      avatar,
      gender,
      birthDate,
      // Address data - can come directly or nested in address object
      address,
      // Also support flat address data for backward compatibility
      fullName,
      phone,
      addressLineOne,
      addressLineTwo,
      city,
      zipCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    // Validate user data
    const userValidationErrors = validateUserData({
      username,
      avatar,
      gender,
      birthDate,
    });

    // Validate address data (both nested and flat)
    const addressToValidate = address || {
      fullName,
      phone,
      addressLineOne,
      addressLineTwo,
      city,
      zipCode,
      country,
      addressType,
      isDefault,
    };

    const addressValidationErrors =
      address || fullName || phone || addressLineOne || city
        ? validateAddressData(addressToValidate)
        : [];

    // Combine all validation errors
    const allErrors = [...userValidationErrors, ...addressValidationErrors];
    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: allErrors,
      });
    }

    // Prepare user data for update
    const userData: any = {};
    if (username !== undefined) userData.username = username.trim();
    if (avatar !== undefined) userData.avatar = avatar;
    if (gender !== undefined) userData.gender = gender;
    if (birthDate !== undefined) userData.birthDate = new Date(birthDate);

    // Prepare address data for update
    const addressData: any = {};

    // Handle nested address object
    if (address && typeof address === "object") {
      if (address.fullName !== undefined)
        addressData.fullName = address.fullName.trim();
      if (address.phone !== undefined) addressData.phone = address.phone.trim();
      if (address.addressLineOne !== undefined)
        addressData.addressLineOne = address.addressLineOne.trim();
      if (address.addressLineTwo !== undefined)
        addressData.addressLineTwo = address.addressLineTwo?.trim() || null;
      if (address.city !== undefined) addressData.city = address.city.trim();
      if (address.zipCode !== undefined)
        addressData.zipCode = address.zipCode.trim();
      if (address.country !== undefined)
        addressData.country = address.country.trim();
      if (address.addressType !== undefined)
        addressData.addressType = address.addressType as AddressType;
      if (address.isDefault !== undefined)
        addressData.isDefault = address.isDefault;
    }

    // Handle flat address data (backward compatibility)
    if (fullName !== undefined) addressData.fullName = fullName.trim();
    if (phone !== undefined) addressData.phone = phone.trim();
    if (addressLineOne !== undefined)
      addressData.addressLineOne = addressLineOne.trim();
    if (addressLineTwo !== undefined)
      addressData.addressLineTwo = addressLineTwo?.trim() || null;
    if (city !== undefined) addressData.city = city.trim();
    if (zipCode !== undefined) addressData.zipCode = zipCode.trim();
    if (country !== undefined) addressData.country = country.trim();
    if (addressType !== undefined)
      addressData.addressType = addressType as AddressType;
    if (isDefault !== undefined) addressData.isDefault = isDefault;

    // Use transaction to update both user and address
    const result = await prisma.$transaction(async (tx) => {
      // Update user data if there's any user data to update
      let updatedUser = null;
      if (Object.keys(userData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: userId },
          data: userData,
          include: {
            Address: true,
          },
        });
      }

      // Update address data if there's any address data to update
      let updatedAddress = null;
      if (Object.keys(addressData).length > 0) {
        // Check if address exists
        const existingAddress = await tx.address.findUnique({
          where: { userId },
        });

        if (existingAddress) {
          // Update existing address
          updatedAddress = await tx.address.update({
            where: { userId },
            data: addressData,
          });
        } else {
          // Create new address
          updatedAddress = await tx.address.create({
            data: {
              ...addressData,
              userId,
              addressType: addressData.addressType || AddressType.HOME,
              isDefault:
                addressData.isDefault !== undefined
                  ? addressData.isDefault
                  : true,
            },
          });
        }
      }

      // Return the final user with address
      const finalUser =
        updatedUser ||
        (await tx.user.findUnique({
          where: { id: userId },
          include: {
            Address: true,
          },
        }));

      return {
        user: finalUser,
        address: updatedAddress || finalUser?.Address,
      };
    });

    // Format response for frontend compatibility
    const responseData = {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: result.user?.id,
        userId: result.user?.id,
        username: result.user?.username,
        email: result.user?.email,
        avatar: result.user?.avatar,
        gender: result.user?.gender,
        birthDate: result.user?.birthDate,
        role: result.user?.role,
        // Flattened address data for backward compatibility
        fullName: result.address?.fullName,
        phone: result.address?.phone,
        addressLineOne: result.address?.addressLineOne,
        addressLineTwo: result.address?.addressLineTwo,
        city: result.address?.city,
        zipCode: result.address?.zipCode,
        country: result.address?.country,
        addressType: result.address?.addressType,
        isDefault: result.address?.isDefault,
        // Nested address
        address: result.address,
      },
      user: result.user,
      address: result.address,
    };

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Profile update error:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
        error: "Username already exists",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "User not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user information with file upload
 * @route   PUT /api/profile/upload
 * @access  Private
 */
export const updateUserInformation = async (
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

    // Handle file uploads or other specific user data updates
    const updateData: any = {};

    // Extract data from request body
    if (req.body.username) {
      const username = req.body.username.trim();
      if (username.length < 2 || username.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Username must be between 2 and 50 characters",
        });
      }
      updateData.username = username;
    }

    if (req.body.gender) {
      if (!["MEN", "WOMEN", "UNISEX"].includes(req.body.gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be MEN, WOMEN, or UNISEX",
        });
      }
      updateData.gender = req.body.gender;
    }

    if (req.body.birthDate) {
      const birthDate = new Date(req.body.birthDate);
      if (birthDate > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Birth date cannot be in the future",
        });
      }
      updateData.birthDate = birthDate;
    }

    // Handle file upload (avatar) to Cloudinary
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const avatarFile = req.files.find(
        (file: any) => file.fieldname === "avatar"
      );
      if (avatarFile) {
        try {
          const uploadResult = await uploadToCloudinary(avatarFile, "avatars");
          updateData.avatar = uploadResult.url;
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Failed to upload avatar",
          });
        }
      }
    }

    // Check if there's any data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update",
      });
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        Address: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User information updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        gender: updatedUser.gender,
        birthDate: updatedUser.birthDate,
        role: updatedUser.role,
        address: updatedUser.Address,
      },
      user: updatedUser,
      address: updatedUser.Address,
    });
  } catch (error: any) {
    console.error("Update user information error:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
        error: "Username already exists",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "User not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create or update address
 * @route   PUT /api/profile/address
 * @access  Private
 */
export const updateAddress = async (
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

    const {
      fullName,
      phone,
      addressLineOne,
      addressLineTwo,
      city,
      zipCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    // Validate address data
    const validationErrors = validateAddressData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Prepare address data
    const addressData: any = {};
    if (fullName !== undefined) addressData.fullName = fullName.trim();
    if (phone !== undefined) addressData.phone = phone.trim();
    if (addressLineOne !== undefined)
      addressData.addressLineOne = addressLineOne.trim();
    if (addressLineTwo !== undefined)
      addressData.addressLineTwo = addressLineTwo?.trim() || null;
    if (city !== undefined) addressData.city = city.trim();
    if (zipCode !== undefined) addressData.zipCode = zipCode.trim();
    if (country !== undefined) addressData.country = country.trim();
    if (addressType !== undefined)
      addressData.addressType = addressType as AddressType;
    if (isDefault !== undefined) addressData.isDefault = isDefault;

    // Check if address exists and update or create
    const existingAddress = await prisma.address.findUnique({
      where: { userId },
    });

    let updatedAddress;
    if (existingAddress) {
      // Update existing address
      updatedAddress = await prisma.address.update({
        where: { userId },
        data: addressData,
      });
    } else {
      // Create new address
      updatedAddress = await prisma.address.create({
        data: {
          ...addressData,
          userId,
          addressType: addressData.addressType || AddressType.HOME,
          isDefault:
            addressData.isDefault !== undefined ? addressData.isDefault : true,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: updatedAddress,
      address: updatedAddress,
    });
  } catch (error: any) {
    console.error("Update address error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "User not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get user orders with pagination
 * @route   GET /api/profile/orders
 * @access  Private
 */
export const getUserOrders = async (
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

    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter conditions
    const whereConditions: any = { userId };
    if (status) {
      whereConditions.orderStatus = status;
    }

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbImage: true,
                price: true,
                originPrice: true,
                isSale: true,
              },
            },
          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalOrders = await prisma.order.count({
      where: whereConditions,
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalOrders,
        pages: Math.ceil(totalOrders / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Test address update (legacy endpoint)
 * @route   PUT /api/profile/test-address
 * @access  Private
 */
export const testUpdateAddress = async (
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

    const { fullName, phone, addressLineOne, city, country } = req.body;

    // Basic validation
    if (!fullName || !phone || !addressLineOne || !city || !country) {
      return res.status(400).json({
        success: false,
        message: "Missing required address fields",
      });
    }

    // Update or create address
    const addressData = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLineOne: addressLineOne.trim(),
      city: city.trim(),
      country: country.trim(),
      addressType: AddressType.HOME,
      isDefault: true,
    };

    const updatedAddress = await prisma.address.upsert({
      where: { userId },
      update: addressData,
      create: {
        ...addressData,
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: updatedAddress,
    });
  } catch (error: any) {
    console.error("Test address update error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


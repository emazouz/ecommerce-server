import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";
import { uploadToCloudinary } from "../utils/cloudinary";

// Validation helpers
const validateUserData = (data: any): string[] => {
  const errors: string[] = [];

  if (data.email && (!data.email.includes("@") || !data.email.includes("."))) {
    errors.push("Email is not valid");
  }

  if (data.birthDate && new Date(data.birthDate) > new Date()) {
    errors.push("Birth date is not valid");
  }

  if (data.username && data.username.trim().length < 2) {
    errors.push("Username must be more than 2 characters");
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

  if (data.fullName && data.fullName.trim().length < 2) {
    errors.push("Full name must be more than 2 characters");
  }

  if (data.addressLineOne && data.addressLineOne.trim().length < 5) {
    errors.push("Address must be more than 5 characters");
  }

  return errors;
};

// Get user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
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
        Address: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            addressLineOne: true,
            addressLineTwo: true,
            city: true,
            zipCode: true,
            country: true,
            addressType: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format response to match frontend expectations
    const profile = {
      userId: user.id,
      id: user.id,
      username: user.username || "",
      firstName: user.username || "", // For backward compatibility
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      birthDate: user.birthDate,
      role: user.role,
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
      profile,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        birthDate: user.birthDate,
      },
      address: user.Address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Create or update user profile
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
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
    if (username !== undefined) userData.username = username;
    if (avatar !== undefined) userData.avatar = avatar;
    if (gender !== undefined) userData.gender = gender;
    if (birthDate !== undefined) userData.birthDate = new Date(birthDate);

    // Prepare address data for update
    const addressData: any = {};

    // Handle nested address object
    if (address && typeof address === "object") {
      if (address.fullName !== undefined)
        addressData.fullName = address.fullName;
      if (address.phone !== undefined) addressData.phone = address.phone;
      if (address.addressLineOne !== undefined)
        addressData.addressLineOne = address.addressLineOne;
      if (address.addressLineTwo !== undefined)
        addressData.addressLineTwo = address.addressLineTwo;
      if (address.city !== undefined) addressData.city = address.city;
      if (address.zipCode !== undefined) addressData.zipCode = address.zipCode;
      if (address.country !== undefined) addressData.country = address.country;
      if (address.addressType !== undefined)
        addressData.addressType = address.addressType;
      if (address.isDefault !== undefined)
        addressData.isDefault = address.isDefault;
    }

    // Handle flat address data (backward compatibility)
    if (fullName !== undefined) addressData.fullName = fullName;
    if (phone !== undefined) addressData.phone = phone;
    if (addressLineOne !== undefined)
      addressData.addressLineOne = addressLineOne;
    if (addressLineTwo !== undefined)
      addressData.addressLineTwo = addressLineTwo;
    if (city !== undefined) addressData.city = city;
    if (zipCode !== undefined) addressData.zipCode = zipCode;
    if (country !== undefined) addressData.country = country;
    if (addressType !== undefined) addressData.addressType = addressType;
    if (isDefault !== undefined) addressData.isDefault = isDefault;

    // Use transaction to update both user and address
    const result = await prisma.$transaction(async (tx) => {
      // Update user data if there's any user data to update
      let updatedUser = null;
      if (Object.keys(userData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: userId },
          data: userData,
          select: {
            id: true,
            username: true,
            avatar: true,
            gender: true,
            birthDate: true,
            email: true,
            Address: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                addressLineOne: true,
                addressLineTwo: true,
                city: true,
                zipCode: true,
                country: true,
                addressType: true,
                isDefault: true,
              },
            },
          },
        });
      }

      // Update address data if there's any address data to update
      let updatedAddress = null;
      if (Object.keys(addressData).length > 0) {
        updatedAddress = await tx.address.upsert({
          where: { userId },
          update: addressData,
          create: {
            ...addressData,
            userId,
          },
        });
      }

      // If we updated user, return the user with address, otherwise fetch current user
      if (updatedUser) {
        return {
          user: updatedUser,
          address: updatedUser.Address || updatedAddress,
        };
      } else if (updatedAddress) {
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            avatar: true,
            gender: true,
            birthDate: true,
            email: true,
          },
        });
        return { user: currentUser, address: updatedAddress };
      }

      return { user: null, address: null };
    });

    // Format response for frontend compatibility
    const responseData = {
      success: true,
      message: "Profile updated successfully",
      profile: result,
      user: result.user,
      address: result.address,
    };

    res.status(200).json(responseData);
  } catch (error: any) {
    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Duplicate data",
        error: "Duplicate data",
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
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Update user information (for file uploads and other specific updates)
export const updateUserInformation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // Handle file uploads or other specific user data updates
    const updateData: any = {};

    // Extract data from request body
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.gender) updateData.gender = req.body.gender;
    if (req.body.birthDate) updateData.birthDate = new Date(req.body.birthDate);

    // Handle file upload (avatar) to Cloudinary
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const avatarFile = req.files.find(
        (file: any) => file.fieldname === "avatar"
      );
      if (avatarFile) {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(avatarFile, "avatars");
        updateData.avatar = result.url; // Save the Cloudinary URL
      }
    } else if (req.body.avatar) {
      // If avatar is sent as a string (e.g., from a gallery), use it directly
      updateData.avatar = req.body.avatar;
    }

    // Validate data
    const validationErrors = validateUserData(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        gender: true,
        birthDate: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User information updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Test function to update address only (for debugging)
export const testUpdateAddress = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { fullName, phone, city } = req.body;

    // Simple address update
    const updatedAddress = await prisma.address.upsert({
      where: { userId },
      update: {
        fullName: fullName || "Your Name",
        phone: phone || "+0123456789",
        city: city || "Your City",
      },
      create: {
        userId,
        fullName: fullName || "Your Name",
        phone: phone || "+0123456789",
        city: city || "Your City",
      },
    });

    res.status(200).json({
      success: true,
      message: "Address updated successfully (test)",
      address: updatedAddress,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Test update failed",
      error: error.message,
    });
  }
};

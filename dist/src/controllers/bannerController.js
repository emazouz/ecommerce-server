"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.fetchAllBanners = exports.createBanner = void 0;
const prisma_1 = require("../utils/prisma");
const cloudinary_1 = require("../utils/cloudinary");
// --- Validation Helper ---
const validateBannerData = (data, files) => {
    const errors = [];
    if (!data.title || data.title.trim().length < 3) {
        errors.push("Banner title must be at least 3 characters long.");
    }
    // For creation, an image file is required.
    const imageFile = files?.find((file) => file.fieldname === "imageUrl");
    if (!imageFile) {
        errors.push("Banner image file is required.");
    }
    return errors;
};
// --- CRUD Operations ---
const createBanner = async (req, res) => {
    try {
        const files = req.files;
        // Server-side validation
        const validationErrors = validateBannerData(req.body, files);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors,
            });
        }
        const { title, subtitle, linkUrl, buttonText, type, isActive } = req.body;
        let imageUrl = undefined;
        const imageFile = files.find((file) => file.fieldname === "imageUrl");
        if (imageFile) {
            const result = await (0, cloudinary_1.uploadToCloudinary)(imageFile, "banners");
            imageUrl = result.url;
        }
        // This check is belt-and-suspenders, but good to have.
        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: "Banner image is required and could not be processed.",
            });
        }
        const newBanner = await prisma_1.prisma.banner.create({
            data: {
                title,
                subtitle,
                linkUrl,
                buttonText,
                type: type || "MAIN",
                isActive: isActive === "true",
                imageUrl,
            },
        });
        res.status(201).json({
            success: true,
            message: "Banner created successfully",
            banner: newBanner,
        });
    }
    catch (error) {
        console.error("Error creating banner:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.createBanner = createBanner;
const fetchAllBanners = async (req, res) => {
    try {
        const banners = await prisma_1.prisma.banner.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ success: true, banners });
    }
    catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.fetchAllBanners = fetchAllBanners;
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;
        const banner = await prisma_1.prisma.banner.findUnique({ where: { id } });
        if (!banner) {
            return res
                .status(404)
                .json({ success: false, message: "Banner not found" });
        }
        const { title, subtitle, linkUrl, buttonText, type, isActive } = req.body;
        let imageUrl = banner.imageUrl; // Keep the old image by default
        const imageFile = files?.find((file) => file.fieldname === "imageUrl");
        if (imageFile) {
            // Delete old image from Cloudinary
            if (banner.imageUrl) {
                try {
                    await (0, cloudinary_1.deleteFromCloudinary)(banner.imageUrl);
                }
                catch (deleteError) {
                    console.error("Failed to delete old banner image, continuing with update:", deleteError);
                }
            }
            // Upload new image
            const result = await (0, cloudinary_1.uploadToCloudinary)(imageFile, "banners");
            imageUrl = result.url;
        }
        const updatedBanner = await prisma_1.prisma.banner.update({
            where: { id },
            data: {
                title,
                subtitle,
                linkUrl,
                buttonText,
                type,
                isActive: isActive !== undefined ? isActive === "true" : undefined,
                imageUrl,
            },
        });
        res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            banner: updatedBanner,
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res
                .status(404)
                .json({ success: false, message: "Banner not found" });
        }
        console.error("Error updating banner:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateBanner = updateBanner;
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await prisma_1.prisma.banner.findUnique({ where: { id } });
        if (!banner) {
            return res
                .status(404)
                .json({ success: false, message: "Banner not found" });
        }
        if (banner.imageUrl) {
            await (0, cloudinary_1.deleteFromCloudinary)(banner.imageUrl);
        }
        await prisma_1.prisma.banner.delete({ where: { id } });
        res
            .status(200)
            .json({ success: true, message: "Banner deleted successfully" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res
                .status(404)
                .json({ success: false, message: "Banner not found" });
        }
        console.error("Error deleting banner:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteBanner = deleteBanner;

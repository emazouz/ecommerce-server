"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFlashSale = exports.validateVariant = exports.validateProduct = void 0;
const client_1 = require("@prisma/client");
const validateProduct = (data, isUpdate = false) => {
    if (!isUpdate) {
        if (!data.name?.trim())
            return "Product name is required";
        if (!data.description?.trim())
            return "Product description is required";
        if (!Array.isArray(data.aboutProduct) || !data.aboutProduct.length)
            return "About product details are required";
        if (typeof data.price !== "number" || data.price <= 0)
            return "Valid price is required";
        if (typeof data.originPrice !== "number" || data.originPrice <= 0)
            return "Valid original price is required";
        if (!data.type?.trim())
            return "Product type is required";
        if (!Object.values(client_1.Gender).includes(data.gender))
            return "Valid gender is required";
        if (!data.brand?.trim())
            return "Brand is required";
        if (!data.categoryId)
            return "Category ID is required";
        if (!Array.isArray(data.sizes) || !data.sizes.length)
            return "At least one size is required";
        if (!Array.isArray(data.colors) || !data.colors.length)
            return "At least one color is required";
    }
    else {
        // For updates, validate only provided fields
        if (data.name !== undefined && !data.name.trim())
            return "Invalid product name";
        if (data.description !== undefined && !data.description.trim())
            return "Invalid product description";
        if (data.aboutProduct !== undefined &&
            (!Array.isArray(data.aboutProduct) || !data.aboutProduct.length))
            return "Invalid about product details";
        if (data.price !== undefined &&
            (typeof data.price !== "number" || data.price <= 0))
            return "Invalid price";
        if (data.originPrice !== undefined &&
            (typeof data.originPrice !== "number" || data.originPrice <= 0))
            return "Invalid original price";
        if (data.type !== undefined && !data.type.trim())
            return "Invalid product type";
        if (data.gender !== undefined &&
            !Object.values(client_1.Gender).includes(data.gender))
            return "Invalid gender";
        if (data.brand !== undefined && !data.brand.trim())
            return "Invalid brand";
        if (data.sizes !== undefined &&
            (!Array.isArray(data.sizes) || !data.sizes.length))
            return "Invalid sizes";
        if (data.colors !== undefined &&
            (!Array.isArray(data.colors) || !data.colors.length))
            return "Invalid colors";
    }
    return null;
};
exports.validateProduct = validateProduct;
const validateVariant = (data) => {
    if (!data.colorName?.trim())
        return "Color name is required";
    if (!data.color?.trim())
        return "Color is required";
    if (!data.colorCode?.trim())
        return "Color code is required";
    if (!data.image?.trim())
        return "Variant image is required";
    if (!data.size?.trim())
        return "Size is required";
    if (typeof data.quantity !== "number" || data.quantity < 0)
        return "Valid quantity is required";
    return null;
};
exports.validateVariant = validateVariant;
const validateFlashSale = (data) => {
    if (typeof data.discount !== "number" || data.discount <= 0)
        return "Valid discount is required";
    if (typeof data.price !== "number" || data.price <= 0)
        return "Valid price is required";
    if (!data.startDate)
        return "Start date is required";
    if (!data.endDate)
        return "End date is required";
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()))
        return "Invalid start date";
    if (isNaN(end.getTime()))
        return "Invalid end date";
    if (start >= end)
        return "End date must be after start date";
    if (start < new Date())
        return "Start date cannot be in the past";
    return null;
};
exports.validateFlashSale = validateFlashSale;

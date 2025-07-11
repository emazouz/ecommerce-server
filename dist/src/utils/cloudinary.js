"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = (file, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            resource_type: "auto",
            folder: `ecommerce/${folder}`,
            timeout: 120000,
        }, (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                return reject(new Error(`Error uploading to Cloudinary: ${error.message}`));
            }
            if (!result) {
                return reject(new Error("Cloudinary upload failed: No result returned."));
            }
            resolve({
                url: result.secure_url,
                public_id: result.public_id,
            });
        });
        uploadStream.end(file.buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = async (url) => {
    try {
        // Extract public_id from URL
        const public_id = url.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary_1.v2.uploader.destroy(public_id);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error deleting from Cloudinary: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image deletion.");
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;

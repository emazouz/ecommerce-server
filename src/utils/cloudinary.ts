import { v2 as cloudinary } from "cloudinary";
import { CloudinaryResponse } from "../types/cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<CloudinaryResponse> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `ecommerce/${folder}`,
      resource_type: "auto",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error uploading to Cloudinary: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image upload.");
  }
};

export const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    // Extract public_id from URL
    const public_id = url.split("/").slice(-2).join("/").split(".")[0];
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error deleting from Cloudinary: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image deletion.");
  }
};

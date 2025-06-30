import { Gender } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export interface ProductFilters {
  category?: number;
  gender?: Gender;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface ProductStatusUpdate {
  isNew?: boolean;
  isSale?: boolean;
  isFlashSale?: boolean;
}

export interface ProductVariantInput {
  colorName: string;
  color: string;
  colorCode: string;
  image: string;
  size: string;
  quantity: number;
}

export interface FlashSaleInput {
  discount: number;
  startDate: string;
  endDate: string;
  price: number;
}

export interface FileRequest extends AuthenticatedRequest {
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

import { prisma } from "../utils/prisma";
import { Request, Response } from "express";

interface FlashSaleData {
  productId: string;
  discount: number;
  startDate: Date | string;
  endDate: Date | string;
  price: number;
}

// create Flash Sale
export const createFlashSale = async (req: Request, res: Response) => {
  // Fixed parameter order
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Request body is required",
      });
    }

    const { productId, discount, startDate, endDate } = req.body;

    // Validate required fields
    if (!productId || discount === undefined || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "All fields are required",
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Start date must be before end date",
      });
    }

    // Validate discount
    if (discount <= 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Discount must be between 1 and 100",
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Product not found",
      });
    }
    // calculate sale price

    const price =
      Number(product.price) - (Number(product.price) * discount) / 100;

    // update product price if necessary
    if (price < Number(product.price)) {
      await prisma.product.update({
        where: { id: productId },
        data: { price },
      });
    }

    // Create flash sale
    const flashSale = await prisma.flashSale.create({
      data: {
        productId,
        discount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price,
      },
    });
    return res.status(201).json({
      // Added return here
      success: true,
      data: flashSale,
      message: "Flash sale created successfully",
    });
  } catch (error) {
    console.error("Error creating flash sale:", error);
    return res.status(500).json({
      // Added return here
      success: false,
      data: null,
      message: "Internal server error",
    });
  }
};

// update Flash Sale
export const updateFlashSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productId, discount, startDate, endDate } = req.body;

    if (!id || !productId || discount === undefined || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "All fields are required",
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Start date must be before end date",
      });
    }

    // Validate discount
    if (discount <= 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Discount must be between 1 and 100",
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Product not found",
      });
    }

    // calculate sale price
    const price =
      Number(product.price) - (Number(product.price) * discount) / 100;

    // update product price if necessary
    if (price < Number(product.price)) {
      await prisma.product.update({
        where: { id: productId },
        data: { price },
      });
    }
    // Update flash sale
    const updatedFlashSale = await prisma.flashSale.update({
      where: { id },
      data: {
        productId,
        discount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedFlashSale,
      message: "Flash sale updated successfully",
    });
  } catch (error) {
    console.error("Error updating flash sale:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Internal server error",
    });
  }
};

// get Flash Sale by ID
export const getFlashSaleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Flash sale ID is required",
      });
    }

    const flashSale = await prisma.flashSale.findUnique({
      where: { id },
      include: {
        product: true, // Include product details
      },
    });

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Flash sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: flashSale,
      message: "Flash sale retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving flash sale:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Internal server error",
    });
  }
};

// delete Flash Sale
export const deleteFlashSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Flash sale ID is required",
      });
    }

    const flashSale = await prisma.flashSale.findUnique({
      where: { id },
    });

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Flash sale not found",
      });
    }

    await prisma.flashSale.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      data: null,
      message: "Flash sale deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting flash sale:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Internal server error",
    });
  }
};
// get all Flash Sales
export const getAllFlashSales = async (req: Request, res: Response) => {
  try {
    const flashSales = await prisma.flashSale.findMany({
      include: {
        product: true, // Include product details
      },
      orderBy: {
        startDate: "asc", // Order by start date
      },
    });

    return res.status(200).json({
      success: true,
      data: flashSales,
      message: "Flash sales retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving flash sales:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Internal server error",
    });
  }
};

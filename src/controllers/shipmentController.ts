import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { Carrier, Prisma, ShipmentStatus } from "@prisma/client";

export const createShipment = async (req: Request, res: Response) => {
  try {
    const { orderId, carrier, service, weight, dimensions, address, items } =
      req.body;

    // هنا نفترض أن الدفع ناجح وأن الطلب موجود
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // الاتصال الوهمي مع شركة التوصيل لإرجاع رقم تتبع للاختبار
    const trackingNumber = carrier + "-" + generateFakeTrackingNumber();
    const trackingUrl = `https://mock-courier.com/track/${trackingNumber}`;
    const shippingLabel = `https://mock-courier.com/label/${trackingNumber}.pdf`;

    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        carrier,
        service,
        weight,
        dimensions,
        address,
        items,
        status: ShipmentStatus.SHIPPED,
        shippingDate: new Date(),
        trackingNumber,
        trackingUrl,
        shippingLabel,
      },
    });

    return res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// get all shipments

export const getAllShipment = async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findMany({
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        service: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderItems: true,
            discountAmount: true,
            totalAmount: true,
            couponCode: true,
          },
        },
        status: true,
        shippingDate: true,
        shippingLabel: true,
        trackingUrl: true,
        weight: true,
        dimensions: true,
        address: true,
        items: true,
        cost: true,
      },
    });
    return res.status(200).json({
      success: true,
      data: shipment,
      message: "Get all shipment is successfully",
    });
  } catch (err) {
    console.error("Error fetching shipments:", err);
    return res.status(500).json({
      success: false,
      data: null,
      message: "An unexpected error occurred while fetching users",
    });
  }
};

// getShipmentById

export const getShipmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      data: null,
      message: "Shipment ID is required in the URL params",
    });
  }
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        service: true,
        orderId: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderItems: true,
            discountAmount: true,
            totalAmount: true,
            couponCode: true,
          },
        },
        status: true,
        shippingDate: true,
        shippingLabel: true,
        trackingUrl: true,
        weight: true,
        dimensions: true,
        address: true,
        items: true,
        cost: true,
      },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shipment,
      message: "Shipment retrieved successfully",
    });
  } catch (err) {
    console.error("Error fetching shipment:", err);
    return res.status(500).json({
      success: false,
      data: null,
      message: "An unexpected error occurred",
    });
  }
};

// update Shipment
export const updateShipment = async (req: Request, res: Response) => {
  try {
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Validate route params                                          */
    /* ------------------------------------------------------------------ */
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Shipment ID is required in the URL params",
      });
    }

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Validate and extract body fields                               */
    /* ------------------------------------------------------------------ */
    const { carrier, status } = req.body as {
      carrier?: string;
      status?: string;
    };

    if (!carrier && !status) {
      return res.status(400).json({
        success: false,
        data: null,
        message:
          "No valid update fields provided. Supply `carrier`, `status`, or both.",
      });
    }

    /* ------------------------------------------------------------------ */
    /* 3️⃣  Ensure the shipment exists                                     */
    /* ------------------------------------------------------------------ */
    const existing = await prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Shipment not found",
      });
    }

    /* ------------------------------------------------------------------ */
    /* 4️⃣  Build the update payload dynamically                           */
    /*     – We only touch fields we’re asked to change                    */
    /* ------------------------------------------------------------------ */
    const data: Prisma.ShipmentUpdateInput = {};

    if (carrier) {
      // When carrier changes we regenerate tracking data
      const trackingNumber = `${carrier}-${generateFakeTrackingNumber()}`;
      Object.assign(data, {
        carrier,
        status,
        trackingNumber,
        trackingUrl: `https://mock-courier.com/track/${trackingNumber}`,
        shippingLabel: `https://mock-courier.com/label/${trackingNumber}.pdf`,
        shippingDate: new Date(),
      });
    }

    /* ------------------------------------------------------------------ */
    /* 5️⃣  Persist & respond                                               */
    /* ------------------------------------------------------------------ */
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Shipment updated successfully",
      data: updatedShipment,
    });
  } catch (err: any) {
    /* ------------------------------------------------------------------ */
    /* 6️⃣  Error handling                                                 */
    /* ------------------------------------------------------------------ */
    console.error("Update shipment error:", err);

    // Return explicit Prisma errors when helpful
    if (err.code === "P2025") {
      // Record to be updated was not found
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteShipment = async (req: Request, res: Response) => {
  try {
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Validate route params                                          */
    /* ------------------------------------------------------------------ */
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Shipment ID is required in the URL params",
      });
    }

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Verify the shipment exists                                     */
    /* ------------------------------------------------------------------ */
    const existing = await prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Shipment not found",
      });
    }

    /* ------------------------------------------------------------------ */
    /* 3️⃣  Delete shipment (and related data if you have cascading needs) */
    /* ------------------------------------------------------------------ */
    await prisma.shipment.delete({ where: { id } });

    // If you store shipping labels on disk / S3, trigger deletion here

    return res.status(200).json({
      success: true,
      message: "Shipment deleted successfully",
      data: null,
    });
  } catch (err: any) {
    console.error("Delete shipment error:", err);

    // Handle common Prisma errors explicitly
    if (err.code === "P2025") {
      // Record to be deleted was not found
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const generateFakeTrackingNumber = (): string => {
  return Math.random().toString().slice(2, 12);
};

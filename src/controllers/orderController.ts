import { prisma } from "../utils/prisma";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Decimal } from "@prisma/client/runtime/library";
import { NotificationHelpers } from "../utils/notificationHelpers";

// --- Helper Functions ---

/**
 * Generate unique order number
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}-${random}`;
};

/**
 * Calculate order totals from cart
 */
const calculateOrderTotals = (cart: any) => {
  const itemsPrice = cart.subtotal;
  const shippingPrice = cart.shippingAmount;
  const taxPrice = cart.taxAmount;
  const discountAmount = cart.discountAmount || new Decimal(0);
  const totalAmount = itemsPrice
    .plus(shippingPrice)
    .plus(taxPrice)
    .minus(discountAmount);

  return {
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountAmount,
    totalAmount: totalAmount.isNegative() ? new Decimal(0) : totalAmount,
  };
};

/**
 * Validate and format shipping address
 */
const validateShippingAddress = (shippingAddress: any): any => {
  if (typeof shippingAddress === "string") {
    // Convert string to object for backward compatibility
    return {
      address: shippingAddress,
      city: "",
      postalCode: "",
      country: "",
    };
  }
  return shippingAddress;
};

// --- Controllers ---

/**
 * Create a new order
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { shippingAddress, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Validate required fields
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Start transaction
    const order = await prisma.$transaction(async (tx) => {
      // Get user's active cart
      const cart = await tx.cart.findFirst({
        where: { userId, status: "ACTIVE" },
        include: {
          cartItems: {
            include: {
              product: true,
            },
          },
          coupon: true,
        },
      });

      if (!cart || cart.cartItems.length === 0) {
        throw new Error("No active cart found or cart is empty");
      }

      // Calculate order totals
      const totals = calculateOrderTotals(cart);

      // Validate shipping address
      const validatedShippingAddress = validateShippingAddress(shippingAddress);

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          itemsPrice: totals.itemsPrice,
          shippingPrice: totals.shippingPrice,
          taxPrice: totals.taxPrice,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paymentMethod,
          shippingAddress: validatedShippingAddress,
          couponId: cart.couponId,
          couponCode: cart.coupon?.code || null,
          orderItems: {
            create: cart.cartItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productSlug: item.productSlug,
              image: item.productImage || item.product.thumbImage,
              price: item.price,
              quantity: item.quantity,
              color: item.color,
              size: item.size,
              weight: item.weight,
              sku: item.sku,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Update cart status to PAID
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: "PAID" },
      });

      // Send order confirmation notification
      try {
        await NotificationHelpers.notifyOrderConfirmed(
          userId,
          newOrder.orderNumber
        );
      } catch (notificationError) {
        console.error(
          "Failed to send order confirmation notification:",
          notificationError
        );
        // Don't fail the order creation if notification fails
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

/**
 * @desc    Get all orders for a user
 * @route   GET /api/orders
 * @access  Private
 */
export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
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
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
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
                brand: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            Address: {
              select: {
                fullName: true,
                phone: true,
                addressLineOne: true,
                city: true,
                country: true,
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
            description: true,
          },
        },
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
            carrier: true,
            status: true,
            shippingDate: true,
            estimatedArrival: true,
            trackingUrl: true,
          },
        },
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if user owns this order or is admin
    if (order.userId !== userId && req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { orderStatus, trackingNumber } = req.body;

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: "Order status is required",
      });
    }

    // Validate order status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    // Update order with tracking number if provided
    const updateData: any = {
      orderStatus,
      updatedAt: new Date(),
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (orderStatus === "DELIVERED") {
      updateData.isDelivered = true;
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Send status update notifications
    try {
      switch (orderStatus) {
        case "CONFIRMED":
          await NotificationHelpers.notifyOrderConfirmed(
            updatedOrder.userId,
            updatedOrder.orderNumber
          );
          break;
        case "SHIPPED":
          await NotificationHelpers.notifyOrderShipped(
            updatedOrder.userId,
            updatedOrder.orderNumber,
            trackingNumber || "N/A"
          );
          break;
        case "DELIVERED":
          await NotificationHelpers.notifyOrderDelivered(
            updatedOrder.userId,
            updatedOrder.orderNumber
          );
          break;
      }
    } catch (notificationError) {
      console.error(
        "Failed to send order status notification:",
        notificationError
      );
      // Don't fail the status update if notification fails
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

/**
 * @desc    Cancel an order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const orderToCancel = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!orderToCancel) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if user owns this order or is admin
    if (orderToCancel.userId !== userId && req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Check if order can be cancelled
    if (
      orderToCancel.orderStatus === "SHIPPED" ||
      orderToCancel.orderStatus === "DELIVERED" ||
      orderToCancel.orderStatus === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage",
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.order.update({
        where: { id },
        data: {
          orderStatus: "CANCELLED",
          paymentStatus:
            orderToCancel.paymentStatus === "COMPLETED" ? "REFUNDED" : "FAILED",
          adminNotes: reason
            ? `Cancellation reason: ${reason}`
            : "Order cancelled",
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Restore inventory
      for (const item of orderToCancel.orderItems) {
        // Restore product variant quantity
        await tx.productVariant.updateMany({
          where: {
            productId: item.productId,
            color: item.color || undefined,
            size: item.size || undefined,
          },
          data: { quantity: { increment: item.quantity } },
        });

        // Restore inventory
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });

        // Update product sold count
        await tx.product.update({
          where: { id: item.productId },
          data: { sold: { decrement: item.quantity } },
        });
      }

      return order;
    });

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Get order by order number
 * @route   GET /api/orders/track/:orderNumber
 * @access  Public
 */
export const trackOrder = async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        shippingStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        deliveredAt: true,
        shippingAddress: true,
        orderItems: {
          select: {
            id: true,
            productName: true,
            image: true,
            quantity: true,
            price: true,
            color: true,
            size: true,
          },
        },
        shipment: {
          select: {
            trackingNumber: true,
            carrier: true,
            status: true,
            estimatedArrival: true,
            trackingUrl: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Error tracking order:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

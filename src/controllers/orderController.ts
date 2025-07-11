import { prisma } from "../utils/prisma";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Decimal } from "@prisma/client/runtime/library";

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

  if (typeof shippingAddress === "object" && shippingAddress !== null) {
    return {
      address: shippingAddress.address || shippingAddress.addressLineOne || "",
      city: shippingAddress.city || "",
      postalCode: shippingAddress.postalCode || shippingAddress.zipCode || "",
      country: shippingAddress.country || "",
    };
  }

  return {
    address: "",
    city: "",
    postalCode: "",
    country: "",
  };
};

// --- Controller Functions ---

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Private
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { shippingAddress, paymentMethod, couponCode, notes, adminNotes } =
      req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method is required" });
    }

    // Get user's active cart
    const cart = await prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      include: {
        cartItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        coupon: true,
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty or not found",
      });
    }

    // Validate shipping address
    let finalShippingAddress = shippingAddress;
    if (!finalShippingAddress) {
      // Get user's default address
      const userAddress = await prisma.address.findFirst({
        where: { userId, isDefault: true },
      });

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          message: "Shipping address is required",
        });
      }

      finalShippingAddress = {
        address: userAddress.addressLineOne || "",
        city: userAddress.city || "",
        postalCode: userAddress.zipCode || "",
        country: userAddress.country || "",
      };
    }

    // Validate and format shipping address
    const formattedShippingAddress =
      validateShippingAddress(finalShippingAddress);

    // Validate coupon if provided
    let couponId: string | undefined = undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.isActive || coupon.endDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired coupon",
        });
      }

      couponId = coupon.id;
    }

    // Calculate order totals
    const totals = calculateOrderTotals(cart);

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Generate unique order number
      const orderNumber = generateOrderNumber();

      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          itemsPrice: totals.itemsPrice,
          shippingPrice: totals.shippingPrice,
          taxPrice: totals.taxPrice,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paymentMethod,
          paymentStatus: "PENDING",
          shippingAddress: formattedShippingAddress,
          shippingMethod: cart.shippingMethod || "STANDARD",
          shippingStatus: "PENDING",
          orderStatus: "PENDING",
          couponId,
          couponCode: couponCode || null,
          notes: notes || null,
          adminNotes: adminNotes || null,
          orderItems: {
            create: cart.cartItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productSlug: item.productSlug,
              image: item.productImage || item.product.thumbImage,
              price: item.price,
              quantity: item.quantity,
              color: item.color || "",
              size: item.size || "",
              weight: item.weight || null,
              sku: item.sku || `${item.productId}-${item.variantId}`,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          coupon: true,
        },
      });

      // Update product stock and sales data
      for (const item of cart.cartItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            sold: { increment: item.quantity },
            quantityPurchase: { increment: 1 },
          },
        });

        // Update inventory if exists
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Update coupon usage count
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Clear cart items and update cart status
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: "PENDING", // Mark as pending/converted
          totalItems: 0,
          subtotal: new Decimal(0),
          taxAmount: new Decimal(0),
          shippingAmount: new Decimal(0),
          total: new Decimal(0),
          discountAmount: new Decimal(0),
          couponId: null,
        },
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred",
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
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private (Admin only)
 */
export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { orderStatus, shippingStatus, paymentStatus, adminNotes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admin only." });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Prepare update data
    const updateData: any = {};
    if (orderStatus !== undefined) {
      updateData.orderStatus = orderStatus;
      if (orderStatus === "DELIVERED") {
        updateData.isDelivered = true;
        updateData.deliveredAt = new Date();
      }
    }
    if (shippingStatus !== undefined)
      updateData.shippingStatus = shippingStatus;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

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

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
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

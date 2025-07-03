import { prisma } from "../utils/prisma";
import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
// --- Helper Functions ---

// دالة مساعدة لحساب إجمالي السلة
const calculateCartTotal = async (cartId: string): Promise<Decimal> => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      cartItems: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    return new Decimal(0);
  }

  return cart.cartItems.reduce((total, item) => {
    const itemPrice = item.product.price;
    return total.plus(itemPrice.times(item.quantity));
  }, new Decimal(0));
};

// --- Controller Functions ---

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  const { productId, variantId, quantity } = req.body;
  const userId = req.user?.userId;

  if (!productId || !variantId || !quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Please provide productId, variantId, and a valid quantity.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. البحث عن المنتج والمتغير الخاص به والتأكد من وجودهما
      const product = await tx.product.findUnique({ where: { id: productId } });
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!product || !variant) {
        throw new Error("Product or variant not found.");
      }

      // 2. التحقق من توفر الكمية المطلوبة في المخزون
      if (variant.quantity < quantity) {
        throw new Error("Not enough quantity in stock.");
      }

      // 3. البحث عن سلة التسوق للمستخدم أو إنشاء واحدة جديدة إذا لم تكن موجودة
      let cart = await tx.cart.findFirst({
        where: { userId, status: "PENDING" },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: { userId: userId! },
        });
      }

      // 4. التحقق مما إذا كان المنتج (بنفس المتغير) موجودًا بالفعل في السلة
      const existingCartItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          variantId,
        },
      });

      if (existingCartItem) {
        // إذا كان موجودًا، قم بتحديث الكمية
        await tx.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + quantity },
        });
      } else {
        // إذا لم يكن موجودًا، قم بإنشاء عنصر جديد في السلة
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            variantId,
            quantity,
            price: product.price,
          },
        });
      }

      // 5. تحديث كمية المتغير في المخزون
      await tx.productVariant.update({
        where: { id: variantId },
        data: { quantity: variant.quantity - quantity },
      });

      // 6. إعادة حساب إجمالي السلة وتحديثها
      const total = await calculateCartTotal(cart.id);
      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: { total },
        include: {
          cartItems: {
            include: { product: true, variant: true },
          },
        },
      });

      return updatedCart;
    });

    res.status(200).json({
      success: true,
      message: "Product added to cart successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add product to cart.",
    });
  }
};

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;

  try {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: "PENDING" },
      include: {
        cartItems: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Your cart is empty.",
        data: null,
      });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve cart.",
    });
  }
};

/**
 * @desc    Update item quantity in cart
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
export const updateCartItemQuantity = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  const userId = req.user?.userId;

  if (!quantity || quantity < 1) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide a valid quantity." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { id: parseInt(itemId) },
        include: { cart: true, variant: true },
      });

      if (!cartItem || cartItem.cart.userId !== userId) {
        throw new Error("Cart item not found or you are not authorized.");
      }
      if (!cartItem.variant) {
        throw new Error("Product variant details not found.");
      }

      const quantityDiff = quantity - cartItem.quantity;
      const totalAvailableStock = cartItem.variant.quantity + cartItem.quantity;

      if (quantity > totalAvailableStock) {
        throw new Error("Not enough stock for the requested quantity.");
      }

      await tx.productVariant.update({
        where: { id: cartItem.variantId! },
        data: { quantity: { decrement: quantityDiff } },
      });

      await tx.cartItem.update({
        where: { id: parseInt(itemId) },
        data: { quantity },
      });

      const total = await calculateCartTotal(cartItem.cartId);
      const updatedCart = await tx.cart.update({
        where: { id: cartItem.cartId },
        data: { total },
        include: {
          cartItems: {
            include: { product: true, variant: true },
          },
        },
      });

      return updatedCart;
    });

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update cart item.",
    });
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
export const removeCartItem = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { itemId } = req.params;
  const userId = req.user?.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { id: parseInt(itemId) },
        include: { cart: true },
      });

      if (!cartItem || cartItem.cart.userId !== userId) {
        throw new Error("Cart item not found or you are not authorized.");
      }

      await tx.productVariant.update({
        where: { id: cartItem.variantId! },
        data: { quantity: { increment: cartItem.quantity } },
      });

      await tx.cartItem.delete({ where: { id: parseInt(itemId) } });

      const total = await calculateCartTotal(cartItem.cartId);
      const updatedCart = await tx.cart.update({
        where: { id: cartItem.cartId },
        data: { total },
        include: {
          cartItems: {
            include: { product: true, variant: true },
          },
        },
      });
      return updatedCart;
    });

    res.status(200).json({
      success: true,
      message: "Item removed from cart.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove item from cart.",
    });
  }
};

/**
 * @desc    Clear all items from cart
 * @route   DELETE /api/cart
 * @access  Private
 */
export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: "PENDING" },
        include: { cartItems: true },
      });

      if (!cart) {
        throw new Error("Cart not found.");
      }

      // إرجاع كميات المنتجات إلى المخزون
      for (const item of cart.cartItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: { total: 0 },
      });

      return updatedCart;
    });

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear cart.",
    });
  }
};

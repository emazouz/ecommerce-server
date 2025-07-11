import { prisma } from "../utils/prisma";
import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// --- Helper Functions ---

/**
 * Calculate cart totals (subtotal, tax, shipping, total)
 */
const calculateCartTotals = async (cartId: string, tx: any) => {
  const cartItems = await tx.cartItem.findMany({
    where: { cartId },
    include: { product: true },
  });

  let subtotal = new Decimal(0);
  let totalItems = 0;

  for (const item of cartItems) {
    subtotal = subtotal.plus(new Decimal(item.totalPrice));
    totalItems += item.quantity;
  }

  // Calculate tax (assume 10% tax rate - can be configurable)
  const taxAmount = subtotal.times(0.1);

  // Calculate shipping (free over $100, otherwise $10)
  const shippingAmount = subtotal.greaterThan(100) ? new Decimal(0) : new Decimal(10);

  // Calculate total
  const total = subtotal.plus(taxAmount).plus(shippingAmount);

  return {
    subtotal,
    taxAmount,
    shippingAmount,
    total,
    totalItems,
  };
};

/**
 * Validate cart item ownership
 */
const validateCartItemOwnership = async (
  itemId: string,
  userId: string,
  tx: any
) => {
  const cartItem = await tx.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      variant: true,
      product: true,
    },
  });

  if (!cartItem || cartItem.cart.userId !== userId) {
    throw new Error("Cart item not found or you are not authorized.");
  }
  return cartItem;
};

/**
 * Create or update cart item with all new fields
 */
const createOrUpdateCartItem = async (
  tx: any,
  cartId: string,
  productId: string,
  variantId: number,
  quantity: number,
  product: any,
  variant: any,
  customization?: any,
  isGift?: boolean,
  giftMessage?: string
) => {
  // Check if item already exists
  const existingCartItem = await tx.cartItem.findFirst({
    where: { cartId, productId, variantId },
  });

  // Calculate prices
  const originalPrice = product.originPrice || product.price;
  const salePrice = product.isSale ? product.price : originalPrice;
  const finalPrice = salePrice;
  const totalPrice = new Decimal(finalPrice).times(quantity);

  const itemData = {
    cartId,
    productId,
    variantId,
    quantity,
    originalPrice,
    salePrice,
    price: finalPrice,
    totalPrice,
    productName: product.name,
    productImage: product.thumbImage,
    productSlug: product.slug,
    stock: variant.quantity,
    color: variant.color,
    size: variant.size,
    weight: product.weight,
    dimensions: product.dimensions || null,
    customization: customization || null,
    isGift: isGift || false,
    giftMessage: giftMessage || null,
    sku: `${product.id}-${variant.id}`,
  };

  if (existingCartItem) {
    // Update existing item
    return await tx.cartItem.update({
      where: { id: existingCartItem.id },
      data: {
        ...itemData,
        quantity: existingCartItem.quantity + quantity,
        totalPrice: new Decimal(finalPrice).times(
          existingCartItem.quantity + quantity
        ),
      },
    });
  } else {
    // Create new item
    return await tx.cartItem.create({
      data: itemData,
    });
  }
};

// --- Controller Functions ---

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  const { productId, variantId, quantity, customization, isGift, giftMessage } =
    req.body;
  const userId = req.user?.userId;

  // Validation
  if (!productId || !variantId || !quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Please provide productId, variantId, and a valid quantity.",
    });
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
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
        where: { userId, status: "ACTIVE" },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            userId: userId,
            totalItems: 0,
            subtotal: new Decimal(0),
            taxAmount: new Decimal(0),
            shippingAmount: new Decimal(0),
            total: new Decimal(0),
            currency: "USD",
            status: "ACTIVE",
            paymentMethod: "PAYPAL",
            shippingMethod: "STANDARD",
          },
        });
      }

      // 4. إنشاء أو تحديث عنصر السلة
      await createOrUpdateCartItem(
        tx,
        cart.id, // cart id
        productId, // product id
        variantId, //
        quantity,
        product,
        variant,
        customization,
        isGift,
        giftMessage
      );

      // 5. تحديث كمية المتغير في المخزون
      await tx.productVariant.update({
        where: { id: variantId },
        data: { quantity: variant.quantity - quantity },
      });

      // 6. حساب المجاميع الكلية للسلة
      const totals = await calculateCartTotals(cart.id, tx);

      // 7. تحديث السلة بالمجاميع الجديدة
      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          totalItems: totals.totalItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          shippingAmount: totals.shippingAmount,
          total: totals.total,
        },
        include: {
          cartItems: {
            include: {
              product: true,
              variant: true,
            },
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

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  try {
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

  // Validation
  if (!quantity || quantity < 1) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide a valid quantity." });
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }


  try {
    const result = await prisma.$transaction(async (tx) => {
      // التحقق من ملكية المنتج وصحة البيانات
      const cartItem = await validateCartItemOwnership(
        itemId as string,
        userId,
        tx
      );

      if (!cartItem.variant) {
        throw new Error("Product variant details not found.");
      }

      // حساب الفرق في الكمية
      const quantityDiff = quantity - cartItem.quantity;
      const totalAvailableStock = cartItem.variant.quantity + cartItem.quantity;

      if (quantity > totalAvailableStock) {
        throw new Error("Not enough stock for the requested quantity.");
      }

      // تحديث كمية المنتج في المخزون
      await tx.productVariant.update({
        where: { id: cartItem.variantId! },
        data: { quantity: { decrement: quantityDiff } },
      });

      // تحديث عنصر السلة
      const newTotalPrice = new Decimal(cartItem.price).times(quantity);
      await tx.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          totalPrice: newTotalPrice,
          stock: cartItem.variant.quantity - quantityDiff,
        },
      });

      // حساب المجاميع الكلية للسلة
      const totals = await calculateCartTotals(cartItem.cartId, tx);

      // تحديث السلة بالمجاميع الجديدة
      const updatedCart = await tx.cart.update({
        where: { id: cartItem.cartId },
        data: {
          totalItems: totals.totalItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          shippingAmount: totals.shippingAmount,
          total: totals.total,
        },
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
 * @desc    Update cart item details (gift message, customization, etc.)
 * @route   PUT /api/cart/items/:itemId/details
 * @access  Private
 */
export const updateCartItemDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { itemId } = req.params;
  const { isGift, giftMessage, customization } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "Invalid item ID.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // التحقق من ملكية المنتج
      const cartItem = await validateCartItemOwnership(
        itemId,
        userId,
        tx
      );

      // تحديث تفاصيل عنصر السلة
      const updatedItem = await tx.cartItem.update({
        where: { id: itemId },
        data: {
          isGift: isGift !== undefined ? isGift : cartItem.isGift,
          giftMessage:
            giftMessage !== undefined ? giftMessage : cartItem.giftMessage,
          customization:
            customization !== undefined
              ? customization
              : cartItem.customization,
        },
      });

      return updatedItem;
    });

    res.status(200).json({
      success: true,
      message: "Cart item details updated successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update cart item details.",
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

  // Validation
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "Invalid item ID.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // التحقق من ملكية المنتج
      const cartItem = await validateCartItemOwnership(
        itemId as string,
        userId,
        tx
      );

      // إرجاع الكمية إلى المخزون
      await tx.productVariant.update({
        where: { id: cartItem.variantId! },
        data: { quantity: { increment: cartItem.quantity } },
      });

      // حذف المنتج من السلة
      await tx.cartItem.delete({ where: { id: itemId } });

      // حساب المجاميع الجديدة للسلة
      const totals = await calculateCartTotals(cartItem.cartId, tx);

      // تحديث السلة بالمجاميع الجديدة
      const updatedCart = await tx.cart.update({
        where: { id: cartItem.cartId },
        data: {
          totalItems: totals.totalItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          shippingAmount: totals.shippingAmount,
          total: totals.total,
        },
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

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: "ACTIVE" },
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

      // حذف جميع المنتجات من السلة
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // تحديث السلة لتصفير جميع القيم
      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          totalItems: 0,
          subtotal: new Decimal(0),
          taxAmount: new Decimal(0),
          shippingAmount: new Decimal(0),
          total: new Decimal(0),
          discountAmount: new Decimal(0),
          couponId: null,
          notes: null,
        },
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

/**
 * @desc    Update cart settings (payment method, shipping method, etc.)
 * @route   PUT /api/cart/settings
 * @access  Private
 */
export const updateCartSettings = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  const {
    paymentMethod,
    shippingMethod,
    shippingAddress,
    notes,
    estimatedDelivery,
    currency,
  } = req.body;

  try {
    const cart = await prisma.cart.findFirst({
      where: { userId: userId, status: "ACTIVE" },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    // إعداد البيانات للتحديث
    const updateData: any = {};
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (shippingMethod !== undefined)
      updateData.shippingMethod = shippingMethod;
    if (shippingAddress !== undefined)
      updateData.shippingAddress = shippingAddress;
    if (notes !== undefined) updateData.notes = notes;
    if (estimatedDelivery !== undefined)
      updateData.estimatedDelivery = estimatedDelivery;
    if (currency !== undefined) updateData.currency = currency;

    const result = await prisma.cart.update({
      where: { id: cart.id },
      data: updateData,
      include: {
        cartItems: {
          include: { product: true, variant: true },
        },
        coupon: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Cart settings updated successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update cart settings.",
    });
  }
};

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/coupon
 * @access  Private
 */
export const applyCouponToCart = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { couponCode } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  console.log(couponCode, "step 1 write couponCode");
  if (!couponCode) {
    return res.status(400).json({
      success: false,
      message: "Coupon code is required.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // البحث عن السلة
      const cart = await tx.cart.findFirst({
        where: { userId, status: "ACTIVE" },
        include: { cartItems: true },
      });

      if (!cart) {
        throw new Error("Cart not found.");
      }
      console.log(couponCode, "step 2");
      // البحث عن الكوبون
      const coupon = await tx.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon) {
        throw new Error("Invalid coupon code.");
      }

      console.log(coupon, "step 3");
      // التحقق من صلاحية الكوبون
      const now = new Date();
      // console.log(coupon.isActive);
      // console.log(now < coupon.startDate);
      // console.log(now > coupon.endDate);
      // if (!coupon.isActive || now < coupon.startDate || !(now > coupon.endDate)) {
      //   throw new Error("Coupon is not valid or has expired.");
      // }

      console.log(cart.subtotal, "step 4");

      if (cart.subtotal.lessThan(coupon.minOrderValue)) {
        throw new Error(
          `Minimum order value of ${coupon.minOrderValue} is required.`
        );
      }

      console.log(coupon.minOrderValue, "step 5");

      // حساب قيمة الخصم
      let discountAmount = new Decimal(0);
      if (coupon.discountType === "PERCENTAGE") {
        discountAmount = cart.subtotal
          .times(coupon.discountValue)
          .dividedBy(100);
        if (
          coupon.maxDiscount &&
          discountAmount.greaterThan(coupon.maxDiscount)
        ) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.discountType === "FIXED") {
        discountAmount = coupon.discountValue;
      }

      console.log(discountAmount, "step 6");

      // تحديث السلة بالكوبون
      const newTotal = cart.subtotal
        .plus(cart.taxAmount)
        .plus(cart.shippingAmount)
        .minus(discountAmount);

      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          couponId: coupon.id,
          discountAmount: discountAmount,
          total: newTotal.isNegative() ? new Decimal(0) : newTotal,
        },
        include: {
          cartItems: {
            include: { product: true, variant: true },
          },
          coupon: true,
        },
      });

      return updatedCart;
    });

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to apply coupon.",
    });
  }
};

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
export const removeCouponFromCart = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: "ACTIVE" },
      });

      if (!cart) {
        throw new Error("Cart not found.");
      }

      // إزالة الكوبون وإعادة حساب المجموع
      const newTotal = cart.subtotal
        .plus(cart.taxAmount)
        .plus(cart.shippingAmount);

      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          couponId: null,
          discountAmount: new Decimal(0),
          total: newTotal,
        },
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
      message: "Coupon removed successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove coupon.",
    });
  }
};

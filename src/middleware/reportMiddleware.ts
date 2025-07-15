import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/ApiError";

// التحقق من صلاحيات الإدارة
export const checkAdminRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير موجود",
      });
      return;
    }

    if (user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "يجب أن تكون مدير للوصول إلى هذا المورد",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error in checkAdminRole:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في التحقق من الصلاحيات",
    });
  }
};

// التحقق من ملكية التقرير أو صلاحيات الإدارة
export const checkReportOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const reportId = req.params.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    if (!reportId) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير موجود",
      });
      return;
    }

    // إذا كان المستخدم مدير، يمكنه الوصول لجميع التقارير
    if (user.role === "ADMIN") {
      next();
      return;
    }

    // التحقق من ملكية التقرير
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { generatedBy: true },
    });

    if (!report) {
      res.status(404).json({
        success: false,
        message: "التقرير غير موجود",
      });
      return;
    }

    if (report.generatedBy !== userId) {
      res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية للوصول إلى هذا التقرير",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error in checkReportOwnership:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في التحقق من الصلاحيات",
    });
  }
};

// التحقق من صحة معايير التقرير
export const validateReportFilters = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { startDate, endDate, categoryId, productId, lowStockThreshold } =
      req.body;

    // التحقق من التواريخ
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        res.status(400).json({
          success: false,
          message: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        });
        return;
      }

      // التحقق من أن التاريخ ليس في المستقبل
      const now = new Date();
      if (start > now || end > now) {
        res.status(400).json({
          success: false,
          message: "التواريخ لا يمكن أن تكون في المستقبل",
        });
        return;
      }
    }

    // التحقق من معرف الفئة
    if (categoryId && (isNaN(categoryId) || categoryId <= 0)) {
      res.status(400).json({
        success: false,
        message: "معرف الفئة غير صحيح",
      });
      return;
    }

    // التحقق من معرف المنتج
    if (productId && typeof productId !== "string") {
      res.status(400).json({
        success: false,
        message: "معرف المنتج غير صحيح",
      });
      return;
    }

    // التحقق من حد المخزون المنخفض
    if (
      lowStockThreshold &&
      (isNaN(lowStockThreshold) || lowStockThreshold < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "حد المخزون المنخفض غير صحيح",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error in validateReportFilters:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في التحقق من معايير التقرير",
    });
  }
};

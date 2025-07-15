import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { ReportService } from "../services/reportService";
import { ApiError } from "../utils/ApiError";
import { ReportFormatter } from "../utils/reportHelpers";
import { ReportType, FileFormat } from "@prisma/client";
import {
  SalesReportFilters,
  InventoryReportFilters,
  UserActivityReportFilters,
} from "../types/reportTypes";

// إنشاء تقرير جديد
export const createReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, reportType, format, filters, expiresAt } = req.body;
    const generatedBy = req.user?.userId;

    if (!generatedBy) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    if (!name || !reportType) {
      res.status(400).json({
        success: false,
        message: "الحقول المطلوبة مفقودة: name, reportType",
      });
      return;
    }

    // التحقق من صحة نوع التقرير
    if (!Object.values(ReportType).includes(reportType)) {
      res.status(400).json({
        success: false,
        message: "نوع التقرير غير صحيح",
      });
      return;
    }

    // التحقق من صحة تنسيق الملف
    if (format && !Object.values(FileFormat).includes(format)) {
      res.status(400).json({
        success: false,
        message: "تنسيق الملف غير صحيح",
      });
      return;
    }

    const report = await ReportService.createReport({
      name,
      reportType,
      format,
      filters,
      generatedBy,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in createReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// جلب جميع التقارير
export const getReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      reportType,
      status,
      generatedBy,
      startDate,
      endDate,
      format,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      reportType: reportType as ReportType,
      status: status as any,
      generatedBy: generatedBy as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      format: format as FileFormat,
    };

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await ReportService.getReports(filters, pagination);

    res.json({
      success: true,
      data: result,
      message: "تم جلب التقارير بنجاح",
    });
  } catch (error) {
    console.error("Error in getReports:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// جلب تقرير واحد
export const getReportById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const report = await ReportService.getReportById(id);

    res.json({
      success: true,
      data: report,
      message: "تم جلب التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in getReportById:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// تحديث التقرير
export const updateReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, status, data, downloadUrl, expiresAt } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const updateData = {
      name,
      status,
      data,
      downloadUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const report = await ReportService.updateReport(id, updateData);

    res.json({
      success: true,
      data: report,
      message: "تم تحديث التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in updateReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// حذف التقرير
export const deleteReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    await ReportService.deleteReport(id);

    res.json({
      success: true,
      message: "تم حذف التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// إنشاء تقرير المبيعات
export const generateSalesReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      categoryId,
      productId,
      paymentMethod,
      orderStatus,
    } = req.body;
    const generatedBy = req.user?.userId;

    if (!generatedBy) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    const filters: SalesReportFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      productId,
      paymentMethod,
      orderStatus,
    };

    const report = await ReportService.createReport({
      name: `تقرير المبيعات - ${new Date().toISOString().split("T")[0]}`,
      reportType: ReportType.SALES,
      format: FileFormat.JSON,
      filters,
      generatedBy,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء تقرير المبيعات بنجاح",
    });
  } catch (error) {
    console.error("Error in generateSalesReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// إنشاء تقرير المخزون
export const generateInventoryReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { categoryId, lowStockThreshold, includeOutOfStock, sortBy } =
      req.body;
    const generatedBy = req.user?.userId;

    if (!generatedBy) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    const filters: InventoryReportFilters = {
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      lowStockThreshold: lowStockThreshold
        ? parseInt(lowStockThreshold)
        : undefined,
      includeOutOfStock: includeOutOfStock === "true",
      sortBy: sortBy as "stock" | "value" | "sales",
    };

    const report = await ReportService.createReport({
      name: `تقرير المخزون - ${new Date().toISOString().split("T")[0]}`,
      reportType: ReportType.INVENTORY,
      format: FileFormat.JSON,
      filters,
      generatedBy,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء تقرير المخزون بنجاح",
    });
  } catch (error) {
    console.error("Error in generateInventoryReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// إنشاء تقرير نشاط المستخدمين
export const generateUserActivityReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, role, includeInactive, minOrders, minSpent } =
      req.body;
    const generatedBy = req.user?.userId;

    if (!generatedBy) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    const filters: UserActivityReportFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      role,
      includeInactive: includeInactive === "true",
      minOrders: minOrders ? parseInt(minOrders) : undefined,
      minSpent: minSpent ? parseFloat(minSpent) : undefined,
    };

    const report = await ReportService.createReport({
      name: `تقرير نشاط المستخدمين - ${new Date().toISOString().split("T")[0]}`,
      reportType: ReportType.USER_ACTIVITY,
      format: FileFormat.JSON,
      filters,
      generatedBy,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء تقرير نشاط المستخدمين بنجاح",
    });
  } catch (error) {
    console.error("Error in generateUserActivityReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// تنظيف التقارير المنتهية الصلاحية
export const cleanupExpiredReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await ReportService.cleanupExpiredReports();

    res.json({
      success: true,
      data: result,
      message: `تم حذف ${result.deletedCount} تقرير منتهي الصلاحية`,
    });
  } catch (error) {
    console.error("Error in cleanupExpiredReports:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// الحصول على إحصائيات التقارير
export const getReportStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // يمكن إضافة منطق لحساب الإحصائيات
    const stats = {
      totalReports: 0,
      reportsByType: {},
      reportsByStatus: {},
      recentActivity: [],
    };

    res.json({
      success: true,
      data: stats,
      message: "تم جلب إحصائيات التقارير بنجاح",
    });
  } catch (error) {
    console.error("Error in getReportStats:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// تحميل التقرير بتنسيق مختلف
export const downloadReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const report = await ReportService.getReportById(id);
    let content: string;
    let mimeType: string;
    let fileName: string;

    const requestedFormat = (format as FileFormat) || report.format;

    switch (requestedFormat) {
      case FileFormat.CSV:
        content = ReportFormatter.toCSV(report.data, report.reportType);
        mimeType = ReportFormatter.getMimeType(FileFormat.CSV);
        fileName = `${report.name.replace(/\s+/g, "_")}.csv`;
        break;
      case FileFormat.JSON:
        content = ReportFormatter.toJSON(report.data);
        mimeType = ReportFormatter.getMimeType(FileFormat.JSON);
        fileName = `${report.name.replace(/\s+/g, "_")}.json`;
        break;
      default:
        content = ReportFormatter.toJSON(report.data);
        mimeType = ReportFormatter.getMimeType(FileFormat.JSON);
        fileName = `${report.name.replace(/\s+/g, "_")}.json`;
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(content);
  } catch (error) {
    console.error("Error in downloadReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

// معاينة التقرير بتنسيق HTML
export const previewReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const report = await ReportService.getReportById(id);
    const htmlContent = ReportFormatter.toHTML(report.data, report.reportType);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
  } catch (error) {
    console.error("Error in previewReport:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    }
  }
};

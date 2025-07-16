import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { ReportService } from "../services/reportService";
import { ApiError } from "../utils/ApiError";
import { ReportFormatter } from "../utils/reportHelpers";
import {
  CustomerReportType,
  AdminReportType,
  AnalyticalReportType,
  ReportStatus,
  ReportPriority,
  FileFormat,
  JobStatus,
} from "@prisma/client";
import { CreateAdminReportData } from "../types/reportTypes";

// ==============================================================================
// تقارير العملاء (Customer Reports)
// ==============================================================================

// إنشاء تقرير عميل جديد
export const createCustomerReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      type,
      title,
      description,
      priority,
      targetId,
      targetType,
      attachments,
      metadata,
    } = req.body;
    const reporterId = req.user?.userId;

    if (!reporterId) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    if (!type || !title || !description) {
      res.status(400).json({
        success: false,
        message: "الحقول المطلوبة مفقودة: type, title, description",
      });
      return;
    }

    // التحقق من صحة نوع التقرير
    if (!Object.values(CustomerReportType).includes(type)) {
      res.status(400).json({
        success: false,
        message: "نوع التقرير غير صحيح",
      });
      return;
    }

    const report = await ReportService.Customer.createCustomerReport({
      reporterId,
      type,
      title,
      description,
      priority,
      targetId,
      targetType,
      attachments,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in createCustomerReport:", error);
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

// جلب تقارير العملاء
export const getCustomerReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      reporterId,
      type,
      status,
      priority,
      targetType,
      reviewedBy,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      reporterId: reporterId as string,
      type: type as CustomerReportType,
      status: status as ReportStatus,
      priority: priority as ReportPriority,
      targetType: targetType as string,
      reviewedBy: reviewedBy as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await ReportService.Customer.getCustomerReports(
      filters,
      pagination
    );

    res.json({
      success: true,
      data: result,
      message: "تم جلب تقارير العملاء بنجاح",
    });
  } catch (error) {
    console.error("Error in getCustomerReports:", error);
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

// جلب تقرير عميل واحد
export const getCustomerReportById = async (
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

    const report = await ReportService.Customer.getCustomerReportById(id);

    res.json({
      success: true,
      data: report,
      message: "تم جلب التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in getCustomerReportById:", error);
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

// تحديث تقرير عميل
export const updateCustomerReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reviewedBy, response, priority } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const updateData = {
      status,
      reviewedBy,
      response,
      priority,
    };

    const report = await ReportService.Customer.updateCustomerReport(
      id,
      updateData
    );

    res.json({
      success: true,
      data: report,
      message: "تم تحديث التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in updateCustomerReport:", error);
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

// حذف تقرير عميل
export const deleteCustomerReport = async (
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

    await ReportService.Customer.deleteCustomerReport(id);

    res.json({
      success: true,
      message: "تم حذف التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteCustomerReport:", error);
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

// ==============================================================================
// تقارير الموظفين (Admin Reports)
// ==============================================================================

// إنشاء تقرير موظف جديد
export const createAdminReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      type,
      title,
      description,
      priority,
      relatedUserId,
      relatedOrderId,
      relatedProductId,
      attachments,
      tags,
      metadata,
    } = req.body;
    const createdBy = req.user?.userId;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير مخول",
      });
      return;
    }

    if (!type || !title || !description) {
      res.status(400).json({
        success: false,
        message: "الحقول المطلوبة مفقودة: type, title, description",
      });
      return;
    }

    // التحقق من صحة نوع التقرير
    if (!Object.values(AdminReportType).includes(type)) {
      res.status(400).json({
        success: false,
        message: "نوع التقرير غير صحيح",
      });
      return;
    }

    // push all product in data object
    const data: CreateAdminReportData = {
      createdBy,
      type,
      title,
      description,
      priority,
      relatedUserId,
      relatedOrderId,
      relatedProductId,
      attachments: attachments || [],
      tags: tags || [],
      metadata: metadata || {},
    };

    const report = await ReportService.Admin.createAdminReport({ ...data });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in createAdminReport:", error);
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

// جلب تقارير الموظفين
export const getAdminReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      createdBy,
      type,
      status,
      priority,
      assignedTo,
      relatedUserId,
      startDate,
      endDate,
      tags,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      createdBy: createdBy as string,
      type: type as AdminReportType,
      status: status as ReportStatus,
      priority: priority as ReportPriority,
      assignedTo: assignedTo as string,
      relatedUserId: relatedUserId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      tags: tags ? (tags as string).split(",") : undefined,
    };

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await ReportService.Admin.getAdminReports(
      filters,
      pagination
    );

    res.json({
      success: true,
      data: result,
      message: "تم جلب تقارير الموظفين بنجاح",
    });
  } catch (error) {
    console.error("Error in getAdminReports:", error);
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

// جلب تقرير موظف واحد
export const getAdminReportById = async (
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

    const report = await ReportService.Admin.getAdminReportById(id);

    res.json({
      success: true,
      data: report,
      message: "تم جلب التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in getAdminReportById:", error);
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

// تحديث تقرير موظف
export const updateAdminReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, assignedTo, priority, tags, metadata } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "معرف التقرير مطلوب",
      });
      return;
    }

    const updateData = {
      status,
      assignedTo,
      priority,
      tags,
      metadata,
    };

    const report = await ReportService.Admin.updateAdminReport(id, updateData);

    res.json({
      success: true,
      data: report,
      message: "تم تحديث التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in updateAdminReport:", error);
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

// حذف تقرير موظف
export const deleteAdminReport = async (
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

    await ReportService.Admin.deleteAdminReport(id);

    res.json({
      success: true,
      message: "تم حذف التقرير بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteAdminReport:", error);
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

// ==============================================================================
// التقارير التحليلية (Analytical Reports)
// ==============================================================================

// إنشاء تقرير تحليلي جديد
export const createAnalyticalReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      reportType,
      format,
      filters,
      expiresAt,
      isScheduled,
      scheduleConfig,
      nextRunAt,
    } = req.body;
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
    if (!Object.values(AnalyticalReportType).includes(reportType)) {
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

    const report = await ReportService.Analytical.createAnalyticalReport({
      name,
      reportType,
      format,
      filters,
      generatedBy,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isScheduled,
      scheduleConfig,
      nextRunAt: nextRunAt ? new Date(nextRunAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "تم إنشاء التقرير التحليلي بنجاح",
    });
  } catch (error) {
    console.error("Error in createAnalyticalReport:", error);
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

// جلب التقارير التحليلية
export const getAnalyticalReports = async (
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
      isScheduled,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      reportType: reportType as AnalyticalReportType,
      status: status as JobStatus,
      generatedBy: generatedBy as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      format: format as FileFormat,
      isScheduled: isScheduled ? isScheduled === "true" : undefined,
    };

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await ReportService.Analytical.getAnalyticalReports(
      filters,
      pagination
    );

    res.json({
      success: true,
      data: result,
      message: "تم جلب التقارير التحليلية بنجاح",
    });
  } catch (error) {
    console.error("Error in getAnalyticalReports:", error);
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

// جلب تقرير تحليلي واحد
export const getAnalyticalReportById = async (
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

    const report = await ReportService.Analytical.getAnalyticalReportById(id);

    res.json({
      success: true,
      data: report,
      message: "تم جلب التقرير التحليلي بنجاح",
    });
  } catch (error) {
    console.error("Error in getAnalyticalReportById:", error);
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

// تحديث تقرير تحليلي
export const updateAnalyticalReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      status,
      data,
      downloadUrl,
      expiresAt,
      isScheduled,
      scheduleConfig,
      nextRunAt,
    } = req.body;

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
      isScheduled,
      scheduleConfig,
      nextRunAt: nextRunAt ? new Date(nextRunAt) : undefined,
    };

    const report = await ReportService.Analytical.updateAnalyticalReport(
      id,
      updateData
    );

    res.json({
      success: true,
      data: report,
      message: "تم تحديث التقرير التحليلي بنجاح",
    });
  } catch (error) {
    console.error("Error in updateAnalyticalReport:", error);
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

// حذف تقرير تحليلي
export const deleteAnalyticalReport = async (
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

    await ReportService.Analytical.deleteAnalyticalReport(id);

    res.json({
      success: true,
      message: "تم حذف التقرير التحليلي بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteAnalyticalReport:", error);
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

// ==============================================================================
// الوظائف المشتركة والإحصائيات
// ==============================================================================

// الحصول على إحصائيات التقارير
export const getReportStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await ReportService.Stats.getReportStats();

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

// تحميل تقرير تحليلي بتنسيق مختلف
export const downloadAnalyticalReport = async (
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

    const report = await ReportService.Analytical.getAnalyticalReportById(id);
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
      case FileFormat.HTML:
        content = ReportFormatter.toHTML(report.data, report.reportType);
        mimeType = ReportFormatter.getMimeType(FileFormat.HTML);
        fileName = `${report.name.replace(/\s+/g, "_")}.html`;
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
    console.error("Error in downloadAnalyticalReport:", error);
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

// معاينة تقرير تحليلي بتنسيق HTML
export const previewAnalyticalReport = async (
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

    const report = await ReportService.Analytical.getAnalyticalReportById(id);
    const htmlContent = ReportFormatter.toHTML(report.data, report.reportType);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
  } catch (error) {
    console.error("Error in previewAnalyticalReport:", error);
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

// تنظيف التقارير التحليلية المنتهية الصلاحية
export const cleanupExpiredAnalyticalReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await ReportService.Analytical.cleanupExpiredReports();

    res.json({
      success: true,
      data: result,
      message: `تم حذف ${result.deletedCount} تقرير تحليلي منتهي الصلاحية`,
    });
  } catch (error) {
    console.error("Error in cleanupExpiredAnalyticalReports:", error);
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

// ==============================================================================
// الوظائف القديمة للتوافق مع الأمام (Deprecated)
// ==============================================================================

// إنشاء تقرير (deprecated - استخدم createAnalyticalReport بدلاً منه)
export const createReport = createAnalyticalReport;

// جلب جميع التقارير (deprecated - استخدم getAnalyticalReports بدلاً منه)
export const getReports = getAnalyticalReports;

// جلب تقرير واحد (deprecated - استخدم getAnalyticalReportById بدلاً منه)
export const getReportById = getAnalyticalReportById;

// تحديث التقرير (deprecated - استخدم updateAnalyticalReport بدلاً منه)
export const updateReport = updateAnalyticalReport;

// حذف التقرير (deprecated - استخدم deleteAnalyticalReport بدلاً منه)
export const deleteReport = deleteAnalyticalReport;

// تحميل التقرير (deprecated - استخدم downloadAnalyticalReport بدلاً منه)
export const downloadReport = downloadAnalyticalReport;

// معاينة التقرير (deprecated - استخدم previewAnalyticalReport بدلاً منه)
export const previewReport = previewAnalyticalReport;

// تنظيف التقارير المنتهية الصلاحية (deprecated - استخدم cleanupExpiredAnalyticalReports بدلاً منه)
export const cleanupExpiredReports = cleanupExpiredAnalyticalReports;

// إنشاء تقرير المبيعات (deprecated - استخدم createAnalyticalReport مع النوع SALES)
export const generateSalesReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  req.body.reportType = AnalyticalReportType.SALES;
  req.body.name = `تقرير المبيعات - ${new Date().toISOString().split("T")[0]}`;
  await createAnalyticalReport(req, res);
};

// إنشاء تقرير المخزون (deprecated - استخدم createAnalyticalReport مع النوع INVENTORY)
export const generateInventoryReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  req.body.reportType = AnalyticalReportType.INVENTORY;
  req.body.name = `تقرير المخزون - ${new Date().toISOString().split("T")[0]}`;
  await createAnalyticalReport(req, res);
};

// إنشاء تقرير نشاط المستخدمين (deprecated - استخدم createAnalyticalReport مع النوع USER_ACTIVITY)
export const generateUserActivityReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  req.body.reportType = AnalyticalReportType.USER_ACTIVITY;
  req.body.name = `تقرير نشاط المستخدمين - ${
    new Date().toISOString().split("T")[0]
  }`;
  await createAnalyticalReport(req, res);
};

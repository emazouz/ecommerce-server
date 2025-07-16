import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import {
  checkAdminRole,
  checkReportOwnership,
  validateReportFilters,
} from "../middleware/reportMiddleware";
import {
  // تقارير العملاء
  createCustomerReport,
  getCustomerReports,
  getCustomerReportById,
  updateCustomerReport,
  deleteCustomerReport,

  // تقارير الموظفين
  createAdminReport,
  getAdminReports,
  getAdminReportById,
  updateAdminReport,
  deleteAdminReport,

  // التقارير التحليلية
  createAnalyticalReport,
  getAnalyticalReports,
  getAnalyticalReportById,
  updateAnalyticalReport,
  deleteAnalyticalReport,
  downloadAnalyticalReport,
  previewAnalyticalReport,
  cleanupExpiredAnalyticalReports,

  // الوظائف المشتركة
  getReportStats,

  // الوظائف القديمة للتوافق مع الأمام
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  downloadReport,
  previewReport,
  cleanupExpiredReports,
  generateSalesReport,
  generateInventoryReport,
  generateUserActivityReport,
} from "../controllers/reportController";

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authenticateJwt);

// ==============================================================================
// مسارات تقارير العملاء (Customer Reports)
// ==============================================================================

// إنشاء تقرير عميل جديد
router.post("/customer", createCustomerReport);

// جلب تقارير العملاء
router.get("/customer", getCustomerReports);

// جلب تقرير عميل واحد
router.get("/customer/:id", getCustomerReportById);

// تحديث تقرير عميل (للموظفين فقط)
router.put("/customer/:id", checkAdminRole, updateCustomerReport);

// حذف تقرير عميل (للموظفين فقط)
router.delete("/customer/:id", checkAdminRole, deleteCustomerReport);

// ==============================================================================
// مسارات تقارير الموظفين (Admin Reports)
// ==============================================================================

// إنشاء تقرير موظف جديد (للموظفين فقط)
router.post("/admin", checkAdminRole, createAdminReport);

// جلب تقارير الموظفين (للموظفين فقط)
router.get("/admin", checkAdminRole, getAdminReports);

// جلب تقرير موظف واحد (للموظفين فقط)
router.get("/admin/:id", checkAdminRole, getAdminReportById);

// تحديث تقرير موظف (للموظفين فقط)
router.put("/admin/:id", checkAdminRole, updateAdminReport);

// حذف تقرير موظف (للموظفين فقط)
router.delete("/admin/:id", checkAdminRole, deleteAdminReport);

// ==============================================================================
// مسارات التقارير التحليلية (Analytical Reports)
// ==============================================================================

// إنشاء تقرير تحليلي جديد (للموظفين فقط)
router.post(
  "/analytical",
  checkAdminRole,
  validateReportFilters,
  createAnalyticalReport
);

// جلب التقارير التحليلية (للموظفين فقط)
router.get("/analytical", checkAdminRole, getAnalyticalReports);

// جلب تقرير تحليلي واحد (للموظفين فقط)
router.get("/analytical/:id", checkAdminRole, getAnalyticalReportById);

// تحديث تقرير تحليلي (للموظفين فقط)
router.put("/analytical/:id", checkAdminRole, updateAnalyticalReport);

// حذف تقرير تحليلي (للموظفين فقط)
router.delete("/analytical/:id", checkAdminRole, deleteAnalyticalReport);

// تحميل تقرير تحليلي (للموظفين فقط)
router.get(
  "/analytical/:id/download",
  checkAdminRole,
  downloadAnalyticalReport
);

// معاينة تقرير تحليلي (للموظفين فقط)
router.get("/analytical/:id/preview", checkAdminRole, previewAnalyticalReport);

// ==============================================================================
// المسارات المشتركة والإحصائيات
// ==============================================================================

// جلب إحصائيات التقارير (للموظفين فقط)
router.get("/stats", checkAdminRole, getReportStats);

// تنظيف التقارير التحليلية المنتهية الصلاحية (للموظفين فقط)
router.post(
  "/analytical/cleanup",
  checkAdminRole,
  cleanupExpiredAnalyticalReports
);

// ==============================================================================
// مسارات التقارير التحليلية المحددة (للموظفين فقط)
// ==============================================================================

// إنشاء تقرير مبيعات
router.post(
  "/analytical/sales",
  checkAdminRole,
  validateReportFilters,
  generateSalesReport
);

// إنشاء تقرير مخزون
router.post(
  "/analytical/inventory",
  checkAdminRole,
  validateReportFilters,
  generateInventoryReport
);

// إنشاء تقرير نشاط المستخدمين
router.post(
  "/analytical/user-activity",
  checkAdminRole,
  validateReportFilters,
  generateUserActivityReport
);

// ==============================================================================
// المسارات القديمة للتوافق مع الأمام (Deprecated)
// ==============================================================================

// المسارات الأساسية للتقارير (deprecated - استخدم المسارات الجديدة)
router.post("/", checkAdminRole, createReport); // deprecated - استخدم /analytical
router.get("/", checkAdminRole, getReports); // deprecated - استخدم /analytical
router.get("/:id", checkAdminRole, getReportById); // deprecated - استخدم /analytical/:id
router.get("/:id/download", checkAdminRole, downloadReport); // deprecated - استخدم /analytical/:id/download
router.get("/:id/preview", checkAdminRole, previewReport); // deprecated - استخدم /analytical/:id/preview
router.put("/:id", checkAdminRole, updateReport); // deprecated - استخدم /analytical/:id
router.delete("/:id", checkAdminRole, deleteReport); // deprecated - استخدم /analytical/:id

// مسارات إنشاء التقارير المختلفة (deprecated - استخدم /analytical/sales, /analytical/inventory, etc.)
router.post(
  "/sales",
  checkAdminRole,
  validateReportFilters,
  generateSalesReport
);
router.post(
  "/inventory",
  checkAdminRole,
  validateReportFilters,
  generateInventoryReport
);
router.post(
  "/user-activity",
  checkAdminRole,
  validateReportFilters,
  generateUserActivityReport
);

// مسارات الإدارة (deprecated - استخدم /analytical/cleanup)
router.post("/cleanup", checkAdminRole, cleanupExpiredReports);

export default router;

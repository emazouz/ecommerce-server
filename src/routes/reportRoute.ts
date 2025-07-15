import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import {
  checkAdminRole,
  checkReportOwnership,
  validateReportFilters,
} from "../middleware/reportMiddleware";
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  generateSalesReport,
  generateInventoryReport,
  generateUserActivityReport,
  cleanupExpiredReports,
  getReportStats,
  downloadReport,
  previewReport,
} from "../controllers/reportController";

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authenticateJwt);

// المسارات الأساسية للتقارير
router.post("/", createReport); // إنشاء تقرير جديد
router.get("/", getReports); // جلب جميع التقارير
router.get("/stats", checkAdminRole, getReportStats); // إحصائيات التقارير (مدير فقط)
router.get("/:id", checkReportOwnership, getReportById); // جلب تقرير واحد
router.get("/:id/download", checkReportOwnership, downloadReport); // تحميل التقرير
router.get("/:id/preview", checkReportOwnership, previewReport); // معاينة التقرير
router.put("/:id", checkReportOwnership, updateReport); // تحديث التقرير
router.delete("/:id", checkReportOwnership, deleteReport); // حذف التقرير

// مسارات إنشاء التقارير المختلفة
router.post("/sales", validateReportFilters, generateSalesReport); // إنشاء تقرير المبيعات
router.post("/inventory", validateReportFilters, generateInventoryReport); // إنشاء تقرير المخزون
router.post(
  "/user-activity",
  validateReportFilters,
  generateUserActivityReport
); // إنشاء تقرير نشاط المستخدمين

// مسارات الإدارة
router.post("/cleanup", checkAdminRole, cleanupExpiredReports); // تنظيف التقارير المنتهية الصلاحية (مدير فقط)

export default router;

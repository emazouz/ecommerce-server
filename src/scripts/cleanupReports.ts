import { ReportService } from "../services/reportService";
import { prisma } from "../utils/prisma";
import cron from "node-cron";

// تنظيف التقارير المنتهية الصلاحية
const cleanupExpiredReports = async () => {
  try {
    console.log("Starting cleanup of expired reports...");

    const result = await ReportService.cleanupExpiredReports();

    console.log(
      `Cleanup completed. Deleted ${result.deletedCount} expired reports.`
    );

    // تسجيل العملية في قاعدة البيانات
    await logCleanupActivity(result.deletedCount);
  } catch (error) {
    console.error("Error during report cleanup:", error);
  }
};

// تسجيل نشاط التنظيف
const logCleanupActivity = async (deletedCount: number) => {
  try {
    // يمكن إضافة جدول للسجلات أو استخدام AdminLog
    console.log(
      `Cleanup activity logged: ${deletedCount} reports deleted at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("Error logging cleanup activity:", error);
  }
};

// تنظيف التقارير القديمة (أكثر من 30 يوماً)
const cleanupOldReports = async () => {
  try {
    console.log("Starting cleanup of old reports...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.report.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
        // لا تحذف التقارير المهمة أو المحفوظة
        // يمكن إضافة شرط isArchived: false
      },
    });

    console.log(
      `Old reports cleanup completed. Deleted ${result.count} old reports.`
    );

    await logCleanupActivity(result.count);
  } catch (error) {
    console.error("Error during old reports cleanup:", error);
  }
};

// تنظيف التقارير الفاشلة
const cleanupFailedReports = async () => {
  try {
    console.log("Starting cleanup of failed reports...");

    const result = await prisma.report.deleteMany({
      where: {
        status: "FAILED",
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // أقدم من يوم واحد
        },
      },
    });

    console.log(
      `Failed reports cleanup completed. Deleted ${result.count} failed reports.`
    );

    await logCleanupActivity(result.count);
  } catch (error) {
    console.error("Error during failed reports cleanup:", error);
  }
};

// تشغيل التنظيف يدوياً
export const runCleanup = async () => {
  await cleanupExpiredReports();
  await cleanupOldReports();
  await cleanupFailedReports();
};

// جدولة التنظيف التلقائي
export const scheduleCleanup = () => {
  // تشغيل كل يوم في الساعة 2:00 صباحاً
  cron.schedule("0 2 * * *", async () => {
    console.log("Running scheduled report cleanup...");
    await runCleanup();
  });

  // تشغيل كل أسبوع في يوم الأحد الساعة 3:00 صباحاً
  cron.schedule("0 3 * * 0", async () => {
    console.log("Running weekly report cleanup...");
    await cleanupOldReports();
  });

  console.log("Report cleanup scheduler initialized");
};

// إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  runCleanup()
    .then(() => {
      console.log("Manual cleanup completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Manual cleanup failed:", error);
      process.exit(1);
    });
}

import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/ApiError";
import { ReportType, FileFormat, JobStatus } from "@prisma/client";
import {
  CreateReportData,
  ReportResponse,
  ReportFilters,
  ReportPaginationParams,
  SalesReportData,
  InventoryReportData,
  UserActivityReportData,
  SalesReportFilters,
  InventoryReportFilters,
  UserActivityReportFilters,
  UpdateReportData,
} from "../types/reportTypes";

export class ReportService {
  // إنشاء تقرير جديد
  static async createReport(data: CreateReportData): Promise<ReportResponse> {
    try {
      let reportData: Record<string, any>;

      // تحديد نوع التقرير وجمع البيانات المطلوبة
      switch (data.reportType) {
        case ReportType.SALES:
          reportData = await this.generateSalesReport(
            data.filters as SalesReportFilters
          );
          break;
        case ReportType.INVENTORY:
          reportData = await this.generateInventoryReport(
            data.filters as InventoryReportFilters
          );
          break;
        case ReportType.USER_ACTIVITY:
          reportData = await this.generateUserActivityReport(
            data.filters as UserActivityReportFilters
          );
          break;
        default:
          throw new ApiError(400, "نوع التقرير غير مدعوم");
      }

      const report = await prisma.report.create({
        data: {
          name: data.name,
          reportType: data.reportType,
          format: data.format || FileFormat.JSON,
          data: reportData,
          filters: data.filters || {},
          generatedBy: data.generatedBy,
          expiresAt: data.expiresAt,
          status: JobStatus.COMPLETED,
        },
      });

      return {
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        status: report.status,
        data: report.data as Record<string, any>,
        filters: report.filters as Record<string, any>,
        generatedBy: report.generatedBy,
        downloadUrl: report.downloadUrl || undefined,
        expiresAt: report.expiresAt || undefined,
        createdAt: report.createdAt,
      };
    } catch (error) {
      console.error("Error creating report:", error);
      throw new ApiError(500, "فشل في إنشاء التقرير");
    }
  }

  // جمع بيانات تقرير المبيعات
  static async generateSalesReport(
    filters: SalesReportFilters = {}
  ): Promise<SalesReportData> {
    try {
      const whereClause: any = {};

      // تطبيق المرشحات
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      if (filters.paymentMethod) {
        whereClause.paymentMethod = filters.paymentMethod;
      }

      if (filters.orderStatus) {
        whereClause.orderStatus = filters.orderStatus;
      }

      // جلب إجمالي المبيعات والطلبات
      const ordersData = await prisma.order.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { totalAmount: true },
      });

      const totalOrders = ordersData._count.id || 0;
      const totalRevenue = Number(ordersData._sum.totalAmount || 0);

      // حساب متوسط قيمة الطلب
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // أفضل المنتجات مبيعاً
      const topProducts = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: whereClause,
        },
        _count: { productId: true },
        _sum: {
          quantity: true,
          price: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 10,
      });

      // جلب تفاصيل المنتجات
      const topProductsData = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          return {
            id: item.productId,
            name: product?.name || "منتج غير معروف",
            totalSales: item._sum.quantity || 0,
            revenue: Number(item._sum.price || 0),
          };
        })
      );

      // المبيعات حسب الفئة
      const salesByCategory = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: whereClause,
        },
        _sum: {
          quantity: true,
          price: true,
        },
      });

      // جمع البيانات حسب الفئة
      const categoryData = new Map<
        string,
        { totalSales: number; revenue: number }
      >();

      for (const item of salesByCategory) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { category: true },
        });

        if (product && product.category) {
          const categoryName = product.category.name;
          const current = categoryData.get(categoryName) || {
            totalSales: 0,
            revenue: 0,
          };

          categoryData.set(categoryName, {
            totalSales: current.totalSales + (item._sum.quantity || 0),
            revenue: current.revenue + Number(item._sum.price || 0),
          });
        }
      }

      const salesByCategoryArray = Array.from(categoryData.entries()).map(
        ([categoryName, data]) => ({
          categoryName,
          totalSales: data.totalSales,
          revenue: data.revenue,
        })
      );

      // المبيعات حسب التاريخ
      const salesByDate = await prisma.order.groupBy({
        by: ["createdAt"],
        where: whereClause,
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: {
          createdAt: "desc",
        },
      });

      const salesByDateArray = salesByDate.map((item) => ({
        date: item.createdAt.toISOString().split("T")[0],
        totalSales: item._count.id || 0,
        revenue: Number(item._sum.totalAmount || 0),
      }));

      // طرق الدفع
      const paymentMethods = await prisma.order.groupBy({
        by: ["paymentMethod"],
        where: whereClause,
        _count: { paymentMethod: true },
        _sum: { totalAmount: true },
      });

      const paymentMethodsArray = paymentMethods.map((item) => ({
        method: item.paymentMethod,
        count: item._count.paymentMethod || 0,
        totalAmount: Number(item._sum.totalAmount || 0),
      }));

      return {
        totalSales: totalOrders,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        topProducts: topProductsData,
        salesByCategory: salesByCategoryArray,
        salesByDate: salesByDateArray,
        paymentMethods: paymentMethodsArray,
      };
    } catch (error) {
      console.error("Error generating sales report:", error);
      throw new ApiError(500, "فشل في إنشاء تقرير المبيعات");
    }
  }

  // جمع بيانات تقرير المخزون
  static async generateInventoryReport(
    filters: InventoryReportFilters = {}
  ): Promise<InventoryReportData> {
    try {
      const whereClause: any = {};

      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId;
      }

      // جلب جميع المنتجات مع معلومات المخزون
      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          inventory: true,
          category: true,
        },
      });

      const totalProducts = products.length;
      const lowStockThreshold = filters.lowStockThreshold || 10;

      let lowStockProducts = 0;
      let outOfStockProducts = 0;
      let totalInventoryValue = 0;

      // حساب الإحصائيات
      products.forEach((product) => {
        const stock = product.inventory?.quantity || 0;
        const value = Number(product.price) * stock;

        totalInventoryValue += value;

        if (stock === 0) {
          outOfStockProducts++;
        } else if (stock <= lowStockThreshold) {
          lowStockProducts++;
        }
      });

      // المخزون حسب الفئة
      const categoryData = new Map<
        string,
        { totalProducts: number; totalValue: number }
      >();

      products.forEach((product) => {
        if (product.category) {
          const categoryName = product.category.name;
          const current = categoryData.get(categoryName) || {
            totalProducts: 0,
            totalValue: 0,
          };
          const stock = product.inventory?.quantity || 0;
          const value = Number(product.price) * stock;

          categoryData.set(categoryName, {
            totalProducts: current.totalProducts + 1,
            totalValue: current.totalValue + value,
          });
        }
      });

      const inventoryByCategory = Array.from(categoryData.entries()).map(
        ([categoryName, data]) => ({
          categoryName,
          totalProducts: data.totalProducts,
          totalValue: data.totalValue,
        })
      );

      // أفضل المنتجات مبيعاً
      const topSellingProducts = products
        .filter(
          (p) => filters.includeOutOfStock || (p.inventory?.quantity || 0) > 0
        )
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)
        .map((product) => ({
          id: product.id,
          name: product.name,
          currentStock: product.inventory?.quantity || 0,
          totalSold: product.sold,
          value: Number(product.price) * (product.inventory?.quantity || 0),
        }));

      // المنتجات بطيئة الحركة
      const slowMovingProducts = products
        .filter((p) => (p.inventory?.quantity || 0) > 0)
        .sort((a, b) => a.sold - b.sold)
        .slice(0, 10)
        .map((product) => ({
          id: product.id,
          name: product.name,
          currentStock: product.inventory?.quantity || 0,
          lastSoldDate: product.updatedAt,
          value: Number(product.price) * (product.inventory?.quantity || 0),
        }));

      return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue,
        inventoryByCategory,
        topSellingProducts,
        slowMovingProducts,
      };
    } catch (error) {
      console.error("Error generating inventory report:", error);
      throw new ApiError(500, "فشل في إنشاء تقرير المخزون");
    }
  }

  // جمع بيانات تقرير نشاط المستخدمين
  static async generateUserActivityReport(
    filters: UserActivityReportFilters = {}
  ): Promise<UserActivityReportData> {
    try {
      const whereClause: any = {};

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      if (filters.role) {
        whereClause.role = filters.role;
      }

      // إجمالي المستخدمين
      const totalUsers = await prisma.user.count({
        where: whereClause,
      });

      // المستخدمين الجدد (آخر 30 يوم)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsers = await prisma.user.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // المستخدمين النشطين (لديهم طلبات)
      const activeUsers = await prisma.user.count({
        where: {
          ...whereClause,
          orders: {
            some: {},
          },
        },
      });

      // المستخدمين حسب الدور
      const usersByRole = await prisma.user.groupBy({
        by: ["role"],
        where: whereClause,
        _count: { role: true },
      });

      const usersByRoleArray = usersByRole.map((item) => ({
        role: item.role,
        count: item._count.role || 0,
      }));

      // تسجيل المستخدمين حسب التاريخ
      const userRegistrations = await prisma.user.groupBy({
        by: ["createdAt"],
        where: whereClause,
        _count: { id: true },
        orderBy: {
          createdAt: "desc",
        },
      });

      const userRegistrationsByDate = userRegistrations.map((item) => ({
        date: item.createdAt.toISOString().split("T")[0],
        count: item._count.id || 0,
      }));

      // أفضل العملاء
      const topCustomers = await prisma.user.findMany({
        where: whereClause,
        include: {
          orders: {
            select: {
              totalAmount: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: {
          orders: {
            _count: "desc",
          },
        },
        take: 10,
      });

      const topCustomersData = topCustomers.map((user) => ({
        id: user.id,
        email: user.email,
        totalOrders: user._count.orders,
        totalSpent: user.orders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0
        ),
      }));

      // نشاط المستخدمين
      const userActivity = await prisma.user.findMany({
        where: whereClause,
        include: {
          orders: {
            select: {
              totalAmount: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        take: 100,
      });

      const userActivityData = userActivity.map((user) => ({
        userId: user.id,
        email: user.email,
        lastLogin: user.updatedAt,
        totalOrders: user._count.orders,
        totalSpent: user.orders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0
        ),
      }));

      return {
        totalUsers,
        newUsers,
        activeUsers,
        usersByRole: usersByRoleArray,
        userRegistrationsByDate,
        topCustomers: topCustomersData,
        userActivity: userActivityData,
      };
    } catch (error) {
      console.error("Error generating user activity report:", error);
      throw new ApiError(500, "فشل في إنشاء تقرير نشاط المستخدمين");
    }
  }

  // جلب جميع التقارير مع التصفية والصفحات
  static async getReports(
    filters: ReportFilters = {},
    pagination: ReportPaginationParams = {}
  ): Promise<{
    reports: ReportResponse[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      // تطبيق المرشحات
      if (filters.reportType) {
        whereClause.reportType = filters.reportType;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.generatedBy) {
        whereClause.generatedBy = filters.generatedBy;
      }

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      if (filters.format) {
        whereClause.format = filters.format;
      }

      // جلب العدد الإجمالي
      const totalCount = await prisma.report.count({
        where: whereClause,
      });

      // جلب التقارير
      const reports = await prisma.report.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      const reportsData = reports.map((report) => ({
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        status: report.status,
        data: report.data as Record<string, any>,
        filters: report.filters as Record<string, any>,
        generatedBy: report.generatedBy,
        downloadUrl: report.downloadUrl,
        expiresAt: report.expiresAt,
        createdAt: report.createdAt,
      }));

      return {
        reports: reportsData as ReportResponse[],
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      console.error("Error fetching reports:", error);
      throw new ApiError(500, "فشل في جلب التقارير");
    }
  }

  // جلب تقرير واحد
  static async getReportById(id: string): Promise<ReportResponse> {
    try {
      const report = await prisma.report.findUnique({
        where: { id },
      });

      if (!report) {
        throw new ApiError(404, "التقرير غير موجود");
      }

      return {
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        status: report.status,
        data: report.data as Record<string, any>,
        filters: report.filters as Record<string, any>,
        generatedBy: report.generatedBy,
        downloadUrl: report.downloadUrl || undefined,
        expiresAt: report.expiresAt || undefined,
        createdAt: report.createdAt,
      };
    } catch (error) {
      console.error("Error fetching report:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "فشل في جلب التقرير");
    }
  }

  // تحديث التقرير
  static async updateReport(
    id: string,
    data: UpdateReportData
  ): Promise<ReportResponse> {
    try {
      const report = await prisma.report.update({
        where: { id },
        data: {
          ...data,
          ...(data.data && { data: data.data }),
        },
      });

      return {
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        status: report.status,
        data: report.data as Record<string, any>,
        filters: report.filters as Record<string, any>,
        generatedBy: report.generatedBy,
        downloadUrl: report.downloadUrl || undefined,
        expiresAt: report.expiresAt || undefined,
        createdAt: report.createdAt,
      };
    } catch (error) {
      console.error("Error updating report:", error);
      throw new ApiError(500, "فشل في تحديث التقرير");
    }
  }

  // حذف التقرير
  static async deleteReport(id: string): Promise<void> {
    try {
      await prisma.report.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Error deleting report:", error);
      throw new ApiError(500, "فشل في حذف التقرير");
    }
  }

  // حذف التقارير المنتهية الصلاحية
  static async cleanupExpiredReports(): Promise<{ deletedCount: number }> {
    try {
      const result = await prisma.report.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return { deletedCount: result.count };
    } catch (error) {
      console.error("Error cleaning up expired reports:", error);
      throw new ApiError(500, "فشل في تنظيف التقارير المنتهية الصلاحية");
    }
  }
}

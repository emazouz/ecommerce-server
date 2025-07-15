import { ReportType, FileFormat, JobStatus } from "@prisma/client";

// واجهة إنشاء التقرير
export interface CreateReportData {
  name: string;
  reportType: ReportType;
  format?: FileFormat;
  filters?: Record<string, any>;
  generatedBy: string;
  expiresAt?: Date;
}

// واجهة استجابة التقرير
export interface ReportResponse {
  id: string;
  name: string;
  reportType: ReportType;
  format: FileFormat;
  status: JobStatus;
  data: Record<string, any>;
  filters?: Record<string, any>;
  generatedBy: string;
  downloadUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
}

// واجهة معايير التصفية
export interface ReportFilters {
  reportType?: ReportType;
  status?: JobStatus;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
  format?: FileFormat;
}

// واجهة معاملات الصفحات
export interface ReportPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// واجهة بيانات تقرير المبيعات
export interface SalesReportData {
  totalSales: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    totalSales: number;
    revenue: number;
  }>;
  salesByCategory: Array<{
    categoryName: string;
    totalSales: number;
    revenue: number;
  }>;
  salesByDate: Array<{
    date: string;
    totalSales: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
}

// واجهة بيانات تقرير المخزون
export interface InventoryReportData {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  inventoryByCategory: Array<{
    categoryName: string;
    totalProducts: number;
    totalValue: number;
  }>;
  topSellingProducts: Array<{
    id: string;
    name: string;
    currentStock: number;
    totalSold: number;
    value: number;
  }>;
  slowMovingProducts: Array<{
    id: string;
    name: string;
    currentStock: number;
    lastSoldDate?: Date;
    value: number;
  }>;
}

// واجهة بيانات تقرير نشاط المستخدمين
export interface UserActivityReportData {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
  userRegistrationsByDate: Array<{
    date: string;
    count: number;
  }>;
  topCustomers: Array<{
    id: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  userActivity: Array<{
    userId: string;
    email: string;
    lastLogin?: Date;
    totalOrders: number;
    totalSpent: number;
  }>;
}

// واجهة معايير تصفية تقرير المبيعات
export interface SalesReportFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: number;
  productId?: string;
  paymentMethod?: string;
  orderStatus?: string;
}

// واجهة معايير تصفية تقرير المخزون
export interface InventoryReportFilters {
  categoryId?: number;
  lowStockThreshold?: number;
  includeOutOfStock?: boolean;
  sortBy?: "stock" | "value" | "sales";
}

// واجهة معايير تصفية تقرير نشاط المستخدمين
export interface UserActivityReportFilters {
  startDate?: Date;
  endDate?: Date;
  role?: string;
  includeInactive?: boolean;
  minOrders?: number;
  minSpent?: number;
}

// واجهة تحديث التقرير
export interface UpdateReportData {
  name?: string;
  status?: JobStatus;
  data?: Record<string, any>;
  downloadUrl?: string;
  expiresAt?: Date;
}

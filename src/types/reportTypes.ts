import {
  CustomerReportType,
  AdminReportType,
  AnalyticalReportType,
  ReportStatus,
  ReportPriority,
  FileFormat,
  JobStatus,
} from "@prisma/client";

// ==============================================================================
// تقارير العملاء (Customer Reports)
// ==============================================================================

export interface CreateCustomerReportData {
  reporterId: string;
  type: CustomerReportType;
  title: string;
  description: string;
  priority?: ReportPriority;
  targetId?: string;
  targetType?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface CustomerReportResponse {
  id: string;
  reporterId: string;
  type: CustomerReportType;
  title: string;
  description: string;
  priority: ReportPriority;
  status: ReportStatus;
  targetId?: string;
  targetType?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  response?: string;
  attachments: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  reporter: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  };
  reviewer?: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  };
}

export interface CustomerReportFilters {
  reporterId?: string;
  type?: CustomerReportType;
  status?: ReportStatus;
  priority?: ReportPriority;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  reviewedBy?: string;
}

export interface UpdateCustomerReportData {
  status?: ReportStatus;
  reviewedBy?: string;
  response?: string;
  priority?: ReportPriority;
}

// ==============================================================================
// تقارير الموظفين (Admin Reports)
// ==============================================================================

export interface CreateAdminReportData {
  createdBy: string;
  type: AdminReportType;
  title: string;
  description: string;
  priority?: ReportPriority;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  attachments?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AdminReportResponse {
  id: string;
  createdBy: string;
  type: AdminReportType;
  title: string;
  description: string;
  priority: ReportPriority;
  status: ReportStatus;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  assignedTo?: string;
  assignedAt?: Date;
  resolvedAt?: Date;
  attachments: string[];
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  };
  relatedUser?: {
    id: string;
    email: string;
    username?: string;
  };
  assignee?: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  };
}

export interface AdminReportFilters {
  createdBy?: string;
  type?: AdminReportType;
  status?: ReportStatus;
  priority?: ReportPriority;
  assignedTo?: string;
  relatedUserId?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}

export interface UpdateAdminReportData {
  status?: ReportStatus;
  assignedTo?: string;
  priority?: ReportPriority;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ==============================================================================
// التقارير التحليلية (Analytical Reports)
// ==============================================================================

export interface CreateAnalyticalReportData {
  name: string;
  reportType: AnalyticalReportType;
  format?: FileFormat;
  filters?: Record<string, any>;
  generatedBy: string;
  expiresAt?: Date;
  isScheduled?: boolean;
  scheduleConfig?: Record<string, any>;
  nextRunAt?: Date;
}

export interface AnalyticalReportResponse {
  id: string;
  name: string;
  reportType: AnalyticalReportType;
  format: FileFormat;
  status: JobStatus;
  data: Record<string, any>;
  filters?: Record<string, any>;
  generatedBy: string;
  downloadUrl?: string;
  expiresAt?: Date;
  isScheduled: boolean;
  scheduleConfig?: Record<string, any>;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  generator: {
    id: string;
    email: string;
    username?: string;
  };
}

export interface AnalyticalReportFilters {
  reportType?: AnalyticalReportType;
  status?: JobStatus;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
  format?: FileFormat;
  isScheduled?: boolean;
}

export interface UpdateAnalyticalReportData {
  name?: string;
  status?: JobStatus;
  data?: Record<string, any>;
  downloadUrl?: string;
  expiresAt?: Date;
  isScheduled?: boolean;
  scheduleConfig?: Record<string, any>;
  nextRunAt?: Date;
}

// ==============================================================================
// الأنواع المشتركة
// ==============================================================================

export interface ReportPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReportStats {
  // إحصائيات تقارير العملاء
  customerReports: {
    total: number;
    pending: number;
    resolved: number;
    rejected: number;
    byType: Record<CustomerReportType, number>;
    byPriority: Record<ReportPriority, number>;
  };

  // إحصائيات تقارير الموظفين
  adminReports: {
    total: number;
    open: number;
    closed: number;
    inProgress: number;
    byType: Record<AdminReportType, number>;
    byPriority: Record<ReportPriority, number>;
  };

  // إحصائيات التقارير التحليلية
  analyticalReports: {
    total: number;
    completed: number;
    failed: number;
    scheduled: number;
    byType: Record<AnalyticalReportType, number>;
  };
}

// ==============================================================================
// أنواع البيانات للتقارير التحليلية المحددة
// ==============================================================================

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

export interface FinancialReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  paymentMethodStats: Array<{
    method: string;
    totalAmount: number;
    transactionCount: number;
    averageTransaction: number;
  }>;
}

export interface PerformanceReportData {
  orderProcessingTime: {
    average: number;
    fastest: number;
    slowest: number;
  };
  customerSatisfaction: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  };
  returnRate: {
    overall: number;
    byCategory: Record<string, number>;
    byReason: Record<string, number>;
  };
  conversionRate: {
    overall: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
  };
}

export interface CustomerBehaviorReportData {
  topPages: Array<{
    page: string;
    views: number;
    bounceRate: number;
    avgTimeOnPage: number;
  }>;
  purchasePatterns: Array<{
    pattern: string;
    frequency: number;
    averageOrderValue: number;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    averageSpend: number;
    retentionRate: number;
  }>;
  abandonmentAnalysis: {
    cartAbandonmentRate: number;
    checkoutAbandonmentRate: number;
    commonAbandonmentReasons: Array<{
      reason: string;
      percentage: number;
    }>;
  };
}

// معايير التصفية للتقارير التحليلية المحددة
export interface SalesReportFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: number;
  productId?: string;
  paymentMethod?: string;
  orderStatus?: string;
}

export interface InventoryReportFilters {
  categoryId?: number;
  lowStockThreshold?: number;
  includeOutOfStock?: boolean;
  sortBy?: "stock" | "value" | "sales";
}

export interface UserActivityReportFilters {
  startDate?: Date;
  endDate?: Date;
  role?: string;
  includeInactive?: boolean;
  minOrders?: number;
  minSpent?: number;
}

export interface FinancialReportFilters {
  startDate?: Date;
  endDate?: Date;
  includeTax?: boolean;
  includeShipping?: boolean;
  paymentMethod?: string;
  currency?: string;
}

export interface PerformanceReportFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: number;
  includeReturns?: boolean;
  minRating?: number;
}

export interface CustomerBehaviorReportFilters {
  startDate?: Date;
  endDate?: Date;
  userSegment?: string;
  minPurchases?: number;
  includeAnonymous?: boolean;
}

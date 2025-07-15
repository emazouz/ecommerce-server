import { FileFormat } from "@prisma/client";
import {
  SalesReportData,
  InventoryReportData,
  UserActivityReportData,
} from "../types/reportTypes";

export class ReportFormatter {
  // تحويل التقرير إلى CSV
  static toCSV(data: any, reportType: string): string {
    let csvContent = "";

    switch (reportType) {
      case "SALES":
        csvContent = this.salesReportToCSV(data as SalesReportData);
        break;
      case "INVENTORY":
        csvContent = this.inventoryReportToCSV(data as InventoryReportData);
        break;
      case "USER_ACTIVITY":
        csvContent = this.userActivityReportToCSV(
          data as UserActivityReportData
        );
        break;
      default:
        csvContent = this.genericToCSV(data);
    }

    return csvContent;
  }

  // تحويل تقرير المبيعات إلى CSV
  private static salesReportToCSV(data: SalesReportData): string {
    let csv = "";

    // إضافة الإحصائيات العامة
    csv += "إحصائيات المبيعات\n";
    csv += `إجمالي المبيعات,${data.totalSales}\n`;
    csv += `إجمالي الطلبات,${data.totalOrders}\n`;
    csv += `إجمالي الإيرادات,${data.totalRevenue}\n`;
    csv += `متوسط قيمة الطلب,${data.averageOrderValue}\n\n`;

    // أفضل المنتجات
    csv += "أفضل المنتجات\n";
    csv += "المنتج,إجمالي المبيعات,الإيرادات\n";
    data.topProducts.forEach((product) => {
      csv += `${product.name},${product.totalSales},${product.revenue}\n`;
    });

    csv += "\n";

    // المبيعات حسب الفئة
    csv += "المبيعات حسب الفئة\n";
    csv += "الفئة,إجمالي المبيعات,الإيرادات\n";
    data.salesByCategory.forEach((category) => {
      csv += `${category.categoryName},${category.totalSales},${category.revenue}\n`;
    });

    csv += "\n";

    // المبيعات حسب التاريخ
    csv += "المبيعات حسب التاريخ\n";
    csv += "التاريخ,إجمالي المبيعات,الإيرادات\n";
    data.salesByDate.forEach((sale) => {
      csv += `${sale.date},${sale.totalSales},${sale.revenue}\n`;
    });

    csv += "\n";

    // طرق الدفع
    csv += "طرق الدفع\n";
    csv += "الطريقة,العدد,المبلغ الإجمالي\n";
    data.paymentMethods.forEach((method) => {
      csv += `${method.method},${method.count},${method.totalAmount}\n`;
    });

    return csv;
  }

  // تحويل تقرير المخزون إلى CSV
  private static inventoryReportToCSV(data: InventoryReportData): string {
    let csv = "";

    // إضافة الإحصائيات العامة
    csv += "إحصائيات المخزون\n";
    csv += `إجمالي المنتجات,${data.totalProducts}\n`;
    csv += `المنتجات قليلة المخزون,${data.lowStockProducts}\n`;
    csv += `المنتجات نافدة المخزون,${data.outOfStockProducts}\n`;
    csv += `القيمة الإجمالية للمخزون,${data.totalInventoryValue}\n\n`;

    // المخزون حسب الفئة
    csv += "المخزون حسب الفئة\n";
    csv += "الفئة,إجمالي المنتجات,القيمة الإجمالية\n";
    data.inventoryByCategory.forEach((category) => {
      csv += `${category.categoryName},${category.totalProducts},${category.totalValue}\n`;
    });

    csv += "\n";

    // أفضل المنتجات مبيعاً
    csv += "أفضل المنتجات مبيعاً\n";
    csv += "المنتج,المخزون الحالي,إجمالي المبيعات,القيمة\n";
    data.topSellingProducts.forEach((product) => {
      csv += `${product.name},${product.currentStock},${product.totalSold},${product.value}\n`;
    });

    csv += "\n";

    // المنتجات بطيئة الحركة
    csv += "المنتجات بطيئة الحركة\n";
    csv += "المنتج,المخزون الحالي,آخر بيع,القيمة\n";
    data.slowMovingProducts.forEach((product) => {
      csv += `${product.name},${product.currentStock},${
        product.lastSoldDate || "لم يبع"
      },${product.value}\n`;
    });

    return csv;
  }

  // تحويل تقرير نشاط المستخدمين إلى CSV
  private static userActivityReportToCSV(data: UserActivityReportData): string {
    let csv = "";

    // إضافة الإحصائيات العامة
    csv += "إحصائيات نشاط المستخدمين\n";
    csv += `إجمالي المستخدمين,${data.totalUsers}\n`;
    csv += `المستخدمين الجدد,${data.newUsers}\n`;
    csv += `المستخدمين النشطين,${data.activeUsers}\n\n`;

    // المستخدمين حسب الدور
    csv += "المستخدمين حسب الدور\n";
    csv += "الدور,العدد\n";
    data.usersByRole.forEach((role) => {
      csv += `${role.role},${role.count}\n`;
    });

    csv += "\n";

    // تسجيل المستخدمين حسب التاريخ
    csv += "تسجيل المستخدمين حسب التاريخ\n";
    csv += "التاريخ,العدد\n";
    data.userRegistrationsByDate.forEach((registration) => {
      csv += `${registration.date},${registration.count}\n`;
    });

    csv += "\n";

    // أفضل العملاء
    csv += "أفضل العملاء\n";
    csv += "البريد الإلكتروني,إجمالي الطلبات,إجمالي الإنفاق\n";
    data.topCustomers.forEach((customer) => {
      csv += `${customer.email},${customer.totalOrders},${customer.totalSpent}\n`;
    });

    csv += "\n";

    // نشاط المستخدمين
    csv += "نشاط المستخدمين\n";
    csv += "البريد الإلكتروني,آخر دخول,إجمالي الطلبات,إجمالي الإنفاق\n";
    data.userActivity.forEach((activity) => {
      csv += `${activity.email},${activity.lastLogin || "لم يسجل دخول"},${
        activity.totalOrders
      },${activity.totalSpent}\n`;
    });

    return csv;
  }

  // تحويل عام إلى CSV
  private static genericToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return "";

      const headers = Object.keys(data[0]);
      let csv = headers.join(",") + "\n";

      data.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }
          return value;
        });
        csv += values.join(",") + "\n";
      });

      return csv;
    } else if (typeof data === "object") {
      let csv = "";
      for (const [key, value] of Object.entries(data)) {
        csv += `${key},${value}\n`;
      }
      return csv;
    } else {
      return String(data);
    }
  }

  // تحويل إلى JSON بتنسيق جميل
  static toJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  // تحويل إلى HTML للمعاينة
  static toHTML(data: any, reportType: string): string {
    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير ${reportType}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
          .section { margin: 30px 0; }
          h1, h2 { color: #333; }
        </style>
      </head>
      <body>
    `;

    switch (reportType) {
      case "SALES":
        html += this.salesReportToHTML(data as SalesReportData);
        break;
      case "INVENTORY":
        html += this.inventoryReportToHTML(data as InventoryReportData);
        break;
      case "USER_ACTIVITY":
        html += this.userActivityReportToHTML(data as UserActivityReportData);
        break;
      default:
        html += `<h1>تقرير</h1><pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    html += "</body></html>";
    return html;
  }

  // تحويل تقرير المبيعات إلى HTML
  private static salesReportToHTML(data: SalesReportData): string {
    return `
      <h1>تقرير المبيعات</h1>
      
      <div class="summary">
        <h2>الإحصائيات العامة</h2>
        <p><strong>إجمالي المبيعات:</strong> ${data.totalSales}</p>
        <p><strong>إجمالي الطلبات:</strong> ${data.totalOrders}</p>
        <p><strong>إجمالي الإيرادات:</strong> ${data.totalRevenue}</p>
        <p><strong>متوسط قيمة الطلب:</strong> ${data.averageOrderValue}</p>
      </div>
      
      <div class="section">
        <h2>أفضل المنتجات</h2>
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>إجمالي المبيعات</th>
              <th>الإيرادات</th>
            </tr>
          </thead>
          <tbody>
            ${data.topProducts
              .map(
                (product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.totalSales}</td>
                <td>${product.revenue}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>المبيعات حسب الفئة</h2>
        <table>
          <thead>
            <tr>
              <th>الفئة</th>
              <th>إجمالي المبيعات</th>
              <th>الإيرادات</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesByCategory
              .map(
                (category) => `
              <tr>
                <td>${category.categoryName}</td>
                <td>${category.totalSales}</td>
                <td>${category.revenue}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // تحويل تقرير المخزون إلى HTML
  private static inventoryReportToHTML(data: InventoryReportData): string {
    return `
      <h1>تقرير المخزون</h1>
      
      <div class="summary">
        <h2>الإحصائيات العامة</h2>
        <p><strong>إجمالي المنتجات:</strong> ${data.totalProducts}</p>
        <p><strong>المنتجات قليلة المخزون:</strong> ${data.lowStockProducts}</p>
        <p><strong>المنتجات نافدة المخزون:</strong> ${
          data.outOfStockProducts
        }</p>
        <p><strong>القيمة الإجمالية للمخزون:</strong> ${
          data.totalInventoryValue
        }</p>
      </div>
      
      <div class="section">
        <h2>المخزون حسب الفئة</h2>
        <table>
          <thead>
            <tr>
              <th>الفئة</th>
              <th>إجمالي المنتجات</th>
              <th>القيمة الإجمالية</th>
            </tr>
          </thead>
          <tbody>
            ${data.inventoryByCategory
              .map(
                (category) => `
              <tr>
                <td>${category.categoryName}</td>
                <td>${category.totalProducts}</td>
                <td>${category.totalValue}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>أفضل المنتجات مبيعاً</h2>
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>المخزون الحالي</th>
              <th>إجمالي المبيعات</th>
              <th>القيمة</th>
            </tr>
          </thead>
          <tbody>
            ${data.topSellingProducts
              .map(
                (product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.currentStock}</td>
                <td>${product.totalSold}</td>
                <td>${product.value}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // تحويل تقرير نشاط المستخدمين إلى HTML
  private static userActivityReportToHTML(
    data: UserActivityReportData
  ): string {
    return `
      <h1>تقرير نشاط المستخدمين</h1>
      
      <div class="summary">
        <h2>الإحصائيات العامة</h2>
        <p><strong>إجمالي المستخدمين:</strong> ${data.totalUsers}</p>
        <p><strong>المستخدمين الجدد:</strong> ${data.newUsers}</p>
        <p><strong>المستخدمين النشطين:</strong> ${data.activeUsers}</p>
      </div>
      
      <div class="section">
        <h2>المستخدمين حسب الدور</h2>
        <table>
          <thead>
            <tr>
              <th>الدور</th>
              <th>العدد</th>
            </tr>
          </thead>
          <tbody>
            ${data.usersByRole
              .map(
                (role) => `
              <tr>
                <td>${role.role}</td>
                <td>${role.count}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>أفضل العملاء</h2>
        <table>
          <thead>
            <tr>
              <th>البريد الإلكتروني</th>
              <th>إجمالي الطلبات</th>
              <th>إجمالي الإنفاق</th>
            </tr>
          </thead>
          <tbody>
            ${data.topCustomers
              .map(
                (customer) => `
              <tr>
                <td>${customer.email}</td>
                <td>${customer.totalOrders}</td>
                <td>${customer.totalSpent}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // الحصول على MIME type للتنسيق
  static getMimeType(format: FileFormat): string {
    switch (format) {
      case FileFormat.CSV:
        return "text/csv";
      case FileFormat.PDF:
        return "application/pdf";
      case FileFormat.JSON:
      default:
        return "application/json";
    }
  }

  // الحصول على امتداد الملف
  static getFileExtension(format: FileFormat): string {
    switch (format) {
      case FileFormat.CSV:
        return "csv";
      case FileFormat.PDF:
        return "pdf";
      case FileFormat.JSON:
      default:
        return "json";
    }
  }
}

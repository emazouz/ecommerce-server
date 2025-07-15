# دليل استخدام نظام التقارير

## نظرة عامة

نظام التقارير يوفر إمكانية إنشاء وإدارة تقارير مختلفة للمتجر الإلكتروني، بما في ذلك تقارير المبيعات والمخزون ونشاط المستخدمين.

## أنواع التقارير المدعومة

### 1. تقرير المبيعات (SALES)

- إجمالي المبيعات والطلبات
- أفضل المنتجات مبيعاً
- المبيعات حسب الفئة والتاريخ
- طرق الدفع المختلفة

### 2. تقرير المخزون (INVENTORY)

- إجمالي المنتجات وقيمة المخزون
- المنتجات قليلة ونافدة المخزون
- أفضل المنتجات مبيعاً
- المنتجات بطيئة الحركة

### 3. تقرير نشاط المستخدمين (USER_ACTIVITY)

- إجمالي المستخدمين والمستخدمين الجدد
- المستخدمين حسب الدور
- أفضل العملاء
- نشاط المستخدمين

## التنسيقات المدعومة

- **JSON**: التنسيق الافتراضي
- **CSV**: للاستيراد في Excel
- **HTML**: للمعاينة في المتصفح

## Endpoints المتاحة

### المسارات الأساسية

```
GET    /api/reports                    # جلب جميع التقارير
POST   /api/reports                    # إنشاء تقرير جديد
GET    /api/reports/stats              # إحصائيات التقارير (مدير فقط)
GET    /api/reports/:id                # جلب تقرير واحد
GET    /api/reports/:id/download       # تحميل التقرير
GET    /api/reports/:id/preview        # معاينة التقرير
PUT    /api/reports/:id                # تحديث التقرير
DELETE /api/reports/:id                # حذف التقرير
```

### مسارات إنشاء التقارير المختلفة

```
POST   /api/reports/sales              # إنشاء تقرير المبيعات
POST   /api/reports/inventory          # إنشاء تقرير المخزون
POST   /api/reports/user-activity      # إنشاء تقرير نشاط المستخدمين
```

### مسارات الإدارة

```
POST   /api/reports/cleanup            # تنظيف التقارير المنتهية الصلاحية (مدير فقط)
```

## أمثلة على الاستخدام

### 1. إنشاء تقرير المبيعات

```bash
curl -X POST http://localhost:3001/api/reports/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "categoryId": 1,
    "paymentMethod": "CREDIT_CARD"
  }'
```

### 2. إنشاء تقرير المخزون

```bash
curl -X POST http://localhost:3001/api/reports/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "categoryId": 1,
    "lowStockThreshold": 10,
    "includeOutOfStock": true,
    "sortBy": "stock"
  }'
```

### 3. إنشاء تقرير نشاط المستخدمين

```bash
curl -X POST http://localhost:3001/api/reports/user-activity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "role": "USER",
    "includeInactive": false,
    "minOrders": 1
  }'
```

### 4. جلب جميع التقارير

```bash
curl -X GET "http://localhost:3001/api/reports?page=1&limit=10&reportType=SALES" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. تحميل التقرير بتنسيق CSV

```bash
curl -X GET "http://localhost:3001/api/reports/REPORT_ID/download?format=CSV" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.csv
```

### 6. معاينة التقرير

```bash
curl -X GET "http://localhost:3001/api/reports/REPORT_ID/preview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## استجابة النظام

### استجابة نجاح إنشاء التقرير

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "تقرير المبيعات - 2024-01-15",
    "reportType": "SALES",
    "format": "JSON",
    "status": "COMPLETED",
    "data": {
      "totalSales": 150,
      "totalOrders": 145,
      "totalRevenue": 50000,
      "averageOrderValue": 344.83,
      "topProducts": [...],
      "salesByCategory": [...],
      "salesByDate": [...],
      "paymentMethods": [...]
    },
    "filters": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    },
    "generatedBy": "user-id",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "تم إنشاء تقرير المبيعات بنجاح"
}
```

### استجابة جلب التقارير

```json
{
  "success": true,
  "data": {
    "reports": [...],
    "totalCount": 25,
    "currentPage": 1,
    "totalPages": 3
  },
  "message": "تم جلب التقارير بنجاح"
}
```

## معايير التصفية

### تقرير المبيعات

- `startDate`: تاريخ البداية
- `endDate`: تاريخ النهاية
- `categoryId`: معرف الفئة
- `productId`: معرف المنتج
- `paymentMethod`: طريقة الدفع
- `orderStatus`: حالة الطلب

### تقرير المخزون

- `categoryId`: معرف الفئة
- `lowStockThreshold`: حد المخزون المنخفض
- `includeOutOfStock`: تضمين المنتجات نافدة المخزون
- `sortBy`: ترتيب حسب (stock, value, sales)

### تقرير نشاط المستخدمين

- `startDate`: تاريخ البداية
- `endDate`: تاريخ النهاية
- `role`: دور المستخدم
- `includeInactive`: تضمين المستخدمين غير النشطين
- `minOrders`: الحد الأدنى للطلبات
- `minSpent`: الحد الأدنى للإنفاق

## الصلاحيات

### المستخدمون العاديون

- إنشاء التقارير
- عرض التقارير التي أنشأوها
- تحميل ومعاينة تقاريرهم
- حذف تقاريرهم

### المديرون

- جميع صلاحيات المستخدمين العاديين
- عرض جميع التقارير
- الوصول لإحصائيات التقارير
- تنظيف التقارير المنتهية الصلاحية

## التنظيف التلقائي

يتم تشغيل نظام التنظيف التلقائي على النحو التالي:

- **يومياً (2:00 ص)**: تنظيف التقارير المنتهية الصلاحية والفاشلة
- **أسبوعياً (الأحد 3:00 ص)**: تنظيف التقارير القديمة (أكثر من 30 يوماً)

## أكواد الأخطاء الشائعة

- `400`: بيانات غير صحيحة
- `401`: مستخدم غير مخول
- `403`: ليس لديك صلاحية
- `404`: التقرير غير موجود
- `500`: خطأ في الخادم

## أفضل الممارسات

1. **استخدم المعايير المناسبة**: حدد نطاق زمني محدد لتحسين الأداء
2. **احفظ التقارير المهمة**: تأكد من حفظ التقارير المهمة قبل انتهاء صلاحيتها
3. **راقب الأداء**: التقارير الكبيرة قد تستغرق وقتاً أطول
4. **استخدم التنسيق المناسب**: CSV للبيانات الكبيرة، JSON للمعالجة البرمجية

## استكشاف الأخطاء

### التقرير فارغ

- تأكد من وجود بيانات في النطاق الزمني المحدد
- تحقق من صحة معايير التصفية

### بطء في الاستجابة

- قلل النطاق الزمني للتقرير
- استخدم معايير تصفية أكثر تحديداً

### خطأ في الصلاحيات

- تأكد من أن المستخدم مسجل دخول
- تحقق من صلاحيات المستخدم

## الدعم التقني

للحصول على المساعدة أو الإبلاغ عن مشاكل، يرجى التواصل مع فريق التطوير.

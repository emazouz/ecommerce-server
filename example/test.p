// generator client {
//   provider = "prisma-client-js" // مزود عميل Prisma
// }

// datasource db {
//   provider = "postgresql" // نوع قاعدة البيانات المستخدمة
//   url      = env("DATABASE_URL") // رابط الاتصال بقاعدة البيانات من متغيرات البيئة
// }

// // ==============================================================================
// // ENUMS - تعدادات لتحديد مجموعات من القيم الثابتة
// // ==============================================================================

// enum UserRole {
//   USER // مستخدم عادي
//   ADMIN // مسؤول
// }

// enum Gender {
//   MEN // رجال
//   WOMEN // نساء
//   UNISEX // للجنسين
// }

// enum CartStatus {
//   PENDING // معلقة
//   PAID // مدفوعة
//   CANCELLED // ملغاة
// }

// enum PaymentStatus {
//   PENDING // لم يتم الدفع بعد
//   COMPLETED // تم الدفع
//   FAILED // فشل الدفع
//   REFUNDED // تم استرداد المبلغ
// }

// enum ShippingStatus {
//   PENDING // لم يتم الشحن بعد
//   SHIPPED // تم شحن الطلب
//   DELIVERED // تم تسليم الطلب
//   CANCELLED // تم إلغاء الشحن
// }

// enum OrderStatus {
//   PENDING // الطلب قيد الانتظار
//   CONFIRMED // تم تأكيد الطلب
//   SHIPPED // تم شحن الطلب
//   DELIVERED // تم تسليم الطلب
//   CANCELLED // تم إلغاء الطلب
// }

// enum ShippingMethodStatus {
//   STANDARD // توصيل عادي
//   PICKUP // استلام من المتجر
//   EXPRESS // توصيل سريع
// }

// enum OrderTrackingStatus {
//   PENDING // لم يتم الشحن بعد
//   SHIPPED // تم شحن الطلب
//   DELIVERED // تم تسليم الطلب
//   CANCELLED // تم إلغاء الشحن
// }

// enum ShipmentStatus {
//   PENDING
//   SHIPPED
//   DELIVERED
//   CANCELLED
// }

// enum DiscountType {
//   PERCENTAGE
//   FIXED
// }

// // ==============================================================================
// // MODELS - نماذج البيانات
// // ==============================================================================

// // --- User and Profile Models ---

// model User {
//   id           String   @id @default(uuid()) // المعرف الفريد للمستخدم
//   email        String   @unique // البريد الإلكتروني (فريد)
//   password     String
//   name         String? // اسم المستخدم (اختياري)
//   role         UserRole @default(USER) // دور المستخدم
//   refreshToken String?  @unique // رمز التحديث للمستخدم
//   createdAt    DateTime @default(now()) // تاريخ إنشاء الحساب
//   updatedAt    DateTime @updatedAt // تاريخ آخر تحديث للحساب

//   profile Profile? // علاقة مع ملف المستخدم الشخصي
//   reviews Review[] // قائمة المراجعات التي كتبها المستخدم
//   carts   Cart[] // قائمة عربات التسوق الخاصة بالمستخدم
//   orders  Order[] // قائمة الطلبات التي قام بها المستخدم
// }

// model Profile {
//   id        String    @id @default(uuid()) // المعرف الفريد للملف الشخصي
//   firstName String? // الاسم الأول
//   lastName  String? // اسم العائلة
//   avatar    String? // رابط الصورة الرمزية (اختياري)
//   gender    Gender? // جنس المستخدم (اختياري)
//   birthDate DateTime? // تاريخ الميلاد
//   phone     String? // رقم الهاتف
//   address   String? // العنوان
//   city      String? // المدينة
//   state     String? // الولاية/المقاطعة
//   zip       String? // الرمز البريدي
//   country   String? // البلد
//   createdAt DateTime  @default(now()) // تاريخ إنشاء الملف الشخصي
//   updatedAt DateTime  @updatedAt // تاريخ آخر تحديث للملف الشخصي

//   user   User   @relation(fields: [userId], references: [id]) // علاقة مع المستخدم
//   userId String @unique // مفتاح خارجي لربط الملف الشخصي بالمستخدم
// }

// // --- Product and Catalog Models ---

// model Category {
//   id       Int       @id @default(autoincrement()) // المعرف الفريد للفئة
//   name     String    @unique // اسم الفئة (فريد)
//   products Product[] // قائمة المنتجات ضمن هذه الفئة
// }

// model Product {
//   id               String   @id @default(uuid()) // المعرف الفريد للمنتج
//   name             String // اسم المنتج
//   description      String // وصف المنتج
//   aboutProduct     String[] // وصف المنتج
//   price            Decimal // السعر الحالي
//   originPrice      Decimal // السعر الأصلي
//   slug             String   @unique // رابط فريد للمنتج
//   type             String // نوع المنتج
//   gender           Gender // الفئة الجنسية للمنتج
//   brand            String // العلامة التجارية
//   thumbImage       String[] // صور مصغرة للمنتج
//   images           String[] // صور المنتج
//   isSale           Boolean  @default(false) // هل المنتج في التخفيضات؟
//   isFlashSale      Boolean  @default(false) // هل المنتج في التخفيضات الفورية؟
//   isNew            Boolean  @default(false) // هل المنتج جديد؟
//   rate             Float    @default(0) // متوسط تقييم المنتج
//   sold             Int      @default(0) // عدد القطع المباعة
//   quantityPurchase Int      @default(0) // عدد مرات الشراء
//   wishlistState    Boolean  @default(false) // هل المنتج في قائمة الرغبات؟
//   compareState     Boolean  @default(false) // هل المنتج في قائمة المقارنة؟
//   action           String? // إجراء خاص بالمنتج (اختياري)
//   weight           Decimal? // الوزن المحدد للمنتج
//   createdAt        DateTime @default(now()) // تاريخ إضافة المنتج
//   updatedAt        DateTime @updatedAt // تاريخ آخر تحديث للمنتج

//   category   Category @relation(fields: [categoryId], references: [id]) // علاقة مع الفئة
//   categoryId Int // مفتاح خارجي لربط المنتج بالفئة

//   variants   ProductVariant[] // قائمة متغيرات المنتج
//   reviews    Review[] // قائمة مراجعات المنتج
//   cartItems  CartItem[] // قائمة عناصر عربة التسوق المرتبطة بالمنتج
//   orderItems OrderItem[] // قائمة عناصر الطلبات المرتبطة بالمنتج
//   flashSale  FlashSale? // علاقة مع الخصم الفوري
// }

// model FlashSale {
//   id        Int      @id @default(autoincrement()) // المعرف الفريد للخصم
//   discount  Decimal // نسبة الخصم أو المبلغ
//   startDate DateTime // تاريخ بدء الخصم
//   endDate   DateTime // تاريخ انتهاء الخصم
//   productId String   @unique // مفتاح خارجي لربط الخصم بالمنتج
//   product   Product  @relation(fields: [productId], references: [id])
//   price     Decimal // السعر الحالي بعد الخصم
//   createdAt DateTime @default(now()) // تاريخ إنشاء الخصم
//   updatedAt DateTime @updatedAt // تاريخ آخر تحديث للخصم
// }

// model ProductVariant {
//   id        Int      @id @default(autoincrement()) // المعرف الفريد للمتغير
//   colorName String? // اسم اللون
//   color     String // اللون
//   colorCode String // كود اللون (HEX)
//   image     String // صورة المتغير
//   size      String // حجم المتغير
//   quantity  Int // الكمية المتاحة لهذا المتغير
//   productId String
//   product   Product  @relation(fields: [productId], references: [id])
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt

//   @@unique([productId, colorCode, size])
// }

// // --- Review and Blog Models ---

// model Review {
//   id        Int      @id @default(autoincrement()) // المعرف الفريد للمراجعة
//   rate      Int // التقييم (من 1 إلى 5)
//   message   String // نص المراجعة
//   color     String // لون المنتج
//   size      String // حجم المنتج
//   likes     Int      @default(0) // عدد الإعجابات
//   createdAt DateTime @default(now()) // تاريخ إنشاء المراجعة
//   updatedAt DateTime @updatedAt // تاريخ آخر تحديث للمراجعة

//   user      User    @relation(fields: [userId], references: [id])
//   userId    String // مفتاح خارجي للمستخدم
//   product   Product @relation(fields: [productId], references: [id])
//   productId String // مفتاح خارجي للمنتج

//   reply Reply? // الرد على المراجعة
// }

// model Reply {
//   id        Int      @id @default(autoincrement()) // المعرف الفريد للرد
//   message   String // نص الرد
//   createdAt DateTime @default(now()) // تاريخ إنشاء الرد
//   updatedAt DateTime @updatedAt // تاريخ آخر تحديث للرد

//   review   Review @relation(fields: [reviewId], references: [id])
//   reviewId Int    @unique // مفتاح خارجي للمراجعة
// }

// // --- Coupon Model ---

// model Coupon {
//   id            String       @id @default(uuid()) // معرّف فريد للكوبون
//   code          String       @unique // كود الكوبون الفريد
//   discountType  DiscountType // نوع الخصم: "percentage" أو "fixed"
//   discountValue Decimal // قيمة الخصم: يمكن أن تكون نسبة مئوية أو مبلغ ثابت
//   startDate     DateTime // تاريخ بدء الصلاحية
//   endDate       DateTime // تاريخ نهاية الصلاحية
//   isActive      Boolean      @default(true) // حالة الكوبون
//   usedCount     Int          @default(0) // عدد المرات المستخدمة
//   maxUsage      Int          @default(1) // عدد المرات المستخدمة المحددة
//   minOrderValue Decimal      @default(0) // القيمة الأدنى للطلب المطلوب لتطبيق الكوبون
//   createdAt     DateTime     @default(now()) // تاريخ إنشاء الكوبون
//   updatedAt     DateTime     @updatedAt // تاريخ آخر تحديث للكوبون
//   order         Order?
// }

// // --- E-commerce Models (Cart, Order) ---

// model Cart {
//   id                String         @id @default(uuid()) // معرّف عربة التسوق
//   total             Decimal        @default(0) // إجمالي المبلغ في العربة
//   totalWithDiscount Decimal        @default(0) // الإجمالي بعد الخصم
//   status            CartStatus     @default(PENDING) // حالة العربة
//   paymentStatus     PaymentStatus  @default(PENDING) // حالة الدفع
//   shippingStatus    ShippingStatus @default(PENDING) // حالة الشحن
//   discountCode      String? // رمز الخصم المطبق
//   discountAmount    Decimal        @default(0) // المبلغ المخصوم
//   notes             String? // ملاحظات المستخدم
//   createdAt         DateTime       @default(now()) // تاريخ الإنشاء
//   updatedAt         DateTime       @updatedAt // تاريخ التحديث

//   user      User       @relation(fields: [userId], references: [id])
//   userId    String // معرف المستخدم
//   cartItems CartItem[] // قائمة العناصر في العربة
// }

// model CartItem {
//   id        Int      @id @default(autoincrement()) // معرّف العنصر في العربة
//   quantity  Int      @default(1) // الكمية
//   price     Decimal // السعر الفردي للمنتج
//   createdAt DateTime @default(now()) // تاريخ الإنشاء
//   updatedAt DateTime @updatedAt // تاريخ التحديث

//   cart      Cart    @relation(fields: [cartId], references: [id])
//   cartId    String // مفتاح خارجي للعربة
//   product   Product @relation(fields: [productId], references: [id])
//   productId String // مفتاح خارجي للمنتج
// }

// model Order {
//   id              String               @id @default(uuid()) // معرف الطلب
//   totalAmount     Decimal              @default(0) // المبلغ الإجمالي
//   paymentStatus   PaymentStatus        @default(PENDING) // حالة الدفع
//   shippingStatus  ShippingStatus       @default(PENDING) // حالة الشحن
//   shippingAddress String // عنوان الشحن
//   shippingMethod  ShippingMethodStatus @default(STANDARD) // طريقة الشحن
//   orderStatus     OrderStatus          @default(PENDING) // حالة الطلب
//   paymentMethod   String // طريقة الدفع
//   createdAt       DateTime             @default(now()) // تاريخ الإنشاء
//   updatedAt       DateTime             @updatedAt // تاريخ التحديث

//   couponId String? @unique // معرّف الكوبون المرتبط
//   coupon   Coupon? @relation(fields: [couponId], references: [id]) // العلاقة مع الكوبون

//   userId     String // معرف المستخدم
//   user       User        @relation(fields: [userId], references: [id]) // علاقة مع المستخدم
//   orderItems OrderItem[] // العناصر المرتبطة بالطلب
//   Shipment   Shipment[] // معلومات الشحن
// }

// model OrderItem {
//   id        String   @id @default(uuid()) // معرف العنصر في الطلب
//   quantity  Int      @default(1) // الكمية
//   price     Decimal // السعر
//   createdAt DateTime @default(now()) // تاريخ الإضافة
//   updatedAt DateTime @updatedAt // تاريخ التحديث

//   order     Order   @relation(fields: [orderId], references: [id])
//   orderId   String // مفتاح خارجي للطلب المرتبط
//   product   Product @relation(fields: [productId], references: [id])
//   productId String // مفتاح خارجي للمنتج
// }

// model Shipment {
//   id               String         @id @default(uuid()) // معرّف الشحنة
//   trackingNumber   String // رقم التتبع
//   status           ShipmentStatus // حالة الشحنة
//   shippingDate     DateTime // تاريخ الشحن
//   estimatedArrival DateTime // الوصول المتوقع
//   carrier          String // شركة الشحن
//   orderId          String // معرف الطلب
//   order            Order          @relation(fields: [orderId], references: [id]) // علاقة مع الطلب
// }




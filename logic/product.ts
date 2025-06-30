// // 1. إنشاء منتج جديد
// createProduct(data: ProductCreateInput)
// // - إضافة منتج جديد مع كل التفاصيل (الاسم، الوصف، السعر، الصور، إلخ)
// // - التحقق من صحة البيانات المدخلة
// // - إنشاء المخزون المرتبط بالمنتج

// // 2. الحصول على منتج واحد
// getProduct(id: string)
// // - جلب تفاصيل منتج محدد مع كل العلاقات المرتبطة
// // - المراجعات، المتغيرات، المخزون، إلخ

// // 3. الحصول على قائمة المنتجات
// getAllProducts(filters: ProductFilters)
// // - جلب قائمة المنتجات مع إمكانية التصفية حسب:
// // - الفئة، النوع، الجنس، العلامة التجارية
// // - المنتجات الجديدة، المنتجات في التخفيضات
// // - دعم الصفحات والترتيب

// // 4. تحديث منتج
// updateProduct(id: string, data: ProductUpdateInput)
// // - تحديث معلومات المنتج
// // - تحديث الصور والأسعار والمخزون

// // 5. حذف منتج
// deleteProduct(id: string)
// // - حذف المنتج وكل البيانات المرتبطة به




// // 2. إدارة متغيرات المنتج:
// // 1. إدارة متغيرات المنتج (الألوان والأحجام)
// manageProductVariants(productId: string, variants: ProductVariantInput[])
// // - إضافة/تحديث/حذف متغيرات المنتج
// // - إدارة المخزون لكل متغير


// // . إدارة التخفيضات والعروض:
// // 1. إدارة التخفيضات الفورية
// manageFlashSale(productId: string, flashSaleData: FlashSaleInput)
// // - إضافة/تحديث/إلغاء تخفيض فوري
// // - تحديد فترة التخفيض والسعر الجديد

// // 2. إدارة حالة المنتج
// updateProductStatus(productId: string, status: ProductStatusUpdate)
// // - تحديث حالات المنتج (جديد، في التخفيضات، إلخ)

// // 1. إدارة المخزون
// manageInventory(productId: string, quantity: number)
// // - تحديث كمية المخزون
// // - تتبع المبيعات والكمية المتبقية

// // 2. تحديث حالة المبيعات
// updateProductSales(productId: string, salesData: SalesUpdateInput)
// // - تحديث عدد القطع المباعة
// // - تحديث عدد مرات الشراء





// // 1. إدارة مراجعات المنتج
// getProductReviews(productId: string)
// // - جلب كل المراجعات الخاصة بمنتج معين
// // - حساب متوسط التقييم

// // 2. إدارة الردود على المراجعات
// manageReviewReplies(reviewId: number, replyData: ReplyInput)
// // - إضافة/تحديث/حذف الردود على المراجعات




// // 1. البحث في المنتجات
// searchProducts(searchQuery: string)
// // - البحث في المنتجات حسب الاسم، الوصف، العلامة التجارية، إلخ

// // 2. التصفية المتقدمة
// filterProducts(advancedFilters: AdvancedFiltersInput)
// // - تصفية متقدمة حسب السعر، التقييم، التوفر، إلخ

// // 3. إدارة الصور
// manageProductImages(productId: string, images: ImageInput[])
// // - إضافة/تحديث/حذف صور المنتج
// // - معالجة الصور المصغرة
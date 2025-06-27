// product type
interface Variation {
  colorName?: string;
  color: string;
  colorCode: string;
  image: string;
  size: string;
  quantity: number;
}

interface Review {
  id: number;
  rate: number;
  message: string;
  color: string[];
  size: string[];
  likes: number;
  date: string;
}
export interface ProductType {
  id: string;
  name: string;
  description: string;
  aboutProduct: Array<string>;
  price: number;
  originPrice: number;
  slug: string;
  type: string;
  gender: string;
  brand: string;
  thumbImage: Array<string>;
  images: Array<string>;
  isSale: boolean;
  isFlashSale: boolean;
  isNew: boolean;
  rate: number;
  sold: number;
  quantityPurchase: number;
  wishlistState: boolean;
  compareState: boolean;
  action?: string;
  weight: number;
  sizes: Array<string>;
  colors: Array<string>;
  categoryId: number;
  reviews: Array<Review>;
  variation: Variation[];
  flashSale?: FlashSale[];
  inventory?: Inventory[];
}

interface FlashSale {
  id: string;
  discount: number;
  startDate: string;
  endDate: string;
  productId: string;
  price: number;
}

interface Inventory {
  id: string;
  productId: string;
  quantity: number;
}





interface BlogPost {
    id: string;
    category: string;
    tag: string;
    title: string;
    date: string;
    author: string;
    avatar: string;
    thumbImg: string;
    coverImg: string;
    subImg: string[];
    shortDesc: string;
    description: string;
    slug: string;
}
/* ===================================================
    - Type Definitions
   =================================================== */

// ===== Product Types =====
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  images: string[];
  videoUrl?: string;
  category: string;
  categorySlug: string;
  sizes: string[];
  colors: ProductColor[];
  stock: number;
  sku: string;
  tags: string[];
  customText?: string;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductColor {
  label?: string;
  name: string;
  hex: string;
}

// ===== Category Types =====
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  gradient: string;
  createdAt: string;
  images?: string[];
}

// ===== Cart Types =====
export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

// ===== Order Types =====
export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  couponCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'stripe' | 'sslcommerz';

export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

// ===== Customer Types =====
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  deliveryZone?: string;
}

export interface Customer {
  id: string;
  info: CustomerInfo;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

// ===== Coupon Types =====
export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

// ===== Banner / Content Types =====
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  gradient: string;
  active: boolean;
}

export interface HomepageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  banners: Banner[];
  featuredTitle: string;
  featuredSubtitle: string;
  trendingTitle: string;
  trendingSubtitle: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
}

// ===== Review Types =====
export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ===== Wishlist Types =====
export interface WishlistItem {
  productId: string;
  addedAt: string;
}

// ===== Admin Types =====
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'editor';
  createdAt: string;
}

// ===== Filter Types =====
export interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sizes: string[];
  sortBy: SortOption;
  inStock: boolean;
}

export type SortOption =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'rating';

// ===== Analytics Types =====
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  revenueChange: number;
  orderChange: number;
}

export interface SalesData {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  sold: number;
  revenue: number;
}

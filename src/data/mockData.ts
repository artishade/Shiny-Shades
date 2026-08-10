/* ===================================================
   Shiny Shades - Mock Data
   Production-ready data structure for development.
   Replace with Supabase queries in production.
   =================================================== */

import type {
  Product, Category, Order, Customer, Coupon,
  HomepageContent, DashboardStats, SalesData, TopProduct, Review
} from '@/types';

// ===== Products =====
export const products: Product[] = [
  {
    
    id: '1',
    name: 'Silk Rose Evening Gown',
    slug: 'silk-rose-evening-gown',
    description: 'An exquisite silk evening gown featuring delicate rose embroidery and a flowing silhouette. Crafted from the finest mulberry silk, this piece embodies timeless elegance and feminine grace. Perfect for galas, weddings, and special occasions.',
    shortDescription: 'Handcrafted silk gown with rose embroidery',
    price: 289.00,
    comparePrice: 389.00,
    images: ['product-gradient-1', 'product-gradient-2', 'product-gradient-3'],
    category: 'Evening Wear',
    categorySlug: 'evening-wear',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Blush Pink', hex: '#F4C2C2' }, { name: 'Champagne', hex: '#F7E7CE' }],
    stock: 15,
    sku: 'AG-EVE-001',
    tags: ['silk', 'evening', 'gown', 'luxury', 'rose'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.8,
    reviewCount: 42,
    createdAt: '2025-01-15',
    updatedAt: '2025-03-01',
  },
  {
    id: '2',
    name: 'Lavender Dream Midi Dress',
    slug: 'lavender-dream-midi-dress',
    description: 'A romantic midi dress in soft lavender chiffon with delicate pleating and a cinched waist. The flowing skirt moves gracefully with every step, creating an ethereal silhouette.',
    shortDescription: 'Romantic lavender chiffon midi dress',
    price: 179.00,
    comparePrice: undefined,
    images: ['product-gradient-2', 'product-gradient-7', 'product-gradient-4'],
    category: 'Dresses',
    categorySlug: 'dresses',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Lavender', hex: '#E6E6FA' }, { name: 'Soft Pink', hex: '#FADBD8' }],
    stock: 28,
    sku: 'AG-DRE-002',
    tags: ['midi', 'dress', 'chiffon', 'lavender', 'romantic'],
    isFeatured: true,
    isTrending: false,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.9,
    reviewCount: 67,
    createdAt: '2025-02-10',
    updatedAt: '2025-03-05',
  },
  {
    id: '3',
    name: 'Pearl Elegance Blouse',
    slug: 'pearl-elegance-blouse',
    description: 'A sophisticated satin blouse with pearl button details and elegant draping. The relaxed fit and luxurious fabric make it perfect for both day and evening wear.',
    shortDescription: 'Satin blouse with pearl button details',
    price: 129.00,
    comparePrice: 169.00,
    images: ['product-gradient-3', 'product-gradient-8', 'product-gradient-1'],
    category: 'Tops',
    categorySlug: 'tops',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Ivory', hex: '#FFFFF0' }, { name: 'Nude', hex: '#E3BCA4' }],
    stock: 45,
    sku: 'AG-TOP-003',
    tags: ['blouse', 'satin', 'pearl', 'elegant'],
    isFeatured: false,
    isTrending: true,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.7,
    reviewCount: 38,
    createdAt: '2025-01-20',
    updatedAt: '2025-02-28',
  },
  {
    id: '4',
    name: 'Golden Hour Maxi Skirt',
    slug: 'golden-hour-maxi-skirt',
    description: 'A stunning maxi skirt in champagne gold with a high waist and flowing A-line silhouette. The shimmery fabric catches the light beautifully, perfect for creating elegant day-to-evening looks.',
    shortDescription: 'Champagne gold flowing maxi skirt',
    price: 159.00,
    comparePrice: undefined,
    images: ['product-gradient-5', 'product-gradient-3', 'product-gradient-8'],
    category: 'Skirts',
    categorySlug: 'skirts',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Champagne', hex: '#F7E7CE' }, { name: 'Rose Gold', hex: '#B76E79' }],
    stock: 22,
    sku: 'AG-SKR-004',
    tags: ['maxi', 'skirt', 'gold', 'a-line', 'flowing'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.6,
    reviewCount: 29,
    createdAt: '2025-02-25',
    updatedAt: '2025-03-02',
  },
  {
    id: '5',
    name: 'Rosé Satin Slip Dress',
    slug: 'rose-satin-slip-dress',
    description: 'A luxurious satin slip dress in soft rosé tones with delicate lace trim. The bias-cut silhouette skims the body beautifully, creating an effortlessly elegant look.',
    shortDescription: 'Satin slip dress with lace trim',
    price: 199.00,
    comparePrice: 259.00,
    images: ['product-gradient-6', 'product-gradient-1', 'product-gradient-4'],
    category: 'Dresses',
    categorySlug: 'dresses',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Rose', hex: '#B76E79' }, { name: 'Blush', hex: '#F4C2C2' }],
    stock: 8,
    sku: 'AG-DRE-005',
    tags: ['satin', 'slip dress', 'rose', 'lace', 'luxury'],
    isFeatured: true,
    isTrending: false,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.9,
    reviewCount: 91,
    createdAt: '2025-01-05',
    updatedAt: '2025-03-01',
  },
  {
    id: '6',
    name: 'Cloud Knit Cardigan',
    slug: 'cloud-knit-cardigan',
    description: 'An ultra-soft oversized cardigan in cream-white with pearl buttons. The chunky knit texture and relaxed fit make it the perfect layering piece for cool evenings.',
    shortDescription: 'Ultra-soft cream knit cardigan',
    price: 149.00,
    comparePrice: undefined,
    images: ['product-gradient-8', 'product-gradient-3', 'product-gradient-5'],
    category: 'Knitwear',
    categorySlug: 'knitwear',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Cream', hex: '#FFFDD0' }, { name: 'Ivory', hex: '#FFFFF0' }],
    stock: 35,
    sku: 'AG-KNT-006',
    tags: ['knit', 'cardigan', 'cream', 'cozy', 'oversized'],
    isFeatured: false,
    isTrending: true,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.5,
    reviewCount: 23,
    createdAt: '2025-03-01',
    updatedAt: '2025-03-05',
  },
  {
    id: '7',
    name: 'Crystal Pleated Palazzo Pants',
    slug: 'crystal-pleated-palazzo-pants',
    description: 'Elegant wide-leg palazzo pants in soft nude with crystal-embellished waistband. The flowing pleated fabric creates a sophisticated silhouette that transitions from office to evening.',
    shortDescription: 'Wide-leg palazzo pants with crystal waistband',
    price: 169.00,
    comparePrice: undefined,
    images: ['product-gradient-5', 'product-gradient-2', 'product-gradient-7'],
    category: 'Pants',
    categorySlug: 'pants',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Nude', hex: '#E3BCA4' }, { name: 'Lavender', hex: '#E6E6FA' }],
    stock: 19,
    sku: 'AG-PNT-007',
    tags: ['palazzo', 'pants', 'pleated', 'crystal', 'wide-leg'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.4,
    reviewCount: 15,
    createdAt: '2025-02-20',
    updatedAt: '2025-03-03',
  },
  {
    id: '8',
    name: 'Midnight Velvet Blazer',
    slug: 'midnight-velvet-blazer',
    description: 'A tailored velvet blazer in deep rose with gold-tone buttons and a nipped waist. The structured shoulders and rich fabric create a powerful yet feminine silhouette.',
    shortDescription: 'Tailored velvet blazer with gold buttons',
    price: 249.00,
    comparePrice: 329.00,
    images: ['product-gradient-4', 'product-gradient-6', 'product-gradient-1'],
    category: 'Outerwear',
    categorySlug: 'outerwear',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Deep Rose', hex: '#8B4557' }, { name: 'Black', hex: '#2D2D2D' }],
    stock: 12,
    sku: 'AG-OUT-008',
    tags: ['blazer', 'velvet', 'tailored', 'gold', 'statement'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.8,
    reviewCount: 56,
    createdAt: '2025-01-10',
    updatedAt: '2025-02-25',
  },
  {
    id: '9',
    name: 'Garden Party Wrap Dress',
    slug: 'garden-party-wrap-dress',
    description: 'A delightful wrap dress in pastel floral print with flutter sleeves and a tied waist. The lightweight fabric and cheerful pattern make it ideal for spring and summer events.',
    shortDescription: 'Pastel floral wrap dress with flutter sleeves',
    price: 159.00,
    comparePrice: undefined,
    images: ['product-gradient-2', 'product-gradient-8', 'product-gradient-5'],
    category: 'Dresses',
    categorySlug: 'dresses',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Pastel Mix', hex: '#FADBD8' }, { name: 'Lavender Mix', hex: '#E6E6FA' }],
    stock: 32,
    sku: 'AG-DRE-009',
    tags: ['wrap', 'dress', 'floral', 'spring', 'wrap'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.6,
    reviewCount: 31,
    createdAt: '2025-03-02',
    updatedAt: '2025-03-05',
  },
  {
    id: '10',
    name: 'Moonlight Sequin Top',
    slug: 'moonlight-sequin-top',
    description: 'A show-stopping sequin top in champagne with a delicate cowl neckline. The all-over sequin embellishment catches light from every angle, perfect for evening events.',
    shortDescription: 'Champagne sequin top with cowl neck',
    price: 189.00,
    comparePrice: 229.00,
    images: ['product-gradient-3', 'product-gradient-6', 'product-gradient-4'],
    category: 'Tops',
    categorySlug: 'tops',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Champagne', hex: '#F7E7CE' }, { name: 'Silver', hex: '#C0C0C0' }],
    stock: 5,
    sku: 'AG-TOP-010',
    tags: ['sequin', 'top', 'evening', 'sparkle', 'statement'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.7,
    reviewCount: 44,
    createdAt: '2025-01-25',
    updatedAt: '2025-02-20',
  },
  {
    id: '11',
    name: 'Whisper Chiffon Blouse',
    slug: 'whisper-chiffon-blouse',
    description: 'An airy chiffon blouse with subtle ruffle details and a soft bow at the neckline. The translucent fabric layers beautifully over camisoles for a romantic daytime look.',
    shortDescription: 'Airy chiffon blouse with bow neckline',
    price: 119.00,
    comparePrice: undefined,
    images: ['product-gradient-7', 'product-gradient-1', 'product-gradient-3'],
    category: 'Tops',
    categorySlug: 'tops',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Blush', hex: '#F4C2C2' }],
    stock: 40,
    sku: 'AG-TOP-011',
    tags: ['chiffon', 'blouse', 'ruffle', 'bow', 'romantic'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    isOnSale: false,
    rating: 4.5,
    reviewCount: 19,
    createdAt: '2025-03-04',
    updatedAt: '2025-03-05',
  },
  {
    id: '12',
    name: 'Belle Tulle Ball Skirt',
    slug: 'belle-tulle-ball-skirt',
    description: 'A breathtaking tulle ball skirt in soft blush with multiple layered ruffles. This statement piece creates a fairy-tale silhouette that transforms any simple top into a gala-worthy ensemble.',
    shortDescription: 'Layered tulle ball skirt in soft blush',
    price: 329.00,
    comparePrice: 449.00,
    images: ['product-gradient-1', 'product-gradient-4', 'product-gradient-2'],
    category: 'Skirts',
    categorySlug: 'skirts',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Blush', hex: '#F4C2C2' }, { name: 'Lavender', hex: '#E6E6FA' }],
    stock: 7,
    sku: 'AG-SKR-012',
    tags: ['tulle', 'ball skirt', 'blush', 'statement', 'gala'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    isOnSale: true,
    rating: 4.9,
    reviewCount: 78,
    createdAt: '2025-01-01',
    updatedAt: '2025-03-01',
  },
];

// ===== Categories =====
export const categories: Category[] = [
  {
    id: '1',
    name: 'Dresses',
    slug: 'dresses',
    description: 'From casual day dresses to breathtaking evening gowns',
    image: 'product-gradient-2',
    productCount: 3,
    gradient: 'linear-gradient(135deg, #F4C2C2, #E6E6FA)',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    name: 'Tops',
    slug: 'tops',
    description: 'Elegant blouses, tops and shirts for every occasion',
    image: 'product-gradient-3',
    productCount: 3,
    gradient: 'linear-gradient(135deg, #F7E7CE, #F4C2C2)',
    createdAt: '2025-01-01',
  },
  {
    id: '3',
    name: 'Skirts',
    slug: 'skirts',
    description: 'Flowing skirts from mini to maxi in luxurious fabrics',
    image: 'product-gradient-5',
    productCount: 2,
    gradient: 'linear-gradient(135deg, #E3BCA4, #FADBD8)',
    createdAt: '2025-01-01',
  },
  {
    id: '4',
    name: 'Evening Wear',
    slug: 'evening-wear',
    description: 'Show-stopping pieces for your most special moments',
    image: 'product-gradient-1',
    productCount: 1,
    gradient: 'linear-gradient(135deg, #B76E79, #F4C2C2)',
    createdAt: '2025-01-01',
  },
  {
    id: '5',
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Structured blazers and elegant coats',
    image: 'product-gradient-4',
    productCount: 1,
    gradient: 'linear-gradient(135deg, #D4949E, #E6E6FA)',
    createdAt: '2025-01-01',
  },
  {
    id: '6',
    name: 'Knitwear',
    slug: 'knitwear',
    description: 'Soft, cozy knits for cool evenings',
    image: 'product-gradient-8',
    productCount: 1,
    gradient: 'linear-gradient(135deg, #FADBD8, #F7E7CE)',
    createdAt: '2025-01-01',
  },
  {
    id: '7',
    name: 'Pants',
    slug: 'pants',
    description: 'Tailored trousers and flowing palazzos',
    image: 'product-gradient-7',
    productCount: 1,
    gradient: 'linear-gradient(135deg, #C8C8E0, #E3BCA4)',
    createdAt: '2025-01-01',
  },
];

// ===== Orders =====
export const orders: Order[] = [
  {
    id: '1',
    orderNumber: 'AG-2025-001',
    customer: {
      firstName: 'Sophia',
      lastName: 'Chen',
      email: 'sophia@example.com',
      phone: '+880 1712-345678',
      address: '45 Gulshan Avenue',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1212',
      country: 'Bangladesh',
    },
    items: [
      { productId: '1', productName: 'Silk Rose Evening Gown', productImage: 'product-gradient-1', size: 'M', color: 'Blush Pink', quantity: 1, price: 289.00 },
      { productId: '3', productName: 'Pearl Elegance Blouse', productImage: 'product-gradient-3', size: 'S', color: 'Ivory', quantity: 2, price: 129.00 },
    ],
    subtotal: 547.00,
    discount: 50.00,
    total: 497.00,
    status: 'delivered',
    paymentMethod: 'bkash',
    paymentStatus: 'verified',
    transactionId: 'TXN-8A7B6C',
    couponCode: 'LUXURY50',
    createdAt: '2025-02-15T10:30:00',
    updatedAt: '2025-02-20T14:00:00',
  },
  {
    id: '2',
    orderNumber: 'AG-2025-002',
    customer: {
      firstName: 'Amara',
      lastName: 'Khan',
      email: 'amara@example.com',
      phone: '+880 1898-765432',
      address: '12 Dhanmondi Road',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1205',
      country: 'Bangladesh',
    },
    items: [
      { productId: '5', productName: 'Rosé Satin Slip Dress', productImage: 'product-gradient-6', size: 'S', color: 'Rose', quantity: 1, price: 199.00 },
    ],
    subtotal: 199.00,
    discount: 0,
    total: 199.00,
    status: 'shipped',
    paymentMethod: 'nagad',
    paymentStatus: 'verified',
    transactionId: 'TXN-9D8E7F',
    createdAt: '2025-03-01T15:45:00',
    updatedAt: '2025-03-03T09:00:00',
  },
  {
    id: '3',
    orderNumber: 'AG-2025-003',
    customer: {
      firstName: 'Isabella',
      lastName: 'Rahman',
      email: 'isabella@example.com',
      phone: '+880 1534-567890',
      address: '78 Banani Road',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1213',
      country: 'Bangladesh',
    },
    items: [
      { productId: '12', productName: 'Belle Tulle Ball Skirt', productImage: 'product-gradient-1', size: 'M', color: 'Blush', quantity: 1, price: 329.00 },
      { productId: '10', productName: 'Moonlight Sequin Top', productImage: 'product-gradient-3', size: 'S', color: 'Champagne', quantity: 1, price: 189.00 },
    ],
    subtotal: 518.00,
    discount: 0,
    total: 518.00,
    status: 'pending',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    createdAt: '2025-03-05T08:20:00',
    updatedAt: '2025-03-05T08:20:00',
  },
  {
    id: '4',
    orderNumber: 'AG-2025-004',
    customer: {
      firstName: 'Luna',
      lastName: 'Ahmed',
      email: 'luna@example.com',
      phone: '+880 1678-123456',
      address: '23 Uttara Sector 7',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1230',
      country: 'Bangladesh',
    },
    items: [
      { productId: '4', productName: 'Golden Hour Maxi Skirt', productImage: 'product-gradient-5', size: 'M', color: 'Champagne', quantity: 1, price: 159.00 },
      { productId: '6', productName: 'Cloud Knit Cardigan', productImage: 'product-gradient-8', size: 'S', color: 'Cream', quantity: 1, price: 149.00 },
    ],
    subtotal: 308.00,
    discount: 30.00,
    total: 278.00,
    status: 'processing',
    paymentMethod: 'bkash',
    paymentStatus: 'pending',
    transactionId: 'TXN-2G3H4I',
    couponCode: 'WELCOME30',
    notes: 'Please deliver before Saturday if possible.',
    createdAt: '2025-03-04T12:00:00',
    updatedAt: '2025-03-05T10:00:00',
  },
];

// ===== Customers =====
export const customers: Customer[] = [
  {
    id: '1',
    info: { firstName: 'Sophia', lastName: 'Chen', email: 'sophia@example.com', phone: '+880 1712-345678', address: '45 Gulshan Avenue', city: 'Dhaka', state: 'Dhaka', zipCode: '1212', country: 'Bangladesh' },
    totalOrders: 3,
    totalSpent: 1247.00,
    createdAt: '2024-12-01',
  },
  {
    id: '2',
    info: { firstName: 'Amara', lastName: 'Khan', email: 'amara@example.com', phone: '+880 1898-765432', address: '12 Dhanmondi Road', city: 'Dhaka', state: 'Dhaka', zipCode: '1205', country: 'Bangladesh' },
    totalOrders: 1,
    totalSpent: 199.00,
    createdAt: '2025-02-10',
  },
  {
    id: '3',
    info: { firstName: 'Isabella', lastName: 'Rahman', email: 'isabella@example.com', phone: '+880 1534-567890', address: '78 Banani Road', city: 'Dhaka', state: 'Dhaka', zipCode: '1213', country: 'Bangladesh' },
    totalOrders: 2,
    totalSpent: 756.00,
    createdAt: '2025-01-15',
  },
  {
    id: '4',
    info: { firstName: 'Luna', lastName: 'Ahmed', email: 'luna@example.com', phone: '+880 1678-123456', address: '23 Uttara Sector 7', city: 'Dhaka', state: 'Dhaka', zipCode: '1230', country: 'Bangladesh' },
    totalOrders: 1,
    totalSpent: 278.00,
    createdAt: '2025-03-01',
  },
  {
    id: '5',
    info: { firstName: 'Mia', lastName: 'Islam', email: 'mia@example.com', phone: '+880 1845-678901', address: '56 Bashundhara R/A', city: 'Dhaka', state: 'Dhaka', zipCode: '1229', country: 'Bangladesh' },
    totalOrders: 5,
    totalSpent: 2150.00,
    createdAt: '2024-11-20',
  },
];

// ===== Coupons =====
export const coupons: Coupon[] = [
  {
    id: '1',
    code: 'LUXURY50',
    discount: 50,
    type: 'fixed',
    minOrderAmount: 200,
    maxUses: 100,
    usedCount: 34,
    expiresAt: '2025-06-30',
    isActive: true,
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    code: 'WELCOME30',
    discount: 30,
    type: 'fixed',
    minOrderAmount: 100,
    maxUses: 200,
    usedCount: 89,
    expiresAt: '2025-12-31',
    isActive: true,
    createdAt: '2025-01-01',
  },
  {
    id: '3',
    code: 'SPRING20',
    discount: 20,
    type: 'percentage',
    minOrderAmount: 150,
    maxUses: 50,
    usedCount: 12,
    expiresAt: '2025-04-30',
    isActive: true,
    createdAt: '2025-03-01',
  },
  {
    id: '4',
    code: 'VIP15',
    discount: 15,
    type: 'percentage',
    minOrderAmount: 0,
    maxUses: 500,
    usedCount: 201,
    expiresAt: '2025-12-31',
    isActive: true,
    createdAt: '2024-12-01',
  },
];

// ===== Homepage Content =====
export const homepageContent: HomepageContent = {
  heroTitle: 'Redefine Your Elegance',
  heroSubtitle: 'Discover our curated collection of luxury feminine fashion — crafted for the woman who dares to be unforgettable.',
  heroButtonText: 'Explore Collection',
  banners: [
    {
      id: '1',
      title: 'Spring Collection 2025',
      subtitle: 'Embrace the season with delicate pastels and flowing silhouettes',
      buttonText: 'Shop Now',
      buttonLink: '/shop',
      gradient: 'linear-gradient(135deg, #F4C2C2, #E6E6FA, #F7E7CE)',
      active: true,
    },
    {
      id: '2',
      title: 'Evening Elegance',
      subtitle: 'Command every room with our exclusive evening wear collection',
      buttonText: 'View Collection',
      buttonLink: '/category/evening-wear',
      gradient: 'linear-gradient(135deg, #B76E79, #E3BCA4, #F7E7CE)',
      active: true,
    },
    {
      id: '3',
      title: 'Sale — Up to 30% Off',
      subtitle: 'Luxury fashion at exceptional prices. Limited time only.',
      buttonText: 'Shop Sale',
      buttonLink: '/shop?sale=true',
      gradient: 'linear-gradient(135deg, #D4949E, #F4C2C2, #E6E6FA)',
      active: true,
    },
  ],
  featuredTitle: 'Featured Collection',
  featuredSubtitle: 'Hand-picked favorites that define our signature style',
  trendingTitle: 'Trending Now',
  trendingSubtitle: 'The pieces everyone is talking about',
  newsletterTitle: 'Join the Inner Circle',
  newsletterSubtitle: 'Subscribe for exclusive access to new arrivals, private sales, and style inspiration.',
};

// ===== Dashboard Stats =====
export const dashboardStats: DashboardStats = {
  totalRevenue: 12480.50,
  totalOrders: 48,
  totalCustomers: 156,
  totalProducts: 12,
  lowStockProducts: 3,
  pendingOrders: 8,
  revenueChange: 12.5,
  orderChange: 8.3,
};

// ===== Sales Data (for charts) =====
export const salesData: SalesData[] = [
  { month: 'Sep', revenue: 2800, orders: 12 },
  { month: 'Oct', revenue: 3200, orders: 15 },
  { month: 'Nov', revenue: 4100, orders: 22 },
  { month: 'Dec', revenue: 5600, orders: 30 },
  { month: 'Jan', revenue: 3900, orders: 18 },
  { month: 'Feb', revenue: 4200, orders: 20 },
  { month: 'Mar', revenue: 4800, orders: 25 },
];

// ===== Top Products =====
export const topProducts: TopProduct[] = [
  { name: 'Rosé Satin Slip Dress', sold: 91, revenue: 18109 },
  { name: 'Belle Tulle Ball Skirt', sold: 78, revenue: 25662 },
  { name: 'Silk Rose Evening Gown', sold: 42, revenue: 12138 },
  { name: 'Moonlight Sequin Top', sold: 44, revenue: 8316 },
  { name: 'Midnight Velvet Blazer', sold: 56, revenue: 13944 },
];

// ===== Reviews =====
export const reviews: Review[] = [
  { id: '1', productId: '1', customerName: 'Ayesha K.', rating: 5, comment: 'Absolutely stunning! The silk quality is incredible. Received so many compliments.', createdAt: '2025-02-20' },
  { id: '2', productId: '1', customerName: 'Fatima R.', rating: 5, comment: 'Perfect fit and the embroidery detail is exquisite. Worth every penny.', createdAt: '2025-02-18' },
  { id: '3', productId: '5', customerName: 'Nusrat J.', rating: 5, comment: 'The satin is so luxurious and the lace trim is beautiful. My new favorite dress!', createdAt: '2025-03-01' },
  { id: '4', productId: '8', customerName: 'Tania S.', rating: 4, comment: 'Beautiful blazer, runs slightly small. The velvet quality is amazing though.', createdAt: '2025-02-25' },
  { id: '5', productId: '2', customerName: 'Priya M.', rating: 5, comment: 'Dreamy dress! The lavender color is even more beautiful in person.', createdAt: '2025-03-04' },
];

// ===== All Sizes =====
export const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ===== Helper: Get products by filter =====
export function getFilteredProducts(filters: {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  sortBy?: string;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
}): Product[] {
  let filtered = [...products];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    filtered = filtered.filter(p => p.categorySlug === filters.category);
  }

  if (filters.minPrice !== undefined) {
    filtered = filtered.filter(p => p.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice!);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    filtered = filtered.filter(p =>
      p.sizes.some(s => filters.sizes!.includes(s))
    );
  }

  if (filters.inStock) {
    filtered = filtered.filter(p => p.stock > 0);
  }

  if (filters.onSale) {
    filtered = filtered.filter(p => p.isOnSale);
  }

  if (filters.featured) {
    filtered = filtered.filter(p => p.isFeatured);
  }

  if (filters.trending) {
    filtered = filtered.filter(p => p.isTrending);
  }

  if (filters.newArrival) {
    filtered = filtered.filter(p => p.isNewArrival);
  }

  switch (filters.sortBy) {
    case 'price_asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'popular':
      filtered.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return filtered;
}

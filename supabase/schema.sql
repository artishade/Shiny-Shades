-- =====================================================
-- Shiny Shades - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- ===== ADMIN USERS TABLE =====
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CUSTOMERS TABLE =====
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Bangladesh',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CATEGORIES TABLE =====
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  gradient TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PRODUCTS TABLE =====
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT,
  category_slug TEXT,
  sku TEXT UNIQUE,
  stock INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  is_on_sale BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PRODUCT IMAGES TABLE =====
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PRODUCT SIZES TABLE =====
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  sku_suffix TEXT
);

-- ===== PRODUCT COLORS TABLE =====
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL
);

-- ===== PRODUCT TAGS TABLE =====
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(product_id, tag)
);

-- ===== ORDERS TABLE =====
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Shipping Info (denormalized for order history)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Bangladesh',
  
  -- Order Details
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bkash', 'nagad')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'failed', 'refunded')),
  transaction_id TEXT,
  
  -- Coupon
  coupon_id UUID,
  coupon_code TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ORDER ITEMS TABLE =====
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  size TEXT,
  color TEXT,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== COUPONS TABLE =====
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount DECIMAL(10,2) NOT NULL,
  type TEXT DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== REVIEWS TABLE =====
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== WISHLIST TABLE =====
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ===== HOMEPAGE CONTENT TABLE =====
CREATE TABLE IF NOT EXISTS homepage_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  content JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== BANNERS TABLE =====
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  image_url TEXT,
  gradient TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== STOCK ALERTS TABLE =====
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  alert_threshold INTEGER DEFAULT 10,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Public read access for products, categories, reviews
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view product images" ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "Public can view product sizes" ON product_sizes FOR SELECT USING (TRUE);
CREATE POLICY "Public can view product colors" ON product_colors FOR SELECT USING (TRUE);
CREATE POLICY "Public can view approved reviews" ON reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Public can view active banners" ON banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view homepage content" ON homepage_content FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view active coupons" ON coupons FOR SELECT USING (is_active = TRUE);

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can view own order items" ON order_items FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can manage own wishlist" ON wishlist FOR ALL USING (customer_id = auth.uid());

-- Guests can place orders (checkout has no login)
CREATE POLICY "Anyone can place an order" ON orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can add items to an order" ON order_items FOR INSERT WITH CHECK (TRUE);

-- Guests can look up their own order by order_number (for payment confirmation page)
CREATE POLICY "Anyone can look up an order by number" ON orders FOR SELECT USING (TRUE);

-- ===== ADMIN ACCESS =====
-- Checks the signed-in user's email against the admins table.
-- SECURITY DEFINER lets this bypass RLS on `admins` itself so it doesn't recurse.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email'
  );
$$;

CREATE POLICY "Admins can manage products" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage orders" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage order items" ON order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- USEFUL INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_trending ON products(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sale ON products(is_on_sale) WHERE is_on_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_new ON products(is_new_arrival) WHERE is_new_arrival = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ==========================================
-- USEFUL VIEWS
-- ==========================================

-- Low stock products view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT p.id, p.name, p.sku, p.stock, c.name as category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock <= 10 AND p.is_active = TRUE
ORDER BY p.stock ASC;

-- Order summary view
CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.id, o.order_number, o.status, o.payment_method, o.payment_status,
  o.total, o.created_at,
  o.first_name || ' ' || o.last_name as customer_name,
  o.email as customer_email,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- ==========================================
-- SEED DATA (Optional — for initial setup)
-- ==========================================

-- Insert default homepage content
INSERT INTO homepage_content (section_key, title, subtitle, button_text, button_link) VALUES
  ('hero', 'Redefine Your Elegance', 'Discover our curated collection of luxury feminine fashion — crafted for the woman who dares to be unforgettable.', 'Explore Collection', '/shop'),
  ('featured', 'Featured Collection', 'Hand-picked favorites that define our signature style', NULL, NULL),
  ('trending', 'Trending Now', 'The pieces everyone is talking about', NULL, NULL),
  ('newsletter', 'Join the Inner Circle', 'Subscribe for exclusive access to new arrivals, private sales, and style inspiration.', NULL, NULL);

-- Insert default admin
-- Password should be hashed via Supabase Auth in production
INSERT INTO admins (email, name, role) VALUES
  ('admin@Shiny Shadess.com', 'Admin User', 'super_admin');

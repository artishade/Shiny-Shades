/* ===================================================
  - Supabase Client
   Updated with Cloudinary + Google Sheets integration
   =================================================== */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ===== Supabase Client =====
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ===== Auth Helpers =====
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, metadata?: Record<string, string>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ===== Product Helpers =====
export async function fetchProducts(filters?: Record<string, string>) {
  let query = supabase.from('products').select('*');
  if (filters?.category) query = query.eq('category_slug', filters.category);
  if (filters?.featured) query = query.eq('is_featured', true);
  if (filters?.trending) query = query.eq('is_trending', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

// ===== Order Helpers =====
export async function createOrder(orderData: Record<string, unknown>) {
  const { error } = await supabase
    .from('orders')
    .insert(orderData);
  if (error) throw error;
  await sendOrderToGoogleSheets(orderData); // use what you already have, not a DB echo
  return orderData;
}

export async function updateOrderStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== Category Helpers =====
export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}

// ===== Coupon Helpers =====
export async function validateCoupon(code: string) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()
  if (error) return null;
  return data;
}


// ===== Google Sheets Integration =====
export async function sendOrderToGoogleSheets(order: Record<string, unknown>) {
  try {
    // Items array
    const itemsArray = Array.isArray(order.items)
      ? (order.items as Array<Record<string, unknown>>)
      : [];

    // ✅ FIXED: Product name + size + color in same column
    const productNames = itemsArray.length > 0
      ? itemsArray.map(item => {
        const name = String(item.productName || '');
        const size = String(item.size || '');
        const color = String(item.color || '');
        const details = [size, color].filter(Boolean).join('/');
        return details ? `${name} (${details})` : name;
      }).join(', ')
      : String(order.items || '-');

    // Quantities comma separated
    const quantities = itemsArray.length > 0
      ? itemsArray.map(item => String(item.quantity || '1')).join(', ')
      : '1';

    // Customer info
    const customer = order.customer as Record<string, string> | undefined;
    const customerName = customer
      ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
      : String(order.customerName || '-');

    const phone = customer?.phone || String(order.phone || '-');
    const address = customer?.address || String(order.address || '-');

    // Payment method label
    const pm = String(order.paymentMethod || 'cod');
    const paymentLabel =
      pm === 'cod' ? 'Cash on Delivery' :
        pm === 'bkash' ? 'বিকাশ' :
          pm === 'nagad' ? 'নগদ' : pm;

    // Notes
    const notes = String(order.notes || '-');

    // Amounts
    const subtotal = Number(order.subtotal || 0);
    const shippingCharge = Number(order.shippingCharge || 0);
    const total = Number(order.total || 0);

    const payload = {
      orderNumber: String(order.orderNumber || order.id || '-'),
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      name: customerName,
      number: phone,
      address: address,
      product: productNames,
      qty: quantities,
      amount: `${subtotal.toFixed(0)}`,
      courier: `${shippingCharge.toFixed(0)}`,
      condAmount: `${total.toFixed(0)}`,
      paymentMethod: paymentLabel,
      notes: notes,
    };

    console.log('Sending to Google Sheets:', payload);

    await fetch('/api/log-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Order sent to Google Sheets successfully');
  } catch (error) {
    console.error('Google Sheets sync failed (order still saved):', error);
  }
}
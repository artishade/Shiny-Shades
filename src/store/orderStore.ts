import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, PaymentStatus } from '@/types';

// ─── Shape ────────────────────────────────────────────────────────────────────

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
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

export interface RealOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  gatewaySessionId?: string;
  couponCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  items: OrderItem[];
}

// ─── Row ↔ Domain mappers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrder(row: any): RealOrder {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number ?? row.id),
    status: (row.status as OrderStatus) ?? 'pending',
    paymentStatus: (row.payment_status as PaymentStatus) ?? 'pending',
    paymentMethod: String(row.payment_method ?? ''),
    transactionId: row.transaction_id ?? undefined,
    gatewaySessionId: row.gateway_session_id ?? undefined,
    couponCode: row.coupon_code ?? undefined,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    notes: row.notes ?? undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    customer: {
      firstName: String(row.customer_first_name ?? ''),
      lastName: String(row.customer_last_name ?? ''),
      email: String(row.customer_email ?? ''),
      phone: String(row.customer_phone ?? ''),
      address: String(row.customer_address ?? ''),
      city: String(row.customer_city ?? ''),
      district: row.customer_district ?? undefined,
    },
    items: Array.isArray(row.items) ? row.items : [],
  };
}

function orderToRow(order: RealOrder): Record<string, unknown> {
  return {
    id: undefined,
    order_number: order.orderNumber,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    transaction_id: order.transactionId ?? null,
    gateway_session_id: order.gatewaySessionId ?? null,
    coupon_code: order.couponCode ?? null,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    notes: order.notes ?? null,
    customer_first_name: order.customer.firstName,
    customer_last_name: order.customer.lastName,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    customer_address: order.customer.address,
    customer_city: order.customer.city,
    customer_district: order.customer.district ?? null,
    items: order.items,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface OrderStore {
  orders: RealOrder[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  placeOrder: (order: RealOrder) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  updateOrder: (order: RealOrder) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<OrderStore>()((set, get) => ({
  orders: [],
  loading: false,
  hasFetched: false,
  error: null,

  // ── Fetch all orders from Supabase ──────────────────────────────────────────
  fetchOrders: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        orders: (data ?? []).map(rowToOrder),
        loading: false,
        hasFetched: true,
      });
    } catch (err) {
      console.error('[OrderStore] fetchOrders:', err);
      set({
        loading: false,
        hasFetched: true,
        error: err instanceof Error ? err.message : 'Failed to load orders',
      });
    }
  },

  // ── Place new order — insert into Supabase first ────────────────────────────
  placeOrder: async (order) => {
    try {
      const row = orderToRow(order);
      delete row.id; // let Postgres generate the real UUID via gen_random_uuid()

      const { error } = await supabase
        .from('orders')
        .insert(row);

      if (error) throw error;

      // No SELECT-back — guests have no SELECT policy on orders, by design
      // (see schema.sql). Use the order object we already have locally for
      // optimistic UI; the admin panel's fetchOrders() will show the real
      // DB row (with real uuid + timestamps) on next load.
      set({ orders: [order, ...get().orders] });
    } catch (err) {
      console.error('[OrderStore] placeOrder:', err);
      // Re-throw so the caller (Checkout) can surface a real error
      // and avoid showing a fake success screen.
      throw err;
    }
  },

  // ── Update order status ─────────────────────────────────────────────────────
  updateOrderStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[OrderStore] updateOrderStatus:', err);
    }
    // Optimistic local update regardless
    set({
      orders: get().orders.map((o) =>
        o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o,
      ),
    });
  },

  // ── Delete order ────────────────────────────────────────────────────────────
  deleteOrder: async (id) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[OrderStore] deleteOrder:', err);
    }
    // Optimistic local removal regardless
    set({
      orders: get().orders.filter((o) => o.id !== id),
    });
  },

  // ── Update payment status ───────────────────────────────────────────────────
  updatePaymentStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[OrderStore] updatePaymentStatus:', err);
    }
    set({
      orders: get().orders.map((o) =>
        o.id === id
          ? { ...o, paymentStatus: status, updatedAt: new Date().toISOString() }
          : o,
      ),
    });
  },

  // ── Full order update ───────────────────────────────────────────────────────
  updateOrder: async (updatedOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(orderToRow(updatedOrder))
        .eq('id', updatedOrder.id);

      if (error) throw error;
    } catch (err) {
      console.error('[OrderStore] updateOrder:', err);
    }
    set({
      orders: get().orders.map((o) =>
        o.id === updatedOrder.id
          ? { ...updatedOrder, updatedAt: new Date().toISOString() }
          : o,
      ),
    });
  },
}));

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Coupon } from '@/types';

// ─── Row ↔ Domain ─────────────────────────────────────────────────────────────

function rowToCoupon(row: Record<string, unknown>): Coupon {
    return {
        id: String(row.id),
        code: String(row.code ?? ''),
        discount: Number(row.discount ?? 0),
        type: (row.type as 'percentage' | 'fixed') ?? 'percentage',
        minOrderAmount: Number(row.min_order_amount ?? 0),
        maxUses: Number(row.max_uses ?? 0),
        usedCount: Number(row.used_count ?? 0),
        expiresAt: String(row.expires_at ?? ''),
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at ?? new Date().toISOString()),
    };
}

function couponToRow(c: Partial<Coupon>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (c.code !== undefined) row.code = c.code;
    if (c.discount !== undefined) row.discount = c.discount;
    if (c.type !== undefined) row.type = c.type;
    if (c.minOrderAmount !== undefined) row.min_order_amount = c.minOrderAmount;
    if (c.maxUses !== undefined) row.max_uses = c.maxUses;
    if (c.usedCount !== undefined) row.used_count = c.usedCount;
    if (c.expiresAt !== undefined) row.expires_at = c.expiresAt;
    if (c.isActive !== undefined) row.is_active = c.isActive;
    return row;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CouponStore {
    coupons: Coupon[];
    loading: boolean;
    hasFetched: boolean;
    error: string | null;

    loadCoupons: () => Promise<void>;
    addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'usedCount' | 'isActive'>) => Promise<void>;
    updateCoupon: (id: string, updates: Partial<Coupon>) => Promise<void>;
    deleteCoupon: (id: string) => Promise<void>;
    toggleCoupon: (id: string) => Promise<void>;
    incrementCouponUsage: (code: string) => Promise<void>;
}

export const useCouponStore = create<CouponStore>()((set, get) => ({
    coupons: [],
    loading: false,
    hasFetched: false,
    error: null,

    loadCoupons: async () => {
        if (get().loading || get().hasFetched) return;
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ coupons: (data ?? []).map(rowToCoupon), loading: false, hasFetched: true });
        } catch (err) {
            console.error('[CouponStore] loadCoupons:', err);
            set({
                loading: false,
                hasFetched: true,
                error: err instanceof Error ? err.message : 'Failed to load coupons',
            });
        }
    },

    addCoupon: async (coupon) => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .insert(couponToRow({ ...coupon, usedCount: 0, isActive: true }))
                .select()
                .single();

            if (error) throw error;
            set((s) => ({ coupons: [rowToCoupon(data), ...s.coupons] }));
        } catch (err) {
            console.error('[CouponStore] addCoupon:', err);
            throw err;
        }
    },

    updateCoupon: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .update(couponToRow(updates))
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            const updated = rowToCoupon(data);
            set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? updated : c)) }));
        } catch (err) {
            console.error('[CouponStore] updateCoupon:', err);
            throw err;
        }
    },

    deleteCoupon: async (id) => {
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
        } catch (err) {
            console.error('[CouponStore] deleteCoupon:', err);
            throw err;
        }
    },

    toggleCoupon: async (id) => {
        const current = get().coupons.find((c) => c.id === id);
        if (!current) return;
        await get().updateCoupon(id, { isActive: !current.isActive });
    },

    // Call this after a successful order that used a coupon, so maxUses is enforced server-side too
    incrementCouponUsage: async (code) => {
        const current = get().coupons.find((c) => c.code === code);
        if (!current) return;
        await get().updateCoupon(current.id, { usedCount: current.usedCount + 1 });
    },
}));
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/types';

interface AdminAuthStore {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  logout: () => void;
  setAuthenticated: (val: boolean) => void;
  setAdmin: (admin: AdminUser | null) => void;
}

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,

      logout: () => set({ admin: null, isAuthenticated: false }),

      setAuthenticated: (val) => set({ isAuthenticated: val }),

      setAdmin: (admin) => set({ admin }),
    }),
    { name: 'website-admin' },
  ),
);

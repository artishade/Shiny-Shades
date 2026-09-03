/* ===================================================
    - Admin auth guard + sidebar shell
    Ported from src/App.tsx's <AdminProtectedRoute> wrapping <AdminLayout>.
   =================================================== */

import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from '@/lib/routerCompat';
import { useAdminAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/layout/AdminLayout';

export const AdminFallback = memo(() => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading admin panel"
    className="flex items-center justify-center min-h-[60vh]"
  >
    <p className="text-[#6B5B55] text-sm animate-pulse">Loading…</p>
  </div>
));
AdminFallback.displayName = 'AdminFallback';

export function AdminAuthLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const setAuthenticated = useAdminAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const checkSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setAuthenticated(!!data.session);
    setChecking(false);
  }, [setAuthenticated]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [checking, isAuthenticated, navigate]);

  if (checking) return <AdminFallback />;
  if (!isAuthenticated) return <AdminFallback />;

  return <AdminLayout>{children}</AdminLayout>;
}

/* ===================================================
    - Admin auth guard + sidebar shell
    Ported from src/App.tsx's <AdminProtectedRoute> wrapping <AdminLayout>.
   =================================================== */

import { memo, useEffect, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthenticated(!!data.session);
      setChecking(false);
    });

    // Without this the shell stays mounted after the token expires or the admin
    // signs out in another tab — every query would silently 401 behind a live UI.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setAuthenticated]);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [checking, isAuthenticated, navigate]);

  if (checking || !isAuthenticated) return <AdminFallback />;

  return <AdminLayout>{children}</AdminLayout>;
}

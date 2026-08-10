/* ===================================================
    - Admin Layout (Sidebar + Topbar)
   =================================================== */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, FolderOpen, ShoppingCart, Users,
  FileText, Ticket, BarChart3, AlertTriangle, LogOut, Menu
} from 'lucide-react';
import { useAdminAuthStore } from '@/store';
import { BRAND } from '@/config/brandingConfig';

const sidebarItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderOpen },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Content', path: '/admin/content', icon: FileText },
  { label: 'Coupons', path: '/admin/coupons', icon: Ticket },
  { label: 'Inventory', path: '/admin/inventory', icon: AlertTriangle },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
];

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-blush/20">
        <Link to="/admin/dashboard" className="block">
          <h2 className="heading-serif text-lg font-bold text-charcoal">
            {BRAND.nameTop}
            <span className="block text-[9px] font-sans font-normal tracking-[0.25em] text-rose-gold">{BRAND.nameBottom}</span>
          </h2>
          <p className="text-[10px] text-[#6B5B55] mt-1 uppercase tracking-wider">Admin Panel</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-rose-gold text-white shadow-md shadow-rose-gold/20'
                : 'text-[#6B5B55] hover:bg-blush-light/50 hover:text-charcoal'
                }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-blush/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-gold/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-rose-gold">
              {admin?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">{admin?.name || 'Admin'}</p>
            <p className="text-xs text-[#6B5B55] truncate">{admin?.role || 'super_admin'}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-blush-light/50 text-[#6B5B55] hover:text-deep-rose transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-soft-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-blush/10 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 glass border-b border-blush/10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-blush-light/50 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden sm:inline-flex px-4 py-1.5 rounded-lg bg-blush-light/50 text-xs font-medium text-charcoal hover:bg-blush-light transition-colors"
              >
                View Store
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
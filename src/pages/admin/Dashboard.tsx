/* ===================================================
   Shiny Shades - Admin Dashboard
   Fixed: uses REAL orders instead of fake demo data
   =================================================== */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, ShoppingBag } from 'lucide-react';
import { FadeIn } from '@/components/ui';
import { useOrderStore, useProductStore, useCategoryStore } from '@/store';

export const AdminDashboard: React.FC = () => {
  // ✅ Real data from real stores
  const { orders } = useOrderStore();
  const { products } = useProductStore();
  const { categories } = useCategoryStore();

  // --- Exclude cancelled orders from all revenue calculations ---
  const revenueOrders = orders.filter(o => o.status !== 'cancelled');

  // --- Compute real stats from actual orders ---
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const lowStock = products.filter(p => p.stock <= 10);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

  // Revenue by month (last 6 months) from real non-cancelled orders
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const salesData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthOrders = revenueOrders.filter(o => {
      const od = new Date(o.createdAt);
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
    });
    return {
      month: monthNames[d.getMonth()],
      revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
    };
  });
  const maxRevenue = Math.max(...salesData.map(d => d.revenue), 1); // avoid div-by-zero

  // Recent 5 orders
  const recentOrders = orders.slice(0, 5);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">Dashboard</h1>
        <p className="text-[#6B5B55] mt-1">Welcome back! Here's your store overview.</p>
      </div>

      {/* Stats Grid — all from real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          {
            label: 'Total Revenue',
            value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            gradient: 'stat-gradient-1',
            sub: `${revenueOrders.length} orders`,
          },
          {
            label: 'Total Orders',
            value: totalOrders.toString(),
            icon: ShoppingCart,
            gradient: 'stat-gradient-2',
            sub: `${pendingOrders.length} pending`,
          },
          {
            label: 'Total Products',
            value: products.length.toString(),
            icon: Package,
            gradient: 'stat-gradient-4',
            sub: `${lowStock.length} low stock`,
          },
          {
            label: 'Categories',
            value: categories.length.toString(),
            icon: ShoppingBag,
            gradient: 'stat-gradient-3',
            sub: 'active categories',
          },
        ].map((stat, index) => (
          <FadeIn key={stat.label} delay={index * 0.1}>
            <div className={`glass-card rounded-2xl p-5 ${stat.gradient}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                  <stat.icon size={20} className="text-rose-gold" />
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-[#6B5B55]">
                  {stat.sub}
                </span>
              </div>
              <p className="heading-serif text-2xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-sm text-[#6B5B55] mt-0.5">{stat.label}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart — built from real non-cancelled orders */}
        <FadeIn className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-charcoal">Revenue Overview</h3>
                <p className="text-sm text-[#6B5B55]">Monthly revenue (last 6 months)</p>
              </div>
              <TrendingUp size={20} className="text-rose-gold" />
            </div>
            <div className="flex items-end gap-2 md:gap-4 h-48">
              {salesData.map((data, index) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-[#6B5B55]">
                    {data.revenue > 0 ? `$${(data.revenue / 1000).toFixed(1)}k` : '$0'}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '100%' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max((data.revenue / maxRevenue) * 100, data.revenue > 0 ? 4 : 0)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="w-full chart-bar rounded-t-lg min-h-[4px]"
                    />
                  </div>
                  <span className="text-xs text-[#6B5B55]">{data.month}</span>
                </div>
              ))}
            </div>
            {orders.length === 0 && (
              <p className="text-center text-[#6B5B55] text-sm mt-4">
                No orders yet — chart will fill as customers order
              </p>
            )}
          </div>
        </FadeIn>

        {/* Alerts */}
        <FadeIn>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              Alerts
            </h3>
            {pendingOrders.length === 0 && lowStock.length === 0 ? (
              <div className="text-center py-8 text-[#6B5B55]">
                <p className="text-sm">All clear! No alerts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.length > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-xl">
                    <p className="text-sm font-medium text-yellow-800">{pendingOrders.length} pending orders</p>
                    <p className="text-xs text-yellow-600 mt-0.5">Require your attention</p>
                  </div>
                )}
                {lowStock.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-sm font-medium text-red-800">{lowStock.length} low stock items</p>
                    <p className="text-xs text-red-600 mt-0.5">Stock below 10 units</p>
                  </div>
                )}
                {lowStock.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/50">
                    <div className={`w-8 h-8 rounded-lg ${p.images?.[0] || 'bg-blush-light'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-charcoal truncate">{p.name}</p>
                      <p className="text-xs text-red-500">{p.stock} left</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </div>

      {/* Recent Orders — real customer orders */}
      <FadeIn>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-charcoal">Recent Orders</h3>
            <Link to="/admin/orders" className="text-sm text-rose-gold hover:underline">
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={36} className="mx-auto text-blush mb-3" />
              <p className="text-charcoal font-medium">No orders yet</p>
              <p className="text-[#6B5B55] text-sm mt-1">
                When customers place orders, they'll appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blush/20">
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Order</th>
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Customer</th>
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Phone</th>
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Total</th>
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Status</th>
                    <th className="text-left py-3 text-[#6B5B55] font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-blush/10 last:border-0">
                      <td className="py-3 font-medium text-charcoal">{order.orderNumber}</td>
                      <td className="py-3 text-[#6B5B55]">
                        {order.customer.firstName} {order.customer.lastName}
                      </td>
                      <td className="py-3 text-[#6B5B55]">{order.customer.phone}</td>
                      <td className="py-3 font-medium text-charcoal">${order.total.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${order.paymentStatus === 'verified'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                            }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
};
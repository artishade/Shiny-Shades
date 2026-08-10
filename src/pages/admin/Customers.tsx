/* ===================================================
   Shiny Shades - Admin Customers
   FIXED:
   - TypeScript errors fixed (RealOrder type imported properly)
   - Cancel order button on each order in modal
   - Cancelled orders excluded from "Total Spent" amount
   - All red/yellow squiggles resolved
   =================================================== */

import React, { useMemo, useState } from 'react';
import { Search, Mail, Phone, ShoppingBag, X } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useOrderStore } from '@/store';
import type { RealOrder } from '@/store';
import type { OrderStatus } from '@/types';

interface DerivedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  firstOrderDate: string;
  orders: RealOrder[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export const AdminCustomers: React.FC = () => {
  const { orders, updateOrderStatus } = useOrderStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<DerivedCustomer | null>(null);

  // ✅ Derive unique customers from real orders — fully typed, no "any"
  const customers = useMemo<DerivedCustomer[]>(() => {
    const map = new Map<string, DerivedCustomer>();

    orders.forEach((order: RealOrder) => {
      const key = order.customer.phone || order.customer.email || order.customer.firstName;
      if (!key) return;

      const isActive = order.status !== 'cancelled';

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.totalOrders += 1;
        if (isActive) existing.totalSpent += order.total;
        existing.orders.push(order);
      } else {
        map.set(key, {
          id: key,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
          phone: order.customer.phone,
          address: order.customer.address,
          city: order.customer.city,
          totalOrders: 1,
          totalSpent: isActive ? order.total : 0,
          firstOrderDate: order.createdAt,
          orders: [order],
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.firstOrderDate).getTime() - new Date(a.firstOrderDate).getTime()
    );
  }, [orders]);

  // ✅ Keep modal data live — re-derives when orders change (e.g. after cancel)
  const liveSelectedCustomer = useMemo<DerivedCustomer | null>(() => {
    if (!selectedCustomer) return null;
    return customers.find(c => c.id === selectedCustomer.id) ?? null;
  }, [customers, selectedCustomer]);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Cancel this order? The amount will be removed from their total and from revenue.')) {
      updateOrderStatus(orderId, 'cancelled' as OrderStatus);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">Customers</h1>
        <p className="text-[#6B5B55] text-sm">{customers.length} customers from real orders</p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blush/20 bg-blush-light/20">
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Contact</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Orders</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Total Spent</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">First Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer: DerivedCustomer) => (
                <tr
                  key={customer.id}
                  className="border-b border-blush/10 last:border-0 hover:bg-blush-light/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-gold/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-rose-gold">
                          {customer.firstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-charcoal">
                        {customer.firstName} {customer.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-[#6B5B55]">
                      <Mail size={12} /> {customer.email || '—'}
                    </div>
                    <div className="flex items-center gap-1 text-[#6B5B55] text-xs mt-0.5">
                      <Phone size={10} /> {customer.phone}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-charcoal">{customer.totalOrders}</td>
                  <td className="py-3 px-4 font-medium text-charcoal">${customer.totalSpent.toFixed(2)}</td>
                  <td className="py-3 px-4 text-[#6B5B55]">
                    {new Date(customer.firstOrderDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag size={36} className="mx-auto text-blush mb-3" />
            <p className="text-charcoal font-medium">No customers yet</p>
            <p className="text-[#6B5B55] text-sm mt-1">
              {searchQuery
                ? 'No customers match your search'
                : 'Customers appear here after they place orders'}
            </p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={!!liveSelectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={liveSelectedCustomer ? `${liveSelectedCustomer.firstName} ${liveSelectedCustomer.lastName}` : ''}
        size="lg"
      >
        {liveSelectedCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-sm font-semibold text-charcoal mb-3">Contact Info</h4>
                <div className="space-y-1">
                  <p className="text-sm text-[#6B5B55]">{liveSelectedCustomer.email || 'No email'}</p>
                  <p className="text-sm text-[#6B5B55]">{liveSelectedCustomer.phone}</p>
                  <p className="text-sm text-[#6B5B55]">
                    {liveSelectedCustomer.address}, {liveSelectedCustomer.city}
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-sm font-semibold text-charcoal mb-3">Stats</h4>
                <div className="space-y-1">
                  <p className="text-sm text-[#6B5B55]">
                    Total Orders: <span className="text-charcoal font-medium">{liveSelectedCustomer.totalOrders}</span>
                  </p>
                  <p className="text-sm text-[#6B5B55]">
                    Total Spent: <span className="text-charcoal font-medium">${liveSelectedCustomer.totalSpent.toFixed(2)}</span>
                    <span className="text-xs text-[#6B5B55] ml-1">(cancelled excluded)</span>
                  </p>
                  <p className="text-sm text-[#6B5B55]">
                    Since: {new Date(liveSelectedCustomer.firstOrderDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Order history with cancel button */}
            <div>
              <h4 className="text-sm font-semibold text-charcoal mb-3">Order History</h4>
              <div className="space-y-2">
                {liveSelectedCustomer.orders.map((order: RealOrder) => (
                  <div
                    key={order.id}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border border-blush/10 ${order.status === 'cancelled' ? 'bg-red-50/40 opacity-70' : 'bg-blush-light/20'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal">{order.orderNumber}</p>
                      <p className="text-xs text-[#6B5B55]">
                        {new Date(order.createdAt).toLocaleDateString()} •{' '}
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                    <span className={`text-sm font-medium flex-shrink-0 ${order.status === 'cancelled' ? 'text-[#6B5B55] line-through' : 'text-charcoal'}`}>
                      ${order.total.toFixed(2)}
                    </span>
                    {/* ✅ Cancel button */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-red-500 hover:!bg-red-50 flex-shrink-0"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <X size={13} /> Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
/* ===================================================
    Admin Orders Management
   FIXED:
   1. fetchOrders() called on mount so search works
   2. Admin can edit order total inline
   3. Admin can add/remove items from an existing order
   4. Admin can permanently delete an order from the panel
   + PDF export: single, multi-select, date range, all
   =================================================== */

import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, XCircle, ShoppingBag, X, Plus, Minus, Edit2, Check, Trash2, FileDown, CheckSquare, Square } from 'lucide-react';
import { Button, Select, Modal } from '@/components/ui';
import { useOrderStore } from '@/store';
import type { OrderStatus } from '@/types';
import type { RealOrder } from '@/store';
import { OrderPdfModal } from '@/components/admin/OrderPdfModal';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Blank item template for "Add Item" form ───────────────────────────────
const blankNewItem = {
  productName: '',
  size: '',
  color: '',
  quantity: 1,
  price: 0,
  productImage: '',
};

export const AdminOrders: React.FC = () => {
  const { orders, fetchOrders, updateOrderStatus, updatePaymentStatus, updateOrder, deleteOrder } = useOrderStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RealOrder | null>(null);

  // ── PDF export state ──────────────────────────────────────────────────────
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfSingleOrder, setPdfSingleOrder] = useState<RealOrder | null>(null);
  const [checkedOrderIds, setCheckedOrderIds] = useState<Set<string>>(new Set());

  const toggleOrderCheck = (id: string) => {
    setCheckedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllChecked = () => {
    if (checkedOrderIds.size === filtered.length) setCheckedOrderIds(new Set());
    else setCheckedOrderIds(new Set(filtered.map(o => o.id)));
  };

  const openPdfForSingle = (order: RealOrder) => {
    setPdfSingleOrder(order);
    setCheckedOrderIds(new Set());
    setPdfModalOpen(true);
  };

  const openPdfForSelected = () => {
    setPdfSingleOrder(null);
    setPdfModalOpen(true);
  };

  // ── FIX 1: Fetch real orders on mount so search has data ──────────────────
  useEffect(() => {
    fetchOrders?.();
  }, []);

  // ── FIX 2: Inline total editing state ─────────────────────────────────────
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');

  // ── FIX 3: Add-item form state ────────────────────────────────────────────
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ ...blankNewItem });

  // ─── Keep selectedOrder in sync with store updates ────────────────────────
  useEffect(() => {
    if (selectedOrder) {
      const fresh = orders.find(o => o.id === selectedOrder.id);
      if (fresh) setSelectedOrder(fresh);
    }
  }, [orders]);

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.firstName.toLowerCase().includes(q) ||
      o.customer.lastName.toLowerCase().includes(q) ||
      o.customer.phone.includes(q);
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  const handlePaymentVerify = (orderId: string, verified: boolean) => {
    updatePaymentStatus(orderId, verified ? 'verified' : 'failed');
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev =>
        prev ? { ...prev, paymentStatus: verified ? 'verified' : 'failed' } : null
      );
    }
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Cancel this order? Revenue and customer total will be updated.')) {
      updateOrderStatus(orderId, 'cancelled' as OrderStatus);
    }
  };

  // ── FIX 4: Permanently delete an order ────────────────────────────────────
  const handleDeleteOrder = (orderId: string) => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return;
    deleteOrder?.(orderId);
    if (selectedOrder?.id === orderId) handleModalClose();
  };

  // ── FIX 2: Save edited total ───────────────────────────────────────────────
  const handleTotalEditStart = () => {
    setTotalDraft(selectedOrder!.total.toFixed(2));
    setEditingTotal(true);
  };

  const handleTotalSave = () => {
    const parsed = parseFloat(totalDraft);
    if (!isNaN(parsed) && parsed >= 0 && selectedOrder) {
      const updated = { ...selectedOrder, total: parsed };
      updateOrder?.(updated);
      setSelectedOrder(updated);
    }
    setEditingTotal(false);
  };

  // ── FIX 3: Remove an item from an order ───────────────────────────────────
  const handleRemoveItem = (itemIndex: number) => {
    if (!selectedOrder) return;
    if (selectedOrder.items.length <= 1) {
      alert('An order must have at least one item. Cancel the order instead.');
      return;
    }
    if (!confirm('Remove this item? The order total will be recalculated.')) return;

    const updatedItems = selectedOrder.items.filter((_, i) => i !== itemIndex);
    const newSubtotal = updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = selectedOrder.discount ?? 0;
    const newTotal = Math.max(0, newSubtotal - discount);

    const updated: RealOrder = {
      ...selectedOrder,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };
    updateOrder?.(updated);
    setSelectedOrder(updated);
  };

  // ── FIX 3: Add a new item to an order ─────────────────────────────────────
  const handleAddItem = () => {
    if (!selectedOrder) return;
    if (!newItem.productName.trim()) {
      alert('Product name is required.');
      return;
    }
    if (newItem.price < 0 || newItem.quantity < 1) {
      alert('Price must be ≥ 0 and quantity ≥ 1.');
      return;
    }

    const addedItem = {
      productId: '',
      productName: newItem.productName.trim(),
      size: newItem.size.trim() || '—',
      color: newItem.color.trim() || '—',
      quantity: newItem.quantity,
      price: newItem.price,
      productImage: newItem.productImage.trim() || '',
    };

    const updatedItems = [...selectedOrder.items, addedItem];
    const newSubtotal = updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = selectedOrder.discount ?? 0;
    const newTotal = Math.max(0, newSubtotal - discount);

    const updated: RealOrder = {
      ...selectedOrder,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };
    updateOrder?.(updated);
    setSelectedOrder(updated);
    setNewItem({ ...blankNewItem });
    setShowAddItem(false);
  };

  const handleModalClose = () => {
    setSelectedOrder(null);
    setEditingTotal(false);
    setShowAddItem(false);
    setNewItem({ ...blankNewItem });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">Orders</h1>
        <p className="text-[#6B5B55] text-sm">{orders.length} total orders</p>
      </div>

      {/* Filters + PDF toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
          <input
            type="text"
            placeholder="Search by order #, name, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
          />
        </div>
        <Select
          options={statusOptions}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="!w-auto"
        />
        {/* PDF export buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {checkedOrderIds.size > 0 && (
            <button
              onClick={openPdfForSelected}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-gold text-white text-xs font-semibold shadow hover:bg-rose-gold/90 transition-colors"
            >
              <FileDown size={14} />
              PDF ({checkedOrderIds.size})
            </button>
          )}
          <button
            onClick={() => { setPdfSingleOrder(null); setCheckedOrderIds(new Set()); setPdfModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blush/30 bg-white text-[#6B5B55] text-xs font-medium hover:bg-blush-light/40 transition-colors"
          >
            <FileDown size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blush/20 bg-blush-light/20">
                <th className="py-3 px-3 w-8">
                  <button onClick={toggleAllChecked} className="text-[#6B5B55] hover:text-rose-gold transition-colors">
                    {checkedOrderIds.size > 0 && checkedOrderIds.size === filtered.length
                      ? <CheckSquare size={15} className="text-rose-gold" />
                      : <Square size={15} />
                    }
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Order #</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Items</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Total</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Payment</th>
                <th className="text-right py-3 px-4 text-[#6B5B55] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className={`border-b border-blush/10 last:border-0 hover:bg-blush-light/10 transition-colors ${order.status === 'cancelled' ? 'opacity-60' : ''}`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleOrderCheck(order.id)}
                      className="text-[#6B5B55] hover:text-rose-gold transition-colors"
                    >
                      {checkedOrderIds.has(order.id)
                        ? <CheckSquare size={15} className="text-rose-gold" />
                        : <Square size={15} />
                      }
                    </button>
                  </td>
                  <td className="py-3 px-4 font-medium text-charcoal">{order.orderNumber}</td>
                  <td className="py-3 px-4">
                    <p className="text-charcoal">{order.customer.firstName} {order.customer.lastName}</p>
                    <p className="text-xs text-[#6B5B55]">{order.customer.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-[#6B5B55]">{order.items.length} items</td>
                  <td className={`py-3 px-4 font-medium ${order.status === 'cancelled' ? 'line-through text-[#6B5B55]' : 'text-charcoal'}`}>
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${statusColors[order.status]}`}
                    >
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${order.paymentStatus === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : order.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {order.paymentMethod.toUpperCase()} — {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 rounded-lg hover:bg-blush-light/50 text-[#6B5B55] hover:text-rose-gold transition-colors"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {/* ── PDF export for single order ── */}
                      <button
                        onClick={() => openPdfForSingle(order)}
                        className="p-2 rounded-lg hover:bg-blush-light/50 text-[#6B5B55] hover:text-rose-gold transition-colors"
                        title="Export as PDF"
                      >
                        <FileDown size={16} />
                      </button>
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!text-red-500 hover:!bg-red-50"
                          onClick={() => handleCancelOrder(order.id)}
                          title="Cancel this order"
                        >
                          <X size={14} />
                        </Button>
                      )}
                      {/* ── FIX 4: Delete button ── */}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#6B5B55] hover:text-red-500 transition-colors"
                        title="Delete order permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag size={40} className="mx-auto text-blush mb-3" />
            <p className="text-charcoal font-medium">No orders yet</p>
            <p className="text-[#6B5B55] text-sm mt-1">
              {searchQuery || filterStatus
                ? 'No orders match your search'
                : 'Orders placed by customers will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={handleModalClose}
        title={`Order ${selectedOrder?.orderNumber || ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer + Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-sm font-semibold text-charcoal mb-3">Customer Info</h4>
                <div className="space-y-1">
                  <p className="text-sm text-charcoal font-medium">
                    {selectedOrder.customer.firstName} {selectedOrder.customer.lastName}
                  </p>
                  <p className="text-sm text-[#6B5B55]">{selectedOrder.customer.email}</p>
                  <p className="text-sm text-[#6B5B55]">{selectedOrder.customer.phone}</p>
                  <p className="text-sm text-[#6B5B55]">
                    {selectedOrder.customer.address}, {selectedOrder.customer.city}
                    {(selectedOrder.customer as any).district ? `, ${(selectedOrder.customer as any).district}` : ''}
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-sm font-semibold text-charcoal mb-3">Payment Info</h4>
                <div className="space-y-1">
                  <p className="text-sm text-[#6B5B55] capitalize">
                    Method: <span className="text-charcoal">{selectedOrder.paymentMethod}</span>
                  </p>
                  <p className="text-sm text-[#6B5B55]">
                    Status: <span className="capitalize text-charcoal">{selectedOrder.paymentStatus}</span>
                  </p>
                  {selectedOrder.transactionId && (
                    <p className="text-sm text-[#6B5B55]">
                      TXN: <span className="text-charcoal">{selectedOrder.transactionId}</span>
                    </p>
                  )}
                  {selectedOrder.couponCode && (
                    <p className="text-sm text-[#6B5B55]">
                      Coupon: <span className="text-charcoal">{selectedOrder.couponCode}</span>
                    </p>
                  )}
                </div>
                {selectedOrder.paymentMethod !== 'cod' &&
                  selectedOrder.paymentStatus === 'pending' &&
                  selectedOrder.transactionId && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handlePaymentVerify(selectedOrder.id, true)}>
                        <CheckCircle size={14} /> Verify
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handlePaymentVerify(selectedOrder.id, false)}>
                        <XCircle size={14} /> Reject
                      </Button>
                    </div>
                  )}
              </div>
            </div>

            {/* ── FIX 3: Order Items with Remove + Add ────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-charcoal">Order Items</h4>
                {selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowAddItem(v => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-rose-gold hover:underline"
                  >
                    <Plus size={13} />
                    {showAddItem ? 'Cancel' : 'Add Item'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-blush/10 last:border-0">
                    <div
                      className={`w-10 h-12 rounded-lg flex-shrink-0 bg-blush-light`}
                      style={item.productImage ? { backgroundImage: `url(${item.productImage})`, backgroundSize: 'cover' } : {}}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal">{item.productName}</p>
                      <p className="text-xs text-[#6B5B55] mt-0.5">
                        Size: <span className="text-charcoal">{item.size}</span>
                        {' • '}
                        Color: <span className="text-charcoal">{item.color}</span>
                        {' • '}
                        Qty: <span className="text-charcoal">{item.quantity}</span>
                      </p>
                    </div>
                    <p className="text-sm font-medium text-charcoal flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    {/* Remove item button */}
                    {selectedOrder.status !== 'cancelled' && (
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-md text-[#6B5B55] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Remove item"
                      >
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Add Item Form ──────────────────────────────────────────── */}
              {showAddItem && (
                <div className="mt-3 p-4 bg-blush-light/20 rounded-xl border border-blush/20 space-y-3">
                  <p className="text-xs font-semibold text-charcoal uppercase tracking-wide">New Item</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Product Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Floral Frock"
                        value={newItem.productName}
                        onChange={e => setNewItem(p => ({ ...p, productName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Image URL (optional)</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newItem.productImage}
                        onChange={e => setNewItem(p => ({ ...p, productImage: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Size</label>
                      <input
                        type="text"
                        placeholder="e.g. S / 2Y / 28"
                        value={newItem.size}
                        onChange={e => setNewItem(p => ({ ...p, size: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Color</label>
                      <input
                        type="text"
                        placeholder="e.g. Pink"
                        value={newItem.color}
                        onChange={e => setNewItem(p => ({ ...p, color: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Unit Price ($) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newItem.price || ''}
                        onChange={e => setNewItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B5B55] mb-1 block">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={newItem.quantity}
                        onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddItem(false); setNewItem({ ...blankNewItem }); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddItem}>
                      <Plus size={14} /> Add to Order
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── FIX 2: Totals with inline total edit ─────────────────────── */}
            <div className="border-t border-blush/20 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B5B55]">Subtotal</span>
                <span>${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${selectedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center text-base font-semibold pt-1 border-t border-blush/10 ${selectedOrder.status === 'cancelled' ? 'text-[#6B5B55] line-through' : 'text-charcoal'
                }`}>
                <span>Total</span>

                {/* Inline total editor */}
                {selectedOrder.status !== 'cancelled' ? (
                  editingTotal ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#6B5B55]">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={totalDraft}
                        autoFocus
                        onChange={e => setTotalDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleTotalSave(); if (e.key === 'Escape') setEditingTotal(false); }}
                        className="w-24 px-2 py-1 rounded-lg border border-rose-gold/40 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                      />
                      <button
                        onClick={handleTotalSave}
                        className="p-1 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                        title="Save total"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingTotal(false)}
                        className="p-1 rounded-md text-[#6B5B55] hover:bg-blush-light/40 transition-colors"
                        title="Discard"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="heading-serif text-lg">${selectedOrder.total.toFixed(2)}</span>
                      <button
                        onClick={handleTotalEditStart}
                        className="p-1 rounded-md text-[#6B5B55] hover:text-rose-gold hover:bg-blush-light/40 transition-colors"
                        title="Edit total"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )
                ) : (
                  <span className="heading-serif text-lg">${selectedOrder.total.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="p-3 bg-champagne/30 rounded-xl">
                <p className="text-xs font-medium text-charcoal mb-1">Order Notes</p>
                <p className="text-sm text-[#6B5B55]">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-[#6B5B55] text-right">
              Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
            </p>

            {/* ── Bottom actions: PDF export + Delete ── */}
            <div className="border-t border-blush/20 pt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  openPdfForSingle(selectedOrder);
                  handleModalClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-gold/10 hover:bg-rose-gold/20 text-rose-gold text-sm font-medium transition-colors"
              >
                <FileDown size={15} />
                Export PDF
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="!text-red-500 hover:!bg-red-50 flex items-center gap-1.5"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
              >
                <Trash2 size={14} />
                Delete Order
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── PDF Export Modal ── */}
      <OrderPdfModal
        isOpen={pdfModalOpen}
        onClose={() => { setPdfModalOpen(false); setPdfSingleOrder(null); }}
        selectedOrders={orders.filter(o => checkedOrderIds.has(o.id))}
        allOrders={orders}
        singleOrder={pdfSingleOrder}
      />
    </div>
  );
};

export interface DerivedCustomer {
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
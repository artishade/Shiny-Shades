/* ===================================================
   Order PDF Modal
   - Preview (iframe embed)
   - Download (single / bulk)
   - Print (opens new tab)
   - Date-range filter for bulk export
   - Settings panel (collapsible)
   =================================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Download, Printer, Eye, Settings2, ChevronDown, ChevronUp,
    Calendar, FileDown, Loader2, CheckSquare, Square,
} from 'lucide-react';
import type { RealOrder } from '@/store/orderStore';
import {
    DEFAULT_PDF_SETTINGS,
    getPdfDataUri,
    downloadSingleOrderPdf,
    downloadMultiOrderPdf,
    previewOrderPdf,
} from '@/lib/orderPdf';
import type { PdfSettings } from '@/lib/orderPdf';
import { PdfSettingsPanel } from './PdfSettingsPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportMode = 'single' | 'selected' | 'dateRange' | 'all';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-selected orders (from table checkboxes). May be empty = show date-range UI */
    selectedOrders: RealOrder[];
    /** All orders in store (needed for date-range and "all" export) */
    allOrders: RealOrder[];
    /** If a single order was clicked, set this for "single" mode */
    singleOrder?: RealOrder | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderPdfModal: React.FC<Props> = ({
    isOpen,
    onClose,
    selectedOrders,
    allOrders,
    singleOrder,
}) => {
    const [settings, setSettings] = useState<PdfSettings>({ ...DEFAULT_PDF_SETTINGS });
    const [showSettings, setShowSettings] = useState(false);
    const [mode, setMode] = useState<ExportMode>('single');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

    // Determine default mode on open
    useEffect(() => {
        if (!isOpen) return;
        if (singleOrder) setMode('single');
        else if (selectedOrders.length > 0) setMode('selected');
        else setMode('dateRange');
        setPreviewUri(null);
        setCheckedIds(new Set(selectedOrders.map(o => o.id)));
    }, [isOpen, singleOrder, selectedOrders]);

    // Resolve orders for current mode
    const getOrdersForMode = useCallback((): RealOrder[] => {
        if (mode === 'single' && singleOrder) return [singleOrder];
        if (mode === 'selected') {
            return allOrders.filter(o => checkedIds.has(o.id));
        }
        if (mode === 'all') return allOrders;
        if (mode === 'dateRange') {
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
            return allOrders.filter(o => {
                const d = new Date(o.createdAt);
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            });
        }
        return [];
    }, [mode, singleOrder, allOrders, checkedIds, dateFrom, dateTo]);

    const resolvedOrders = getOrdersForMode();
    const orderCount = resolvedOrders.length;

    const handlePreview = () => {
        if (!orderCount) return;
        setGenerating(true);
        // Defer so spinner renders first
        setTimeout(() => {
            try {
                const uri = getPdfDataUri(resolvedOrders, settings);
                setPreviewUri(uri);
            } finally {
                setGenerating(false);
            }
        }, 50);
    };

    const handleDownload = () => {
        if (!orderCount) return;
        setGenerating(true);
        setTimeout(() => {
            try {
                if (mode === 'single' && singleOrder) {
                    downloadSingleOrderPdf(singleOrder, settings);
                } else {
                    const fname =
                        mode === 'dateRange' && (dateFrom || dateTo)
                            ? `orders-${dateFrom || 'start'}-to-${dateTo || 'today'}.pdf`
                            : undefined;
                    downloadMultiOrderPdf(resolvedOrders, settings, fname);
                }
            } finally {
                setGenerating(false);
            }
        }, 50);
    };

    const handlePrint = () => {
        if (!orderCount) return;
        setGenerating(true);
        setTimeout(() => {
            try {
                previewOrderPdf(resolvedOrders, settings);
            } finally {
                setGenerating(false);
            }
        }, 50);
    };

    const toggleOrder = (id: string) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (checkedIds.size === allOrders.length) setCheckedIds(new Set());
        else setCheckedIds(new Set(allOrders.map(o => o.id)));
    };

    if (!isOpen) return null;

    const inputCls =
        'px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 text-charcoal';

    const tabCls = (active: boolean) =>
        `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-rose-gold text-white' : 'bg-blush-light/40 text-[#6B5B55] hover:bg-blush-light'
        }`;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-4 sm:inset-8 lg:inset-12 z-[70] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-blush/20 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-rose-gold/10">
                                    <FileDown size={18} className="text-rose-gold" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-charcoal text-base">Export Orders as PDF</h2>
                                    <p className="text-xs text-[#6B5B55]">
                                        {orderCount > 0
                                            ? `${orderCount} order${orderCount > 1 ? 's' : ''} selected`
                                            : 'No orders selected'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-blush-light/50 text-[#6B5B55] hover:text-charcoal transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            {/* ── Left panel: controls ── */}
                            <div className="lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-blush/20 overflow-y-auto p-5 space-y-5">

                                {/* Export mode tabs */}
                                <div>
                                    <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-2">Export Mode</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {singleOrder && (
                                            <button className={tabCls(mode === 'single')} onClick={() => setMode('single')}>
                                                Single Order
                                            </button>
                                        )}
                                        {selectedOrders.length > 0 && (
                                            <button className={tabCls(mode === 'selected')} onClick={() => setMode('selected')}>
                                                Selected ({selectedOrders.length})
                                            </button>
                                        )}
                                        <button className={tabCls(mode === 'dateRange')} onClick={() => setMode('dateRange')}>
                                            <span className="flex items-center gap-1"><Calendar size={11} />Date Range</span>
                                        </button>
                                        <button className={tabCls(mode === 'all')} onClick={() => setMode('all')}>
                                            All ({allOrders.length})
                                        </button>
                                    </div>
                                </div>

                                {/* Date range inputs */}
                                {mode === 'dateRange' && (
                                    <div className="space-y-2 p-3 bg-blush-light/20 rounded-xl border border-blush/20">
                                        <p className="text-xs font-medium text-charcoal">Filter by Date Range</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-[#6B5B55] block mb-1">From</label>
                                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inputCls} w-full`} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-[#6B5B55] block mb-1">To</label>
                                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inputCls} w-full`} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-[#6B5B55]">
                                            {orderCount > 0
                                                ? `${orderCount} order${orderCount !== 1 ? 's' : ''} match this range`
                                                : 'No orders in this range'}
                                        </p>
                                    </div>
                                )}

                                {/* Manual order picker for "selected" mode */}
                                {mode === 'selected' && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-charcoal">
                                                Orders ({checkedIds.size} selected)
                                            </p>
                                            <button
                                                onClick={toggleAll}
                                                className="text-[10px] text-rose-gold hover:underline"
                                            >
                                                {checkedIds.size === allOrders.length ? 'Deselect all' : 'Select all'}
                                            </button>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                            {allOrders.map(o => (
                                                <button
                                                    key={o.id}
                                                    onClick={() => toggleOrder(o.id)}
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blush-light/30 transition-colors text-left"
                                                >
                                                    {checkedIds.has(o.id)
                                                        ? <CheckSquare size={14} className="text-rose-gold flex-shrink-0" />
                                                        : <Square size={14} className="text-blush flex-shrink-0" />
                                                    }
                                                    <span className="text-xs text-charcoal truncate">#{o.orderNumber}</span>
                                                    <span className="text-[10px] text-[#6B5B55] ml-auto flex-shrink-0">
                                                        {o.customer.firstName} {o.customer.lastName}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Settings collapsible ── */}
                                <div className="border border-blush/20 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setShowSettings(v => !v)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-blush-light/20 hover:bg-blush-light/40 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
                                            <Settings2 size={15} className="text-rose-gold" />
                                            PDF Settings &amp; Template
                                        </span>
                                        {showSettings ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </button>
                                    <AnimatePresence>
                                        {showSettings && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4">
                                                    <PdfSettingsPanel settings={settings} onChange={setSettings} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* ── Action buttons ── */}
                                <div className="space-y-2 pt-1">
                                    <button
                                        onClick={handlePreview}
                                        disabled={!orderCount || generating}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blush-light/40 hover:bg-blush-light border border-blush/30 text-sm font-medium text-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {generating ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                                        Preview PDF
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={!orderCount || generating}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-gold hover:bg-rose-gold/90 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        disabled={!orderCount || generating}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-charcoal hover:bg-charcoal/80 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {generating ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                                        Print / Open in Browser
                                    </button>
                                </div>
                            </div>

                            {/* ── Right panel: preview ── */}
                            <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
                                {generating ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                        <Loader2 size={32} className="animate-spin text-rose-gold" />
                                        <p className="text-sm text-[#6B5B55]">Generating PDF…</p>
                                    </div>
                                ) : previewUri ? (
                                    <iframe
                                        src={previewUri}
                                        className="flex-1 w-full h-full border-0"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                                        <div className="p-5 rounded-2xl bg-blush-light/30 mb-2">
                                            <Eye size={40} className="text-blush" />
                                        </div>
                                        <p className="font-medium text-charcoal">PDF Preview</p>
                                        <p className="text-sm text-[#6B5B55] max-w-xs">
                                            Configure your settings on the left, then click <strong>Preview PDF</strong> to see it here before downloading.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

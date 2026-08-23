/* ===================================================
   PDF Settings Panel — Template / Paper / Options
   =================================================== */

import React from 'react';
import type { PdfSettings, PaperSize, Orientation, TemplateStyle } from '@/lib/orderPdf';

interface Props {
    settings: PdfSettings;
    onChange: (s: PdfSettings) => void;
}

const PAPER_SIZES: { value: PaperSize; label: string }[] = [
    { value: 'a4', label: 'A4 (210 × 297 mm)' },
    { value: 'a5', label: 'A5 (148 × 210 mm)' },
    { value: 'letter', label: 'Letter (8.5 × 11 in)' },
    { value: 'legal', label: 'Legal (8.5 × 14 in)' },
];

const TEMPLATES: { value: TemplateStyle; label: string; desc: string }[] = [
    { value: 'classic', label: 'Classic', desc: 'Colored header bars, balanced layout' },
    { value: 'minimal', label: 'Minimal', desc: 'Clean lines, lots of white space' },
    { value: 'bold', label: 'Bold', desc: 'Larger headers, high-contrast' },
];

export const PdfSettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
    const set = <K extends keyof PdfSettings>(key: K, val: PdfSettings[K]) =>
        onChange({ ...settings, [key]: val });

    const inputCls =
        'w-full px-3 py-2 rounded-lg border border-blush/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 text-charcoal';

    const labelCls = 'block text-xs font-medium text-[#6B5B55] mb-1';

    return (
        <div className="space-y-5">
            {/* ── Template ── */}
            <div>
                <p className={labelCls}>Template Style</p>
                <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => set('template', t.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${settings.template === t.value
                                    ? 'border-rose-gold bg-blush-light/40'
                                    : 'border-blush/30 hover:border-blush/60'
                                }`}
                        >
                            <p className="text-xs font-semibold text-charcoal">{t.label}</p>
                            <p className="text-[10px] text-[#6B5B55] mt-0.5 leading-tight">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Paper Size + Orientation ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Paper Size</label>
                    <select
                        value={settings.paperSize}
                        onChange={e => set('paperSize', e.target.value as PaperSize)}
                        className={inputCls}
                    >
                        {PAPER_SIZES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Orientation</label>
                    <select
                        value={settings.orientation}
                        onChange={e => set('orientation', e.target.value as Orientation)}
                        className={inputCls}
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
            </div>

            {/* ── Page Title ── */}
            <div>
                <label className={labelCls}>Page Title</label>
                <input
                    type="text"
                    value={settings.pageTitle}
                    onChange={e => set('pageTitle', e.target.value)}
                    placeholder="ORDER INVOICE"
                    className={inputCls}
                />
            </div>

            {/* ── Colors ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Primary Color</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="color"
                            value={settings.primaryColor}
                            onChange={e => set('primaryColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-blush/30"
                        />
                        <input
                            type="text"
                            value={settings.primaryColor}
                            onChange={e => set('primaryColor', e.target.value)}
                            className={`${inputCls} flex-1`}
                            placeholder="#B07D6B"
                        />
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Text Color</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="color"
                            value={settings.accentColor}
                            onChange={e => set('accentColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-blush/30"
                        />
                        <input
                            type="text"
                            value={settings.accentColor}
                            onChange={e => set('accentColor', e.target.value)}
                            className={`${inputCls} flex-1`}
                            placeholder="#2C2C2C"
                        />
                    </div>
                </div>
            </div>

            {/* ── Company Info ── */}
            <div className="space-y-3 p-3 bg-blush-light/20 rounded-xl border border-blush/20">
                <p className="text-xs font-semibold text-charcoal uppercase tracking-wide">Company Info</p>
                <div>
                    <label className={labelCls}>Company Name</label>
                    <input
                        type="text"
                        value={settings.companyName}
                        onChange={e => set('companyName', e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className={labelCls}>Address</label>
                    <input
                        type="text"
                        value={settings.companyAddress}
                        onChange={e => set('companyAddress', e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className={labelCls}>Phone</label>
                    <input
                        type="text"
                        value={settings.companyPhone}
                        onChange={e => set('companyPhone', e.target.value)}
                        className={inputCls}
                    />
                </div>
            </div>

            {/* ── Toggle Options ── */}
            <div className="space-y-2">
                <p className={labelCls}>Options</p>
                {(
                    [
                        { key: 'showLogo', label: 'Show Company Name / Logo Area' },
                        { key: 'showPageNumbers', label: 'Show Page Numbers' },
                        { key: 'showOrderNotes', label: 'Include Order Notes' },
                        { key: 'showPaymentInfo', label: 'Include Payment / Transaction Info' },
                    ] as const
                ).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                        <div
                            onClick={() => set(key, !settings[key])}
                            className={`relative w-9 h-5 rounded-full transition-colors ${settings[key] ? 'bg-rose-gold' : 'bg-blush/40'
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                            />
                        </div>
                        <span className="text-sm text-charcoal group-hover:text-rose-gold transition-colors">{label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

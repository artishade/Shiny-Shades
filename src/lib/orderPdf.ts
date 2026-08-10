/* ===================================================
   Order PDF Generator — jsPDF + jspdf-autotable
   Supports: single order, multi-order, date-range
   Paper sizes: A4, A5, Letter, Legal
   =================================================== */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';
import type { RealOrder } from '@/store/orderStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaperSize = 'a4' | 'a5' | 'letter' | 'legal';
export type Orientation = 'portrait' | 'landscape';
export type TemplateStyle = 'classic' | 'minimal' | 'bold';

export interface PdfSettings {
    paperSize: PaperSize;
    orientation: Orientation;
    template: TemplateStyle;
    showLogo: boolean;
    showPageNumbers: boolean;
    showOrderNotes: boolean;
    showPaymentInfo: boolean;
    primaryColor: string;   // hex e.g. "#B07D6B"
    accentColor: string;    // hex e.g. "#2C2C2C"
    logoUrl?: string;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    pageTitle: string;
}

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
    paperSize: 'a4',
    orientation: 'portrait',
    template: 'classic',
    showLogo: true,
    showPageNumbers: true,
    showOrderNotes: true,
    showPaymentInfo: true,
    primaryColor: BRAND.colors.primary,
    accentColor: BRAND.colors.dark,
    logoUrl: BRAND.logoUrl,
    companyName: BRAND.fullName,
    companyAddress: CONTACT.address,
    companyPhone: CONTACT.phone,
    pageTitle: 'ORDER INVOICE',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert "#RRGGBB" → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatCurrency(n: number) {
    return `$${n.toFixed(2)}`;
}

function statusLabel(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Core builder ─────────────────────────────────────────────────────────────

/** Add one order to the PDF doc starting at `startY`. Returns ending Y. */
function renderOrder(
    doc: jsPDF,
    order: RealOrder,
    settings: PdfSettings,
    pageW: number,
    marginX: number,
    startY: number,
    isFirstOnPage: boolean,
): number {
    const pri = hexToRgb(settings.primaryColor);
    const acc = hexToRgb(settings.accentColor);
    const rightCol = pageW - marginX;

    let y = startY;

    // ── Order header bar ────────────────────────────────────────────────────────
    if (settings.template === 'classic' || settings.template === 'bold') {
        doc.setFillColor(...pri);
        doc.roundedRect(marginX, y, rightCol - marginX, 10, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(settings.template === 'bold' ? 9 : 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`ORDER #${order.orderNumber}`, marginX + 4, y + 6.5);
        doc.text(`Date: ${formatDate(order.createdAt)}`, rightCol - 4, y + 6.5, { align: 'right' });
        y += 13;
    } else {
        // minimal — simple line
        doc.setDrawColor(...pri);
        doc.setLineWidth(0.4);
        doc.line(marginX, y, rightCol, y);
        y += 4;
        doc.setTextColor(...acc);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`ORDER #${order.orderNumber}`, marginX, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Date: ${formatDate(order.createdAt)}`, rightCol, y + 4, { align: 'right' });
        y += 9;
    }

    // ── Status badge ─────────────────────────────────────────────────────────────
    doc.setTextColor(...acc);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${statusLabel(order.status)}  |  Payment: ${order.paymentMethod.toUpperCase()} — ${statusLabel(order.paymentStatus)}`, marginX, y + 5);
    if (order.transactionId && settings.showPaymentInfo) {
        doc.text(`TXN: ${order.transactionId}`, rightCol, y + 5, { align: 'right' });
    }
    y += 10;

    // ── Customer + Address info ──────────────────────────────────────────────────
    const boxH = 26;
    const halfW = (rightCol - marginX - 4) / 2;

    // Left box — Customer
    doc.setFillColor(250, 244, 240);
    doc.roundedRect(marginX, y, halfW, boxH, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...acc);
    doc.text('CUSTOMER', marginX + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${order.customer.firstName} ${order.customer.lastName}`, marginX + 3, y + 10);
    doc.text(order.customer.phone, marginX + 3, y + 15);
    if (order.customer.email) {
        doc.text(order.customer.email, marginX + 3, y + 20, { maxWidth: halfW - 6 });
    }

    // Right box — Delivery Address
    const bx2 = marginX + halfW + 4;
    doc.setFillColor(250, 244, 240);
    doc.roundedRect(bx2, y, halfW, boxH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('DELIVERY ADDRESS', bx2 + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const addrLines = doc.splitTextToSize(
        `${order.customer.address}, ${order.customer.city}${order.customer.district ? ', ' + order.customer.district : ''}`,
        halfW - 6,
    ) as string[];
    doc.text(addrLines.slice(0, 2), bx2 + 3, y + 10);

    y += boxH + 7;

    // ── Items table ──────────────────────────────────────────────────────────────
    const tableRows = order.items.map((item, i) => [
        String(i + 1),
        item.productName,
        item.size || '—',
        item.color || '—',
        String(item.quantity),
        formatCurrency(item.price),
        formatCurrency(item.price * item.quantity),
    ]);

    autoTable(doc, {
        startY: y,
        head: [['#', 'Product', 'Size', 'Color', 'Qty', 'Unit Price', 'Total']],
        body: tableRows,
        margin: { left: marginX, right: pageW - rightCol },
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: hexToRgb(settings.accentColor),
        },
        headStyles: {
            fillColor: pri,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
        },
        alternateRowStyles: { fillColor: [253, 248, 245] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            4: { halign: 'center', cellWidth: 12 },
            5: { halign: 'right', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 22 },
        },
        didDrawPage: () => { /* page break handled outside */ },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 5;

    // ── Totals block ─────────────────────────────────────────────────────────────
    const totW = 80;
    const totX = rightCol - totW;

    doc.setDrawColor(...pri);
    doc.setLineWidth(0.2);
    doc.line(totX, y, rightCol, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...acc);

    const addTotRow = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(label, totX, y);
        doc.text(value, rightCol, y, { align: 'right' });
        y += 5;
    };

    addTotRow('Subtotal', formatCurrency(order.subtotal));
    if (order.discount > 0) addTotRow(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${formatCurrency(order.discount)}`);
    doc.setDrawColor(...pri);
    doc.setLineWidth(0.2);
    doc.line(totX, y, rightCol, y);
    y += 3;
    addTotRow('TOTAL', formatCurrency(order.total), true);

    y += 3;

    // ── Notes ────────────────────────────────────────────────────────────────────
    if (settings.showOrderNotes && order.notes) {
        doc.setFillColor(255, 250, 240);
        const noteText = `Note: ${order.notes}`;
        const noteLines = doc.splitTextToSize(noteText, rightCol - marginX - 6) as string[];
        const noteH = noteLines.length * 4 + 6;
        doc.roundedRect(marginX, y, rightCol - marginX, noteH, 1, 1, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 90, 70);
        doc.text(noteLines, marginX + 3, y + 4.5);
        y += noteH + 5;
    }

    y += 6;
    return y;
}

// ─── Page header (logo + company info) ───────────────────────────────────────

function renderPageHeader(
    doc: jsPDF,
    settings: PdfSettings,
    pageW: number,
    marginX: number,
): number {
    const pri = hexToRgb(settings.primaryColor);
    const acc = hexToRgb(settings.accentColor);
    const rightCol = pageW - marginX;
    let y = marginX;

    // Brand name block
    doc.setFontSize(settings.template === 'bold' ? 20 : 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...pri);
    doc.text(settings.companyName, marginX, y + 10);

    // Page title (right-aligned)
    doc.setFontSize(settings.template === 'bold' ? 14 : 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...acc);
    doc.text(settings.pageTitle, rightCol, y + 10, { align: 'right' });

    y += 13;

    // Company info line
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 90, 70);
    const infoLine = [settings.companyAddress, settings.companyPhone].filter(Boolean).join('  ·  ');
    doc.text(infoLine, marginX, y + 5);

    y += 8;

    // Divider
    doc.setDrawColor(...pri);
    doc.setLineWidth(settings.template === 'bold' ? 0.8 : 0.4);
    doc.line(marginX, y, rightCol, y);

    y += 8;
    return y;
}

// ─── Page footer ─────────────────────────────────────────────────────────────

function renderPageFooter(
    doc: jsPDF,
    settings: PdfSettings,
    pageW: number,
    pageH: number,
    marginX: number,
    pageNum: number,
    totalPages: number,
) {
    const pri = hexToRgb(settings.primaryColor);
    const rightCol = pageW - marginX;
    const fy = pageH - marginX + 2;

    doc.setDrawColor(...pri);
    doc.setLineWidth(0.2);
    doc.line(marginX, fy, rightCol, fy);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 120, 100);
    doc.text(settings.companyName, marginX, fy + 5);
    doc.text(`Generated ${formatDateTime(new Date().toISOString())}`, pageW / 2, fy + 5, { align: 'center' });
    if (settings.showPageNumbers) {
        doc.text(`Page ${pageNum} of ${totalPages}`, rightCol, fy + 5, { align: 'right' });
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Build and return a jsPDF document for the given orders */
export function buildOrderPdf(orders: RealOrder[], settings: PdfSettings): jsPDF {
    const paperDimensions: Record<PaperSize, [number, number]> = {
        a4: [210, 297],
        a5: [148, 210],
        letter: [215.9, 279.4],
        legal: [215.9, 355.6],
    };

    const [pw, ph] = settings.orientation === 'landscape'
        ? [paperDimensions[settings.paperSize][1], paperDimensions[settings.paperSize][0]]
        : paperDimensions[settings.paperSize];

    const doc = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: [pw, ph],
    });

    const marginX = settings.paperSize === 'a5' ? 10 : 14;
    const pageH = ph;
    const pageW = pw;
    const footerSpace = 14;
    const usableH = pageH - marginX - footerSpace;

    // We do two passes: first collect page count, then render footers
    // jsPDF doesn't support "total pages" natively in a simple way,
    // so we render everything first and then add footers.

    const totalOrders = orders.length;
    let pageIndex = 1;

    let headerH = renderPageHeader(doc, settings, pageW, marginX);
    let y = headerH;

    orders.forEach((order, idx) => {
        // Estimate if this order fits on remaining page space
        // Rough estimate: header ~50, items ~10*n, totals ~25
        const estimatedOrderH = 60 + order.items.length * 8 + (order.notes ? 15 : 0);

        if (idx > 0 && y + estimatedOrderH > usableH) {
            doc.addPage([pw, ph], settings.orientation);
            pageIndex++;
            y = renderPageHeader(doc, settings, pageW, marginX);
        }

        y = renderOrder(doc, order, settings, pageW, marginX, y, idx === 0);

        // Separator between orders (not after last)
        if (idx < totalOrders - 1) {
            if (y + 8 < usableH) {
                doc.setDrawColor(220, 200, 190);
                doc.setLineWidth(0.3);
                doc.setLineDashPattern([2, 2], 0);
                doc.line(marginX, y, pageW - marginX, y);
                doc.setLineDashPattern([], 0);
                y += 10;
            }
        }
    });

    // Add footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        renderPageFooter(doc, settings, pageW, pageH, marginX, p, totalPages);
    }

    return doc;
}

/** Download PDF for a single order */
export function downloadSingleOrderPdf(order: RealOrder, settings: PdfSettings) {
    const doc = buildOrderPdf([order], settings);
    doc.save(`order-${order.orderNumber}.pdf`);
}

/** Download PDF for multiple orders */
export function downloadMultiOrderPdf(orders: RealOrder[], settings: PdfSettings, filename?: string) {
    const doc = buildOrderPdf(orders, settings);
    const name = filename ?? `orders-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(name);
}

/** Open PDF in new tab for in-browser print/preview */
export function previewOrderPdf(orders: RealOrder[], settings: PdfSettings) {
    const doc = buildOrderPdf(orders, settings);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke after 60 s
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Return a data-URI string (for <iframe> preview) */
export function getPdfDataUri(orders: RealOrder[], settings: PdfSettings): string {
    const doc = buildOrderPdf(orders, settings);
    return doc.output('datauristring');
}

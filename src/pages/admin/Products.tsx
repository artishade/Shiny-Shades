/* ===================================================
   - Admin Products Management
   FIXES:
   - Robust image upload: per-file retry (3 attempts) + failed-image alert
   - setUploading(false) always called via finally block
   - All images draggable including cover (no special first-image lock)
   - Cover badge always follows index 0, not a fixed file
   - WatermarkPreview shown for whichever image is at index 0
   =================================================== */
import { uploadToCloudinary } from '@/lib/cloudinary';
import { BRAND } from '@/config/brandingConfig';
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, RefreshCw } from 'lucide-react';
import { Button, Input, Select, Badge, Modal } from '@/components/ui';
import { useProductStore, useCategoryStore } from '@/store';
import type { Product } from '@/types';
import { supabase } from '@/lib/supabase';
import { UploadCloud } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { useContentStore } from '@/store';
// ─────────────────────────────────────────────────
// WATERMARK POSITION — module-level mutable ref
// ─────────────────────────────────────────────────
let wmPos: { xFrac: number; yFrac: number } = { xFrac: 0.82, yFrac: 0.90 };

// ─────────────────────────────────────────────────
// FASHION COLOR MAP — 50+ names → real hex values
// ─────────────────────────────────────────────────
import { colornames as colorNameList } from 'color-name-list';
import nearestColor from 'nearest-color';
// Build a lookup map: name → hex (lowercase keys)
const COLOR_NAME_TO_HEX: Record<string, string> = {};
const COLOR_HEX_TO_NAME: Record<string, string> = {};
const nearestColorMap: Record<string, string> = {};

colorNameList.forEach((c: { name: string; hex: string }) => {
  const key = c.name.toLowerCase();
  COLOR_NAME_TO_HEX[key] = c.hex;
  COLOR_HEX_TO_NAME[c.hex.toLowerCase()] = c.name;
  nearestColorMap[c.name] = c.hex;
});

const getNearestColorName = nearestColor.from(nearestColorMap);
// ─────────────────────────────────────────────────
// SIMPLE COLOR PALETTE — snaps any hex to a common name
// ─────────────────────────────────────────────────
const SIMPLE_COLORS: Record<string, string> = {
  'White': '#FFFFFF', 'Off White': '#FAF9F6', 'Cream': '#FFFDD0',
  'Ivory': '#FFFFF0', 'Black': '#000000', 'Charcoal': '#36454F',
  'Dark Grey': '#A9A9A9', 'Grey': '#808080', 'Light Grey': '#D3D3D3',
  'Red': '#FF0000', 'Dark Red': '#8B0000', 'Maroon': '#800000',
  'Crimson': '#DC143C', 'Pink': '#FFC0CB', 'Hot Pink': '#FF69B4',
  'Baby Pink': '#F4C2C2', 'Rose': '#FF007F', 'Blush': '#FFB6C1',
  'Magenta': '#FF00FF', 'Purple': '#800080', 'Violet': '#EE82EE',
  'Lavender': '#E6E6FA', 'Navy': '#000080', 'Blue': '#0000FF',
  'Sky Blue': '#87CEEB', 'Baby Blue': '#89CFF0', 'Royal Blue': '#4169E1',
  'Teal': '#008080', 'Cyan': '#00FFFF', 'Turquoise': '#40E0D0',
  'Green': '#008000', 'Dark Green': '#006400', 'Light Green': '#90EE90',
  'Mint': '#98FF98', 'Olive': '#808000', 'Yellow': '#FFFF00',
  'Light Yellow': '#FFFFE0', 'Gold': '#FFD700', 'Orange': '#FFA500',
  'Peach': '#FFDAB9', 'Coral': '#FF6B6B', 'Salmon': '#FA8072',
  'Brown': '#8B4513', 'Dark Brown': '#5C4033', 'Light Brown': '#C4A882',
  'Tan': '#D2B48C', 'Beige': '#F5F5DC', 'Skin': '#FED9B0',
  'Nude': '#E8C9A0', 'Camel': '#C19A6B', 'Rose Gold': '#B76E79',
  'Copper': '#B87333', 'Silver': '#C0C0C0', 'Wine': '#722F37',
  'Burgundy': '#800020', 'Mustard': '#FFDB58', 'Khaki': '#F0E68C',
  'Lemon': '#FFF44F', 'Indigo': '#4B0082', 'Mauve': '#E0B0FF',
};

const getNearestSimpleColor = nearestColor.from(SIMPLE_COLORS);

const resolveToSimpleName = (hex: string): string => {
  try {
    const result = getNearestSimpleColor(hex);
    return result?.name || hex;
  } catch {
    return hex;
  }
};

// ─────────────────────────────────────────────────
// AUTO DETECT DOMINANT COLORS FROM IMAGE
// ─────────────────────────────────────────────────
const extractDominantColors = (file: File, maxColors = 5): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Sample at reduced size for speed
      const sampleSize = 100;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      URL.revokeObjectURL(url);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      const colorBuckets: Record<string, number> = {};

      // Sample every 5th pixel, quantize to reduce similar colors
      for (let i = 0; i < imageData.length; i += 4 * 5) {
        const r = Math.round(imageData[i] / 32) * 32;
        const g = Math.round(imageData[i + 1] / 32) * 32;
        const b = Math.round(imageData[i + 2] / 32) * 32;
        const a = imageData[i + 3];
        // Skip transparent and near-white/near-black pixels
        if (a < 128) continue;
        if (r > 240 && g > 240 && b > 240) continue; // skip white/near-white
        if (r < 20 && g < 20 && b < 20) continue;    // skip black/near-black
        const key = `${r},${g},${b}`;
        colorBuckets[key] = (colorBuckets[key] || 0) + 1;
      }

      // Sort by frequency, take top colors
      const sorted = Object.entries(colorBuckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxColors * 3); // take more then dedupe by name

      const colorNames: string[] = [];
      const seenNames = new Set<string>();

      // Skip very similar simple colors (e.g. don't show both Grey and Dark Grey)
      const skipIfSimilarExists = new Map([
        ['Dark Grey', 'Grey'], ['Light Grey', 'Grey'],
        ['Dark Green', 'Green'], ['Light Green', 'Green'],
        ['Dark Brown', 'Brown'], ['Light Brown', 'Brown'],
        ['Baby Pink', 'Pink'], ['Hot Pink', 'Pink'], ['Blush', 'Pink'],
        ['Dark Red', 'Red'], ['Crimson', 'Red'],
        ['Baby Blue', 'Sky Blue'], ['Royal Blue', 'Blue'],
        ['Off White', 'White'], ['Ivory', 'White'], ['Cream', 'White'],
        ['Light Yellow', 'Yellow'], ['Lemon', 'Yellow'],
      ]);

      for (const [key] of sorted) {
        const [r, g, b] = key.split(',').map(Number);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        const name = resolveToSimpleName(hex);

        // Skip if we already have the "parent" color
        const parent = skipIfSimilarExists.get(name);
        if (parent && seenNames.has(parent)) continue;

        if (!seenNames.has(name)) {
          seenNames.add(name);
          colorNames.push(name);
        }
        if (colorNames.length >= maxColors) break;
      }

      resolve(colorNames);
    };
    img.onerror = () => {
      try { URL.revokeObjectURL(url); } catch { }
      resolve([]);
    };
    img.src = url;
  });
};

// Given any input (name or hex), return a hex value
const resolveColor = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '#cccccc';

  // If it's already a valid hex, return it directly
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();

  // Check simple colors first (exact match)
  const simpleMatch = Object.entries(SIMPLE_COLORS).find(
    ([name]) => name.toLowerCase() === lower
  );
  if (simpleMatch) return simpleMatch[1];

  // Try full color name library
  if (COLOR_NAME_TO_HEX[lower]) return COLOR_NAME_TO_HEX[lower];

  // Try CSS color names via browser
  const s = new Option().style;
  s.color = trimmed;
  if (s.color !== '') return trimmed;

  // Last resort — use nearest simple color hex
  try {
    const result = getNearestSimpleColor(trimmed);
    if (result?.value) return result.value;
  } catch { }

  return '#cccccc';
};

// Given a hex, return the nearest human-readable color name
const resolveColorName = (hex: string): string => {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;
  try {
    const result = getNearestColorName(hex);
    return result?.name || hex;
  } catch {
    return hex;
  }
};

// ─────────────────────────────────────────────────
// DRAW TILED TEXT WATERMARK
// ─────────────────────────────────────────────────
const drawTextWatermark = (
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  text: string,
  fontSize: number,
  opacity: number,
  angleDeg: number,
  color: string,
  spacingX: number,
  spacingY: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const angleRad = (angleDeg * Math.PI) / 180;
  const diagonal = Math.sqrt(canvasW * canvasW + canvasH * canvasH);

  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(angleRad);

  const cols = Math.ceil(diagonal / spacingX) + 4;
  const rows = Math.ceil(diagonal / spacingY) + 4;

  for (let row = -rows; row <= rows; row++) {
    for (let col = -cols; col <= cols; col++) {
      ctx.fillText(text, col * spacingX, row * spacingY);
    }
  }

  ctx.restore();
};


// ─────────────────────────────────────────────────
// DRAW AG LOGO WATERMARK
// ─────────────────────────────────────────────────
const drawAGLogo = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  logoText: string = 'TEXT',
  colorLeft: string = '#030303ff',
  colorRight: string = '#630303ff'
) => {
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  const gap = size * 0.04;
  const text = logoText.trim() || `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`;
  // Split into two halves: left = first half, right = second half
  const mid = Math.ceil(text.length / 2);
  const leftPart = text.slice(0, mid);
  const rightPart = text.slice(mid);

  ctx.font = `900 ${size}px Arial, sans-serif`;
  const leftWidth = ctx.measureText(leftPart).width;
  const rightWidth = ctx.measureText(rightPart).width;
  const totalTextWidth = leftWidth + rightWidth + gap * 2;

  const boxW = totalTextWidth + size * 0.6;
  const boxH = size + size * 0.5;

  const boxX = x - boxW / 2;
  const boxY = y - size - size * 0.25;
  const radius = size * 0.22;

  ctx.globalAlpha = 0.52;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxW - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
  ctx.lineTo(boxX + boxW, boxY + boxH - radius);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
  ctx.lineTo(boxX + radius, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.92;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetX = size * 0.04;
  ctx.shadowOffsetY = size * 0.04;

  ctx.font = `900 ${size}px Arial, sans-serif`;
  ctx.fillStyle = colorLeft;
  ctx.textAlign = 'right';
  ctx.fillText(leftPart, x - gap, y);

  ctx.fillStyle = colorRight;
  ctx.textAlign = 'left';
  ctx.fillText(rightPart, x + gap, y);

  ctx.restore();
};

// ─────────────────────────────────────────────────
// WATERMARK A FILE with retry-safe canvas approach
// ─────────────────────────────────────────────────
interface TextWmConfig {
  enabled: boolean;
  text: string;
  opacity: number;
  size: number;
  angle: number;
  color: string;
  spacingX: number;
  spacingY: number;
}

interface LogoWmConfig {
  text: string;
  colorLeft: string;
  colorRight: string;
}

// ─────────────────────────────────────────────────
// CUSTOM LOGO WATERMARK CONFIG
// ─────────────────────────────────────────────────
interface CustomLogoWmConfig {
  enabled: boolean;         // true = use uploaded logo, false = use AG text logo
  imageDataUrl: string;     // base64 data URL of the uploaded logo
  size: number;             // multiplier relative to canvas min edge (0.05 – 0.6)
  opacity: number;          // 0.0 – 1.0
  bgEnabled: boolean;       // draw background box behind logo
  bgColor: string;          // CSS hex colour for background
  bgOpacity: number;        // 0.0 – 1.0
  borderRadius: number;     // px (applied as fraction of box size)
  padding: number;          // px padding inside background box
  shadowEnabled: boolean;
  shadowStrength: number;   // 0 – 40
}

const CUSTOM_LOGO_LS_KEY = 'ag_custom_logo_wm_v1';

const defaultCustomLogoWm: CustomLogoWmConfig = {
 
  enabled: false,
  imageDataUrl: '',
  size: 0.15,
  opacity: 0.85,
  bgEnabled: true,
  bgColor: '#1a1a1a',
  bgOpacity: 0.50,
  borderRadius: 12,
  padding: 10,
  shadowEnabled: true,
  shadowStrength: 18,
};

const loadCustomLogoWmFromLS = (): CustomLogoWmConfig => {
  try {
    const raw = localStorage.getItem(CUSTOM_LOGO_LS_KEY);
    if (!raw) return { ...defaultCustomLogoWm };
    return { ...defaultCustomLogoWm, ...JSON.parse(raw) };
  } catch {
    return { ...defaultCustomLogoWm };
  }
};

const saveCustomLogoWmToLS = (cfg: CustomLogoWmConfig) => {
  try {
    localStorage.setItem(CUSTOM_LOGO_LS_KEY, JSON.stringify(cfg));
  } catch { }
};

// ─────────────────────────────────────────────────
// DRAW CUSTOM LOGO WATERMARK (async — loads image)
// ─────────────────────────────────────────────────
const drawCustomLogoWatermark = (
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  xFrac: number,
  yFrac: number,
  logoImg: HTMLImageElement,
  cfg: CustomLogoWmConfig
): void => {
  ctx.save();

  // Scale logo so its longest edge = size * min(canvasW, canvasH)
  const maxLogoEdge = Math.min(canvasW, canvasH) * cfg.size;
  const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
  let logoW: number, logoH: number;
  if (aspect >= 1) {
    logoW = maxLogoEdge;
    logoH = maxLogoEdge / aspect;
  } else {
    logoH = maxLogoEdge;
    logoW = maxLogoEdge * aspect;
  }

  const pad = cfg.bgEnabled ? cfg.padding : 0;
  const boxW = logoW + pad * 2;
  const boxH = logoH + pad * 2;

  // Centre the logo on (xFrac * canvasW, yFrac * canvasH)
  const cx = xFrac * canvasW;
  const cy = yFrac * canvasH;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH / 2;
  const r = Math.min(cfg.borderRadius, boxW / 2, boxH / 2);

  // Draw background box
  if (cfg.bgEnabled) {
    ctx.globalAlpha = cfg.bgOpacity;
    ctx.fillStyle = cfg.bgColor;
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();
  }

  // Draw shadow
  if (cfg.shadowEnabled) {
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = cfg.shadowStrength;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Draw logo image (supports transparent PNGs)
  ctx.globalAlpha = cfg.opacity;
  ctx.drawImage(logoImg, boxX + pad, boxY + pad, logoW, logoH);

  ctx.restore();
};

// ─────────────────────────────────────────────────
// LOAD IMAGE FROM DATA URL (helper for logo)
// ─────────────────────────────────────────────────
const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

// ─────────────────────────────────────────────────
// APPLY WATERMARK — with pre-resize for large files
// ─────────────────────────────────────────────────
const applyWatermark = (
  file: File,
  sizeMultiplier = 1.0,
  textWm?: TextWmConfig,
  logoWm?: LogoWmConfig,
  customLogoWm?: CustomLogoWmConfig
): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const applyToCanvas = async (
      ctx: CanvasRenderingContext2D,
      targetW: number,
      targetH: number
    ) => {
      // Decide: custom logo or AG text logo
      const useCustomLogo =
        customLogoWm?.enabled &&
        customLogoWm.imageDataUrl &&
        customLogoWm.imageDataUrl.length > 10;

      if (useCustomLogo) {
        try {
          const logoImg = await loadImageFromDataUrl(customLogoWm!.imageDataUrl);
          drawCustomLogoWatermark(
            ctx, targetW, targetH,
            wmPos.xFrac, wmPos.yFrac,
            logoImg, customLogoWm!
          );
        } catch {
          // fallback to AG logo on error
          const size = Math.max(18, Math.min(targetW, targetH) * 0.08) * sizeMultiplier;
          drawAGLogo(ctx, wmPos.xFrac * targetW, wmPos.yFrac * targetH, size, logoWm?.text, logoWm?.colorLeft, logoWm?.colorRight);
        }
      } else {
        // Apply AG logo watermark
        const size = Math.max(18, Math.min(targetW, targetH) * 0.08) * sizeMultiplier;
        drawAGLogo(ctx, wmPos.xFrac * targetW, wmPos.yFrac * targetH, size, logoWm?.text, logoWm?.colorLeft, logoWm?.colorRight);
      }

      // Apply text watermark if enabled
      if (textWm?.enabled) {
        drawTextWatermark(
          ctx, targetW, targetH,
          textWm.text, Math.max(10, targetW * (textWm.size / 500)),
          textWm.opacity, textWm.angle, textWm.color,
          targetW * (textWm.spacingX / 500),
          targetH * (textWm.spacingY / 500)
        );
      }
    };

    img.onload = async () => {
      // ── Pre-resize: cap at 2400px on the long edge for AI-generated images ──
      const MAX_EDGE = 2400;
      let targetW = img.width;
      let targetH = img.height;
      const longEdge = Math.max(img.width, img.height);
      if (longEdge > MAX_EDGE) {
        const scale = MAX_EDGE / longEdge;
        targetW = Math.round(img.width * scale);
        targetH = Math.round(img.height * scale);
      }

      // Draw to canvas at target size
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      await applyToCanvas(ctx, targetW, targetH);

      // Determine output format — always use JPEG for large images to avoid
      // canvas toBlob failures on oversized PNGs (common with AI-generated images)
      const isPng = file.type === 'image/png' && targetW * targetH < 4_000_000; // ~2000x2000
      const outputFormat = isPng ? 'image/png' : 'image/jpeg';
      const outputQuality = isPng ? 1.0 : 0.92;

      canvas.toBlob(
        (blob) => {
          // Always revoke the object URL
          try { URL.revokeObjectURL(url); } catch { }

          if (!blob) {
            // toBlob returned null — fall back to JPEG at lower quality
            canvas.toBlob(
              (fallbackBlob) => {
                if (!fallbackBlob) {
                  console.warn(`toBlob failed for "${file.name}" — using original file`);
                  resolve(file);
                  return;
                }
                resolve(new File([fallbackBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                }));
              },
              'image/jpeg',
              0.85
            );
            return;
          }

          resolve(new File([blob], file.name, {
            type: outputFormat,
            lastModified: Date.now(),
          }));
        },
        outputFormat,
        outputQuality
      );
    };

    img.onerror = () => {
      try { URL.revokeObjectURL(url); } catch { }
      // Retry once after 400ms before giving up
      setTimeout(() => {
        try {
          const retryUrl = URL.createObjectURL(file);
          const retryImg = new Image();
          retryImg.onload = async () => {
            const MAX_EDGE = 2400;
            let targetW = retryImg.width;
            let targetH = retryImg.height;
            const longEdge = Math.max(retryImg.width, retryImg.height);
            if (longEdge > MAX_EDGE) {
              const scale = MAX_EDGE / longEdge;
              targetW = Math.round(retryImg.width * scale);
              targetH = Math.round(retryImg.height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = targetW; canvas.height = targetH;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(retryImg, 0, 0, targetW, targetH);
            await applyToCanvas(ctx, targetW, targetH);
            try { URL.revokeObjectURL(retryUrl); } catch { }
            const isPng = file.type === 'image/png' && targetW * targetH < 4_000_000;
            const fmt = isPng ? 'image/png' : 'image/jpeg';
            canvas.toBlob((blob) => {
              resolve(blob ? new File([blob], file.name, { type: fmt, lastModified: Date.now() }) : file);
            }, fmt, isPng ? 1.0 : 0.92);
          };
          retryImg.onerror = () => {
            try { URL.revokeObjectURL(retryUrl); } catch { }
            console.warn(`Image load failed for "${file.name}" after retry — using original`);
            resolve(file);
          };
          retryImg.src = retryUrl;
        } catch {
          console.warn(`Image load failed for "${file.name}" — using original file`);
          resolve(file);
        }
      }, 400);
    };

    img.src = url;
  });
};
// ─────────────────────────────────────────────────
// MINI THUMBNAIL with watermark overlay
// ─────────────────────────────────────────────────
const MiniWatermarkThumb: React.FC<{
  file: File; xFrac: number; yFrac: number; enabled?: boolean;
  textWmEnabled?: boolean; textWmText?: string; textWmOpacity?: number;
  textWmSize?: number; textWmAngle?: number; textWmColor?: string;
  textWmSpacingX?: number; textWmSpacingY?: number;
  logoText?: string; logoColorLeft?: string; logoColorRight?: string;
  customLogoWm?: CustomLogoWmConfig;
}> = ({ file, xFrac, yFrac, enabled = true, textWmEnabled = false, textWmText = BRAND.watermarkText,
  textWmOpacity = 0.18, textWmSize = 22, textWmAngle = -30,
  textWmColor = '#ffffff', textWmSpacingX = 180, textWmSpacingY = 90,
  logoText = `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`, logoColorLeft = '#C0C0C0', logoColorRight = '#F5A623',
  customLogoWm }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const xRef = useRef(xFrac);
    const yRef = useRef(yFrac);

    xRef.current = xFrac;
    yRef.current = yFrac;

    const redraw = async () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const displayW = 300;
      const displayH = Math.round((img.naturalHeight / img.naturalWidth) * displayW);
      canvas.width = displayW;
      canvas.height = displayH;
      ctx.drawImage(img, 0, 0, displayW, displayH);

      if (enabled) {
        const useCustomLogo =
          customLogoWm?.enabled &&
          customLogoWm.imageDataUrl &&
          customLogoWm.imageDataUrl.length > 10;

        if (useCustomLogo) {
          try {
            const logoImg = await loadImageFromDataUrl(customLogoWm!.imageDataUrl);
            drawCustomLogoWatermark(ctx, displayW, displayH, xRef.current, yRef.current, logoImg, customLogoWm!);
          } catch {
            const size = Math.max(10, Math.min(displayW, displayH) * 0.08);
            drawAGLogo(ctx, xRef.current * displayW, yRef.current * displayH, size, logoText, logoColorLeft, logoColorRight);
          }
        } else {
          const size = Math.max(10, Math.min(displayW, displayH) * 0.08);
          drawAGLogo(ctx, xRef.current * displayW, yRef.current * displayH, size, logoText, logoColorLeft, logoColorRight);
        }
      }

      if (textWmEnabled) {
        drawTextWatermark(
          ctx, displayW, displayH,
          textWmText, displayW * (textWmSize / 500),
          textWmOpacity, textWmAngle, textWmColor,
          displayW * (textWmSpacingX / 500),
          displayH * (textWmSpacingY / 500)
        );
      }
    };

    useEffect(() => {
      imgRef.current = null;
      let url = '';
      let revoked = false;
      try {
        url = URL.createObjectURL(file);
      } catch {
        return;
      }
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        redraw();
        if (!revoked) { revoked = true; try { URL.revokeObjectURL(url); } catch { } }
      };
      img.onerror = () => {
        if (!revoked) { revoked = true; try { URL.revokeObjectURL(url); } catch { } }
        // Retry once after 300ms — handles race condition on AI-generated files
        setTimeout(() => {
          try {
            const retryUrl = URL.createObjectURL(file);
            const retryImg = new Image();
            retryImg.onload = () => {
              imgRef.current = retryImg;
              redraw();
              try { URL.revokeObjectURL(retryUrl); } catch { }
            };
            retryImg.onerror = () => { try { URL.revokeObjectURL(retryUrl); } catch { } };
            retryImg.src = retryUrl;
          } catch { }
        }, 300);
      };
      img.src = url;
      return () => {
        if (!revoked) { revoked = true; try { URL.revokeObjectURL(url); } catch { } }
      };
    }, [file]);
    useEffect(() => {
      redraw();
    }, [xFrac, yFrac, enabled, textWmEnabled, textWmText, textWmOpacity, textWmSize, textWmAngle, textWmColor, textWmSpacingX, textWmSpacingY, logoText, logoColorLeft, logoColorRight, customLogoWm?.enabled, customLogoWm?.imageDataUrl, customLogoWm?.size, customLogoWm?.opacity, customLogoWm?.bgEnabled, customLogoWm?.bgColor, customLogoWm?.bgOpacity, customLogoWm?.borderRadius, customLogoWm?.padding, customLogoWm?.shadowEnabled, customLogoWm?.shadowStrength]);

    return (
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    );
  };

// ─────────────────────────────────────────────────
// WATERMARK PREVIEW — interactive canvas (cover image)
// ─────────────────────────────────────────────────
interface WatermarkPreviewProps {
  file: File;
  onPositionChange: (xFrac: number, yFrac: number) => void;
  sizeMultiplier?: number;
  enabled?: boolean;
  textWmEnabled?: boolean;
  textWmText?: string;
  textWmOpacity?: number;
  textWmSize?: number;
  textWmAngle?: number;
  textWmColor?: string;
  textWmSpacingX?: number;
  textWmSpacingY?: number;
  logoText?: string;
  logoColorLeft?: string;
  logoColorRight?: string;
  customLogoWm?: CustomLogoWmConfig;
}
const WatermarkPreview: React.FC<WatermarkPreviewProps> = ({
  file, onPositionChange, sizeMultiplier = 1.0, enabled = true,
  textWmEnabled = false, textWmText = BRAND.watermarkText,
  textWmOpacity = 0.18, textWmSize = 22, textWmAngle = -30,
  textWmColor = '#ffffff', textWmSpacingX = 180, textWmSpacingY = 90,
  logoText = `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`, logoColorLeft = '#C0C0C0', logoColorRight = '#F5A623',
  customLogoWm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const [pos, setPos] = useState<{ xFrac: number; yFrac: number }>(wmPos);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = async (img: HTMLImageElement) => {
      const displayW = 800;
      const displayH = Math.round((img.naturalHeight / img.naturalWidth) * displayW);
      canvas.width = displayW;
      canvas.height = displayH;
      ctx.drawImage(img, 0, 0, displayW, displayH);

      if (enabled) {
        const useCustomLogo =
          customLogoWm?.enabled &&
          customLogoWm.imageDataUrl &&
          customLogoWm.imageDataUrl.length > 10;

        if (useCustomLogo) {
          try {
            const logoImg = await loadImageFromDataUrl(customLogoWm!.imageDataUrl);
            drawCustomLogoWatermark(ctx, displayW, displayH, pos.xFrac, pos.yFrac, logoImg, customLogoWm!);
          } catch {
            const size = Math.max(18, Math.min(displayW, displayH) * 0.08) * sizeMultiplier;
            drawAGLogo(ctx, pos.xFrac * displayW, pos.yFrac * displayH, size, logoText, logoColorLeft, logoColorRight);
          }
        } else {
          const size = Math.max(18, Math.min(displayW, displayH) * 0.08) * sizeMultiplier;
          drawAGLogo(ctx, pos.xFrac * displayW, pos.yFrac * displayH, size, logoText, logoColorLeft, logoColorRight);
        }
      }

      if (textWmEnabled) {
        drawTextWatermark(
          ctx, displayW, displayH,
          textWmText,
          displayW * (textWmSize / 500),
          textWmOpacity, textWmAngle, textWmColor,
          displayW * (textWmSpacingX / 500),
          displayH * (textWmSpacingY / 500)
        );
      }
    };

    if (imgRef.current) {
      drawFrame(imgRef.current);
    } else {
      const img = new Image();
      let url = '';
      try {
        url = URL.createObjectURL(file);
      } catch {
        return;
      }
      img.onload = () => {
        imgRef.current = img;
        drawFrame(img);
        try { URL.revokeObjectURL(url); } catch { }
      };
      img.onerror = () => {
        try { URL.revokeObjectURL(url); } catch { }
        // Retry once — handles AI-generated files with delayed readiness
        setTimeout(() => {
          try {
            const retryUrl = URL.createObjectURL(file);
            const retryImg = new Image();
            retryImg.onload = () => {
              imgRef.current = retryImg;
              drawFrame(retryImg);
              try { URL.revokeObjectURL(retryUrl); } catch { }
            };
            retryImg.onerror = () => { try { URL.revokeObjectURL(retryUrl); } catch { } };
            retryImg.src = retryUrl;
          } catch { }
        }, 300);
      };
      img.src = url;
    }
  }, [pos, file, sizeMultiplier, enabled, textWmEnabled, textWmText, textWmOpacity, textWmSize, textWmAngle, textWmColor, textWmSpacingX, textWmSpacingY, logoText, logoColorLeft, logoColorRight, customLogoWm?.enabled, customLogoWm?.imageDataUrl, customLogoWm?.size, customLogoWm?.opacity, customLogoWm?.bgEnabled, customLogoWm?.bgColor, customLogoWm?.bgOpacity, customLogoWm?.borderRadius, customLogoWm?.padding, customLogoWm?.shadowEnabled, customLogoWm?.shadowStrength]);

  const getFrac = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      xFrac: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      yFrac: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const applyPos = (xFrac: number, yFrac: number) => {
    wmPos = { xFrac, yFrac };
    setPos({ xFrac, yFrac });
    onPositionChange(xFrac, yFrac);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const f = getFrac(e);
      applyPos(f.xFrac, f.yFrac);
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="relative select-none">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl cursor-crosshair"
        style={{ display: 'block', maxHeight: '380px', objectFit: 'contain', userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
        onMouseDown={(e) => { isDragging.current = true; const f = getFrac(e); applyPos(f.xFrac, f.yFrac); }}
        onDragStart={(e) => e.preventDefault()}
      />
      <p className="text-[10px] text-[#6B5B55] text-center mt-1 italic">
        Click or drag to reposition the {customLogoWm?.enabled && customLogoWm?.imageDataUrl ? 'logo' : `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`} watermark
      </p>

    </div>
  );
};

// ─────────────────────────────────────────────────
// EMPTY PRODUCT TEMPLATE
// ─────────────────────────────────────────────────
const emptyProduct: any = {
  name: '', slug: '', description: '', shortDescription: '',
  price: 0, comparePrice: undefined, images: [],
  category: '', categorySlug: '',
  sizes: [], colors: [], stock: 150, sku: '', tags: [],
  isFeatured: false, isTrending: false, isNewArrival: false, isOnSale: false,
  customText: '',
};

// ═════════════════════════════════════════════════
// ADMIN PRODUCTS COMPONENT
// ═════════════════════════════════════════════════
export const AdminProducts: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, fetchProducts } = useProductStore();
  const { categories } = useCategoryStore();
  const { getSiteSettings, saveSiteSettings } = useContentStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyProduct);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  // Drag-to-reorder state — works for ALL images including cover (index 0)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [wmFrac, setWmFrac] = useState<{ xFrac: number; yFrac: number }>({ xFrac: 0.82, yFrac: 0.90 });
  const [wmSize, setWmSize] = useState<number>(1.0);
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [wmEnabled, setWmEnabled] = useState<boolean>(true);
  const [wmPanelOpen, setWmPanelOpen] = useState<boolean>(false);
  const [textWmEnabled, setTextWmEnabled] = useState<boolean>(true);
  const [textWmText, setTextWmText] = useState<string>(BRAND.watermarkText);
  const [textWmOpacity, setTextWmOpacity] = useState<number>(0.18);
  const [textWmSize, setTextWmSize] = useState<number>(22);
  const [textWmAngle, setTextWmAngle] = useState<number>(-30);
  const [textWmColor, setTextWmColor] = useState<string>('#ffffff');
  const [textWmSpacingX, setTextWmSpacingX] = useState<number>(180);
  const [textWmSpacingY, setTextWmSpacingY] = useState<number>(90);
  const [agLogoText, setAgLogoText] = useState<string>('TEXT');
  const [agLogoColorLeft, setAgLogoColorLeft] = useState<string>('#000000ff');
  const [agLogoColorRight, setAgLogoColorRight] = useState<string>('#5c0404ff');
  const [hasEyeDropper] = useState(() => typeof (window as any).EyeDropper !== 'undefined');
  const [detectedColors, setDetectedColors] = useState<string[]>([]);
  const [detectingColors, setDetectingColors] = useState(false);

  // ── Custom Logo Watermark state (persisted in localStorage) ──
  const [customLogoWm, setCustomLogoWm] = useState<CustomLogoWmConfig>(() => loadCustomLogoWmFromLS());
  const customLogoFileRef = useRef<HTMLInputElement>(null);

  // Persist custom logo wm config whenever it changes
  useEffect(() => { saveCustomLogoWmToLS(customLogoWm); }, [customLogoWm]);

  const updateCustomLogoWm = (patch: Partial<CustomLogoWmConfig>) => {
    setCustomLogoWm(prev => ({ ...prev, ...patch }));
  };

  const handleCustomLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        updateCustomLogoWm({ imageDataUrl: dataUrl, enabled: true });
      }
    };
    reader.readAsDataURL(file);

    // Also push this logo to the site-wide brand settings (Navbar + watermark default)
    uploadToCloudinary(file)
      .then((url) => {
        const current = getSiteSettings();
        saveSiteSettings({
          logoUrl: current.logoUrl || url, // don't overwrite an already-set nav logo unless empty
          watermarkLogoUrl: url,
        });
      })
      .catch((err) => console.error('[BrandLogo] Cloudinary upload failed:', err));
  };

  useEffect(() => { fetchProducts(); }, []);

  // Auto-detect colors from first uploaded image
  useEffect(() => {
    if (imageFiles.length === 0) {
      setDetectedColors([]);
      return;
    }
    let cancelled = false;
    setDetectingColors(true);
    extractDominantColors(imageFiles[0], 6).then((colors) => {
      if (!cancelled) {
        setDetectedColors(colors);
        setDetectingColors(false);
      }
    });
    return () => { cancelled = true; };
  }, [imageFiles[0]?.name, imageFiles[0]?.size]);

  // ── Auto-generate SKU ──
  const generateSKU = (name: string): string => {
    if (!name.trim()) return '';

    const words = name.trim().toUpperCase().split(/\s+/);

    // First 2 letters of first 2 words only
    const prefix = words
      .slice(0, 2)
      .map(w => w.slice(0, 2))
      .join('');

    // Random 3 digits
    const suffix = Math.floor(100 + Math.random() * 900);

    return `${prefix}${suffix}`;
  };

  const handleNameChange = (name: string) => {
    const newForm: Partial<Product> = { ...form, name };
    if (!form.sku || form.sku.startsWith('')) newForm.sku = generateSKU(name);
    setForm(newForm);
  };

  // ── Colors ──
  const addColor = () => {
    const c = colorInput.trim();
    if (!c) return;
    const colors = form.colors || [];
    // If user typed a hex, store the nearest color name instead
    let toStore = c;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) {
      toStore = resolveColorName(c);
    }
    if (!colors.includes(toStore)) setForm({ ...form, colors: [...colors, toStore] });
    setColorInput('');
  };

  // Eye dropper
  const openEyeDropper = async () => {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      const name = resolveToSimpleName(hex);
      setColorInput(name);
    } catch {
      // User cancelled or browser doesn't support
    }
  };
  const removeColor = (color: string) =>
    setForm({ ...form, colors: (form.colors || []).filter((c: string) => c !== color) });

  // ── Sizes ──
  const addSizes = () => {
    if (!sizeInput.trim()) return;
    const newSizes = sizeInput.split(',').map((s: string) => s.trim()).filter(Boolean);
    const existing = form.sizes || [];
    setForm({ ...form, sizes: [...new Set([...existing, ...newSizes])] });
    setSizeInput('');
  };
  const removeSize = (size: string) =>
    setForm({ ...form, sizes: (form.sizes || []).filter((s: string) => s !== size) });

  const filtered = products.filter((p: Product) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !filterCategory || p.categorySlug === filterCategory;
    return matchesSearch && matchesCat;
  });

  const resetModal = () => {
    setImageFiles([]);
    setVideoFile(null);
    setVideoPreviewUrl('');
    setColorInput('');
    setSizeInput('');
    setUploadProgress(null);
    wmPos = { xFrac: 0.82, yFrac: 0.90 };
    setWmFrac({ xFrac: 0.82, yFrac: 0.90 });
    setWmSize(1.0);
    setWmEnabled(true);
    setWmPanelOpen(false);
    setDetectedColors([]);
    setDetectingColors(false);
  };


  const openAdd = () => {
    setEditingId(null);
    resetModal();
    setForm({
      ...emptyProduct,
      id: '',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0,
    });
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    resetModal();
    setVideoPreviewUrl((product as any).videoUrl || '');
    setForm({
      ...product,
      images: product.images || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags || [],
    });
    setShowModal(true);
  };

  // ────────────────────────────────────────────────
  // FIXED: uploadImages — per-file retry (3 attempts),
  // tracks progress, returns { urls, failedCount }
  // ────────────────────────────────────────────────
  const uploadImages = async (
    files: File[],
    onProgress: (done: number, total: number) => void,
    sizeMultiplier = 1.0
  ): Promise<{ urls: string[]; failedCount: number }> => {
    const urls: string[] = [];
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      let uploaded = false;

      // Apply watermark once, then retry the upload up to 3 times
      // Skip if this is somehow not a real local file
      if (!(files[i] instanceof File) || files[i].size === 0) {
        failedCount++;
        onProgress(i + 1, files.length);
        continue;
      }

      let watermarked: File;
      try {
        watermarked = wmEnabled ? await applyWatermark(files[i], sizeMultiplier, {
          enabled: textWmEnabled,
          text: textWmText,
          opacity: textWmOpacity,
          size: textWmSize,
          angle: textWmAngle,
          color: textWmColor,
          spacingX: textWmSpacingX,
          spacingY: textWmSpacingY,
        }, {
          text: agLogoText,
          colorLeft: agLogoColorLeft,
          colorRight: agLogoColorRight,
        }, customLogoWm) : files[i];
      } catch {
        watermarked = files[i];
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const url = await uploadToCloudinary(watermarked);
          if (url) {
            urls.push(url);
            uploaded = true;
            break;
          }
        } catch (err) {
          console.warn(`Upload attempt ${attempt}/3 failed for "${files[i].name}":`, err);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
      if (!uploaded) {
        failedCount++;
        console.error(`All 3 attempts failed for "${files[i].name}"`);
      }

      onProgress(i + 1, files.length);
    }

    return { urls, failedCount };
  };

  const uploadVideo = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      return data.secure_url || '';
    } catch (err) {
      console.error('Video upload failed:', err);
      return '';
    }
  };

  // ────────────────────────────────────────────────
  // FIXED: handleSave — always calls setUploading(false)
  // via finally, alerts user if any images failed
  // ────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setUploading(true);
      setUploadProgress(null);

      const baseSlug = form.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
      const slug = editingId ? baseSlug : `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const cat = categories.find((c: any) => c.name === form.category);

      // Keep existing uploaded images
      let finalImages = (form.images || []).filter((img: string) => img.startsWith('http'));

      // Upload new images with progress tracking
      let failedCount = 0;
      if (imageFiles.length > 0) {
        setUploadProgress({ done: 0, total: imageFiles.length });
        const result = await uploadImages(imageFiles, (done, total) => {
          setUploadProgress({ done, total });
        }, wmSize);
        finalImages = [...finalImages, ...result.urls];
        failedCount = result.failedCount;
      }

      // Upload video
      let finalVideoUrl = (form as any).videoUrl || '';
      if (videoFile) {
        finalVideoUrl = await uploadVideo(videoFile);
      }

      const payload = {
        name: form.name, slug,
        images: finalImages,
        video_url: finalVideoUrl || null,
        price: form.price,
        compare_price: form.comparePrice || null,
        category_name: form.category,
        category_slug: cat?.slug || form.categorySlug || '',
        sizes: form.sizes || [],
        colors: form.colors || [],
        stock: form.stock || 0,
        sku: form.sku || null,
        tags: form.tags || [],
        custom_text: form.customText || '',
        is_featured: form.isFeatured || false,
        is_trending: form.isTrending || false,
        is_new_arrival: form.isNewArrival || false,
        is_on_sale: form.isOnSale || false,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
        updateProduct(editingId, {
          ...form, slug, images: finalImages,
          categorySlug: cat?.slug || form.categorySlug || '',
          videoUrl: finalVideoUrl,
          customText: form.customText || '',
          updatedAt: new Date().toISOString(),
        } as any);
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{ ...payload, is_active: true, rating: 0, review_count: 0, created_at: new Date().toISOString() }])
          .select();
        if (error) throw error;
        addProduct({
          ...form, id: data[0].id, slug, images: finalImages,
          categorySlug: cat?.slug || '',
          videoUrl: finalVideoUrl,
          customText: form.customText || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0, reviewCount: 0,
        } as Product);
      }

      setImageFiles([]);
      setVideoFile(null);
      setUploadProgress(null);
      setShowModal(false);

      // Warn after save if some images failed
      if (failedCount > 0) {
        alert(`Product saved, but ${failedCount} image(s) failed to upload after 3 attempts. Please re-edit the product and re-upload the missing images.`);
      }

    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      alert('Error saving product. Check browser console (F12) for details.');
    } finally {
      // ALWAYS reset uploading state — fixes the "stuck uploading" bug
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    deleteProduct(id);
  };

  const existingImages = (form.images || []).filter((img: string) => img.startsWith('http'));

  // ────────────────────────────────────────────────
  // FIXED: Unified drag-to-reorder for ALL new images
  // Index 0 = cover. ANY image can be moved to cover slot.
  // ────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...imageFiles];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setImageFiles(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">Products</h1>
          <p className="text-[#6B5B55] text-sm">{products.length} total products</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Add Product</Button>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
          />
        </div>
        <Select
          options={[{ value: '', label: 'All Categories' }, ...categories.map((c: any) => ({ value: c.slug, label: c.name }))]}
          value={filterCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
          className="!w-auto"
        />
      </div>

      {/* ── Products Table ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blush/20 bg-blush-light/20">
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Product</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Category</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Price</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Stock</th>
                <th className="text-left py-3 px-4 text-[#6B5B55] font-medium">Status</th>
                <th className="text-right py-3 px-4 text-[#6B5B55] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product: Product) => (
                <tr key={product.id} className="border-b border-blush/10 last:border-0 hover:bg-blush-light/10 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0]?.startsWith('http') ? (
                        <img src={product.images[0]} alt={product.name} className="w-10 h-12 object-cover rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-gradient-to-br from-blush to-lavender flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-charcoal line-clamp-1">{product.name}</p>
                        <p className="text-xs text-[#6B5B55]">{product.sku}</p>
                        {(product.colors || []).length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {(product.colors || []).slice(0, 5).map((color: any) => (
                              <div
                                key={String(color)}
                                className="w-3 h-3 rounded-full border border-white shadow-sm"
                                style={{ backgroundColor: resolveColor(String(color)) }}
                                title={String(color)}
                              />
                            ))}
                            {(product.colors || []).length > 5 && (
                              <span className="text-xs text-[#6B5B55]">+{(product.colors || []).length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#6B5B55]">{product.category}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-charcoal">${product.price.toFixed(0)}</span>
                    {product.comparePrice && (
                      <span className="text-xs text-[#6B5B55] line-through ml-1">${product.comparePrice.toFixed(0)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${product.stock <= 10 ? 'text-red-500' : 'text-charcoal'}`}>{product.stock}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {product.isFeatured && <Badge variant="featured">Featured</Badge>}
                      {product.isOnSale && <Badge variant="sale">Sale</Badge>}
                      {product.isNewArrival && <Badge variant="new">New</Badge>}
                      {product.isTrending && <Badge variant="trending">Trending</Badge>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blush-light/50 text-[#6B5B55] hover:text-rose-gold transition-colors"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#6B5B55] hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-[#6B5B55]">No products found</div>}
      </div>

      {/* ════════════════════════════════════════
          ADD / EDIT MODAL
          ════════════════════════════════════════ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Product' : 'Add Product'} size="xl">
        <div
          className="space-y-5 max-h-[70vh] overflow-y-auto pr-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const allFiles = Array.from(e.dataTransfer.files);
            const imgs = allFiles.filter((f: File) => f.type.startsWith('image/'));
            const vid = allFiles.find((f: File) => f.type.startsWith('video/'));
            if (imgs.length > 0) setImageFiles(prev => {
              const existing = new Set(prev.map(f => f.name + f.size));
              return [...prev, ...imgs.filter(f => !existing.has(f.name + f.size))];
            });
            if (vid) { setVideoFile(vid); setVideoPreviewUrl(URL.createObjectURL(vid)); }
          }}
        >

          {/* ── Basic Info ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={form.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
              placeholder="e.g. Silk Evening Gown"
            />
            <div>
              <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">SKU (auto-generated)</label>
              <div className="flex gap-2">
                <input
                  value={form.sku || ''}
                  onChange={e => setForm({ ...form, sku: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  placeholder="Auto-filled from name"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sku: generateSKU(form.name || '') })}
                  className="px-3 py-2 rounded-xl bg-blush-light hover:bg-blush transition-colors"
                  title="Regenerate SKU"
                >
                  <RefreshCw size={14} className="text-[#6B5B55]" />
                </button>
              </div>
            </div>
            <Input
              label="Price ($)"
              type="number"
              value={form.price?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Compare Price ($) — strike-through"
              type="number"
              value={form.comparePrice?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, comparePrice: parseFloat(e.target.value) || undefined })}
            />
            <Select
              label="Category"
              options={[{ value: '', label: 'Select category' }, ...categories.map((c: any) => ({ value: c.name, label: c.name }))]}
              value={form.category || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const cat = categories.find((c: any) => c.name === e.target.value);
                setForm({ ...form, category: e.target.value, categorySlug: cat?.slug || '' });
              }}
            />
            <Input
              label="Stock"
              type="number"
              value={form.stock?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* ── EXISTING IMAGES (Edit Mode) ── */}
          {editingId && existingImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#6B5B55] mb-2">
                Current Images ({existingImages.length})
                <span className="ml-2 text-xs font-normal text-[#6B5B55]/70">Drag to reorder · Click × to remove</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingImages.map((url: string, i: number) => (
                  <div
                    key={url}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOverIndex(null); return; }
                      const updated = [...(form.images || [])];
                      const [moved] = updated.splice(dragIndex, 1);
                      updated.splice(i, 0, moved);
                      setForm({ ...form, images: updated });
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                    className={`relative group rounded-xl overflow-hidden border-2 bg-white shadow-sm cursor-grab transition-all
                      ${dragOverIndex === i ? 'border-rose-gold scale-95' : 'border-blush/30'}
                      ${dragIndex === i ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="absolute top-1 left-1 z-10 bg-white/80 rounded-full p-0.5 shadow">
                      <GripVertical size={12} className="text-charcoal" />
                    </div>
                    <img src={url} alt="" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, images: (form.images || []).filter((u: string) => u !== url) })}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                    >
                      <X size={12} />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-2 left-2 bg-rose-gold text-white text-[10px] px-2 py-1 rounded-full shadow">Cover</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── NEW IMAGES DROP ZONE ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-2">
              {editingId && existingImages.length > 0 ? 'Add More Images' : 'Product Images'}
              <span className="ml-2 text-xs font-normal text-[#6B5B55]/70">AG logo will be auto-watermarked ✓</span>
            </label>

            <div
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const allFiles = Array.from(e.dataTransfer.files);
                e.stopPropagation();
                const imgs = allFiles.filter((f: File) => f.type.startsWith('image/'));
                const vid = allFiles.find((f: File) => f.type.startsWith('video/'));
                if (imgs.length > 0) setImageFiles(prev => {
                  const existing = new Set(prev.map(f => f.name + f.size));
                  return [...prev, ...imgs.filter(f => !existing.has(f.name + f.size))];
                });
                if (vid) { setVideoFile(vid); setVideoPreviewUrl(URL.createObjectURL(vid)); }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all
                ${dragActive ? 'border-rose-gold bg-blush-light/40' : 'border-blush/40 bg-white/60'}`}
            >
              <UploadCloud className="mx-auto mb-3 text-rose-gold" size={40} />
              <p className="text-sm font-medium text-charcoal mb-1">Drag & Drop Images or Video</p>
              <p className="text-xs text-[#6B5B55] mb-4">Images: JPG, PNG, WEBP · Video: MP4, MOV</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <input type="file" accept="image/*" multiple onChange={(e) => {
                  if (e.target.files) setImageFiles(prev => {
                    const existing = new Set(prev.map(f => f.name + f.size));
                    return [...prev, ...Array.from(e.target.files || []).filter(f => !existing.has(f.name + f.size))];
                  });
                }} className="hidden" id="product-image-upload" />
                <label htmlFor="product-image-upload"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-gold text-white text-sm cursor-pointer hover:opacity-90">
                  Browse Images
                </label>
                <input type="file" accept="video/*" hidden id="video-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setVideoFile(file); setVideoPreviewUrl(URL.createObjectURL(file)); }
                  }}
                />
                <label htmlFor="video-upload"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-rose-gold text-rose-gold text-sm cursor-pointer hover:bg-blush-light/40 transition-colors">
                  Browse Video
                </label>
              </div>
            </div>

            {/* ────────────────────────────────────────
                FIXED IMAGE GRID:
                - Index 0 gets full-width WatermarkPreview
                - ALL images (0 included) are draggable
                - Cover badge follows index 0 dynamically
                ──────────────────────────────────────── */}
            {imageFiles.length > 0 && (
              <div className="mt-4 space-y-3">

                {/* Cover image — full-width watermark preview */}
                <div className="relative rounded-xl overflow-hidden border-2 border-rose-gold">
                  <WatermarkPreview
                    file={imageFiles[0]}
                    sizeMultiplier={wmSize}
                    enabled={wmEnabled}
                    onPositionChange={(xFrac: number, yFrac: number) => {
                      wmPos = { xFrac, yFrac };
                      setWmFrac({ xFrac, yFrac });
                    }}
                    textWmEnabled={textWmEnabled}
                    textWmText={textWmText}
                    textWmOpacity={textWmOpacity}
                    textWmSize={textWmSize}
                    textWmAngle={textWmAngle}
                    textWmColor={textWmColor}
                    textWmSpacingX={textWmSpacingX}
                    textWmSpacingY={textWmSpacingY}
                    logoText={agLogoText}
                    logoColorLeft={agLogoColorLeft}
                    logoColorRight={agLogoColorRight}
                    customLogoWm={customLogoWm}
                  />
                  <button
                    type="button"
                    onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== 0))}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center z-10 hover:bg-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  {existingImages.length === 0 && (
                    <div className="absolute bottom-2 left-2 bg-rose-gold text-white text-[10px] px-2 py-1 rounded-full shadow z-10">
                      Cover ✓
                    </div>
                  )}
                </div>

                {/* Watermark controls */}
                <div className="rounded-xl border border-blush/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setWmPanelOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-blush-light/40 hover:bg-blush-light/60 transition-colors"
                  >
                    <span className="text-xs font-medium text-[#6B5B55]">⚙️ Watermark Settings</span>
                    <span className="text-[10px] text-[#6B5B55]">{wmPanelOpen ? '▲ Hide' : '▼ Expand'}</span>
                  </button>

                  {wmPanelOpen && (
                    <div className="bg-blush-light/30 px-3 py-2.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6B5B55]">AG Logo Watermark</span>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <span className="text-xs text-[#6B5B55]">{wmEnabled ? 'On' : 'Off'}</span>
                          <div
                            onClick={() => setWmEnabled(v => !v)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${wmEnabled ? 'bg-rose-gold' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${wmEnabled ? 'left-4' : 'left-0.5'}`} />
                          </div>
                        </label>
                      </div>
                      {wmEnabled && (
                        <div className="space-y-2.5">
                          {/* Logo Text */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Logo Text</span>
                            <input
                              type="text"
                              value={agLogoText}
                              onChange={e => setAgLogoText(e.target.value.slice(0, 10))}
                              maxLength={10}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-blush/30 bg-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-rose-gold/30 font-bold tracking-widest"
                              placeholder="e.g. AG"
                            />
                            <span className="text-[10px] text-[#6B5B55]/60 shrink-0">max 10</span>
                          </div>

                          {/* Left half color */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Left Color</span>
                            <input
                              type="color"
                              value={agLogoColorLeft}
                              onChange={e => setAgLogoColorLeft(e.target.value)}
                              className="w-8 h-7 rounded cursor-pointer border border-blush/30 p-0.5 bg-white"
                            />
                            <span className="text-[10px] text-[#6B5B55] font-mono">{agLogoColorLeft}</span>
                            {/* live mini preview */}
                            <span
                              className="ml-auto text-sm font-black select-none"
                              style={{ color: agLogoColorLeft, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                            >
                              {agLogoText.slice(0, Math.ceil(agLogoText.length / 2)) || 'A'}
                            </span>
                            <span
                              className="text-sm font-black select-none"
                              style={{ color: agLogoColorRight, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                            >
                              {agLogoText.slice(Math.ceil(agLogoText.length / 2)) || 'G'}
                            </span>
                          </div>

                          {/* Right half color */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Right Color</span>
                            <input
                              type="color"
                              value={agLogoColorRight}
                              onChange={e => setAgLogoColorRight(e.target.value)}
                              className="w-8 h-7 rounded cursor-pointer border border-blush/30 p-0.5 bg-white"
                            />
                            <span className="text-[10px] text-[#6B5B55] font-mono">{agLogoColorRight}</span>
                            <button
                              type="button"
                              onClick={() => { setAgLogoColorLeft('#C0C0C0'); setAgLogoColorRight('#F5A623'); setAgLogoText(`${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`); }}
                              className="ml-auto text-[10px] text-[#6B5B55] underline hover:text-rose-gold transition-colors"
                            >
                              Reset
                            </button>
                          </div>

                          {/* Logo Size */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Logo Size</span>
                            <input
                              type="range" min={0.4} max={2.5} step={0.05} value={wmSize}
                              onChange={e => setWmSize(parseFloat(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{Math.round(wmSize * 100)}%</span>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-blush/20" />

                      {/* ── CUSTOM LOGO WATERMARK SECTION ── */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6B5B55]">🖼 Custom Logo Watermark</span>
                      </div>

                      {/* Upload area */}
                      <div className="space-y-2.5">
                        <div
                          className="relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-blush/40 rounded-xl py-3 px-4 cursor-pointer hover:border-rose-gold/60 hover:bg-rose-50/30 transition-colors"
                          onClick={() => customLogoFileRef.current?.click()}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            const f = e.dataTransfer.files[0];
                            if (f && /image\/(png|svg\+xml|webp|jpeg)/.test(f.type)) handleCustomLogoUpload(f);
                          }}
                        >
                          <input
                            ref={customLogoFileRef}
                            type="file"
                            accept="image/png,image/svg+xml,image/webp,image/jpeg"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleCustomLogoUpload(f);
                              e.target.value = '';
                            }}
                          />
                          {customLogoWm.imageDataUrl ? (
                            <div className="flex items-center gap-3 w-full">
                              <img
                                src={customLogoWm.imageDataUrl}
                                alt="Uploaded logo"
                                className="h-10 w-auto max-w-[80px] object-contain rounded"
                                style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-charcoal font-medium truncate">Logo uploaded ✓</p>
                                <p className="text-[10px] text-[#6B5B55]">Click to replace</p>
                              </div>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); updateCustomLogoWm({ imageDataUrl: '', enabled: false }); }}
                                className="ml-auto text-[10px] text-red-400 hover:text-red-600 transition-colors shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <UploadCloud size={20} className="text-[#6B5B55]/60" />
                              <p className="text-[11px] text-[#6B5B55] text-center">
                                Drop or click to upload logo<br />
                                <span className="text-[10px] opacity-70">PNG · SVG · WEBP · JPG — transparent PNGs supported</span>
                              </p>
                            </>
                          )}
                        </div>

                        {/* Toggle: Use Uploaded Logo vs AG Text Logo */}
                        {customLogoWm.imageDataUrl && (
                          <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-blush/20">
                            <span className="text-[11px] text-[#6B5B55] flex-1">
                              {customLogoWm.enabled ? '🖼 Using uploaded logo' : '🔤 Using AG text logo'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateCustomLogoWm({ enabled: false })}
                                className={`text-[10px] px-2 py-1 rounded-md transition-colors ${!customLogoWm.enabled ? 'bg-rose-gold text-white' : 'text-[#6B5B55] hover:bg-blush/40'}`}
                              >
                                AG Logo
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCustomLogoWm({ enabled: true })}
                                className={`text-[10px] px-2 py-1 rounded-md transition-colors ${customLogoWm.enabled ? 'bg-rose-gold text-white' : 'text-[#6B5B55] hover:bg-blush/40'}`}
                              >
                                Uploaded Logo
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Controls — only shown when custom logo is active */}
                        {customLogoWm.enabled && customLogoWm.imageDataUrl && (
                          <div className="space-y-2 bg-white/40 rounded-xl px-3 py-2.5 border border-blush/20">
                            {/* Logo Size */}
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Logo Size</span>
                              <input
                                type="range" min={0.04} max={0.55} step={0.01} value={customLogoWm.size}
                                onChange={e => updateCustomLogoWm({ size: parseFloat(e.target.value) })}
                                className="flex-1 accent-rose-gold"
                              />
                              <span className="text-[11px] text-[#6B5B55] w-8 text-right">{Math.round(customLogoWm.size * 100)}%</span>
                            </div>

                            {/* Opacity */}
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Opacity</span>
                              <input
                                type="range" min={0.05} max={1.0} step={0.05} value={customLogoWm.opacity}
                                onChange={e => updateCustomLogoWm({ opacity: parseFloat(e.target.value) })}
                                className="flex-1 accent-rose-gold"
                              />
                              <span className="text-[11px] text-[#6B5B55] w-8 text-right">{Math.round(customLogoWm.opacity * 100)}%</span>
                            </div>

                            {/* Background Box toggle */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#6B5B55]">Background Box</span>
                              <div
                                onClick={() => updateCustomLogoWm({ bgEnabled: !customLogoWm.bgEnabled })}
                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${customLogoWm.bgEnabled ? 'bg-rose-gold' : 'bg-gray-300'}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${customLogoWm.bgEnabled ? 'left-4' : 'left-0.5'}`} />
                              </div>
                            </div>

                            {customLogoWm.bgEnabled && (
                              <>
                                {/* Background Color + Opacity */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">BG Color</span>
                                  <input
                                    type="color"
                                    value={customLogoWm.bgColor}
                                    onChange={e => updateCustomLogoWm({ bgColor: e.target.value })}
                                    className="w-8 h-7 rounded cursor-pointer border border-blush/30 p-0.5 bg-white"
                                  />
                                  <span className="text-[11px] text-[#6B5B55] ml-1 whitespace-nowrap">BG Opacity</span>
                                  <input
                                    type="range" min={0.05} max={1.0} step={0.05} value={customLogoWm.bgOpacity}
                                    onChange={e => updateCustomLogoWm({ bgOpacity: parseFloat(e.target.value) })}
                                    className="flex-1 accent-rose-gold"
                                  />
                                  <span className="text-[11px] text-[#6B5B55] w-8 text-right">{Math.round(customLogoWm.bgOpacity * 100)}%</span>
                                </div>

                                {/* Border Radius */}
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Radius</span>
                                  <input
                                    type="range" min={0} max={40} step={1} value={customLogoWm.borderRadius}
                                    onChange={e => updateCustomLogoWm({ borderRadius: parseInt(e.target.value) })}
                                    className="flex-1 accent-rose-gold"
                                  />
                                  <span className="text-[11px] text-[#6B5B55] w-8 text-right">{customLogoWm.borderRadius}px</span>
                                </div>

                                {/* Padding */}
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Padding</span>
                                  <input
                                    type="range" min={0} max={40} step={1} value={customLogoWm.padding}
                                    onChange={e => updateCustomLogoWm({ padding: parseInt(e.target.value) })}
                                    className="flex-1 accent-rose-gold"
                                  />
                                  <span className="text-[11px] text-[#6B5B55] w-8 text-right">{customLogoWm.padding}px</span>
                                </div>
                              </>
                            )}

                            {/* Shadow toggle */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#6B5B55]">Shadow</span>
                              <div
                                onClick={() => updateCustomLogoWm({ shadowEnabled: !customLogoWm.shadowEnabled })}
                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${customLogoWm.shadowEnabled ? 'bg-rose-gold' : 'bg-gray-300'}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${customLogoWm.shadowEnabled ? 'left-4' : 'left-0.5'}`} />
                              </div>
                            </div>

                            {customLogoWm.shadowEnabled && (
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Shadow Strength</span>
                                <input
                                  type="range" min={0} max={40} step={1} value={customLogoWm.shadowStrength}
                                  onChange={e => updateCustomLogoWm({ shadowStrength: parseInt(e.target.value) })}
                                  className="flex-1 accent-rose-gold"
                                />
                                <span className="text-[11px] text-[#6B5B55] w-8 text-right">{customLogoWm.shadowStrength}</span>
                              </div>
                            )}

                            {/* Reset button */}
                            <button
                              type="button"
                              onClick={() => updateCustomLogoWm({ ...defaultCustomLogoWm, imageDataUrl: customLogoWm.imageDataUrl, enabled: true })}
                              className="text-[10px] text-[#6B5B55] underline hover:text-rose-gold transition-colors"
                            >
                              Reset logo controls to default
                            </button>
                          </div>
                        )}
                      </div>
                      {/* ── END CUSTOM LOGO WATERMARK ── */}

                      <div className="border-t border-blush/20" />

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6B5B55]">Text Watermark (anti-theft)</span>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <span className="text-xs text-[#6B5B55]">{textWmEnabled ? 'On' : 'Off'}</span>
                          <div
                            onClick={() => setTextWmEnabled(v => !v)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${textWmEnabled ? 'bg-rose-gold' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${textWmEnabled ? 'left-4' : 'left-0.5'}`} />
                          </div>
                        </label>
                      </div>

                      {textWmEnabled && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Text</span>
                            <input
                              type="text"
                              value={textWmText}
                              onChange={e => setTextWmText(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-blush/30 bg-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-rose-gold/30"
                              placeholder={`e.g. ${BRAND.watermarkText}`}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Color</span>
                            <input
                              type="color"
                              value={textWmColor}
                              onChange={e => setTextWmColor(e.target.value)}
                              className="w-8 h-7 rounded cursor-pointer border border-blush/30 p-0.5 bg-white"
                            />
                            <span className="text-[11px] text-[#6B5B55] ml-2 whitespace-nowrap">Opacity</span>
                            <input
                              type="range" min={0.03} max={0.7} step={0.01} value={textWmOpacity}
                              onChange={e => setTextWmOpacity(parseFloat(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{Math.round(textWmOpacity * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Font Size</span>
                            <input
                              type="range" min={8} max={80} step={1} value={textWmSize}
                              onChange={e => setTextWmSize(parseInt(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{textWmSize}px</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Angle</span>
                            <input
                              type="range" min={-90} max={90} step={1} value={textWmAngle}
                              onChange={e => setTextWmAngle(parseInt(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{textWmAngle}°</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Spacing H</span>
                            <input
                              type="range" min={60} max={500} step={5} value={textWmSpacingX}
                              onChange={e => setTextWmSpacingX(parseInt(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{textWmSpacingX}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B5B55] w-20 shrink-0">Spacing V</span>
                            <input
                              type="range" min={40} max={400} step={5} value={textWmSpacingY}
                              onChange={e => setTextWmSpacingY(parseInt(e.target.value))}
                              className="flex-1 accent-rose-gold"
                            />
                            <span className="text-[11px] text-[#6B5B55] w-8 text-right">{textWmSpacingY}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Remaining images — draggable thumbnails */}
                {imageFiles.length > 1 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {imageFiles.slice(1).map((file: File, i: number) => {
                      const realIndex = i + 1;
                      return (
                        <div
                          key={realIndex}
                          draggable
                          onDragStart={() => handleDragStart(realIndex)}
                          onDragOver={(e) => handleDragOver(e, realIndex)}
                          onDrop={() => handleDrop(realIndex)}
                          onDragEnd={handleDragEnd}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-grab
                            ${dragOverIndex === realIndex ? 'border-rose-gold scale-95' : 'border-blush/30'}
                            ${dragIndex === realIndex ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="absolute top-1 left-1 z-10 bg-white/80 rounded-full p-0.5 shadow">
                            <GripVertical size={12} className="text-charcoal" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...imageFiles];
                              const [moved] = updated.splice(realIndex, 1);
                              updated.unshift(moved);
                              setImageFiles(updated);
                            }}
                            className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10 hover:bg-rose-gold transition-colors"
                          >
                            Set Cover
                          </button>
                          <MiniWatermarkThumb
                            file={file}
                            xFrac={wmFrac.xFrac}
                            yFrac={wmFrac.yFrac}
                            enabled={wmEnabled}
                            textWmEnabled={textWmEnabled}
                            textWmText={textWmText}
                            textWmOpacity={textWmOpacity}
                            textWmSize={textWmSize}
                            textWmAngle={textWmAngle}
                            textWmColor={textWmColor}
                            textWmSpacingX={textWmSpacingX}
                            textWmSpacingY={textWmSpacingY}
                            logoText={agLogoText}
                            logoColorLeft={agLogoColorLeft}
                            logoColorRight={agLogoColorRight}
                            customLogoWm={customLogoWm}
                          />
                          <button
                            type="button"
                            onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== realIndex))}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500 transition-colors z-10"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
                }

                <p className="text-[10px] text-[#6B5B55] italic text-center">
                  Drag any image to reorder — the top image will be the cover photo
                </p>
              </div>
            )}
          </div>

          {/* ── VIDEO PREVIEW (shown after selection) ── */}
          {/* ── VIDEO PREVIEW (shown after selection) ── */}
          {
            videoPreviewUrl && (
              <div className="relative">
                <video src={videoPreviewUrl} controls className="w-full rounded-2xl border border-blush/30" />
                <button
                  type="button"
                  onClick={() => { setVideoFile(null); setVideoPreviewUrl(''); }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                >
                  <X size={12} />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">Video</div>
              </div>
            )
          }

          {/* ── COLORS ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-0.5">Colors</label>
            <p className="text-xs text-[#6B5B55] mb-2">
              Type color name (e.g. <span className="text-charcoal font-medium">red, navy, rose gold, maroon</span>) or hex. Press Enter or click Add.
            </p>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  value={colorInput}
                  onChange={e => {
                    const val = e.target.value;
                    setColorInput(val);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                  className="w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  placeholder="e.g. red  or  #B76E79  or  rose gold"
                />
                {/* Live name hint when hex is typed */}
                {colorInput.trim() && (() => {
                  const lower = colorInput.trim().toLowerCase();
                  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorInput.trim());
                  const exactMatch = COLOR_NAME_TO_HEX[lower];
                  const hint = isHex
                    ? resolveColorName(colorInput.trim())
                    : exactMatch ? null : (() => {
                      const partial = Object.keys(COLOR_NAME_TO_HEX).find(k => k.startsWith(lower));
                      return partial ? partial : null;
                    })();
                  return hint ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#6B5B55] pointer-events-none">
                      → {hint}
                    </span>
                  ) : null;
                })()}
              </div>
              {/* Color preview swatch */}
              <div
                className="w-11 h-11 rounded-xl border-2 border-blush/40 flex-shrink-0 transition-all"
                style={{
                  backgroundColor: (() => {
                    const t = colorInput.trim();
                    if (!t) return '#f0f0f0';
                    const resolved = resolveColor(t);
                    if (resolved !== '#cccccc') return resolved;
                    // Try partial match
                    const lower = t.toLowerCase();
                    const partial = Object.keys(COLOR_NAME_TO_HEX).find(k => k.startsWith(lower));
                    return partial ? COLOR_NAME_TO_HEX[partial] : '#f0f0f0';
                  })()
                }}
              />
              {/* Eye dropper button */}
              {hasEyeDropper && (
                <button
                  type="button"
                  onClick={openEyeDropper}
                  title="Pick color from screen"
                  className="w-11 h-11 rounded-xl border-2 border-blush/30 bg-white hover:bg-blush-light/40 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6B5B55]">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" />
                    <path d="M20 14l-1.5-1.5M16.5 17.5l-8-8 2-2 8 8-2 2z" />
                    <path d="M8.5 9.5L6 12l-2 5 5-2 2.5-2.5" />
                  </svg>
                </button>
              )}
              <Button size="sm" onClick={addColor} type="button">Add</Button>
            </div>
            {/* Auto-detected colors from image */}
            {(detectedColors.length > 0 || detectingColors) && (
              <div className="mb-3 p-3 rounded-xl bg-blush-light/30 border border-blush/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#6B5B55]">
                    🎨 Auto-detected from image
                  </span>
                  {detectingColors && (
                    <span className="text-[10px] text-[#6B5B55] animate-pulse">Analyzing...</span>
                  )}
                </div>
                {!detectingColors && (
                  <div className="flex flex-wrap gap-1.5">
                    {detectedColors.map((colorName) => {
                      const alreadyAdded = (form.colors || []).includes(colorName);
                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => {
                            if (!alreadyAdded) {
                              setForm({ ...form, colors: [...(form.colors || []), colorName] });
                            }
                          }}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors
                ${alreadyAdded
                              ? 'border-rose-gold/40 bg-rose-gold/10 text-rose-gold cursor-default'
                              : 'border-blush/30 bg-white hover:bg-blush-light/60 text-charcoal cursor-pointer'
                            }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/80 shadow-sm flex-shrink-0"
                            style={{ backgroundColor: resolveColor(colorName) }}
                          />
                          {colorName}
                          {alreadyAdded ? (
                            <span className="text-[9px]">✓</span>
                          ) : (
                            <span className="text-[9px] text-[#6B5B55]">+ add</span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const toAdd = detectedColors.filter(c => !(form.colors || []).includes(c));
                        if (toAdd.length > 0) {
                          setForm({ ...form, colors: [...(form.colors || []), ...toAdd] });
                        }
                      }}
                      className="text-[10px] px-2.5 py-1.5 rounded-full bg-rose-gold text-white hover:opacity-90 transition-opacity"
                    >
                      Add All
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                ['White', '#FFFFFF'], ['Black', '#000000'], ['Red', '#E53E3E'],
                ['Maroon', '#800000'], ['Navy', '#001F5B'], ['Pink', '#FFC0CB'],
                ['Rose Gold', '#B76E79'], ['Green', '#38A169'], ['Yellow', '#F6E05E'],
                ['Orange', '#ED8936'], ['Purple', '#805AD5'], ['Skin', '#FED9B0'],
                ['Beige', '#F5F5DC'], ['Grey', '#808080'], ['Teal', '#008080'],
              ].map(([name, hex]) => (
                <button key={name} type="button"
                  onClick={() => { if (!(form.colors || []).includes(name)) setForm({ ...form, colors: [...(form.colors || []), name] }); }}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-blush/20 bg-white hover:bg-blush-light/40 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full border border-white/80 shadow-sm flex-shrink-0" style={{ backgroundColor: hex }} />
                  {name}
                </button>
              ))}
            </div>
            {(form.colors || []).length > 0 && (
              <>
                <p className="text-xs text-[#6B5B55] mb-2">Selected ({(form.colors || []).length}):</p>
                <div className="flex flex-wrap gap-2">
                  {(form.colors || []).map((color: string) => (
                    <div key={String(color)} className="flex items-center gap-1.5 bg-white border border-blush/20 rounded-full px-3 py-1.5 shadow-sm">
                      <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm flex-shrink-0" style={{ backgroundColor: resolveColor(String(color)) }} />
                      <span className="text-xs text-charcoal font-medium">{String(color)}</span>
                      <button type="button" onClick={() => removeColor(String(color))} className="text-[#6B5B55] hover:text-red-500 ml-0.5 transition-colors"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── SIZES ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-0.5">Sizes</label>
            <p className="text-xs text-[#6B5B55] mb-2">
              Type sizes separated by commas (e.g. <span className="text-charcoal font-medium">XS, S, M, L, XL</span>) then click Add.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={sizeInput}
                onChange={e => setSizeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSizes(); } }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                placeholder="e.g.  S, M, L   or   Free Size   or   32, 34, 36"
              />
              <Button size="sm" onClick={addSizes} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: 'M–XL', sizes: ['M', 'L', 'XL'] },
                { label: '32-38', sizes: ['32', '34', '36', '38'] },
                { label: 'XS–XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
                { label: 'Free Size', sizes: ['Free Size'] },
                { label: '32–40 (bra/chest)', sizes: ['32', '34', '36', '38', '40'] },
                { label: '28–36 (waist)', sizes: ['28', '30', '32', '34', '36'] },
                { label: 'S–XXL only', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },


              ].map(preset => (
                <button key={preset.label} type="button"
                  onClick={() => { const existing = form.sizes || []; setForm({ ...form, sizes: [...new Set([...existing, ...preset.sizes])] }); }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blush-light/60 text-[#6B5B55] hover:bg-blush-light transition-colors border border-blush/20"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
            {(form.sizes || []).length > 0 && (
              <>
                <p className="text-xs text-[#6B5B55] mb-2">Selected ({(form.sizes || []).length}):</p>
                <div className="flex flex-wrap gap-2">
                  {(form.sizes || []).map((size: string) => (
                    <div key={String(size)} className="flex items-center gap-1 bg-rose-gold/10 text-rose-gold rounded-full px-3 py-1 border border-rose-gold/20">
                      <span className="text-xs font-medium">{String(size)}</span>
                      <button type="button" onClick={() => removeSize(String(size))} className="hover:text-red-500 ml-1 transition-colors"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Description ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">
              Products Details / Description / Notes (optional)
            </label>
            <textarea
              value={form.customText || ''}
              onChange={e => setForm({ ...form, customText: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 resize-none"
              rows={5}
              placeholder="Write custom product information, offer, sizing help, delivery notes, fabric details etc."
            />
          </div>

          {/* ── Product Assembly ── */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isCustomAssembly || false}
                onChange={(e) => setForm({ ...form, isCustomAssembly: e.target.checked })} />
              <span className="text-sm font-medium text-charcoal">Enable Product Assembly</span>
            </label>
            {form.isCustomAssembly && (
              <div>
                <p className="text-xs text-[#6B5B55] mb-2">Add related products separated by commas</p>
                <input
                  type="text"
                  placeholder="e.g. Hijab, Bag, Shoes"
                  value={(form.assembledProducts || []).join(', ')}
                  onChange={(e) => setForm({ ...form, assembledProducts: e.target.value.split(',').map((item: string) => item.trim()).filter(Boolean) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm"
                />
              </div>
            )}
          </div>

          {/* ── Tags ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Tags (comma separated)</label>
            <input
              value={(form.tags || []).join(', ')}
              onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })}
              className="w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
              placeholder="e.g. silk, evening, luxury"
            />
          </div>

          {/* ── Labels ── */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-2">Product Labels</label>
            <div className="flex flex-wrap gap-4">
              {(['isFeatured', 'isTrending', 'isNewArrival', 'isOnSale'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4 rounded accent-rose-gold" />
                  <span className="text-sm text-charcoal">{key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Footer with upload progress ── */}
          <div className="flex flex-col gap-3 pt-4 border-t border-blush/20">
            {/* Upload progress bar */}
            {uploading && uploadProgress && (
              <div className="w-full">
                <div className="flex justify-between text-xs text-[#6B5B55] mb-1">
                  <span>Uploading images...</span>
                  <span>{uploadProgress.done} / {uploadProgress.total}</span>
                </div>
                <div className="w-full bg-blush/20 rounded-full h-2">
                  <div
                    className="bg-rose-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={uploading}>
                {uploading
                  ? uploadProgress
                    ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
                    : 'Saving...'
                  : editingId ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </div>

        </div >
      </Modal >
    </div >
  );
};
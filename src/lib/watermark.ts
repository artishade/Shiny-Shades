/**
 * Canvas watermarking, shared by /admin/products and the admin AI chat.
 *
 * Stateless on purpose: the caller owns the position and the panel settings, so
 * this module never reads localStorage at import time (which would break SSR
 * and make two callers fight over one mutable position).
 */
import { BRAND } from '@/config/brandingConfig';

// ─────────────────────────────────────────────────
// WATERMARK PANEL SETTINGS — "last usage" defaults
// Persisted to localStorage so the next product upload
// starts with the same watermark state the admin used
// last time (on/off toggle + position + all options).
// ─────────────────────────────────────────────────
export const WM_SETTINGS_LS_KEY = 'ag_wm_panel_settings_v1';

export interface WmPanelSettings {
  wmEnabled: boolean;
  wmSize: number;
  wmPos: { xFrac: number; yFrac: number };
  textWmEnabled: boolean;
  textWmText: string;
  textWmOpacity: number;
  textWmSize: number;
  textWmAngle: number;
  textWmColor: string;
  textWmSpacingX: number;
  textWmSpacingY: number;
  agLogoText: string;
  agLogoColorLeft: string;
  agLogoColorRight: string;
}

export const DEFAULT_WM_SETTINGS: WmPanelSettings = {
  wmEnabled: true,
  wmSize: 1.0,
  wmPos: { xFrac: 0.82, yFrac: 0.90 },
  textWmEnabled: true,
  textWmText: BRAND.watermarkText,
  textWmOpacity: 0.18,
  textWmSize: 22,
  textWmAngle: -30,
  textWmColor: '#ffffff',
  textWmSpacingX: 180,
  textWmSpacingY: 90,
  agLogoText: 'TEXT',
  agLogoColorLeft: '#000000ff',
  agLogoColorRight: '#5c0404ff',
};

export const loadWmSettings = (): WmPanelSettings => {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_WM_SETTINGS };
    const raw = localStorage.getItem(WM_SETTINGS_LS_KEY);
    if (!raw) return { ...DEFAULT_WM_SETTINGS };
    return { ...DEFAULT_WM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_WM_SETTINGS };
  }
};

export const saveWmSettings = (s: WmPanelSettings) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WM_SETTINGS_LS_KEY, JSON.stringify(s));
  } catch { }
};

// ─────────────────────────────────────────────────
// DRAW TILED TEXT WATERMARK
// ─────────────────────────────────────────────────
export const drawTextWatermark = (
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
export const drawAGLogo = (
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
export interface TextWmConfig {
  enabled: boolean;
  text: string;
  opacity: number;
  size: number;
  angle: number;
  color: string;
  spacingX: number;
  spacingY: number;
}

export interface LogoWmConfig {
  text: string;
  colorLeft: string;
  colorRight: string;
}

// ─────────────────────────────────────────────────
// CUSTOM LOGO WATERMARK CONFIG
// ─────────────────────────────────────────────────
export interface CustomLogoWmConfig {
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

export const CUSTOM_LOGO_LS_KEY = 'ag_custom_logo_wm_v1';

export const defaultCustomLogoWm: CustomLogoWmConfig = {
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

export const loadCustomLogoWmFromLS = (): CustomLogoWmConfig => {
  try {
    if (typeof localStorage === 'undefined') return { ...defaultCustomLogoWm };
    const raw = localStorage.getItem(CUSTOM_LOGO_LS_KEY);
    if (!raw) return { ...defaultCustomLogoWm };
    return { ...defaultCustomLogoWm, ...JSON.parse(raw) };
  } catch {
    return { ...defaultCustomLogoWm };
  }
};

export const saveCustomLogoWmToLS = (cfg: CustomLogoWmConfig) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CUSTOM_LOGO_LS_KEY, JSON.stringify(cfg));
  } catch { }
};

// ─────────────────────────────────────────────────
// DRAW CUSTOM LOGO WATERMARK (async — loads image)
// ─────────────────────────────────────────────────
export const drawCustomLogoWatermark = (
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
export const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

export interface ApplyWatermarkOptions {
  sizeMultiplier?: number;
  textWm?: TextWmConfig;
  logoWm?: LogoWmConfig;
  customLogoWm?: CustomLogoWmConfig;
  /** Logo anchor as a fraction of each edge. Owned by the caller. */
  pos?: { xFrac: number; yFrac: number };
}

// ─────────────────────────────────────────────────
// APPLY WATERMARK — with pre-resize for large files
// ─────────────────────────────────────────────────
export const applyWatermark = (
  file: File,
  opts: ApplyWatermarkOptions = {}
): Promise<File> => {
  const {
    sizeMultiplier = 1.0,
    textWm,
    logoWm,
    customLogoWm,
    pos = DEFAULT_WM_SETTINGS.wmPos,
  } = opts;

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
            pos.xFrac, pos.yFrac,
            logoImg, customLogoWm!
          );
        } catch {
          // fallback to AG logo on error
          const size = Math.max(18, Math.min(targetW, targetH) * 0.08) * sizeMultiplier;
          drawAGLogo(ctx, pos.xFrac * targetW, pos.yFrac * targetH, size, logoWm?.text, logoWm?.colorLeft, logoWm?.colorRight);
        }
      } else {
        // Apply AG logo watermark
        const size = Math.max(18, Math.min(targetW, targetH) * 0.08) * sizeMultiplier;
        drawAGLogo(ctx, pos.xFrac * targetW, pos.yFrac * targetH, size, logoWm?.text, logoWm?.colorLeft, logoWm?.colorRight);
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

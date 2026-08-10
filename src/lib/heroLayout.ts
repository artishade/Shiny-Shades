// src/lib/heroLayout.ts
// Shared types + defaults for the draggable Hero component layout.
// Imported by Hero.tsx (renders) and pages/admin/content.tsx (drag builder).

export interface HeroPosition {
    /** percentage from left, 0-100 */
    x: number;
    /** percentage from top, 0-100 */
    y: number;
}

export interface HeroLayout {
    title: HeroPosition;
    subtitle: HeroPosition;
    /** Groups the primary "Shop Now" + secondary "Shop Sale" buttons together */
    buttons: HeroPosition;
}

export type HeroExtraComponentType = 'text' | 'button';

export interface HeroExtraComponent {
    id: string;
    type: HeroExtraComponentType;
    /** Text content, or button label when type === 'button' */
    content: string;
    /** Link target, only used when type === 'button' */
    link?: string;
    position: HeroPosition;
}

// Matches the original static layout (left-aligned, stacked) so existing
// sites look unchanged until someone drags something in the admin panel.
export const DEFAULT_HERO_LAYOUT: HeroLayout = {
    title: { x: 6, y: 32 },
    subtitle: { x: 6, y: 58 },
    buttons: { x: 6, y: 80 },
};

// Keep dragged elements from going fully off-canvas / behind padding.
export const HERO_DRAG_BOUNDS = { minX: 2, maxX: 88, minY: 4, maxY: 92 };

export const clampHeroPosition = (pos: HeroPosition): HeroPosition => ({
    x: Math.min(HERO_DRAG_BOUNDS.maxX, Math.max(HERO_DRAG_BOUNDS.minX, pos.x)),
    y: Math.min(HERO_DRAG_BOUNDS.maxY, Math.max(HERO_DRAG_BOUNDS.minY, pos.y)),
});
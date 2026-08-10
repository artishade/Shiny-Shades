/* ===================================================
   Shiny Shades - Admin Content Editor
   Adds: hero free-drag component builder, video upload
   (drag-and-drop) for Banner / New Arrival / Sale banners
   =================================================== */

import React, { useState, useRef, useEffect } from 'react';
import { Save, Eye, Plus, Trash2, Image, Megaphone, ToggleLeft, ToggleRight, Video, Type, Crop } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useContentStore, type ContentData } from '@/store/contentStore';
import { ImageCropperModal } from '@/components/admin/ImageCropperModal';
import {
  DEFAULT_HERO_LAYOUT,
  clampHeroPosition,
  type HeroLayout,
  type HeroPosition,
  type HeroExtraComponent,
} from '@/lib/heroLayout';
import { NewArrivalsHero } from '@/pages/NewArrivals';
import { SaleHero } from '@/pages/Sale';

const gradients = [
  'linear-gradient(135deg, #F4C2C2, #E6E6FA, #F7E7CE)',
  'linear-gradient(135deg, #B76E79, #E3BCA4, #F7E7CE)',
  'linear-gradient(135deg, #D4949E, #F4C2C2, #E6E6FA)',
  'linear-gradient(135deg, #E6E6FA, #F4C2C2, #FADBD8)',
  'linear-gradient(135deg, #F7E7CE, #E3BCA4, #F4C2C2)',
];

const announcementColorPresets = [
  { bg: '#B76E79', text: '#FFFFFF', name: 'Rose Gold' },
  { bg: '#2D2D2D', text: '#FFFFFF', name: 'Charcoal' },
  { bg: '#F4C2C2', text: '#2D2D2D', name: 'Blush' },
  { bg: '#E6E6FA', text: '#2D2D2D', name: 'Lavender' },
  { bg: '#000000', text: '#F7E7CE', name: 'Black & Gold' },
  { bg: '#D4949E', text: '#FFFFFF', name: 'Dusty Pink' },
];

// ── Banner media target dimensions ──────────────────────────────────────────
// Hero + Banner Slider: 1920×840 desktop, 1440×810 mobile (both requested by design).
// New Arrival / Sale page banners: desktop crop is unchanged (already correct),
// only the mobile crop now matches the same 1440×810 widescreen shape.
const DESKTOP_BANNER_ASPECT = 1920 / 840; // 16 / 7
const DEFAULT_DESKTOP_ASPECT = 16 / 6; // unchanged existing shape for New Arrival / Sale desktop crops
const MOBILE_BANNER_ASPECT = 1440 / 810; // 16 / 9

type BannerMediaType = 'gradient' | 'image' | 'video';

type BannerLike = {
  id: string;

  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  active: boolean;

  mediaType?: BannerMediaType;
  imageUrl?: string;
  imageUrlMobile?: string;
  videoUrl?: string;
  gradient: string;
};

const getBannerMediaType = (banner: BannerLike): BannerMediaType =>
  banner.mediaType ?? (banner.videoUrl ? 'video' : banner.imageUrl ? 'image' : 'gradient');

// ── Upload image/video to Cloudinary ──
const uploadContentMedia = async (
  file: File,
  folder: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<string> => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append(
    'upload_preset',
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  );
  formData.append('folder', folder);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }

  return data.secure_url;
};

// ── Small, reusable card section header (icon + title + optional description) ──
const SectionHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="flex items-start gap-2.5">
      {icon && <div className="mt-0.5 text-rose-gold shrink-0">{icon}</div>}
      <div>
        <h3 className="font-semibold text-charcoal leading-tight">{title}</h3>
        {description && <p className="text-xs text-[#6B5B55]/80 mt-0.5">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── Subtle inline hint/tip box, replaces the old inline emoji lines ──
const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 flex items-start gap-2 text-xs text-[#6B5B55] bg-blush-light/25 border border-blush/20 rounded-lg px-3 py-2">
    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-gold shrink-0" />
    <p>{children}</p>
  </div>
);

// ── Reusable drag-and-drop media uploader (image or video) ──
// Images go through the crop modal first; videos upload as-is.
const MediaDropzone: React.FC<{
  accept: string;
  isVideo?: boolean;
  preview?: string;
  currentUrl?: string;
  onFile: (file: File) => void;
  onRemoveCurrent?: () => void;
  cropAspect?: number; // width / height for the crop modal, default 16/6 (banner shape)
}> = ({ accept, isVideo, preview, currentUrl, onFile, onRemoveCurrent, cropAspect = 16 / 6 }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Crop modal state — holds the raw, not-yet-cropped image while admin adjusts it
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const handleIncomingFile = (file: File) => {
    if (isVideo) {
      onFile(file);
      return;
    }
    // Image: open the cropper instead of uploading immediately
    const reader = new FileReader();
    reader.onload = () => setRawImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleIncomingFile(file);
  };

  const handleCropDone = (blob: Blob, previewUrl: string) => {
    const croppedFile = new File([blob], 'cropped-banner.jpg', { type: 'image/jpeg' });
    setRawImageSrc(null);
    onFile(croppedFile);
    // Replace the preview blob URL with the cropped one for accuracy
    URL.revokeObjectURL(previewUrl); // not used directly; parent generates its own preview via onFile caller
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl py-4 px-3 text-center cursor-pointer transition-colors ${dragOver ? 'border-rose-gold bg-blush-light/40' : 'border-blush/30 bg-white/50 hover:bg-white/70'
          }`}
      >
        {isVideo ? <Video size={16} className="text-[#6B5B55]" /> : <Image size={16} className="text-[#6B5B55]" />}
        <p className="text-xs text-[#6B5B55]">
          Drag &amp; drop {isVideo ? 'a video' : 'an image'} here, or click to browse
        </p>
        {!isVideo && (
          <p className="text-[10px] text-[#6B5B55]/70 flex items-center gap-1">
            <Crop size={10} /> You'll be able to adjust the crop before upload
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleIncomingFile(file);
            e.target.value = ''; // allow re-selecting the same file later
          }}
        />
      </div>

      {(preview || currentUrl) && (
        <div className="mt-2 relative">
          {isVideo ? (
            <video
              src={preview || currentUrl}
              className="w-full h-24 object-cover rounded-lg border border-blush/30"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <img src={preview || currentUrl} alt="" className="w-full h-24 object-cover rounded-lg border border-blush/30" />
          )}
          <div className="flex items-center justify-between mt-1">
            {!isVideo && (preview || currentUrl) && (
              <button
                type="button"
                onClick={() => setRawImageSrc(preview || currentUrl || null)}
                className="text-xs text-rose-gold hover:underline flex items-center gap-1"
              >
                <Crop size={11} /> Re-adjust crop
              </button>
            )}
            {currentUrl && !preview && onRemoveCurrent && (
              <button
                type="button"
                onClick={onRemoveCurrent}
                className="text-xs bg-white/90 text-red-500 rounded px-2 py-0.5 ml-auto"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {rawImageSrc && (
        <ImageCropperModal
          imageSrc={rawImageSrc}
          aspect={cropAspect}
          onCancel={() => setRawImageSrc(null)}
          onCropDone={handleCropDone}
        />
      )}
    </div>
  );
};

// ── Small toggle-button group for choosing banner media type ──
const MediaTypeToggle: React.FC<{ value: BannerMediaType; onChange: (v: BannerMediaType) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-2">
    {([
      { key: 'gradient', label: '🎨 Gradient' },
      { key: 'image', label: '🖼️ Image' },
      { key: 'video', label: '🎬 Video' },
    ] as const).map(opt => (
      <button
        key={opt.key}
        type="button"
        onClick={() => onChange(opt.key)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${value === opt.key ? 'bg-rose-gold text-white' : 'bg-blush-light/50 text-charcoal hover:bg-blush-light'
          }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const AdminContent: React.FC = () => {
  const { content, setContent, saveContent } = useContentStore();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Hero image state
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState('');
  const [heroFileMobile, setHeroFileMobile] = useState<File | null>(null);
  const [heroPreviewMobile, setHeroPreviewMobile] = useState('');

  // Homepage banner media state
  const [bannerFiles, setBannerFiles] = useState<Record<string, File>>({});
  const [bannerPreviews, setBannerPreviews] = useState<Record<string, string>>({});
  const [bannerVideoFiles, setBannerVideoFiles] = useState<Record<string, File>>({});
  const [bannerVideoPreviews, setBannerVideoPreviews] = useState<Record<string, string>>({});
  const [bannerMobileFiles, setBannerMobileFiles] = useState<Record<string, File>>({});
  const [bannerMobilePreviews, setBannerMobilePreviews] = useState<Record<string, string>>({});

  // New Arrival banner media state
  const [newArrivalBannerFiles, setNewArrivalBannerFiles] = useState<Record<string, File>>({});
  const [newArrivalBannerPreviews, setNewArrivalBannerPreviews] = useState<Record<string, string>>({});
  const [newArrivalBannerVideoFiles, setNewArrivalBannerVideoFiles] = useState<Record<string, File>>({});
  const [newArrivalBannerVideoPreviews, setNewArrivalBannerVideoPreviews] = useState<Record<string, string>>({});
  const [newArrivalBannerMobileFiles, setNewArrivalBannerMobileFiles] = useState<Record<string, File>>({});
  const [newArrivalBannerMobilePreviews, setNewArrivalBannerMobilePreviews] = useState<Record<string, string>>({});

  // Sale banner media state
  const [saleBannerFiles, setSaleBannerFiles] = useState<Record<string, File>>({});
  const [saleBannerPreviews, setSaleBannerPreviews] = useState<Record<string, string>>({});
  const [saleBannerVideoFiles, setSaleBannerVideoFiles] = useState<Record<string, File>>({});
  const [saleBannerVideoPreviews, setSaleBannerVideoPreviews] = useState<Record<string, string>>({});
  const [saleBannerMobileFiles, setSaleBannerMobileFiles] = useState<Record<string, File>>({});
  const [saleBannerMobilePreviews, setSaleBannerMobilePreviews] = useState<Record<string, string>>({});

  // Hero drag-and-drop builder state
  const heroCanvasRef = useRef<HTMLDivElement>(null);
  const [draggingHeroId, setDraggingHeroId] = useState<string | null>(null);

  // Safe accessor — announcement.messages is always an array after contentStore defaults
  const messages = content.announcement?.messages ?? [];

  const updateField = (field: keyof ContentData, value: unknown) => {
    setContent({ ...content, [field]: value });
  };

  // ── Hero builder helpers ─────────────────────────────────────────────────────

  const heroLayout: HeroLayout = content.heroLayout ?? DEFAULT_HERO_LAYOUT;
  const heroExtras: HeroExtraComponent[] = content.heroExtraComponents ?? [];

  const updateHeroLayoutKey = (key: keyof HeroLayout, pos: HeroPosition) => {
    updateField('heroLayout', { ...heroLayout, [key]: clampHeroPosition(pos) });
  };

  const updateHeroExtra = (id: string, patch: Partial<HeroExtraComponent>) => {
    updateField(
      'heroExtraComponents',
      heroExtras.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const addHeroExtraComponent = () => {
    updateField('heroExtraComponents', [
      ...heroExtras,
      {
        id: Date.now().toString(),
        type: 'text',
        content: 'New text',
        position: { x: 50, y: 50 },
      } as HeroExtraComponent,
    ]);
  };

  const removeHeroExtraComponent = (id: string) =>
    updateField('heroExtraComponents', heroExtras.filter(c => c.id !== id));

  const startHeroDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHeroId(id);
  };

  useEffect(() => {
    if (!draggingHeroId) return;

    const handleMove = (e: PointerEvent) => {
      const canvas = heroCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pos = clampHeroPosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });

      if (draggingHeroId === 'title' || draggingHeroId === 'subtitle' || draggingHeroId === 'buttons') {
        updateHeroLayoutKey(draggingHeroId, pos);
      } else {
        updateHeroExtra(draggingHeroId, { position: pos });
      }
    };

    const handleUp = () => setDraggingHeroId(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingHeroId, heroLayout, heroExtras]);

  // ── Homepage Banner helpers ──────────────────────────────────────────────────

  const updateBanner = (index: number, field: string, value: string | boolean) => {
    const banners = [...content.banners];
    banners[index] = { ...banners[index], [field]: value };
    setContent({ ...content, banners });
  };

  const addBanner = () => {
    setContent({
      ...content,
      banners: [
        ...content.banners,
        {
          id: Date.now().toString(),
          title: 'New Banner',
          subtitle: 'Banner description',
          buttonText: 'Shop Now',
          buttonLink: '/shop',
          gradient: gradients[0],
          imageUrl: '',
          videoUrl: '',
          mediaType: 'gradient',
          active: true,
        },
      ],
    });
  };

  const removeBanner = (index: number) =>
    setContent({ ...content, banners: content.banners.filter((_, i) => i !== index) });

  // ── New Arrival Banner helpers ───────────────────────────────────────────────

  const updateNewArrivalBanner = (index: number, field: string, value: string | boolean) => {
    const newArrivalBanners = [...content.newArrivalBanners];
    newArrivalBanners[index] = { ...newArrivalBanners[index], [field]: value };
    setContent({ ...content, newArrivalBanners });
  };

  const addNewArrivalBanner = () => {
    setContent({
      ...content,
      newArrivalBanners: [
        ...(content.newArrivalBanners ?? []),
        {
          id: Date.now().toString(),
          title: 'New Arrival Banner',
          subtitle: 'Banner description',
          buttonText: 'Shop Now',
          buttonLink: '/new-arrivals',
          gradient: gradients[0],
          imageUrl: '',
          videoUrl: '',
          mediaType: 'gradient',
          active: true,
        },
      ],
    });
  };

  const removeNewArrivalBanner = (index: number) =>
    setContent({
      ...content,
      newArrivalBanners: (content.newArrivalBanners ?? []).filter((_, i) => i !== index),
    });

  // ── Sale Banner helpers ───────────────────────────────────────────────
  const updateSaleBanner = (index: number, field: string, value: string | boolean) => {
    const saleBanners = [...(content.saleBanners ?? [])];
    saleBanners[index] = { ...saleBanners[index], [field]: value };
    setContent({ ...content, saleBanners });
  };

  const addSaleBanner = () => {
    setContent({
      ...content,
      saleBanners: [
        ...(content.saleBanners ?? []),
        {
          id: Date.now().toString(),
          title: 'Sale Banner',
          subtitle: 'Limited time offers',
          buttonText: 'Shop Sale',
          buttonLink: '/sale',
          gradient: gradients[0],
          imageUrl: '',
          videoUrl: '',
          mediaType: 'gradient',
          active: true,
        },
      ],
    });
  };

  const removeSaleBanner = (index: number) =>
    setContent({
      ...content,
      saleBanners: (content.saleBanners ?? []).filter((_, i) => i !== index),
    });

  // ── Announcement helpers ─────────────────────────────────────────────────────

  const updateAnnouncement = (field: string, value: unknown) => {
    setContent({
      ...content,
      announcement: { ...content.announcement, [field]: value },
    });
  };

  const updateAnnouncementMessage = (index: number, value: string) => {
    const updated = [...messages];
    updated[index] = value;
    updateAnnouncement('messages', updated);
  };

  const addAnnouncementMessage = () =>
    updateAnnouncement('messages', [...messages, 'New announcement']);

  const removeAnnouncementMessage = (index: number) =>
    updateAnnouncement('messages', messages.filter((_, i) => i !== index));

  // ── Save handler ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setUploading(true);
    setUploadError('');
    let updatedContent = { ...content };

    try {
      // Step 1: Upload hero image if selected
      if (heroFile) {
        const url = await uploadContentMedia(heroFile, 'hero', 'image');
        updatedContent = { ...updatedContent, heroImageUrl: url };
      }

      // Step 1b: Upload mobile hero crop if selected
      if (heroFileMobile) {
        const mobileUrl = await uploadContentMedia(heroFileMobile, 'hero-mobile', 'image');
        updatedContent = { ...updatedContent, heroImageUrlMobile: mobileUrl };
      }

      // Step 2: Upload homepage banner images + videos
      const updatedBanners = [...updatedContent.banners];
      for (const [bannerId, file] of Object.entries(bannerFiles)) {
        const url = await uploadContentMedia(file, 'banners', 'image');
        const idx = updatedBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedBanners[idx] = { ...updatedBanners[idx], imageUrl: url };
      }
      for (const [bannerId, file] of Object.entries(bannerVideoFiles)) {
        const url = await uploadContentMedia(file, 'banners', 'video');
        const idx = updatedBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedBanners[idx] = { ...updatedBanners[idx], videoUrl: url };
      }
      for (const [bannerId, file] of Object.entries(bannerMobileFiles)) {
        const url = await uploadContentMedia(file, 'banners-mobile', 'image');
        const idx = updatedBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedBanners[idx] = { ...updatedBanners[idx], imageUrlMobile: url };
      }
      updatedContent = { ...updatedContent, banners: updatedBanners };

      // Step 3: Upload new arrival banner images + videos
      const updatedNewArrivalBanners = [...updatedContent.newArrivalBanners];
      for (const [bannerId, file] of Object.entries(newArrivalBannerFiles)) {
        const url = await uploadContentMedia(file, 'new-arrival-banners', 'image');
        const idx = updatedNewArrivalBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedNewArrivalBanners[idx] = { ...updatedNewArrivalBanners[idx], imageUrl: url };
      }
      for (const [bannerId, file] of Object.entries(newArrivalBannerVideoFiles)) {
        const url = await uploadContentMedia(file, 'new-arrival-banners', 'video');
        const idx = updatedNewArrivalBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedNewArrivalBanners[idx] = { ...updatedNewArrivalBanners[idx], videoUrl: url };
      }
      for (const [bannerId, file] of Object.entries(newArrivalBannerMobileFiles)) {
        const url = await uploadContentMedia(file, 'new-arrival-banners-mobile', 'image');
        const idx = updatedNewArrivalBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedNewArrivalBanners[idx] = { ...updatedNewArrivalBanners[idx], imageUrlMobile: url };
      }
      updatedContent = { ...updatedContent, newArrivalBanners: updatedNewArrivalBanners };

      // Step 4: Upload sale banner images + videos
      const updatedSaleBanners = [...(updatedContent.saleBanners ?? [])];
      for (const [bannerId, file] of Object.entries(saleBannerFiles)) {
        const url = await uploadContentMedia(file, 'sale-banners', 'image');
        const idx = updatedSaleBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedSaleBanners[idx] = { ...updatedSaleBanners[idx], imageUrl: url };
      }
      for (const [bannerId, file] of Object.entries(saleBannerVideoFiles)) {
        const url = await uploadContentMedia(file, 'sale-banners', 'video');
        const idx = updatedSaleBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedSaleBanners[idx] = { ...updatedSaleBanners[idx], videoUrl: url };
      }
      for (const [bannerId, file] of Object.entries(saleBannerMobileFiles)) {
        const url = await uploadContentMedia(file, 'sale-banners-mobile', 'image');
        const idx = updatedSaleBanners.findIndex(b => b.id === bannerId);
        if (idx !== -1) updatedSaleBanners[idx] = { ...updatedSaleBanners[idx], imageUrlMobile: url };
      }
      updatedContent = { ...updatedContent, saleBanners: updatedSaleBanners };

      // Step 5: Save to Supabase via store (handles upsert + local state update)
      await saveContent(updatedContent);

      // Step 6: Clean up local file state
      setHeroFile(null);
      setHeroPreview('');
      setBannerFiles({});
      setBannerPreviews({});
      setBannerVideoFiles({});
      setBannerVideoPreviews({});
      setNewArrivalBannerFiles({});
      setNewArrivalBannerPreviews({});
      setNewArrivalBannerVideoFiles({});
      setNewArrivalBannerVideoPreviews({});
      setSaleBannerFiles({});
      setSaleBannerPreviews({});
      setSaleBannerVideoFiles({});
      setSaleBannerVideoPreviews({});

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isStorageError = msg.toLowerCase().includes('upload') || msg.toLowerCase().includes('storage');
      setUploadError(
        isStorageError
          ? `Media upload failed: ${msg}. Check Supabase/Cloudinary permissions (and that video uploads are enabled on your Cloudinary upload preset).`
          : `Save failed: ${msg}. Check Supabase table permissions for site_content.`,
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Reusable banner-section renderer (used for Banner / New Arrival / Sale) ──
  const renderBannerSection = (
    sectionTitle: string,
    banners: BannerLike[] & { title: string; subtitle: string; buttonText: string; buttonLink: string; active: boolean }[],
    handlers: {
      update: (index: number, field: string, value: string | boolean) => void;
      add: () => void;
      remove: (index: number) => void;
    },
    imagePreviews: Record<string, string>,
    setImageFiles: React.Dispatch<React.SetStateAction<Record<string, File>>>,
    setImagePreviews: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    videoPreviews: Record<string, string>,
    setVideoFiles: React.Dispatch<React.SetStateAction<Record<string, File>>>,
    setVideoPreviews: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    mobilePreviews: Record<string, string>,
    setMobileFiles: React.Dispatch<React.SetStateAction<Record<string, File>>>,
    setMobilePreviews: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    // Desktop crop shape is only overridden for the Banner Slider (to match the
    // Hero: 1920×840). New Arrival / Sale desktop crops are left as-is.
    desktopCropAspect: number = DEFAULT_DESKTOP_ASPECT,
  ) => (
    <div className="glass-card rounded-2xl p-6 mb-6">
      <SectionHeader
        title={`${sectionTitle} · ${banners.length} ${banners.length === 1 ? 'banner' : 'banners'}`}
        action={<Button size="sm" onClick={handlers.add}><Plus size={14} /> Add Banner</Button>}
      />

      <div className="space-y-4">
        {banners.map((banner, index) => {
          const mediaType = getBannerMediaType(banner);
          const livePreviewStyle =
            mediaType === 'video' && (videoPreviews[banner.id] || banner.videoUrl)
              ? undefined // video shown via <video> tag below, not as a bg-image
              : mediaType === 'image' && (imagePreviews[banner.id] || banner.imageUrl)
                ? {
                  backgroundImage: `url(${imagePreviews[banner.id] || banner.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
                : { background: banner.gradient };

          return (
            <div key={banner.id} className="border border-blush/25 rounded-xl overflow-hidden bg-white/40 hover:shadow-sm transition-shadow">
              {sectionTitle === 'New Arrival Page Banners' || sectionTitle === 'Sale Page Banners' ? (
                <div className="relative">
                  <div className="pointer-events-none scale-[0.6] origin-top-left w-[166%]">
                    {sectionTitle === 'New Arrival Page Banners' ? (
                      <NewArrivalsHero
                        banner={{
                          title: banner.title,
                          subtitle: banner.subtitle,
                          imageUrl: imagePreviews[banner.id] || banner.imageUrl,
                          imageUrlMobile: mobilePreviews[banner.id] || banner.imageUrlMobile,
                          videoUrl: videoPreviews[banner.id] || banner.videoUrl,
                          mediaType,
                          gradient: banner.gradient,
                        }}
                      />
                    ) : (
                      <SaleHero
                        banner={{
                          title: banner.title,
                          subtitle: banner.subtitle,
                          imageUrl: imagePreviews[banner.id] || banner.imageUrl,
                          imageUrlMobile: mobilePreviews[banner.id] || banner.imageUrlMobile,
                          videoUrl: videoPreviews[banner.id] || banner.videoUrl,
                          mediaType,
                          gradient: banner.gradient,
                        }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handlers.remove(index)}
                    className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/60 hover:bg-red-500 hover:scale-110 shadow-lg ring-1 ring-white/30 transition-all"
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="h-20 flex items-center px-6 relative overflow-hidden" style={livePreviewStyle}>
                  {mediaType === 'video' && (videoPreviews[banner.id] || banner.videoUrl) && (
                    <video
                      src={videoPreviews[banner.id] || banner.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  )}
                  <div className="relative flex-1 bg-white/40 backdrop-blur-sm rounded-lg px-3 py-1">
                    <p className="font-medium text-charcoal text-sm">{banner.title}</p>
                    <p className="text-xs text-[#6B5B55]">{banner.subtitle.substring(0, 50)}</p>
                  </div>
                  <button onClick={() => handlers.remove(index)} className="relative p-1.5 rounded-lg hover:bg-white/50 ml-2">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              )}

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#6B5B55]/70 uppercase tracking-wide">
                    Banner {index + 1}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {banner.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Title" value={banner.title} onChange={e => handlers.update(index, 'title', e.target.value)} />
                  <Input label="Button Text" value={banner.buttonText} onChange={e => handlers.update(index, 'buttonText', e.target.value)} />
                  <Input label="Button Link" value={banner.buttonLink} onChange={e => handlers.update(index, 'buttonLink', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Subtitle</label>
                  <input
                    value={banner.subtitle}
                    onChange={e => handlers.update(index, 'subtitle', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Background Media</label>
                  <MediaTypeToggle
                    value={mediaType}
                    onChange={v => handlers.update(index, 'mediaType', v)}
                  />
                </div>

                {mediaType === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">
                      Desktop Image
                      {sectionTitle === 'Banner Slider' && (
                        <span className="ml-1.5 font-normal text-[#6B5B55]/60">— 1920 × 840px</span>
                      )}
                    </label>
                    <MediaDropzone
                      accept="image/*"
                      cropAspect={desktopCropAspect}
                      currentUrl={banner.imageUrl}
                      preview={imagePreviews[banner.id]}
                      onFile={file => {
                        setImageFiles(prev => ({ ...prev, [banner.id]: file }));
                        setImagePreviews(prev => ({ ...prev, [banner.id]: URL.createObjectURL(file) }));
                      }}
                      onRemoveCurrent={() => handlers.update(index, 'imageUrl', '')}
                    />
                  </div>
                )}

                {mediaType === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">
                      Mobile Crop <span className="font-normal text-[#6B5B55]/70">— optional, 1440 × 810px</span>
                    </label>
                    <MediaDropzone
                      accept="image/*"
                      cropAspect={MOBILE_BANNER_ASPECT}
                      currentUrl={banner.imageUrlMobile}
                      preview={mobilePreviews[banner.id]}
                      onFile={file => {
                        setMobileFiles(prev => ({ ...prev, [banner.id]: file }));
                        setMobilePreviews(prev => ({ ...prev, [banner.id]: URL.createObjectURL(file) }));
                      }}
                      onRemoveCurrent={() => handlers.update(index, 'imageUrlMobile', '')}
                    />
                  </div>
                )}

                {mediaType === 'video' && (
                  <MediaDropzone
                    accept="video/*"
                    isVideo
                    currentUrl={banner.videoUrl}
                    preview={videoPreviews[banner.id]}
                    onFile={file => {
                      setVideoFiles(prev => ({ ...prev, [banner.id]: file }));
                      setVideoPreviews(prev => ({ ...prev, [banner.id]: URL.createObjectURL(file) }));
                    }}
                    onRemoveCurrent={() => handlers.update(index, 'videoUrl', '')}
                  />
                )}

                {mediaType === 'gradient' && (
                  <div>
                    <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Gradient</label>
                    <div className="flex gap-2 flex-wrap">
                      {gradients.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handlers.update(index, 'gradient', g)}
                          className={`w-12 h-8 rounded-lg border-2 ${banner.gradient === g ? 'border-rose-gold' : 'border-transparent'}`}
                          style={{ background: g }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-blush/15">
                  <input type="checkbox" checked={banner.active} onChange={e => handlers.update(index, 'active', e.target.checked)} className="w-4 h-4 rounded accent-rose-gold mt-1" />
                  <span className="text-sm text-charcoal mt-1">Active (show on website)</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <Hint>Click <strong>Save Changes</strong> to upload media and apply all edits to the website.</Hint>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-blush/20">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">Content Editor</h1>
          <p className="text-[#6B5B55] text-sm mt-0.5">Manage homepage content without touching code</p>
        </div>
        <Button onClick={handleSave} disabled={uploading}>
          {uploading ? 'Uploading...' : saved ? '✓ Saved!' : <><Save size={16} /> Save Changes</>}
        </Button>
      </div>

      {uploadError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {uploadError}
        </div>
      )}

      {/* ── Announcement Bar ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader
          icon={<Megaphone size={16} />}
          title="Announcement Bar"
          action={
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcement?.enabled ?? false}
                onChange={e => updateAnnouncement('enabled', e.target.checked)}
                className="w-4 h-4 rounded accent-rose-gold"
              />
              <span className="text-sm text-charcoal">Enabled</span>
            </label>
          }
        />

        {/* Live Preview */}
        <div
          className="rounded-xl overflow-hidden mb-4 h-10 flex items-center justify-center px-4"
          style={{ backgroundColor: content.announcement?.bgColor ?? '#000', color: content.announcement?.textColor ?? '#fff' }}
        >
          <p className="text-sm text-center" style={{ fontWeight: content.announcement?.bold ? 600 : 500 }}>
            {messages[0] || 'Your announcement preview'}
          </p>
        </div>

        {/* Messages */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#6B5B55]">Messages</label>
            <Button size="sm" onClick={addAnnouncementMessage}><Plus size={12} /> Add Message</Button>
          </div>
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={msg}
                  onChange={e => updateAnnouncementMessage(idx, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  placeholder="Enter announcement text..."
                />
                <button onClick={() => removeAnnouncementMessage(idx)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Animation Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#6B5B55] mb-2">Animation Style</label>
          <div className="grid grid-cols-3 gap-2">
            {(['marquee', 'fade', 'static'] as const).map(anim => (
              <button
                key={anim}
                type="button"
                onClick={() => updateAnnouncement('animation', anim)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${content.announcement?.animation === anim
                  ? 'bg-rose-gold text-white'
                  : 'bg-blush-light/50 text-charcoal hover:bg-blush-light'
                  }`}
              >
                {anim === 'marquee' ? 'Scrolling' : anim === 'fade' ? 'Fade' : 'Static'}
              </button>
            ))}
          </div>
        </div>

        {/* Color Presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#6B5B55] mb-2">Color Theme</label>
          <div className="flex gap-2 flex-wrap">
            {announcementColorPresets.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => { updateAnnouncement('bgColor', preset.bg); updateAnnouncement('textColor', preset.text); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${content.announcement?.bgColor === preset.bg ? 'border-rose-gold scale-105' : 'border-transparent'}`}
                style={{ backgroundColor: preset.bg, color: preset.text }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Background Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={content.announcement?.bgColor ?? '#000000'} onChange={e => updateAnnouncement('bgColor', e.target.value)} className="w-12 h-10 rounded-lg border border-blush/30 cursor-pointer" />
              <input type="text" value={content.announcement?.bgColor ?? '#000000'} onChange={e => updateAnnouncement('bgColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-blush/30 bg-white/80 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Text Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={content.announcement?.textColor ?? '#ffffff'} onChange={e => updateAnnouncement('textColor', e.target.value)} className="w-12 h-10 rounded-lg border border-blush/30 cursor-pointer" />
              <input type="text" value={content.announcement?.textColor ?? '#ffffff'} onChange={e => updateAnnouncement('textColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-blush/30 bg-white/80 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={content.announcement?.bold ?? false} onChange={e => updateAnnouncement('bold', e.target.checked)} className="w-4 h-4 rounded accent-rose-gold" />
            <span className="text-sm text-charcoal">Bold text</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={content.announcement?.dismissible ?? false} onChange={e => updateAnnouncement('dismissible', e.target.checked)} className="w-4 h-4 rounded accent-rose-gold" />
            <span className="text-sm text-charcoal">Show close button</span>
          </label>
        </div>
      </div>

      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader
          icon={<Eye size={16} />}
          title="Hero Section"
          action={
            <button
              type="button"
              onClick={() => updateField('heroEnabled', !content.heroEnabled)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blush/30 bg-white/60 hover:bg-white/80 transition-colors"
            >
              {content.heroEnabled
                ? <ToggleRight size={20} className="text-rose-gold" />
                : <ToggleLeft size={20} className="text-[#6B5B55]" />}
              <span className="text-sm font-medium text-charcoal">
                {content.heroEnabled ? 'Visible' : 'Hidden'}
              </span>
            </button>
          }
        />

        <div className="space-y-4">
          <Input label="Hero Title" value={content.heroTitle} onChange={e => updateField('heroTitle', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Hero Subtitle</label>
            <textarea
              value={content.heroSubtitle}
              onChange={e => updateField('heroSubtitle', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 resize-none"
              rows={3}
            />
          </div>
          <Input label="Button Text" value={content.heroButtonText} onChange={e => updateField('heroButtonText', e.target.value)} />

          <div>
            <label className="text-sm font-medium text-[#6B5B55] mb-1.5 flex items-center gap-1.5">
              <Image size={14} /> Hero Background Image (Desktop)
            </label>
            <p className="text-xs text-[#6B5B55]/70 mb-2">
              1920 × 840px. Shown on tablets and desktop.
            </p>
            <MediaDropzone
              accept="image/*"
              cropAspect={DESKTOP_BANNER_ASPECT}
              currentUrl={content.heroImageUrl}
              preview={heroPreview}
              onFile={file => {
                setHeroFile(file);
                setHeroPreview(URL.createObjectURL(file));
              }}
              onRemoveCurrent={() => updateField('heroImageUrl', '')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#6B5B55] mb-1.5 flex items-center gap-1.5">
              <Image size={14} /> Hero Background Image (Mobile)
              <span className="text-xs font-normal text-[#6B5B55]/70">— optional</span>
            </label>
            <p className="text-xs text-[#6B5B55]/70 mb-2">
              1440 × 810px widescreen crop for phones, so the subject isn't cropped awkwardly.
              If left empty, the desktop image is reused (and repositioned to reduce cropping,
              but a dedicated upload looks much better).
            </p>
            <MediaDropzone
              accept="image/*"
              cropAspect={MOBILE_BANNER_ASPECT}
              currentUrl={content.heroImageUrlMobile}
              preview={heroPreviewMobile}
              onFile={file => {
                setHeroFileMobile(file);
                setHeroPreviewMobile(URL.createObjectURL(file));
              }}
              onRemoveCurrent={() => updateField('heroImageUrlMobile', '')}
            />
          </div>
        </div>

        {/* ── Hero Component Builder ──────────────────────────────────────────
            Drag the chips below to reposition Title / Subtitle / Buttons
            anywhere on the hero. A chip only appears here — and on the live
            site — when its matching field above actually has text. */}
        <div className="mt-6 pt-6 border-t border-blush/15">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#6B5B55]">
              Component Placement <span className="text-[#6B5B55]/70">(drag to position)</span>
            </label>
            <Button size="sm" onClick={addHeroExtraComponent}><Plus size={12} /> Add Component</Button>
          </div>

          <div
            ref={heroCanvasRef}
            className="relative w-full h-64 rounded-xl overflow-hidden border border-blush/30 select-none touch-none"
            style={
              heroPreview || content.heroImageUrl
                ? { backgroundImage: `url(${heroPreview || content.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg, #F4C2C2, #E6E6FA, #F7E7CE)' }
            }
          >
            {!content.heroEnabled && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <p className="text-white text-sm font-medium">Hero is hidden on website</p>
              </div>
            )}

            {content.heroTitle?.trim() && (
              <div
                onPointerDown={startHeroDrag('title')}
                style={{ left: `${heroLayout.title.x}%`, top: `${heroLayout.title.y}%`, transform: 'translate(0, -50%)' }}
                className="absolute cursor-move px-2 py-1 rounded bg-rose-gold/90 text-white text-xs font-semibold whitespace-nowrap shadow"
              >
                Title
              </div>
            )}
            {content.heroSubtitle?.trim() && (
              <div
                onPointerDown={startHeroDrag('subtitle')}
                style={{ left: `${heroLayout.subtitle.x}%`, top: `${heroLayout.subtitle.y}%`, transform: 'translate(0, -50%)' }}
                className="absolute cursor-move px-2 py-1 rounded bg-rose-gold/70 text-white text-xs font-semibold whitespace-nowrap shadow"
              >
                Subtitle
              </div>
            )}
            {content.heroButtonText?.trim() && (
              <div
                onPointerDown={startHeroDrag('buttons')}
                style={{ left: `${heroLayout.buttons.x}%`, top: `${heroLayout.buttons.y}%`, transform: 'translate(0, -50%)' }}
                className="absolute cursor-move px-2 py-1 rounded bg-charcoal/80 text-white text-xs font-semibold whitespace-nowrap shadow"
              >
                Buttons
              </div>
            )}

            {heroExtras.map(comp => (
              <div
                key={comp.id}
                onPointerDown={startHeroDrag(comp.id)}
                style={{ left: `${comp.position.x}%`, top: `${comp.position.y}%`, transform: 'translate(0, -50%)' }}
                className="absolute cursor-move flex items-center gap-1 px-2 py-1 rounded bg-white/90 border border-blush/40 text-charcoal text-xs whitespace-nowrap shadow"
              >
                {comp.type === 'button' ? <Type size={10} /> : <Type size={10} />}
                {comp.content.substring(0, 16) || 'Empty'}
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => removeHeroExtraComponent(comp.id)}
                  className="ml-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>

          {heroExtras.length > 0 && (
            <div className="mt-3 space-y-2">
              {heroExtras.map(comp => (
                <div key={comp.id} className="flex items-center gap-2">
                  <select
                    value={comp.type}
                    onChange={e => updateHeroExtra(comp.id, { type: e.target.value as 'text' | 'button' })}
                    className="px-2 py-2 rounded-lg border border-blush/30 bg-white/80 text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="button">Button</option>
                  </select>
                  <input
                    value={comp.content}
                    onChange={e => updateHeroExtra(comp.id, { content: e.target.value })}
                    placeholder={comp.type === 'button' ? 'Button label' : 'Text content'}
                    className="flex-1 px-3 py-2 rounded-lg border border-blush/30 bg-white/80 text-sm"
                  />
                  {comp.type === 'button' && (
                    <input
                      value={comp.link ?? ''}
                      onChange={e => updateHeroExtra(comp.id, { link: e.target.value })}
                      placeholder="/link-target"
                      className="flex-1 px-3 py-2 rounded-lg border border-blush/30 bg-white/80 text-sm"
                    />
                  )}
                  <button onClick={() => removeHeroExtraComponent(comp.id)} className="p-2 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Hint>Clearing Hero Title / Subtitle / Button Text above removes that chip here — and hides it on the live site.</Hint>
        </div>
      </div>

      {/* ── Section Titles ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="Section Titles" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Featured Title" value={content.featuredTitle} onChange={e => updateField('featuredTitle', e.target.value)} />
          <Input label="Featured Subtitle" value={content.featuredSubtitle} onChange={e => updateField('featuredSubtitle', e.target.value)} />
          <Input label="Trending Title" value={content.trendingTitle} onChange={e => updateField('trendingTitle', e.target.value)} />
          <Input label="Trending Subtitle" value={content.trendingSubtitle} onChange={e => updateField('trendingSubtitle', e.target.value)} />
          <Input label="Newsletter Title" value={content.newsletterTitle} onChange={e => updateField('newsletterTitle', e.target.value)} />
          <Input label="Newsletter Subtitle" value={content.newsletterSubtitle} onChange={e => updateField('newsletterSubtitle', e.target.value)} />
        </div>
      </div>

      {/* ── Banner Slider ────────────────────────────────────────────────────── */}
      {renderBannerSection(
        'Banner Slider',
        (content.banners ?? []) as any,
        { update: updateBanner, add: addBanner, remove: removeBanner },
        bannerPreviews, setBannerFiles, setBannerPreviews,
        bannerVideoPreviews, setBannerVideoFiles, setBannerVideoPreviews,
        bannerMobilePreviews, setBannerMobileFiles, setBannerMobilePreviews,
        DESKTOP_BANNER_ASPECT,
      )}

      {/* ── New Arrival Page Banners ─────────────────────────────────────────── */}
      {renderBannerSection(
        'New Arrival Page Banners',
        (content.newArrivalBanners ?? []) as any,
        { update: updateNewArrivalBanner, add: addNewArrivalBanner, remove: removeNewArrivalBanner },
        newArrivalBannerPreviews, setNewArrivalBannerFiles, setNewArrivalBannerPreviews,
        newArrivalBannerVideoPreviews, setNewArrivalBannerVideoFiles, setNewArrivalBannerVideoPreviews,
        newArrivalBannerMobilePreviews, setNewArrivalBannerMobileFiles, setNewArrivalBannerMobilePreviews,
      )}

      {/* ── Sale Page Banners ────────────────────────────────────────────────── */}
      {renderBannerSection(
        'Sale Page Banners',
        (content.saleBanners ?? []) as any,
        { update: updateSaleBanner, add: addSaleBanner, remove: removeSaleBanner },
        saleBannerPreviews, setSaleBannerFiles, setSaleBannerPreviews,
        saleBannerVideoPreviews, setSaleBannerVideoFiles, setSaleBannerVideoPreviews,
        saleBannerMobilePreviews, setSaleBannerMobileFiles, setSaleBannerMobilePreviews,
      )}
    </div>
  );
};
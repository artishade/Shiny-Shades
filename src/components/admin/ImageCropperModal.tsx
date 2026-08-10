/* ===================================================
   Admin Image Cropper Modal
   Reusable crop-before-upload UI for banner images.
   Used by: Banner Slider, New Arrival Banner, Sale
   Banner, and Hero Section image uploads.
   =================================================== */

import React, { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Button } from '@/components/ui';

interface ImageCropperModalProps {
    imageSrc: string;
    aspect: number; // width / height, e.g. 16/6 for wide banners
    onCancel: () => void;
    onCropDone: (croppedBlob: Blob, previewUrl: string) => void;
}

// ── Helper: crop the image on a canvas using pixel coordinates from react-easy-crop ──
const getCroppedImageBlob = (imageSrc: string, cropPixels: Area): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = cropPixels.width;
            canvas.height = cropPixels.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context unavailable'));
                return;
            }
            ctx.drawImage(
                image,
                cropPixels.x,
                cropPixels.y,
                cropPixels.width,
                cropPixels.height,
                0,
                0,
                cropPixels.width,
                cropPixels.height
            );
            canvas.toBlob(
                blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create cropped image blob'));
                },
                'image/jpeg',
                0.92
            );
        };
        image.onerror = () => reject(new Error('Failed to load image for cropping'));
    });
};

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
    imageSrc,
    aspect,
    onCancel,
    onCropDone,
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPx: Area) => {
        setCroppedAreaPixels(croppedAreaPx);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
            const previewUrl = URL.createObjectURL(blob);
            onCropDone(blob, previewUrl);
        } catch (err) {
            console.error('Crop failed:', err);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-blush/30">
                    <span className="text-base font-semibold text-charcoal">Adjust Crop Area</span>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1.5 rounded-full hover:bg-blush-light transition-colors"
                        aria-label="Cancel crop"
                    >
                        <X size={18} className="text-[#6B5B55]" />
                    </button>
                </div>

                {/* Cropper viewport */}
                <div className="relative w-full h-[420px] bg-charcoal">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        objectFit="contain"
                    />
                </div>

                {/* Zoom control + actions */}
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <ZoomOut size={16} className="text-[#6B5B55] flex-shrink-0" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={e => setZoom(parseFloat(e.target.value))}
                            className="w-full accent-rose-gold"
                        />
                        <ZoomIn size={16} className="text-[#6B5B55] flex-shrink-0" />
                    </div>

                    <p className="text-xs text-[#6B5B55]">
                        Drag the image to reposition. Use the slider to zoom. The highlighted area is exactly what will show on the live website.
                    </p>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2.5 rounded-xl border-2 border-blush/40 text-sm font-medium text-[#6B5B55] hover:border-rose-gold transition-colors"
                        >
                            Cancel
                        </button>
                        <Button onClick={handleConfirm} disabled={processing} className="flex-1 justify-center">
                            {processing ? 'Processing...' : <><Check size={16} /> Use This Crop</>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
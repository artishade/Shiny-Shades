import imageCompression from 'browser-image-compression';

export const uploadToCloudinary = async (file: File) => {

    const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: false,
        fileType: 'image/webp',
    });

    const formData = new FormData();

    formData.append('file', compressedFile);

    formData.append(
        'upload_preset',
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    );

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData,
        }
    );

    const data = await res.json();

    if (!data.secure_url) {
        throw new Error('Cloudinary upload failed');
    }

    return data.secure_url;
};

/**
 * Returns a Cloudinary-optimized version of a given image URL by injecting
 * automatic format + quality + resize transformations into the delivery URL.
 *
 * If the URL is not a Cloudinary URL (e.g. local placeholder, non-http string,
 * or already contains transformation params), it is returned unchanged so
 * existing behavior is never broken.
 *
 * Example:
 *   https://res.cloudinary.com/demo/image/upload/v123/sample.jpg
 *   -> https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600,c_limit/v123/sample.jpg
 */
export const getOptimizedImageUrl = (
    url: string | undefined | null,
    options?: { width?: number; height?: number; crop?: string }
): string => {
    if (!url || typeof url !== 'string') return '';
    if (!url.startsWith('http')) return url;

    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url; // Not a Cloudinary delivery URL — return as-is

    const { width, height, crop = 'limit' } = options || {};

    const transformParts = ['f_auto', 'q_auto'];
    if (width) transformParts.push(`w_${width}`);
    if (height) transformParts.push(`h_${height}`);
    transformParts.push(`c_${crop}`);

    const transformation = transformParts.join(',');

    const before = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);

    // Avoid double-injecting transformations if already present
    if (/^[a-z]_[^/]+\//i.test(after) && after.split('/')[0].includes(',')) {
        return url;
    }

    return `${before}${transformation}/${after}`;
};

/**
 * Default widths used to generate responsive srcset variants.
 * Covers small phones up to large desktop displays.
 */
const DEFAULT_SRCSET_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];

/**
 * Returns a Cloudinary `srcset` string containing multiple optimized
 * widths of the same image, each with f_auto + q_auto applied.
 *
 * If the URL is not a Cloudinary delivery URL, returns an empty string
 * so callers can safely omit the `srcset` attribute without breaking
 * existing <img src="..."> behavior.
 *
 * Example usage:
 *   <img
 *     src={getOptimizedImageUrl(url, { width: 800 })}
 *     srcSet={getResponsiveSrcSet(url)}
 *     sizes="(max-width: 768px) 100vw, 50vw"
 *   />
 */
export const getResponsiveSrcSet = (
    url: string | undefined | null,
    options?: { widths?: number[]; height?: number; crop?: string }
): string => {
    if (!url || typeof url !== 'string') return '';
    if (!url.startsWith('http')) return '';

    const marker = '/image/upload/';
    if (!url.includes(marker)) return '';

    const widths = options?.widths || DEFAULT_SRCSET_WIDTHS;

    return widths
        .map((w) => {
            const optimized = getOptimizedImageUrl(url, {
                width: w,
                height: options?.height,
                crop: options?.crop,
            });
            return `${optimized} ${w}w`;
        })
        .join(', ');
};

/**
 * Convenience helper returning a sensible default `sizes` attribute
 * for full-width-on-mobile, half-width-on-tablet, fraction-on-desktop
 * grid layouts commonly used for product cards.
 *
 * Pass a custom string directly to <img sizes="..."> if a layout needs
 * different breakpoints — this is just a reasonable shared default.
 */
export const DEFAULT_IMAGE_SIZES =
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
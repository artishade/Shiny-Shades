import assert from 'node:assert/strict';

// Test implementation directly with the exact same logic as src/lib/cloudinary.ts
const parseTransformParams = (segment) => {
    const paramsMap = new Map();
    if (!segment || (segment.startsWith('v') && /^v\d+$/.test(segment))) {
        return { paramsMap, isTransformSegment: false };
    }

    const parts = segment.split(',');
    const isTransformPattern = /^[a-z]{1,3}_[a-zA-Z0-9_:.-]+$/i;
    const allMatch = parts.every(part => isTransformPattern.test(part));

    if (!allMatch) {
        return { paramsMap, isTransformSegment: false };
    }

    for (const part of parts) {
        const prefix = part.split('_')[0];
        paramsMap.set(prefix, part);
    }

    return { paramsMap, isTransformSegment: true };
};

const getOptimizedImageUrl = (url, options) => {
    if (!url || typeof url !== 'string') return '';

    const opts = typeof options === 'number' ? { width: options } : options || {};
    const { width, height, crop, quality, format = 'auto', dpr } = opts;

    const marker = '/image/upload/';
    const markerIndex = url.indexOf(marker);

    if (markerIndex !== -1) {
        const prefix = url.slice(0, markerIndex + marker.length);
        const rest = url.slice(markerIndex + marker.length);

        const segments = rest.split('/');
        const firstSegment = segments[0] || '';
        const { paramsMap, isTransformSegment } = parseTransformParams(firstSegment);

        paramsMap.set('f', `f_${format}`);
        if (quality !== undefined) {
            paramsMap.set('q', `q_${quality}`);
        } else if (!paramsMap.has('q')) {
            paramsMap.set('q', 'q_auto');
        }

        if (width) {
            paramsMap.set('w', `w_${width}`);
        }
        if (height) {
            paramsMap.set('h', `h_${height}`);
        }
        if (crop) {
            paramsMap.set('c', `c_${crop}`);
        }
        if (dpr) {
            paramsMap.set('dpr', `dpr_${dpr}`);
        }

        const newTransformString = Array.from(paramsMap.values()).join(',');

        if (isTransformSegment) {
            const remainder = segments.slice(1).join('/');
            return `${prefix}${newTransformString}/${remainder}`;
        } else {
            return `${prefix}${newTransformString}/${rest}`;
        }
    }

    if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('/') ||
        url.startsWith('data:') ||
        url.startsWith('product-gradient')
    ) {
        return url;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'nrdmy8ir';
    const transformParts = [`f_${format}`];
    if (quality !== undefined) {
        transformParts.push(`q_${quality}`);
    } else {
        transformParts.push('q_auto');
    }
    if (width) transformParts.push(`w_${width}`);
    if (height) transformParts.push(`h_${height}`);
    if (crop) transformParts.push(`c_${crop}`);
    if (dpr) transformParts.push(`dpr_${dpr}`);

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformParts.join(',')}/${url.replace(/^\/+/, '')}`;
};

const cloudinaryLoader = ({ src, width, quality }) => {
    return getOptimizedImageUrl(src, { width, quality });
};

// 1. Basic URL without transformations
const res1 = cloudinaryLoader({
    src: 'https://res.cloudinary.com/nrdmy8ir/image/upload/v12345/shinyshades/dress.jpg',
    width: 640,
    quality: 80
});
console.log('Test 1 (basic):', res1);
assert.equal(res1, 'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_80,w_640/v12345/shinyshades/dress.jpg');

// 2. URL with existing crop and transformations
const res2 = cloudinaryLoader({
    src: 'https://res.cloudinary.com/nrdmy8ir/image/upload/c_fill,g_auto,h_500,w_300/v12345/shinyshades/dress.jpg',
    width: 800
});
console.log('Test 2 (preserve existing):', res2);
assert.equal(res2, 'https://res.cloudinary.com/nrdmy8ir/image/upload/c_fill,g_auto,h_500,w_800,f_auto,q_auto/v12345/shinyshades/dress.jpg');

// 3. getOptimizedImageUrl with numeric width
const res3 = getOptimizedImageUrl('https://res.cloudinary.com/nrdmy8ir/image/upload/v12345/shinyshades/dress.jpg', 750);
console.log('Test 3 (numeric width):', res3);
assert.equal(res3, 'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_750/v12345/shinyshades/dress.jpg');

// 4. Public ID
const res4 = cloudinaryLoader({
    src: 'shinyshades/banner.jpg',
    width: 1200
});
console.log('Test 4 (public ID):', res4);
assert.equal(res4, 'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_1200/shinyshades/banner.jpg');

// 5. Local asset pass-through
const res5 = cloudinaryLoader({
    src: '/images/logo.png',
    width: 200
});
console.log('Test 5 (local asset):', res5);
assert.equal(res5, '/images/logo.png');

console.log('\nAll tests passed successfully!');

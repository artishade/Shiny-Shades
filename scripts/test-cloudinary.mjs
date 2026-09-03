/**
 * Exercises the real src/lib/cloudinary.ts (Node strips the types natively).
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../src/lib/cloudinary.ts';

const BASE = 'https://res.cloudinary.com/nrdmy8ir/image/upload/v12345/shinyshades/dress.jpg';
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('injects f_auto/q_auto/w/c_limit before the version segment', () => {
  assert.equal(
    getOptimizedImageUrl(BASE, { width: 640 }),
    'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_640,c_limit/v12345/shinyshades/dress.jpg',
  );
});

test('honours height and an explicit crop mode', () => {
  assert.equal(
    getOptimizedImageUrl(BASE, { width: 400, height: 600, crop: 'fill' }),
    'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_400,h_600,c_fill/v12345/shinyshades/dress.jpg',
  );
});

test('defaults to c_limit with no options', () => {
  assert.equal(
    getOptimizedImageUrl(BASE),
    'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,c_limit/v12345/shinyshades/dress.jpg',
  );
});

test('leaves an already-transformed URL untouched', () => {
  const transformed =
    'https://res.cloudinary.com/nrdmy8ir/image/upload/c_fill,g_auto,h_500,w_300/v12345/shinyshades/dress.jpg';
  assert.equal(getOptimizedImageUrl(transformed, { width: 800 }), transformed);
});

test('passes non-Cloudinary and local URLs through unchanged', () => {
  assert.equal(getOptimizedImageUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(getOptimizedImageUrl('/web-app-manifest-512x512.png'), '/web-app-manifest-512x512.png');
});

test('returns an empty string for missing input', () => {
  assert.equal(getOptimizedImageUrl(''), '');
  assert.equal(getOptimizedImageUrl(null), '');
  assert.equal(getOptimizedImageUrl(undefined), '');
});

test('builds a srcSet with one descriptor per width', () => {
  assert.equal(
    getResponsiveSrcSet(BASE, { widths: [320, 640] }),
    'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_320,c_limit/v12345/shinyshades/dress.jpg 320w, ' +
      'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_640,c_limit/v12345/shinyshades/dress.jpg 640w',
  );
});

test('returns an empty srcSet for non-Cloudinary URLs so callers can omit the attribute', () => {
  assert.equal(getResponsiveSrcSet('/local.png'), '');
  assert.equal(getResponsiveSrcSet('https://example.com/a.jpg'), '');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`fail  ${name}\n      ${err.message}`);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);

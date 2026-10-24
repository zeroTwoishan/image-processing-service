import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { applyTransform, escapeXml } from '../src/services/transform.js';

// No server, no database: applyTransform is pure, so these tests only pass bytes in and check bytes out.

const RED = { r: 255, g: 0, b: 0 };
const solid = (width, height, background = RED) => sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();

// 2×2 PNG with four different corners: top-left red, top-right blue, bottom-left green, bottom-right white.
const corners = () =>
  sharp(Buffer.from([255, 0, 0, 0, 0, 255, 0, 255, 0, 255, 255, 255]), { raw: { width: 2, height: 2, channels: 3 } })
    .png()
    .toBuffer();

async function pixel(buffer, x, y) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

const size = async (buffer) => {
  const { width, height } = await sharp(buffer).metadata();
  return [width, height];
};

describe('applyTransform: geometry', () => {
  it('rotate 90 + resize 800×600 on a 3000×2000 photo gives exactly 800×600', async () => {
    const { buffer, meta } = await applyTransform(await solid(3000, 2000), { rotate: 90, resize: { width: 800, height: 600 } });
    expect(await size(buffer)).toEqual([800, 600]);
    expect([meta.width, meta.height]).toEqual([800, 600]);
  });

  it('never enlarges: resize 800×600 on a 400×300 image stays 400×300', async () => {
    const { buffer } = await applyTransform(await solid(400, 300), { resize: { width: 800, height: 600 } });
    expect(await size(buffer)).toEqual([400, 300]);
  });

  it('resize with one side keeps the aspect ratio', async () => {
    const { buffer } = await applyTransform(await solid(3000, 2000), { resize: { width: 600 } });
    expect(await size(buffer)).toEqual([600, 400]);
  });

  it('rotate 90 swaps width and height', async () => {
    const { buffer } = await applyTransform(await solid(300, 200), { rotate: 90 });
    expect(await size(buffer)).toEqual([200, 300]);
  });

  it('mirror swaps left and right; flip swaps top and bottom', async () => {
    const mirrored = (await applyTransform(await corners(), { mirror: true })).buffer;
    expect(await pixel(mirrored, 0, 0)).toEqual([0, 0, 255]); // blue moved to top-left

    const flipped = (await applyTransform(await corners(), { flip: true })).buffer;
    expect(await pixel(flipped, 0, 0)).toEqual([0, 255, 0]); // green moved to top-left
  });

  it('flips and mirrors AFTER rotating (Sharp itself would do them first)', async () => {
    // Corners turned 90° clockwise: blue red / white green. Flip that → white green / blue red; mirror → red blue / green white.
    const flipped = (await applyTransform(await corners(), { rotate: 90, flip: true })).buffer;
    expect(await pixel(flipped, 0, 0)).toEqual([255, 255, 255]);

    const mirrored = (await applyTransform(await corners(), { rotate: 90, mirror: true })).buffer;
    expect(await pixel(mirrored, 0, 0)).toEqual([255, 0, 0]);
  });

  it('crops the requested rectangle', async () => {
    const { buffer } = await applyTransform(await corners(), { crop: { x: 1, y: 1, width: 1, height: 1 } });
    expect(await size(buffer)).toEqual([1, 1]);
    expect(await pixel(buffer, 0, 0)).toEqual([255, 255, 255]); // the white bottom-right corner
  });
});

describe('applyTransform: crop check (measured after rotation)', () => {
  it('a crop that fits only the rotated frame is accepted', async () => {
    // 300×200 rotated 90° is 200×300, so a 200×300 crop fits exactly.
    const { buffer } = await applyTransform(await solid(300, 200), { rotate: 90, crop: { x: 0, y: 0, width: 200, height: 300 } });
    expect(await size(buffer)).toEqual([200, 300]);
  });

  it('a crop that fits the original but not the rotated frame is 400 INVALID_CROP', async () => {
    const attempt = applyTransform(await solid(300, 200), { rotate: 90, crop: { x: 0, y: 0, width: 300, height: 200 } });
    await expect(attempt).rejects.toMatchObject({ status: 400, code: 'INVALID_CROP', details: { width: 200, height: 300 } });
  });

  it('a crop past the edge is 400 INVALID_CROP, not a Sharp error', async () => {
    const attempt = applyTransform(await solid(100, 100), { crop: { x: 50, y: 0, width: 60, height: 10 } });
    await expect(attempt).rejects.toMatchObject({ code: 'INVALID_CROP' });
  });

  it('uses the upright size of a photo that still carries an EXIF rotation', async () => {
    // 400×300 stored sideways with "rotate 90°" (orientation 6): people see it as 300×400.
    const sideways = await sharp(await solid(400, 300)).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const { buffer } = await applyTransform(sideways, { crop: { x: 0, y: 0, width: 300, height: 400 } });
    expect(await size(buffer)).toEqual([300, 400]);
  });
});

describe('applyTransform: filters and watermark', () => {
  it('grayscale makes red, green and blue equal', async () => {
    const { buffer } = await applyTransform(await solid(10, 10), { filters: { grayscale: true } });
    const [r, g, b] = await pixel(buffer, 5, 5);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('sepia uses the standard matrix (pure red → brownish 100, 89, 69)', async () => {
    const { buffer } = await applyTransform(await solid(10, 10), { filters: { sepia: true }, format: 'png' });
    const actual = await pixel(buffer, 5, 5);
    // 0.393×255, 0.349×255, 0.272×255, give or take 1 for rounding
    [100, 89, 69].forEach((expected, i) => expect(Math.abs(actual[i] - expected)).toBeLessThanOrEqual(1));
  });

  it('renders a watermark of "<&>" in the bottom-right corner (escaped, so Sharp can parse it)', async () => {
    const black = await solid(400, 200, { r: 0, g: 0, b: 0 });
    const { buffer } = await applyTransform(black, { watermark: { text: '<&>' }, format: 'png' });

    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    let brightBottomRight = 0;
    let brightTopLeft = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels] < 128) continue;
        if (x > info.width / 2 && y > info.height / 2) brightBottomRight++;
        if (x < info.width / 2 && y < info.height / 2) brightTopLeft++;
      }
    }
    expect(brightBottomRight).toBeGreaterThan(50); // the text is there
    expect(brightTopLeft).toBe(0); // and nowhere else
  });

  it('escapeXml turns every XML special character into an entity', () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;');
  });
});

describe('applyTransform: output', () => {
  it('keeps the original format unless asked to change it', async () => {
    const jpeg = await sharp(await solid(40, 30)).jpeg().toBuffer();
    const kept = await applyTransform(jpeg, { rotate: 180 });
    expect(kept.meta).toMatchObject({ format: 'jpeg', ext: 'jpg', mimeType: 'image/jpeg' });
    expect((await sharp(kept.buffer).metadata()).format).toBe('jpeg');

    const converted = await applyTransform(jpeg, { format: 'webp' });
    expect(converted.meta).toMatchObject({ format: 'webp', ext: 'webp', mimeType: 'image/webp' });
    expect((await sharp(converted.buffer).metadata()).format).toBe('webp');
  });

  it('lower quality gives a smaller file', async () => {
    // Noise doesn't compress, so quality makes a visible difference in size.
    const noisy = await sharp(Buffer.from(Array.from({ length: 200 * 200 * 3 }, () => Math.floor(Math.random() * 256))), {
      raw: { width: 200, height: 200, channels: 3 },
    })
      .png()
      .toBuffer();
    const low = await applyTransform(noisy, { format: 'jpeg', compress: { quality: 20 } });
    const high = await applyTransform(noisy, { format: 'jpeg', compress: { quality: 95 } });
    expect(low.meta.size).toBeLessThan(high.meta.size);
  });

  it('flattens an animated GIF to its first frame', async () => {
    const frames = await Promise.all([RED, { r: 0, g: 0, b: 255 }].map((c) => solid(20, 10, c)));
    const gif = await sharp(frames, { join: { animated: true } }).gif().toBuffer();
    expect((await sharp(gif).metadata()).pages).toBe(2);

    const { buffer, meta } = await applyTransform(gif, { rotate: 180 });
    expect((await sharp(buffer).metadata()).pages ?? 1).toBe(1);
    expect([meta.width, meta.height]).toEqual([20, 10]); // one frame's size, not both stacked
  });
});

describe('applyTransform: invalid transforms', () => {
  it.each([
    ['an empty transform', {}],
    ['a transform that changes nothing', { rotate: 0, flip: false, filters: { grayscale: false } }],
    ['grayscale and sepia together', { filters: { grayscale: true, sepia: true } }],
  ])('%s is 400 INVALID_TRANSFORM', async (_, t) => {
    await expect(applyTransform(await solid(10, 10), t)).rejects.toMatchObject({ status: 400, code: 'INVALID_TRANSFORM' });
  });
});

it('stays pure: transform.js imports neither Express nor Mongoose', async () => {
  const source = await fs.readFile(new URL('../src/services/transform.js', import.meta.url), 'utf8');
  expect(source).not.toMatch(/from ['"](express|mongoose)/);
});

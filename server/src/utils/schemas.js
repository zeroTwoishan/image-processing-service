import { z } from 'zod';

const bytes = (s) => Buffer.byteLength(s, 'utf8');

export const credentialsSchema = z.object({
  // trim + lowercase run first, so " Ishan " is checked (and stored) as "ishan".
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3–30 characters: letters, numbers or _'),
  // Bytes, not characters: bcrypt ignores everything after byte 72, and "é" is 2 bytes, an emoji 4.
  password: z
    .string()
    .refine((p) => bytes(p) >= 8, 'Password must be at least 8 characters')
    .refine((p) => bytes(p) <= 72, 'Password is too long (max 72 bytes)'),
});

// Login only needs something to check. Applying the register rules here would turn a wrong (short) password
// into a vague 400 instead of "Wrong username or password", and would lock out old accounts if the rules ever change.
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

// JSON numbers may arrive as strings from some clients, so coerce them; booleans stay strict, because
// coercing the string "false" gives true. strictObject rejects unknown keys, so a typo like "rotat" is a 400,
// not an edit that silently does nothing.
const int = (min, max) => z.coerce.number().int().min(min).max(max);
const MAX_SIDE = 10_000; // resize target; resize never enlarges, so this only stops absurd input
// Crop has no cap of its own: a 25 MP panorama can be 12000 px wide, and applyTransform already checks
// that the crop fits the (rotated) image, which is the real limit.
const px = (min) => z.coerce.number().int().min(min);

export const transformSchema = z.strictObject({
  transformations: z.strictObject({
    // Right angles only: any other angle leaves empty corners that would need a fill colour.
    rotate: z.coerce
      .number()
      .refine((r) => [0, 90, 180, 270].includes(r), 'Rotate must be 0, 90, 180 or 270')
      .optional(),
    flip: z.boolean().optional(),
    mirror: z.boolean().optional(),
    crop: z.strictObject({ x: px(0), y: px(0), width: px(1), height: px(1) }).optional(),
    resize: z
      .strictObject({ width: int(1, MAX_SIDE).optional(), height: int(1, MAX_SIDE).optional() })
      .refine((r) => r.width || r.height, 'Give a width, a height or both')
      .optional(),
    filters: z.strictObject({ grayscale: z.boolean().optional(), sepia: z.boolean().optional() }).optional(),
    watermark: z.strictObject({ text: z.string().trim().min(1, 'Enter the watermark text').max(100) }).optional(),
    format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
    compress: z.strictObject({ quality: int(1, 100) }).optional(),
  }),
});

// A display and download name, not a path: no slashes or control characters. The extension isn't part of it;
// the server adds the real one from the stored format, so a rename can't make a JPEG claim to be ".png".
export const renameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(200, 'Use at most 200 characters')
    .refine((n) => !/[/\\\p{Cc}]/u.test(n), 'Names can’t contain slashes or control characters'),
});

// Query strings are always text ("2"), so coerce to numbers. A cap on limit stops ?limit=100000 from
// pulling a user's whole collection in one request.
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

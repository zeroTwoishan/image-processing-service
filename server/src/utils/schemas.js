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

// Query strings are always text ("2"), so coerce to numbers. A cap on limit stops ?limit=100000 from
// pulling a user's whole collection in one request.
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

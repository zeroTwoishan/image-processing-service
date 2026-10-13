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

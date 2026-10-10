import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  MONGO_URI: z.string().min(1),
  // Anyone who knows this secret can forge a login token for any user, so it must be long and random.
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
});

const result = schema.safeParse(process.env);

// Fail fast: crash at boot with a clear message instead of failing on the first request that needs the value.
if (!result.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const env = result.data;

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  LINE_CLIENT_ID: z.string().min(1),
  LINE_CLIENT_SECRET: z.string().min(1),
  MANAGER_LINE_IDS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    throw new Error('Missing required environment variables');
  }

  return result.data;
}

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        throw new Error('PORT must be a valid number');
      }
      return parsed;
    }),
  NODE_ENV: z.enum(['development', 'production'] as const).default('development'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Environment configuration validation failed:');
  result.error.issues.forEach((issue) => {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = result.data;

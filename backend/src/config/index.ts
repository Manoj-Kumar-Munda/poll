import { env } from "./env.config.js";

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  mongodbUri: env.MONGODB_URI,
  betterAuthSecret: env.BETTER_AUTH_SECRET,
  betterAuthUrl: env.BETTER_AUTH_URL,
  clientUrl: env.CLIENT_URL,
  resendApiKey: env.RESEND_API_KEY,
  corsOrigin: env.CORS_ORIGIN,
} as const;

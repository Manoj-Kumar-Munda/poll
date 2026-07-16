import type { auth } from "../modules/auth/auth.js";

type BetterAuthSession = typeof auth.$Infer.Session;

declare global {
  namespace Express {
    interface Request {
      session?: BetterAuthSession["session"];
      user?: BetterAuthSession["user"];
    }
  }
}

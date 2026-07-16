import { auth } from "./auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { ApiError } from "@/utils/ApiError.js";

/**
 * Middleware to require authentication for routes.
 * Verifies the host's session token and attaches user and session info to the Request object.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw new ApiError(401, "Unauthorized: Host session is invalid or expired");
  }

  req.session = session.session;
  req.user = session.user;

  next();
});

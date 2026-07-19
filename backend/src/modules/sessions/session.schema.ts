import { z } from 'zod';

import { SESSION_STATUSES } from '@/constants/index.js';
import { objectIdRegex } from '@/utils/helpers.js';

export const createSessionParamsSchema = z.object({
  gameId: z.string().regex(objectIdRegex, 'Invalid game ID'),
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().regex(objectIdRegex, 'Invalid session ID'),
});

export const listSessionsQuerySchema = z.object({
  status: z.enum(SESSION_STATUSES).optional(),
  gameId: z.string().regex(objectIdRegex, 'Invalid game ID').optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

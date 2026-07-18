import { Router } from 'express';

import { requireAuth } from '@/modules/auth/index.js';
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
} from './session.controller.js';

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.post('/games/:gameId/sessions', createSession);
sessionRouter.get('/sessions', listSessions);
sessionRouter.get('/sessions/:sessionId', getSession);
sessionRouter.delete('/sessions/:sessionId', deleteSession);

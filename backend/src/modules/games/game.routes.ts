import { Router } from 'express';

import { requireAuth } from '@/modules/auth/index.js';
import { createGame, deleteGame, getGame, listGames, updateGame } from './game.controller.js';

export const gameRouter = Router();

gameRouter.use(requireAuth);
gameRouter.route('/').post(createGame).get(listGames);
gameRouter.route('/:gameId').get(getGame).patch(updateGame).delete(deleteGame);

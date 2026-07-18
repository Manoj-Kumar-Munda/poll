import { ApiError } from '@/utils/ApiError.js';
import { gameRepository } from './game.repository.js';

interface ListGamesParams {
  ownerId: string;
  search?: string;
  status?: string;
  sort?: string;
}

export const gameService = {
  async create(payload: Record<string, unknown>, ownerId: string) {
    return gameRepository.create({ ...payload, ownerId });
  },

  async list({ ownerId, search, status, sort }: ListGamesParams) {
    const filter: Record<string, unknown> = { ownerId };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const sortOrder: Record<string, 1 | -1> = { createdAt: sort === 'newest' ? -1 : 1 };
    return gameRepository.find(filter, sortOrder);
  },

  async getById(gameId: string, ownerId: string) {
    const game = await gameRepository.findOne({ _id: gameId, ownerId });
    if (!game) throw new ApiError(404, 'Game not found');
    return game;
  },

  async update(gameId: string, ownerId: string, payload: Record<string, unknown>) {
    const game = await gameRepository.findOneAndUpdate({ _id: gameId, ownerId }, payload);
    if (!game) throw new ApiError(404, 'Game not found');
    return game;
  },

  async delete(gameId: string, ownerId: string) {
    const game = await gameRepository.findOneAndDelete({ _id: gameId, ownerId });
    if (!game) throw new ApiError(404, 'Game not found');
    return game;
  },
};

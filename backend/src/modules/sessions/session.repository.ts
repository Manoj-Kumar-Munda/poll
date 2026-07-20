import { Session, type SessionDocument } from './session.model.js';

export const sessionRepository = {
  create(data: Partial<SessionDocument>) {
    return Session.create(data);
  },

  findById(id: string) {
    return Session.findById(id);
  },

  findByRoomCode(roomCode: string) {
    return Session.findOne({ roomCode });
  },

  findByOwner(
    ownerId: string,
    options: {
      status?: string;
      gameId?: string;
      sort?: string;
    },
  ) {
    const filter: Record<string, unknown> = { ownerId };
    if (options.status) filter.status = options.status;
    if (options.gameId) filter.gameId = options.gameId;

    const sortOrder: Record<string, 1 | -1> = {
      createdAt: options.sort === 'oldest' ? 1 : -1,
    };

    return Session.find(filter).sort(sortOrder);
  },

  findByIdAndDelete(id: string) {
    return Session.findByIdAndDelete(id);
  },

  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Partial<SessionDocument>,
  ) {
    return Session.findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    );
  },
};

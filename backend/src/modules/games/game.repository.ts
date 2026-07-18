import { Game, type GameDocument } from "./game.model.js";

export const gameRepository = {
  create(data: Partial<GameDocument>) {
    return Game.create(data);
  },

  find(filter: Record<string, unknown>, sort: Record<string, 1 | -1>) {
    return Game.find(filter).sort(sort);
  },

  findById(id: string) {
    return Game.findById(id);
  },

  findOne(filter: Record<string, unknown>) {
    return Game.findOne(filter);
  },

  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Partial<GameDocument>,
  ) {
    return Game.findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    );
  },

  findOneAndDelete(filter: Record<string, unknown>) {
    return Game.findOneAndDelete(filter);
  },
};

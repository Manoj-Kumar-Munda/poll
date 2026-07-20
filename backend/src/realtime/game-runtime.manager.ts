import type { GameRuntime, RuntimeParticipant } from "./game-runtime.types.js";

export class GameRuntimeManager {
  private readonly runtimes = new Map<string, GameRuntime>();

  create(sessionId: string): GameRuntime {
    const existingRuntime = this.runtimes.get(sessionId);
    if (existingRuntime) return existingRuntime;

    const runtime: GameRuntime = {
      sessionId,
      participants: new Map<string, RuntimeParticipant>(),
      currentQuestion: null,
      submissions: {},
      leaderboard: {},
      statistics: {},
    };

    this.runtimes.set(sessionId, runtime);
    return runtime;
  }

  get(sessionId: string): GameRuntime | undefined {
    return this.runtimes.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.runtimes.has(sessionId);
  }

  remove(sessionId: string): boolean {
    return this.runtimes.delete(sessionId);
  }

  getAll(): GameRuntime[] {
    return Array.from(this.runtimes.values());
  }
}

export const gameRuntimeManager = new GameRuntimeManager();

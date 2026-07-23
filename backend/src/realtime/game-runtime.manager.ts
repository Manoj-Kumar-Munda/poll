import type { GameRuntime, RuntimeParticipant } from "./game-runtime.types.js";

/** Stores live in-memory state for active game sessions. */
export class GameRuntimeManager {
  private readonly runtimes = new Map<string, GameRuntime>();

  /** Creates or returns the runtime for a session. */
  create(sessionId: string): GameRuntime {
    const existingRuntime = this.runtimes.get(sessionId);
    if (existingRuntime) return existingRuntime;

    const runtime: GameRuntime = {
      sessionId,
      participants: new Map<string, RuntimeParticipant>(),
      currentQuestion: null,
      finalizingQuestionId: undefined,
      submissions: new Map(),
    };

    this.runtimes.set(sessionId, runtime);
    return runtime;
  }

  /** Returns a session runtime when it exists. */
  get(sessionId: string): GameRuntime | undefined {
    return this.runtimes.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.runtimes.has(sessionId);
  }

  /** Removes a session runtime from memory. */
  remove(sessionId: string): boolean {
    return this.runtimes.delete(sessionId);
  }

  getAll(): GameRuntime[] {
    return Array.from(this.runtimes.values());
  }
}

export const gameRuntimeManager = new GameRuntimeManager();

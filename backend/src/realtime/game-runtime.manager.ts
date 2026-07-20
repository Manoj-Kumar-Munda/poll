import type {
  GameRuntime,
  RuntimeLeaderboard,
  RuntimeParticipant,
  RuntimeQuestion,
  RuntimeStatistics,
  RuntimeSubmission,
} from "./game-runtime.types.js";

export class GameRuntimeManager {
  private readonly runtimes = new Map<string, GameRuntime>();

  create(sessionId: string): GameRuntime {
    const existingRuntime = this.runtimes.get(sessionId);
    if (existingRuntime) return existingRuntime;

    const runtime: GameRuntime = {
      sessionId,
      participants: new Map<string, RuntimeParticipant>(),
      currentQuestion: null as RuntimeQuestion | null,
      submissions: {} as RuntimeSubmission,
      leaderboard: {} as RuntimeLeaderboard,
      statistics: {} as RuntimeStatistics,
      timer: null,
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
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;

    if (runtime.timer) {
      clearTimeout(runtime.timer);
      runtime.timer = null;
    }

    runtime.participants.clear();
    runtime.currentQuestion = null;
    runtime.submissions = {} as RuntimeSubmission;
    runtime.leaderboard = {} as RuntimeLeaderboard;
    runtime.statistics = {} as RuntimeStatistics;

    return this.runtimes.delete(sessionId);
  }

  getAll(): GameRuntime[] {
    return Array.from(this.runtimes.values());
  }
}

export const gameRuntimeManager = new GameRuntimeManager();

import { describe, it, expect, beforeEach } from "vitest";
import { gameRuntimeManager } from "../../../realtime/game-runtime.manager.js";

describe("GameRuntimeManager", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    // Clear any existing runtimes before each test
    const allRuntimes = gameRuntimeManager.getAll();
    for (const runtime of allRuntimes) {
      gameRuntimeManager.remove(runtime.sessionId);
    }
  });

  it("should create a new game runtime state", () => {
    const runtime = gameRuntimeManager.create(sessionId);

    expect(runtime).toBeDefined();
    expect(runtime.sessionId).toBe(sessionId);
    expect(runtime.participants).toBeInstanceOf(Map);
    expect(runtime.currentQuestion).toBeNull();
    expect(runtime.submissions).toEqual({});
    expect(runtime.leaderboard).toEqual({});
    expect(runtime.statistics).toEqual({});
  });

  it("should retrieve an existing game runtime", () => {
    gameRuntimeManager.create(sessionId);
    const runtime = gameRuntimeManager.get(sessionId);

    expect(runtime).toBeDefined();
    expect(runtime?.sessionId).toBe(sessionId);
  });

  it("should check if a game runtime exists", () => {
    expect(gameRuntimeManager.has(sessionId)).toBe(false);

    gameRuntimeManager.create(sessionId);
    expect(gameRuntimeManager.has(sessionId)).toBe(true);
  });

  it("should remove a game runtime successfully", () => {
    gameRuntimeManager.create(sessionId);
    expect(gameRuntimeManager.has(sessionId)).toBe(true);

    const removed = gameRuntimeManager.remove(sessionId);
    expect(removed).toBe(true);
    expect(gameRuntimeManager.has(sessionId)).toBe(false);
  });

  it("should return false when removing a non-existent runtime", () => {
    const removed = gameRuntimeManager.remove("non-existent");
    expect(removed).toBe(false);
  });

  it("should return all active runtimes", () => {
    expect(gameRuntimeManager.getAll()).toHaveLength(0);

    gameRuntimeManager.create("session-1");
    gameRuntimeManager.create("session-2");

    const all = gameRuntimeManager.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.sessionId)).toContain("session-1");
    expect(all.map((r) => r.sessionId)).toContain("session-2");
  });
});

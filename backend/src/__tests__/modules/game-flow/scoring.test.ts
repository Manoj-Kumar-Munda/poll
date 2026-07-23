import { describe, expect, it } from "vitest";
import {
  answersMatch,
  rankParticipants,
  scoreSubmission,
} from "../../../modules/game-flow/scoring.service.js";

const startedAt = new Date("2026-01-01T00:00:00.000Z");
const endsAt = new Date("2026-01-01T00:00:10.000Z");

const makeSubmission = (submittedAt: string, isCorrect = true) => ({
  questionId: "question-1",
  participantId: "participant-1",
  answer: "yes",
  isCorrect,
  submittedAt: new Date(submittedAt),
  responseTimeMs: 0,
  scoreAwarded: 0,
});

describe("scoring service", () => {
  it("awards more points to faster correct answers", () => {
    const fast = scoreSubmission({
      submission: makeSubmission("2026-01-01T00:00:02.000Z"),
      startedAt,
      endsAt,
      pointsPerQuestion: 100,
    });
    const slow = scoreSubmission({
      submission: makeSubmission("2026-01-01T00:00:08.000Z"),
      startedAt,
      endsAt,
      pointsPerQuestion: 100,
    });

    expect(fast).toEqual({ responseTimeMs: 2000, scoreAwarded: 80 });
    expect(slow).toEqual({ responseTimeMs: 8000, scoreAwarded: 20 });
  });

  it("awards zero for incorrect answers and preserves zero-point games", () => {
    expect(
      scoreSubmission({
        submission: makeSubmission("2026-01-01T00:00:01.000Z", false),
        startedAt,
        endsAt,
        pointsPerQuestion: 100,
      }).scoreAwarded,
    ).toBe(0);
    expect(
      scoreSubmission({
        submission: makeSubmission("2026-01-01T00:00:01.000Z"),
        startedAt,
        endsAt,
        pointsPerQuestion: 0,
      }).scoreAwarded,
    ).toBe(0);
  });

  it("normalizes answers before comparing them", () => {
    expect(answersMatch(" YES ", "yes")).toBe(true);
    expect(answersMatch("no", "yes")).toBe(false);
  });

  it("ranks by score, response time, and participant ID", () => {
    const participants = [
      {
        participantId: "b",
        name: "B",
        socketId: null,
        connected: false,
        hasAnsweredCurrentQuestion: false,
        stats: {
          score: 10,
          correctAnswers: 1,
          answeredQuestions: 1,
          totalResponseTimeMs: 200,
          streak: 0,
          rank: 0,
        },
      },
      {
        participantId: "a",
        name: "A",
        socketId: null,
        connected: false,
        hasAnsweredCurrentQuestion: false,
        stats: {
          score: 10,
          correctAnswers: 1,
          answeredQuestions: 1,
          totalResponseTimeMs: 100,
          streak: 0,
          rank: 0,
        },
      },
    ];

    expect(
      rankParticipants(participants).map(
        (participant) => participant.participantId,
      ),
    ).toEqual(["a", "b"]);
    expect(participants[0].stats.rank).toBe(2);
    expect(participants[1].stats.rank).toBe(1);
  });
});

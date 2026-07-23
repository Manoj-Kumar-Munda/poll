import type {
  RuntimeParticipant,
  RuntimeSubmission,
} from "@/realtime/game-runtime.types.js";

/** Provides answer matching, score calculation, and leaderboard ranking. */

export interface ScoreSubmissionInput {
  submission: RuntimeSubmission;
  startedAt: Date;
  endsAt: Date;
  pointsPerQuestion: number;
}

export interface ScoreSubmissionResult {
  responseTimeMs: number;
  scoreAwarded: number;
}

/** Converts an answer to a comparable normalized string. */
export const normalizeAnswer = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase();

/** Compares a submitted answer with the configured correct answer. */
export const answersMatch = (
  answer: unknown,
  correctAnswer: unknown,
): boolean =>
  correctAnswer != null &&
  normalizeAnswer(answer) === normalizeAnswer(correctAnswer);

/** Calculates response time and awarded points for one submission. */
export const scoreSubmission = ({
  submission,
  startedAt,
  endsAt,
  pointsPerQuestion,
}: ScoreSubmissionInput): ScoreSubmissionResult => {
  const responseTimeMs = Math.max(
    0,
    submission.submittedAt.getTime() - startedAt.getTime(),
  );

  if (!submission.isCorrect || pointsPerQuestion <= 0) {
    return { responseTimeMs, scoreAwarded: 0 };
  }

  const durationMs = Math.max(1, endsAt.getTime() - startedAt.getTime());
  const remainingTimeMs = Math.max(
    0,
    Math.min(durationMs, endsAt.getTime() - submission.submittedAt.getTime()),
  );
  const remainingTimeRatio = remainingTimeMs / durationMs;

  return {
    responseTimeMs,
    scoreAwarded: Math.max(
      1,
      Math.floor(pointsPerQuestion * remainingTimeRatio),
    ),
  };
};

/** Sorts participants and assigns deterministic ranks. */
export const rankParticipants = (
  participants: Iterable<RuntimeParticipant>,
): RuntimeParticipant[] => {
  const ranked = Array.from(participants).sort((a, b) => {
    if (b.stats.score !== a.stats.score) return b.stats.score - a.stats.score;
    if (a.stats.totalResponseTimeMs !== b.stats.totalResponseTimeMs) {
      return a.stats.totalResponseTimeMs - b.stats.totalResponseTimeMs;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  ranked.forEach((participant, index) => {
    participant.stats.rank = index + 1;
  });

  return ranked;
};

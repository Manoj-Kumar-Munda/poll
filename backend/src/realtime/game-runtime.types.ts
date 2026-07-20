/**
 * Runtime participant data.
 *
 * This is intentionally empty until participant-specific runtime state is
 * introduced by a later feature.
 */
export interface RuntimeParticipant {}

/** Runtime question data, to be defined by the question flow. */
export interface RuntimeQuestion {}

/** Runtime submission data, to be defined by answer handling. */
export interface RuntimeSubmission {}

/** Runtime leaderboard data, to be defined by scoring. */
export interface RuntimeLeaderboard {}

/** Runtime statistics data, to be defined by statistics tracking. */
export interface RuntimeStatistics {}

export interface GameRuntime {
  sessionId: string;
  participants: Map<string, RuntimeParticipant>;
  currentQuestion: RuntimeQuestion | null;
  submissions: RuntimeSubmission;
  leaderboard: RuntimeLeaderboard;
  statistics: RuntimeStatistics;
}

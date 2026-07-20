export interface RuntimeParticipant {
  participantId: string;
  name: string;
  email?: string;
  socketId: string | null;
  connected: boolean;
  joinedAt: Date;
  score: number;
  rank: number;
  streak: number;
  hasAnsweredCurrentQuestion: boolean;
}

export interface RuntimeQuestion {
  questionId: string;
  order: number;
  startedAt: Date;
  endsAt: Date;
}

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

export interface ParticipantStats {
    score: number;
    correctAnswers: number;
    answeredQuestions: number;
    totalResponseTimeMs: number;
    streak: number;
    rank: number;
}

export interface RuntimeParticipant {
    participantId: string;
    name: string;
    socketId: string | null;
    connected: boolean;
    hasAnsweredCurrentQuestion: boolean;
    stats: ParticipantStats;
}

export interface RuntimeQuestion {
  questionId: string;
  order: number;
  startedAt: Date;
  endsAt: Date;
  /** Kept in the runtime and never included in question:started. */
  correctAnswer?: string;
}

export interface RuntimeSubmission {
  questionId: string;
  participantId: string;
  answer: unknown;
  isCorrect: boolean;
  submittedAt: Date;
  responseTimeMs: number;
  scoreAwarded: number;
}

/** Runtime leaderboard data, to be defined by scoring. */
export interface RuntimeLeaderboard {}


export interface GameRuntime {
  sessionId: string;
  participants: Map<string, RuntimeParticipant>;
  currentQuestion: RuntimeQuestion | null;
  /** Set while the active question is being finalized and persisted. */
  finalizingQuestionId?: string;
  submissions: Map<string, RuntimeSubmission>;
}

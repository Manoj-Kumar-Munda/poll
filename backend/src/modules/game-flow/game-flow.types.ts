export interface GameFlowState {}

export interface QuestionLeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
  correctAnswers: number;
  answeredQuestions: number;
  totalResponseTimeMs: number;
  streak: number;
  rank: number;
}

export interface QuestionParticipantResult {
  participantId: string;
  socketId: string | null;
  isCorrect: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
}

export interface QuestionStatistics {
  totalParticipants: number;
  answeredCount: number;
  correctCount: number;
  unansweredCount: number;
  averageResponseTimeMs: number;
}

export interface QuestionFinalizationResult {
  finalized: boolean;
  sessionId: string;
  questionId: string;
  correctAnswer?: string;
  endedAt?: Date;
  leaderboard: QuestionLeaderboardEntry[];
  participantResults: QuestionParticipantResult[];
  statistics: QuestionStatistics;
}

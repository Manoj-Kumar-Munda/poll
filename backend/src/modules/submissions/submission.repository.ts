import { Types } from "mongoose";
import { Submission } from "./submission.model.js";

/** Persists participant answers and their calculated results. */

export interface CreateSubmissionInput {
  sessionId: string;
  participantId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
  submittedAt: Date;
}

export const submissionRepository = {
  /** Upserts all submissions from a finalized question safely for retries. */
  upsertMany(data: CreateSubmissionInput[]) {
    if (data.length === 0) return Promise.resolve([]);

    return Submission.bulkWrite(
      data.map((submission) => ({
        updateOne: {
          filter: {
            sessionId: new Types.ObjectId(submission.sessionId),
            participantId: new Types.ObjectId(submission.participantId),
            questionId: submission.questionId,
          },
          update: {
            $set: {
              answer: submission.answer,
              isCorrect: submission.isCorrect,
              responseTimeMs: submission.responseTimeMs,
              scoreAwarded: submission.scoreAwarded,
              submittedAt: submission.submittedAt,
            },
            $setOnInsert: {
              sessionId: new Types.ObjectId(submission.sessionId),
              participantId: new Types.ObjectId(submission.participantId),
              questionId: submission.questionId,
            },
          },
          upsert: true,
        },
      })),
    );
  },
};

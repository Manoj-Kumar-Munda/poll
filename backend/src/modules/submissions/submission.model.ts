import { Schema, model, type InferSchemaType } from 'mongoose';

import { QUESTION_TYPES } from '@/constants/index.js';

const submissionSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionParticipant',
      required: true,
      index: true,
    },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    questionType: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    answer: { type: String, required: true },
    isCorrect: { type: Boolean },
    responseTimeMs: { type: Number, required: true },
    scoreAwarded: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

submissionSchema.index({ sessionId: 1, participantId: 1, questionId: 1 }, { unique: true });

export type SubmissionDocument = InferSchemaType<typeof submissionSchema>;
export const Submission = model('Submission', submissionSchema);

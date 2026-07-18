import { Schema, model, type InferSchemaType } from 'mongoose';

export const GAME_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const QUESTION_TYPES = ['MCQ', 'YES_NO', 'OPEN_TEXT'] as const;

const questionSchema = new Schema(
  {
    id: { type: String, required: true, default: () => crypto.randomUUID() },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    question: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, default: undefined },
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const gameSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: GAME_STATUSES, default: 'DRAFT', index: true },
    pointsPerQuestion: { type: Number, required: true, min: 0 },
    timeLimitPerQuestion: { type: Number, default: 30, min: 1 },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true },
);

gameSchema.index({ ownerId: 1, createdAt: -1 });

export type GameDocument = InferSchemaType<typeof gameSchema>;
export const Game = model('Game', gameSchema);

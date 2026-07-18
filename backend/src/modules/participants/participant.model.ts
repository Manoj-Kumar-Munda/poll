import { Schema, model, type InferSchemaType } from 'mongoose';

const participantSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 255 },
    joinedAt: { type: Date, default: Date.now },
    finalScore: { type: Number, default: 0 },
    finalRank: { type: Number, default: null },
    correctAnswers: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
  },
  { timestamps: true },
);

participantSchema.index(
  { sessionId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  },
);

export type ParticipantDocument = InferSchemaType<typeof participantSchema>;
export const Participant = model('Participant', participantSchema);

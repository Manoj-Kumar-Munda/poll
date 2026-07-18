import { Schema, model, type InferSchemaType } from 'mongoose';

export const SESSION_STATUSES = ['WAITING', 'LIVE', 'FINISHED'] as const;

const sessionSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'WAITING',
      index: true,
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SessionDocument = InferSchemaType<typeof sessionSchema>;
export const Session = model('Session', sessionSchema);

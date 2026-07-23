import {
  SessionParticipant,
  type SessionParticipantDocument,
} from "./participant.model.js";

export type ParticipantResultUpdate = Pick<
  SessionParticipantDocument,
  "finalScore" | "finalRank" | "correctAnswers" | "averageResponseTime"
> & { participantId: string };

export const participantRepository = {
  create(data: Partial<SessionParticipantDocument>) {
    return SessionParticipant.create(data);
  },

  findById(id: string) {
    return SessionParticipant.findById(id);
  },

  findBySessionId(sessionId: string) {
    return SessionParticipant.find({ sessionId });
  },

  /** Stores the participant's latest score and performance summary. */
  updateResults(
    participantId: string,
    update: Pick<
      SessionParticipantDocument,
      "finalScore" | "finalRank" | "correctAnswers" | "averageResponseTime"
    >,
  ) {
    return SessionParticipant.findByIdAndUpdate(
      participantId,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    );
  },

  /** Updates all participant result snapshots in one database operation. */
  updateResultsMany(updates: ParticipantResultUpdate[]) {
    if (updates.length === 0) return Promise.resolve([]);

    return SessionParticipant.bulkWrite(
      updates.map(({ participantId, ...result }) => ({
        updateOne: {
          filter: { _id: participantId },
          update: { $set: result },
        },
      })),
    );
  },
};

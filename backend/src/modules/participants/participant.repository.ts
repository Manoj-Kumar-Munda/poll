import { SessionParticipant, type SessionParticipantDocument } from "./participant.model.js";

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
};

import { Router } from "express";
import { joinSession } from "./participant.controller.js";

export const participantRouter = Router();

participantRouter.post("/participants/join", joinSession);

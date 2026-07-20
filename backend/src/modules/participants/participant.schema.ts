import { z } from "zod";
import { objectIdRegex } from "@/utils/helpers.js";

export const joinSessionSchema = z.object({
  roomCode: z
    .string({ message: "Room code is required" })
    .trim()
    .min(1, "Room code is required")
    .toUpperCase(),
  participantId: z
    .string()
    .regex(objectIdRegex, "Invalid participant ID")
    .optional(),
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .optional()
    .or(z.literal("")),
});

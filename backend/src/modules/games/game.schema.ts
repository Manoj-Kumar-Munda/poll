import { z } from "zod";

import { GAME_STATUSES, QUESTION_TYPES } from "./game.model.js";

export const questionSchema = z
  .object({
    id: z.string().min(1).optional(),
    type: z.enum(QUESTION_TYPES),
    question: z.string().trim().min(1, "Question is required"),
    options: z.array(z.string().trim().min(1)).default([]),
    correctAnswer: z.string().trim().min(1).optional(),
    order: z.number().int().min(0),
  })
  .superRefine((question, ctx) => {
    if (question.type === "MCQ" && question.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "MCQ questions require at least two options",
      });
    }
    if (
      question.type === "YES_NO" &&
      question.options.length > 0 &&
      question.options.length !== 2
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message:
          "YES_NO questions must have exactly two options when options are supplied",
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;

export const createGameSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2_000),
  status: z.enum(GAME_STATUSES).default("DRAFT"),
  pointsPerQuestion: z.number().min(0),
  timeLimitPerQuestion: z.number().int().min(1).default(30),
  questions: z.array(questionSchema).default([]),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

export const updateGameSchema = createGameSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be supplied",
  );

export const gameIdParamsSchema = z.object({
  gameId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid game ID"),
});

export const listGamesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(GAME_STATUSES).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

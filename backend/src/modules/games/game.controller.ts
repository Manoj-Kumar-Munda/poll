import { ApiResponse } from "@/utils/ApiResponse.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { validate } from "@/utils/validate.js";
import {
  createGameSchema,
  gameIdParamsSchema,
  listGamesQuerySchema,
  updateGameSchema,
} from "./game.schema.js";
import { gameService } from "./game.service.js";

export const createGame = asyncHandler(async (req, res) => {
  const payload = await validate(req.body, createGameSchema);
  const game = await gameService.create(payload, req.user!.id);

  res
    .status(201)
    .json(
      new ApiResponse({
        statusCode: 201,
        message: "Game created successfully",
        data: game,
      }),
    );
});

export const listGames = asyncHandler(async (req, res) => {
  const { search, status, sort } = await validate(
    req.query,
    listGamesQuerySchema,
  );
  const games = await gameService.list({
    ownerId: req.user!.id,
    search,
    status,
    sort,
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Games retrieved successfully",
      data: { games },
    }),
  );
});

export const getGame = asyncHandler(async (req, res) => {
  const { gameId } = await validate(req.params, gameIdParamsSchema);
  const game = await gameService.getById(gameId, req.user!.id);

  res
    .status(200)
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "Game retrieved successfully",
        data: game,
      }),
    );
});

export const updateGame = asyncHandler(async (req, res) => {
  const { gameId } = await validate(req.params, gameIdParamsSchema);
  const payload = await validate(req.body, updateGameSchema);
  const game = await gameService.update(gameId, req.user!.id, payload);

  res
    .status(200)
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "Game updated successfully",
        data: game,
      }),
    );
});

export const deleteGame = asyncHandler(async (req, res) => {
  const { gameId } = await validate(req.params, gameIdParamsSchema);
  await gameService.delete(gameId, req.user!.id);

  res
    .status(200)
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "Game deleted successfully",
        data: null,
      }),
    );
});

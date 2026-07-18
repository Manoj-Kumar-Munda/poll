import { ApiResponse } from '@/utils/ApiResponse.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { validate } from '@/utils/validate.js';
import {
  createSessionParamsSchema,
  listSessionsQuerySchema,
  sessionIdParamsSchema,
} from './session.schema.js';
import { sessionService } from './session.service.js';

export const createSession = asyncHandler(async (req, res) => {
  const { gameId } = await validate(req.params, createSessionParamsSchema);
  const session = await sessionService.create(gameId, req.user!.id);

  res.status(201).json(
    new ApiResponse({
      statusCode: 201,
      message: 'Session created successfully',
      data: session,
    }),
  );
});

export const listSessions = asyncHandler(async (req, res) => {
  const { status, gameId, sort } = await validate(
    req.query,
    listSessionsQuerySchema,
  );
  const result = await sessionService.list(req.user!.id, {
    status,
    gameId,
    sort,
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: result,
    }),
  );
});

export const getSession = asyncHandler(async (req, res) => {
  const { sessionId } = await validate(req.params, sessionIdParamsSchema);
  const session = await sessionService.getById(sessionId, req.user!.id);

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: 'Session retrieved successfully',
      data: session,
    }),
  );
});

export const deleteSession = asyncHandler(async (req, res) => {
  const { sessionId } = await validate(req.params, sessionIdParamsSchema);
  await sessionService.delete(sessionId, req.user!.id);

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: 'Session deleted successfully',
      data: null,
    }),
  );
});

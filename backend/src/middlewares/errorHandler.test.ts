import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorHandler } from './errorHandler.js';
import { ApiError } from '../utils/ApiError.js';

describe('errorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
    } as unknown as Response;
    next = vi.fn() as NextFunction;
  });

  it('should handle ZodError with status 400', () => {
    const zodError = new ZodError([
      { code: 'too_small', path: ['name'], message: 'Name is required', minimum: 1, type: 'string', inclusive: true, exact: false } as any,
    ]);

    errorHandler(zodError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          { path: 'name', message: 'Name is required' },
        ],
      })
    );
  });

  it('should handle ApiError with its status code', () => {
    const apiError = new ApiError(401, 'Unauthorized', ['Invalid token']);

    errorHandler(apiError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Unauthorized',
        errors: ['Invalid token'],
      })
    );
  });

  it('should handle unknown errors with status 500', () => {
    const error = new Error('Unexpected error');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Unexpected error',
        data: null,
      })
    );
  });

  it('should handle non-Error unknown values with status 500', () => {
    errorHandler('string error', req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal Server Error',
      })
    );
  });

  it('should delegate to next if headers already sent', () => {
    res.headersSent = true;
    const error = new Error('test');

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should include stack trace in development mode', () => {
    const error = new Error('test error');

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.any(String),
      })
    );
  });
});

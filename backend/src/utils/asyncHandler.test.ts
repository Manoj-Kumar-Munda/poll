import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './asyncHandler.js';

describe('asyncHandler', () => {
  it('should call next with error when handler throws', async () => {
    const error = new Error('test error');
    const handler = asyncHandler(async () => {
      throw error;
    });

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when handler succeeds', async () => {
    const handler = asyncHandler(async () => {});

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with rejected promise from non-async handler', async () => {
    const error = new Error('async error');
    const handler = asyncHandler(() => {
      return Promise.reject(error);
    });

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { notFoundHandler } from './notFoundHandler.js';

describe('notFoundHandler', () => {
  it('should return 404 with correct method and URL in message', () => {
    const req = { method: 'GET', originalUrl: '/api/test' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    notFoundHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        success: false,
        message: 'Not Found - GET /api/test',
        data: null,
      })
    );
  });

  it('should return 404 for POST requests', () => {
    const req = { method: 'POST', originalUrl: '/api/unknown' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    notFoundHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Not Found - POST /api/unknown',
      })
    );
  });
});

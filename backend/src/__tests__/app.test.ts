import { describe, it, expect, vi, beforeAll } from 'vitest';
import supertest from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../modules/auth/index.js', () => ({
  auth: {},
  requireAuth: vi.fn((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'test-user', email: 'test@test.com', name: 'Test' } as any;
    req.session = { id: 'test-session', userId: 'test-user' } as any;
    next();
  }),
}));

const { app } = await import('../app.js');

describe('App routes', () => {
  const request = supertest(app);

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await request.get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is healthy');
      expect(response.body.data).toBeNull();
    });
  });

  describe('GET /api/v1/me', () => {
    it('should return 200 with user and session when authenticated', async () => {
      const response = await request.get('/api/v1/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Authenticated host retrieved successfully');
      expect(response.body.data.host).toBeDefined();
      expect(response.body.data.session).toBeDefined();
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request.get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

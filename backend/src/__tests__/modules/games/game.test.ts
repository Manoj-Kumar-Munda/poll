import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Game } from '@/modules/games/game.model.js';

// Mock auth middleware to return a mock user
vi.mock('../../../modules/auth/index.js', () => ({
  auth: {},
  requireAuth: vi.fn((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'test-user', email: 'test@test.com', name: 'Test Host' } as any;
    req.session = { id: 'test-session', userId: 'test-user' } as any;
    next();
  }),
}));

// Load app after setting up mock
const { app } = await import('../../../app.js');

describe('Games API', () => {
  const request = supertest(app);

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
  });

  afterEach(async () => {
    await Game.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('POST /api/v1/games', () => {
    it('should create a game successfully with valid data', async () => {
      const payload = {
        title: 'Science Quiz',
        description: 'A quiz about science',
        pointsPerQuestion: 10,
        timeLimitPerQuestion: 30,
        questions: [
          {
            type: 'MCQ',
            question: 'What is water?',
            options: ['Liquid', 'Gas'],
            correctAnswer: 'Liquid',
            order: 0,
          },
        ],
      };

      const response = await request
        .post('/api/v1/games')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.ownerId).toBe('test-user');
    });

    it('should fail creation if pointsPerQuestion is missing', async () => {
      const payload = {
        title: 'Science Quiz',
        description: 'A quiz about science',
      };

      const response = await request
        .post('/api/v1/games')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail creation if MCQ question does not have at least 2 options', async () => {
      const payload = {
        title: 'Science Quiz',
        description: 'A quiz about science',
        pointsPerQuestion: 10,
        questions: [
          {
            type: 'MCQ',
            question: 'What is water?',
            options: ['Liquid'],
            order: 0,
          },
        ],
      };

      const response = await request
        .post('/api/v1/games')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/games', () => {
    beforeEach(async () => {
      // Create some test games
      await Game.create([
        {
          title: 'Math Quiz',
          description: 'A math quiz',
          ownerId: 'test-user',
          pointsPerQuestion: 5,
          status: 'PUBLISHED',
          createdAt: new Date(Date.now() - 10000),
        },
        {
          title: 'History Quiz',
          description: 'A history quiz',
          ownerId: 'test-user',
          pointsPerQuestion: 10,
          status: 'DRAFT',
          createdAt: new Date(),
        },
        {
          title: 'Other User Quiz',
          description: 'Not mine',
          ownerId: 'other-user',
          pointsPerQuestion: 10,
          status: 'PUBLISHED',
        },
      ]);
    });

    it('should list only games owned by the authenticated user', async () => {
      const response = await request.get('/api/v1/games');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toHaveLength(2);
      expect(response.body.data.games.every((g: any) => g.ownerId === 'test-user')).toBe(true);
    });

    it('should filter games by status', async () => {
      const response = await request.get('/api/v1/games?status=PUBLISHED');

      expect(response.status).toBe(200);
      expect(response.body.data.games).toHaveLength(1);
      expect(response.body.data.games[0].title).toBe('Math Quiz');
    });

    it('should search games by title search term', async () => {
      const response = await request.get('/api/v1/games?search=history');

      expect(response.status).toBe(200);
      expect(response.body.data.games).toHaveLength(1);
      expect(response.body.data.games[0].title).toBe('History Quiz');
    });

    it('should sort games by oldest first when specified', async () => {
      const response = await request.get('/api/v1/games?sort=oldest');

      expect(response.status).toBe(200);
      expect(response.body.data.games[0].title).toBe('Math Quiz');
      expect(response.body.data.games[1].title).toBe('History Quiz');
    });
  });

  describe('GET /api/v1/games/:gameId', () => {
    it('should get an owned game successfully', async () => {
      const game = await Game.create({
        title: 'Math Quiz',
        description: 'A math quiz',
        ownerId: 'test-user',
        pointsPerQuestion: 5,
      });

      const response = await request.get(`/api/v1/games/${game._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Math Quiz');
    });

    it('should return 404 for a game owned by someone else', async () => {
      const game = await Game.create({
        title: 'Other User Quiz',
        description: 'Not mine',
        ownerId: 'other-user',
        pointsPerQuestion: 10,
      });

      const response = await request.get(`/api/v1/games/${game._id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for an invalid game ID', async () => {
      const response = await request.get('/api/v1/games/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/games/:gameId', () => {
    it('should update an owned game successfully', async () => {
      const game = await Game.create({
        title: 'Math Quiz',
        description: 'A math quiz',
        ownerId: 'test-user',
        pointsPerQuestion: 5,
      });

      const response = await request
        .patch(`/api/v1/games/${game._id}`)
        .send({ title: 'Advanced Math Quiz' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Advanced Math Quiz');
    });

    it('should return 404 for updating a game owned by someone else', async () => {
      const game = await Game.create({
        title: 'Other User Quiz',
        description: 'Not mine',
        ownerId: 'other-user',
        pointsPerQuestion: 10,
      });

      const response = await request
        .patch(`/api/v1/games/${game._id}`)
        .send({ title: 'Hacked Quiz' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/games/:gameId', () => {
    it('should delete an owned game successfully', async () => {
      const game = await Game.create({
        title: 'Math Quiz',
        description: 'A math quiz',
        ownerId: 'test-user',
        pointsPerQuestion: 5,
      });

      const response = await request.delete(`/api/v1/games/${game._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const dbGame = await Game.findById(game._id);
      expect(dbGame).toBeNull();
    });

    it('should return 404 for deleting a game owned by someone else', async () => {
      const game = await Game.create({
        title: 'Other User Quiz',
        description: 'Not mine',
        ownerId: 'other-user',
        pointsPerQuestion: 10,
      });

      const response = await request.delete(`/api/v1/games/${game._id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      const dbGame = await Game.findById(game._id);
      expect(dbGame).not.toBeNull();
    });
  });
});

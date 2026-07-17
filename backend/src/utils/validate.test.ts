import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from './validate.js';
import { ApiError } from './ApiError.js';

describe('validate', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().min(0, 'Age must be non-negative'),
  });

  it('should return parsed data for valid payload', async () => {
    const data = await validate({ name: 'John', age: 25 }, schema);
    expect(data).toEqual({ name: 'John', age: 25 });
  });

  it('should throw ApiError for invalid payload', async () => {
    const payload = { name: '', age: -1 };
    await expect(validate(payload, schema)).rejects.toThrow(ApiError);
  });

  it('should throw ApiError with status 400 for validation failure', async () => {
    try {
      await validate({ name: '', age: -1 }, schema);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(400);
      expect((error as ApiError).message).toBe('Validation failed');
      expect((error as ApiError).errors).toHaveLength(2);
    }
  });

  it('should include path and message in each validation error', async () => {
    try {
      await validate({ name: '', age: -1 }, schema);
    } catch (error) {
      const errors = (error as ApiError).errors as Array<{ path: string; message: string }>;
      expect(errors[0]).toHaveProperty('path');
      expect(errors[0]).toHaveProperty('message');
    }
  });

  it('should pass valid data through unchanged', async () => {
    const data = await validate({ name: 'Alice', age: 30 }, schema);
    expect(data).toEqual({ name: 'Alice', age: 30 });
  });
});

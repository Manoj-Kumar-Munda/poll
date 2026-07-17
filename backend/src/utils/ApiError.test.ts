import { describe, it, expect } from 'vitest';
import { ApiError } from './ApiError.js';

describe('ApiError', () => {
  it('should create an error with default values', () => {
    const error = new ApiError(400);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Something went wrong');
    expect(error.success).toBe(false);
    expect(error.errors).toEqual([]);
  });

  it('should create an error with custom message and errors', () => {
    const error = new ApiError(404, 'Not found', [{ field: 'id', message: 'Missing' }]);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.errors).toEqual([{ field: 'id', message: 'Missing' }]);
  });

  it('should set a custom stack trace if provided', () => {
    const error = new ApiError(500, 'Server error', [], 'custom stack');
    expect(error.stack).toBe('custom stack');
  });

  it('should capture stack trace by default', () => {
    const error = new ApiError(400);
    expect(error.stack).toBeDefined();
  });

  it('should be an instance of Error', () => {
    const error = new ApiError(400);
    expect(error).toBeInstanceOf(Error);
  });
});

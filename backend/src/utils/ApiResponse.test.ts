import { describe, it, expect } from 'vitest';
import { ApiResponse } from './ApiResponse.js';

describe('ApiResponse', () => {
  it('should create a success response for status < 400', () => {
    const response = new ApiResponse({ statusCode: 200, message: 'OK', data: { id: 1 } });
    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.message).toBe('OK');
    expect(response.data).toEqual({ id: 1 });
  });

  it('should mark success as false for status >= 400', () => {
    const response = new ApiResponse({ statusCode: 400, message: 'Bad Request', data: null });
    expect(response.success).toBe(false);
  });

  it('should not include errors property when errors array is empty', () => {
    const response = new ApiResponse({ statusCode: 200, data: null, errors: [] });
    expect(response.errors).toBeUndefined();
  });

  it('should include errors when provided', () => {
    const response = new ApiResponse({ statusCode: 400, data: null, errors: ['validation error'] });
    expect(response.errors).toEqual(['validation error']);
  });

  it('should use default message when not provided', () => {
    const response = new ApiResponse({ statusCode: 200, data: null });
    expect(response.message).toBe('Success');
  });

  it('should work with null data', () => {
    const response = new ApiResponse({ statusCode: 200, data: null });
    expect(response.data).toBeNull();
  });
});

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.config.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If headers have already been sent, delegate to standard express error handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = env.NODE_ENV === 'production';

  // Handle Zod validation errors cleanly
  if (err instanceof ZodError) {
    const response = new ApiResponse({
      statusCode: 400,
      message: 'Validation failed',
      data: null,
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });

    res.status(400).json({
      ...response,
      ...(!isProduction && { stack: err.stack }),
    });
    return;
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    const response = new ApiResponse({
      statusCode: err.statusCode,
      message: err.message,
      data: null,
      errors: err.errors,
    });

    res.status(err.statusCode).json({
      ...response,
      ...(!isProduction && { stack: err.stack }),
    });
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const stack = err instanceof Error ? err.stack : undefined;

  const response = new ApiResponse({
    statusCode,
    message,
    data: null,
    errors: [],
  });

  res.status(statusCode).json({
    ...response,
    ...(!isProduction && { stack }),
  });
};

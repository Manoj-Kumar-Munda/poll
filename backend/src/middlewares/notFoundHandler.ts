import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const response = new ApiResponse({
    statusCode: 404,
    message: `Not Found - ${req.method} ${req.originalUrl}`,
    data: null,
    errors: [],
  });

  res.status(404).json(response);
};

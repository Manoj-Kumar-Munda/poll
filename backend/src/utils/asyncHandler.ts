import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (requestHandler: AsyncRequestHandler) => {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(requestHandler(req, res, next)).catch(function (err: unknown) {
      next(err);
    });
  };
};

export { asyncHandler };

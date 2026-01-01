import {Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  // Use status from error if available, otherwise fallback
    const statusCode = res.statusCode && res.statusCode !== 200
        ? res.statusCode
        : err.status || 500;

    if (statusCode === 429) {
      const retryDelay = err.retryDelay || err?.errorDetails?.find((d: any) =>
          d['@type']?.includes('RetryInfo')
        )?.retryDelay ||
        null;

      return res.status(429).json({
        message: "Quota has been exhausted.",
        retryDelay,
      });
    }

    if (statusCode === 409) {
      return res.status(409).json({
        message: "Conflict: Already exists or cannot be processed.",
      });
    }

    return res.status(statusCode).json({
      message: err.message || "Unexpected error",
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
};

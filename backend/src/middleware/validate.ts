import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Middleware factory for validating request bodies against a Zod schema.
 * Returns 400 with detailed error messages if validation fails.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          message: 'Validation failed',
          errors,
        });
        return;
      }
      res.status(500).json({ message: 'Internal validation error' });
    }
  };
}

/**
 * Middleware factory for validating request query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          message: 'Validation failed',
          errors,
        });
        return;
      }
      res.status(500).json({ message: 'Internal validation error' });
    }
  };
}

/**
 * Middleware factory for validating request params against a Zod schema.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          message: 'Validation failed',
          errors,
        });
        return;
      }
      res.status(500).json({ message: 'Internal validation error' });
    }
  };
}

// Common param schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const gameIdParamSchema = z.object({
  gameId: z.string().uuid('Invalid game ID format'),
});

export const matchIdParamSchema = z.object({
  matchId: z.string().uuid('Invalid match ID format'),
});

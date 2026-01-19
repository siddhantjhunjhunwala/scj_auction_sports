import { z } from 'zod';

// ============ Auth Schemas ============

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must not exceed 50 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(30, 'Team name must not exceed 30 characters').optional().or(z.literal('')),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

// ============ Game Schemas ============

export const createGameSchema = z.object({
  name: z.string().min(3, 'Game name must be at least 3 characters').max(50, 'Game name must not exceed 50 characters'),
});

export const gameCodeSchema = z.object({
  code: z.string().length(6, 'Game code must be exactly 6 characters').regex(/^[A-Z0-9]+$/, 'Game code must only contain uppercase letters and numbers'),
});

// ============ Match Schemas ============

export const createMatchSchema = z.object({
  matchNumber: z.number().int().positive('Match number must be positive'),
  team1: z.string().min(2, 'Team 1 name is required').max(50, 'Team name must not exceed 50 characters'),
  team2: z.string().min(2, 'Team 2 name is required').max(50, 'Team name must not exceed 50 characters'),
  matchDate: z.string().min(1, 'Match date is required'),
});

// ============ Bid Schema ============

export const bidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive').max(200, 'Bid cannot exceed maximum budget'),
});

// ============ Points Config Schema ============

export const pointFieldSchema = z.number().int().min(-50).max(200);

export const pointsConfigSchema = z.object({
  // Batting
  runPoints: pointFieldSchema,
  fourBonus: pointFieldSchema,
  sixBonus: pointFieldSchema,
  runs25Bonus: pointFieldSchema,
  runs50Bonus: pointFieldSchema,
  runs75Bonus: pointFieldSchema,
  runs100Bonus: pointFieldSchema,
  duckPenalty: pointFieldSchema,
  sr130Bonus: pointFieldSchema,
  sr150Bonus: pointFieldSchema,
  sr170Bonus: pointFieldSchema,
  // Bowling
  wicketPoints: pointFieldSchema,
  lbwBowledBonus: pointFieldSchema,
  maidenPoints: pointFieldSchema,
  dotBallPoints: pointFieldSchema,
  wickets3Bonus: pointFieldSchema,
  wickets4Bonus: pointFieldSchema,
  wickets5Bonus: pointFieldSchema,
  econ5Bonus: pointFieldSchema,
  econ6Bonus: pointFieldSchema,
  econ7Bonus: pointFieldSchema,
  // Fielding
  catchPoints: pointFieldSchema,
  catches3Bonus: pointFieldSchema,
  stumpingPoints: pointFieldSchema,
  directRunout: pointFieldSchema,
  indirectRunout: pointFieldSchema,
  playingXiBonus: pointFieldSchema,
});

// ============ Type Exports ============

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type GameCodeInput = z.infer<typeof gameCodeSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type BidInput = z.infer<typeof bidSchema>;
export type PointsConfigInput = z.infer<typeof pointsConfigSchema>;

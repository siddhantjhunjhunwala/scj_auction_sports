import { z } from 'zod';

// ============ Auth Schemas ============

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must not exceed 50 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(30, 'Team name must not exceed 30 characters').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
});

// ============ Game Schemas ============

export const createGameSchema = z.object({
  name: z.string().min(3, 'Game name must be at least 3 characters').max(50, 'Game name must not exceed 50 characters'),
});

export const updateGameSchema = z.object({
  name: z.string().min(3, 'Game name must be at least 3 characters').max(50, 'Game name must not exceed 50 characters').optional(),
  joiningAllowed: z.boolean().optional(),
});

export const joinGameByCodeSchema = z.object({
  code: z.string().length(6, 'Game code must be exactly 6 characters').regex(/^[A-Z0-9]+$/, 'Game code must only contain uppercase letters and numbers'),
});

// ============ Points Config Schema ============

export const pointsConfigSchema = z.object({
  // Batting
  runPoints: z.number().int().min(0).max(10).optional(),
  fourBonus: z.number().int().min(0).max(20).optional(),
  sixBonus: z.number().int().min(0).max(30).optional(),
  runs25Bonus: z.number().int().min(0).max(50).optional(),
  runs50Bonus: z.number().int().min(0).max(100).optional(),
  runs75Bonus: z.number().int().min(0).max(100).optional(),
  runs100Bonus: z.number().int().min(0).max(200).optional(),
  duckPenalty: z.number().int().min(-50).max(0).optional(),
  sr130Bonus: z.number().int().min(0).max(50).optional(),
  sr150Bonus: z.number().int().min(0).max(50).optional(),
  sr170Bonus: z.number().int().min(0).max(50).optional(),
  // Bowling
  wicketPoints: z.number().int().min(0).max(100).optional(),
  lbwBowledBonus: z.number().int().min(0).max(50).optional(),
  maidenPoints: z.number().int().min(0).max(50).optional(),
  dotBallPoints: z.number().int().min(0).max(10).optional(),
  wickets3Bonus: z.number().int().min(0).max(100).optional(),
  wickets4Bonus: z.number().int().min(0).max(100).optional(),
  wickets5Bonus: z.number().int().min(0).max(150).optional(),
  econ5Bonus: z.number().int().min(0).max(50).optional(),
  econ6Bonus: z.number().int().min(0).max(50).optional(),
  econ7Bonus: z.number().int().min(0).max(50).optional(),
  // Fielding
  catchPoints: z.number().int().min(0).max(50).optional(),
  catches3Bonus: z.number().int().min(0).max(50).optional(),
  stumpingPoints: z.number().int().min(0).max(50).optional(),
  directRunout: z.number().int().min(0).max(50).optional(),
  indirectRunout: z.number().int().min(0).max(50).optional(),
  playingXiBonus: z.number().int().min(0).max(20).optional(),
});

// ============ Auction Schemas ============

export const placeBidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive').max(200, 'Bid cannot exceed maximum budget'),
});

export const startAuctionSchema = z.object({
  cricketerId: z.string().uuid('Invalid cricketer ID').optional(),
});

export const auctionOrderSchema = z.object({
  order: z.array(z.string().uuid('Invalid cricketer ID')),
});

// ============ Match Schemas ============

export const createMatchSchema = z.object({
  matchNumber: z.number().int().positive('Match number must be positive'),
  team1: z.string().min(2, 'Team 1 name is required').max(50),
  team2: z.string().min(2, 'Team 2 name is required').max(50),
  matchDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export const playerScoreSchema = z.object({
  cricketerId: z.string().uuid('Invalid cricketer ID'),
  inPlayingXi: z.boolean().default(true),
  runs: z.number().int().min(0).max(500).default(0),
  ballsFaced: z.number().int().min(0).max(200).default(0),
  fours: z.number().int().min(0).max(50).default(0),
  sixes: z.number().int().min(0).max(30).default(0),
  wickets: z.number().int().min(0).max(10).default(0),
  oversBowled: z.number().min(0).max(10).default(0),
  runsConceded: z.number().int().min(0).max(200).default(0),
  maidens: z.number().int().min(0).max(10).default(0),
  dotBalls: z.number().int().min(0).max(60).default(0),
  catches: z.number().int().min(0).max(10).default(0),
  stumpings: z.number().int().min(0).max(5).default(0),
  directRunouts: z.number().int().min(0).max(5).default(0),
  indirectRunouts: z.number().int().min(0).max(5).default(0),
  dismissalType: z.string().optional().default(''),
  lbwBowledDismissals: z.number().int().min(0).max(10).default(0),
});

export const saveMatchScoresSchema = z.object({
  scores: z.array(playerScoreSchema),
});

// ============ Cricketer Schemas ============

export const playerTypeEnum = z.enum(['batsman', 'bowler', 'wicketkeeper', 'allrounder']);

export const cricketerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  playerType: playerTypeEnum,
  isForeign: z.boolean().default(false),
  iplTeam: z.string().min(2, 'IPL team is required').max(50),
  battingRecord: z.any().optional().nullable(),
  bowlingRecord: z.any().optional().nullable(),
  pictureUrl: z.string().url('Invalid picture URL').optional().nullable(),
});

// ============ User Schemas ============

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(30).optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  email: z.string().email('Invalid email address').optional(),
});

// ============ Export Type Inferences ============

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type JoinGameByCodeInput = z.infer<typeof joinGameByCodeSchema>;
export type PointsConfigInput = z.infer<typeof pointsConfigSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type StartAuctionInput = z.infer<typeof startAuctionSchema>;
export type AuctionOrderInput = z.infer<typeof auctionOrderSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type PlayerScoreInput = z.infer<typeof playerScoreSchema>;
export type SaveMatchScoresInput = z.infer<typeof saveMatchScoresSchema>;
export type CricketerInput = z.infer<typeof cricketerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.js';

const prisma = new PrismaClient();

export interface GameAuthRequest extends AuthRequest {
  game?: {
    id: string;
    name: string;
    code: string;
    createdById: string;
    status: string;
    joiningAllowed: boolean;
    cricketersUploaded: boolean;
  };
  participant?: {
    id: string;
    gameId: string;
    userId: string;
    budgetRemaining: number;
  };
  isGameCreator?: boolean;
}

// Middleware to verify user has access to a game (either creator or participant)
export const gameAccessMiddleware = async (
  req: GameAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = req.params.gameId || req.params.id;
    const userId = req.user?.id;

    if (!gameId) {
      res.status(400).json({ message: 'Game ID is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Check if user is creator or participant
    const isCreator = game.createdById === userId;
    let participant = null;

    if (!isCreator) {
      participant = await prisma.gameParticipant.findUnique({
        where: {
          gameId_userId: { gameId, userId },
        },
      });

      if (!participant) {
        res.status(403).json({ message: 'You do not have access to this game' });
        return;
      }
    }

    req.game = {
      id: game.id,
      name: game.name,
      code: game.code,
      createdById: game.createdById,
      status: game.status,
      joiningAllowed: game.joiningAllowed,
      cricketersUploaded: game.cricketersUploaded,
    };
    req.isGameCreator = isCreator;

    if (participant) {
      req.participant = {
        id: participant.id,
        gameId: participant.gameId,
        userId: participant.userId,
        budgetRemaining: participant.budgetRemaining,
      };
    }

    next();
  } catch (error) {
    console.error('Game access middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to verify user is the game creator
export const gameCreatorOnly = (
  req: GameAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.isGameCreator) {
    res.status(403).json({ message: 'Only the game creator can perform this action' });
    return;
  }
  next();
};

// Middleware to verify user is a participant (not creator)
export const participantOnly = (
  req: GameAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.participant) {
    res.status(403).json({ message: 'Only game participants can perform this action' });
    return;
  }
  next();
};

// Middleware to get participant info for creator as well (for bidding etc.)
export const ensureParticipantInfo = async (
  req: GameAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.participant) {
      next();
      return;
    }

    // If user is creator, they might also be a participant
    const gameId = req.game?.id;
    const userId = req.user?.id;

    if (!gameId || !userId) {
      res.status(400).json({ message: 'Game or user information missing' });
      return;
    }

    const participant = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: { gameId, userId },
      },
    });

    if (participant) {
      req.participant = {
        id: participant.id,
        gameId: participant.gameId,
        userId: participant.userId,
        budgetRemaining: participant.budgetRemaining,
      };
    }

    next();
  } catch (error) {
    console.error('Ensure participant info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

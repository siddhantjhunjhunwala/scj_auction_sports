import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true,
        avatarUrl: true,
        role: true,
        budgetRemaining: true,
        createdAt: true,
      },
    });

    res.json(users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true,
        avatarUrl: true,
        role: true,
        budgetRemaining: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's team
router.get('/:id/team', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const cricketers = await prisma.cricketer.findMany({
      where: { pickedByUserId: userId },
      orderBy: { pickOrder: 'asc' },
    });

    res.json(cricketers.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      playerType: c.playerType,
      isForeign: c.isForeign,
      iplTeam: c.iplTeam,
      battingRecord: c.battingRecord,
      bowlingRecord: c.bowlingRecord,
      pictureUrl: c.pictureUrl,
      newsArticles: c.newsArticles || [],
      isPicked: c.isPicked,
      pickedByUserId: c.pickedByUserId,
      pricePaid: c.pricePaid,
      pickOrder: c.pickOrder,
      wasSkipped: c.wasSkipped,
    })));
  } catch (error) {
    console.error('Get user team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

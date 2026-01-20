import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const TEAM_SIZE = 12;
const MAX_FOREIGNERS = 4;

// Helper to calculate snake order
async function calculateSnakeOrder(round: 1 | 2) {
  // Get all players and their total points
  const players = await prisma.user.findMany({
    where: { role: 'player' },
  });

  // Get all match scores for each player's team
  const playerPoints: { userId: string; user: typeof players[0]; totalPoints: number }[] = [];

  for (const player of players) {
    const team = await prisma.cricketer.findMany({
      where: { pickedByUserId: player.id },
    });

    let totalPoints = 0;
    for (const cricketer of team) {
      const scores = await prisma.playerMatchScore.findMany({
        where: { cricketerId: cricketer.id },
      });
      totalPoints += scores.reduce((sum, s) => sum + s.calculatedPoints, 0);
    }

    playerPoints.push({ userId: player.id, user: player, totalPoints });
  }

  // Sort by points (highest first for ranking)
  playerPoints.sort((a, b) => b.totalPoints - a.totalPoints);

  // Snake order:
  // Round 1: 8, 7, 6, 5, 4, 3, 2, 1 (worst to best)
  // Round 2: 1, 2, 3, 4, 5, 6, 7, 8 (best to worst)
  if (round === 1) {
    return playerPoints.reverse().map((p, i) => ({
      userId: p.userId,
      user: {
        id: p.user.id,
        email: p.user.email,
        name: p.user.name,
        teamName: p.user.teamName,
        avatarUrl: p.user.avatarUrl,
        role: p.user.role,
        budgetRemaining: p.user.budgetRemaining,
        createdAt: p.user.createdAt.toISOString(),
      },
      position: i + 1,
    }));
  } else {
    return playerPoints.map((p, i) => ({
      userId: p.userId,
      user: {
        id: p.user.id,
        email: p.user.email,
        name: p.user.name,
        teamName: p.user.teamName,
        avatarUrl: p.user.avatarUrl,
        role: p.user.role,
        budgetRemaining: p.user.budgetRemaining,
        createdAt: p.user.createdAt.toISOString(),
      },
      position: i + 1,
    }));
  }
}

// Get snake order for a round
router.get('/snake-order/:round', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roundParam = req.params.round as string;
    const round = parseInt(roundParam) as 1 | 2;

    if (round !== 1 && round !== 2) {
      res.status(400).json({ message: 'Invalid round' });
      return;
    }

    const order = await calculateSnakeOrder(round);
    res.json(order);
  } catch (error) {
    console.error('Get snake order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get substitutions by user
router.get('/user/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const subs = await prisma.substitution.findMany({
      where: { userId },
      include: {
        subOutPlayer: true,
        subInPlayer: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(subs.map(s => ({
      id: s.id,
      userId: s.userId,
      subOutCricketerId: s.subOutCricketerId,
      subInCricketerId: s.subInCricketerId,
      subRound: s.subRound,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('Get user subs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate substitution
router.post('/validate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subOutId, subInId } = req.body;
    const userId = req.user!.id;

    // Get current user's team
    const team = await prisma.cricketer.findMany({
      where: { pickedByUserId: userId },
    });

    const subOut = team.find(c => c.id === subOutId);
    const subIn = await prisma.cricketer.findUnique({ where: { id: subInId } });

    if (!subOut) {
      res.json({ valid: false, message: 'Player not in your team' });
      return;
    }

    if (!subIn) {
      res.json({ valid: false, message: 'Player not found' });
      return;
    }

    if (subIn.isPicked) {
      res.json({ valid: false, message: 'Player already picked by another team' });
      return;
    }

    // Check foreign player limit
    const currentForeigners = team.filter(c => c.isForeign).length;
    const removingForeigner = subOut.isForeign;
    const addingForeigner = subIn.isForeign;

    const newForeignerCount = currentForeigners - (removingForeigner ? 1 : 0) + (addingForeigner ? 1 : 0);

    if (newForeignerCount > MAX_FOREIGNERS) {
      res.json({ valid: false, message: `Maximum ${MAX_FOREIGNERS} foreign players allowed` });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Validate sub error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create substitution (auctioneer only)
router.post('/', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subOutId, subInId, round } = req.body;

    // Get league state to find current user
    const leagueState = await prisma.leagueState.findFirst();
    if (!leagueState?.currentSubUserId) {
      res.status(400).json({ message: 'No current sub user set' });
      return;
    }

    const userId = leagueState.currentSubUserId;

    // Perform the substitution
    // Remove player from team
    await prisma.cricketer.update({
      where: { id: subOutId },
      data: {
        isPicked: false,
        pickedByUserId: null,
        pricePaid: null,
        pickOrder: null,
      },
    });

    // Add new player to team
    const maxPickOrder = await prisma.cricketer.aggregate({
      _max: { pickOrder: true },
    });
    const newPickOrder = (maxPickOrder._max.pickOrder || 0) + 1;

    await prisma.cricketer.update({
      where: { id: subInId },
      data: {
        isPicked: true,
        pickedByUserId: userId,
        pricePaid: 0, // Subs are free
        pickOrder: newPickOrder,
      },
    });

    // Record the substitution
    const sub = await prisma.substitution.create({
      data: {
        userId,
        subOutCricketerId: subOutId,
        subInCricketerId: subInId,
        subRound: round,
      },
    });

    res.json({
      id: sub.id,
      userId: sub.userId,
      subOutCricketerId: sub.subOutCricketerId,
      subInCricketerId: sub.subInCricketerId,
      subRound: sub.subRound,
      createdAt: sub.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Create sub error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Skip substitution (auctioneer only)
router.post('/skip', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Just move to next user - no substitution recorded
    res.json({ success: true });
  } catch (error) {
    console.error('Skip sub error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

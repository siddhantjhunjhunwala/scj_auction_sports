import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

const TEAM_SIZE = 12;
const MAX_FOREIGNERS = 4;
const MIN_BUDGET_PER_PLAYER = 0.5;

// Helper to get or create auction state
async function getAuctionState() {
  let state = await prisma.auctionState.findFirst();
  if (!state) {
    state = await prisma.auctionState.create({
      data: {},
    });
  }
  return state;
}

// Helper to format auction state response
async function formatAuctionState(state: Awaited<ReturnType<typeof getAuctionState>>) {
  const currentCricketer = state.currentCricketerId
    ? await prisma.cricketer.findUnique({ where: { id: state.currentCricketerId } })
    : null;

  const currentHighBidder = state.currentHighBidderId
    ? await prisma.user.findUnique({ where: { id: state.currentHighBidderId } })
    : null;

  return {
    id: state.id,
    currentCricketerId: state.currentCricketerId,
    auctionStatus: state.auctionStatus,
    timerEndTime: state.timerEndTime?.toISOString() || null,
    timerPausedAt: state.timerPausedAt?.toISOString() || null,
    currentHighBid: state.currentHighBid,
    currentHighBidderId: state.currentHighBidderId,
    isFirstRound: state.isFirstRound,
    currentCricketer: currentCricketer ? {
      id: currentCricketer.id,
      firstName: currentCricketer.firstName,
      lastName: currentCricketer.lastName,
      playerType: currentCricketer.playerType,
      isForeign: currentCricketer.isForeign,
      iplTeam: currentCricketer.iplTeam,
      battingRecord: currentCricketer.battingRecord,
      bowlingRecord: currentCricketer.bowlingRecord,
      pictureUrl: currentCricketer.pictureUrl,
      newsArticles: currentCricketer.newsArticles || [],
      isPicked: currentCricketer.isPicked,
      pickedByUserId: currentCricketer.pickedByUserId,
      pricePaid: currentCricketer.pricePaid,
      pickOrder: currentCricketer.pickOrder,
      wasSkipped: currentCricketer.wasSkipped,
    } : null,
    currentHighBidder: currentHighBidder ? {
      id: currentHighBidder.id,
      email: currentHighBidder.email,
      name: currentHighBidder.name,
      teamName: currentHighBidder.teamName,
      avatarUrl: currentHighBidder.avatarUrl,
      role: currentHighBidder.role,
      budgetRemaining: currentHighBidder.budgetRemaining,
      createdAt: currentHighBidder.createdAt.toISOString(),
    } : null,
  };
}

// Get auction state
router.get('/state', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await getAuctionState();
    const formatted = await formatAuctionState(state);
    res.json(formatted);
  } catch (error) {
    console.error('Get auction state error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start auction for a cricketer (auctioneer only)
router.post('/start', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cricketerId } = req.body;
    const io: Server = req.app.get('io');

    // Verify cricketer exists and is not picked
    const cricketer = await prisma.cricketer.findUnique({ where: { id: cricketerId } });
    if (!cricketer) {
      res.status(404).json({ message: 'Cricketer not found' });
      return;
    }
    if (cricketer.isPicked) {
      res.status(400).json({ message: 'Cricketer already picked' });
      return;
    }

    // Set 60 second timer
    const timerEnd = new Date(Date.now() + 60 * 1000);

    const state = await getAuctionState();
    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        currentCricketerId: cricketerId,
        auctionStatus: 'in_progress',
        timerEndTime: timerEnd,
        timerPausedAt: null,
        currentHighBid: 0,
        currentHighBidderId: null,
      },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Start auction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Place bid
router.post('/bid', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const userId = req.user!.id;
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    // Validate auction is in progress
    if (state.auctionStatus !== 'in_progress') {
      res.status(400).json({ message: 'Auction is not in progress' });
      return;
    }

    if (!state.currentCricketerId) {
      res.status(400).json({ message: 'No cricketer currently up for auction' });
      return;
    }

    // Get user and cricketer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const cricketer = await prisma.cricketer.findUnique({ where: { id: state.currentCricketerId } });

    if (!user || !cricketer) {
      res.status(400).json({ message: 'Invalid user or cricketer' });
      return;
    }

    // Get user's current team
    const userTeam = await prisma.cricketer.findMany({ where: { pickedByUserId: userId } });
    const teamSize = userTeam.length;
    const foreignCount = userTeam.filter(c => c.isForeign).length;

    // Validate team not full
    if (teamSize >= TEAM_SIZE) {
      res.status(400).json({ message: 'Your team is already full' });
      return;
    }

    // Validate foreign player limit
    if (cricketer.isForeign && foreignCount >= MAX_FOREIGNERS) {
      res.status(400).json({ message: 'Maximum foreign players limit reached' });
      return;
    }

    // Validate bid increment
    const minIncrement = state.currentHighBid < 10 ? 0.5 : 1;
    if (amount < state.currentHighBid + minIncrement) {
      res.status(400).json({
        message: `Minimum bid is $${(state.currentHighBid + minIncrement).toFixed(2)}`,
      });
      return;
    }

    // Validate budget
    const remainingSlots = TEAM_SIZE - teamSize - 1;
    const minBudgetNeeded = remainingSlots * MIN_BUDGET_PER_PLAYER;
    const maxBidAllowed = user.budgetRemaining - minBudgetNeeded;

    if (amount > maxBidAllowed) {
      res.status(400).json({
        message: `Maximum bid allowed is $${maxBidAllowed.toFixed(2)}`,
      });
      return;
    }

    // Create bid record
    await prisma.bid.create({
      data: {
        cricketerId: state.currentCricketerId,
        userId,
        amount,
      },
    });

    // Update auction state
    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        currentHighBid: amount,
        currentHighBidderId: userId,
      },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:bid', {
      auctionState: formatted,
      bid: { userId, amount },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add time (auctioneer only)
router.post('/add-time', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { seconds } = req.body;
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    if (!state.timerEndTime) {
      res.status(400).json({ message: 'No active timer' });
      return;
    }

    const newEndTime = new Date(state.timerEndTime.getTime() + seconds * 1000);

    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: { timerEndTime: newEndTime },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Add time error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Pause auction (auctioneer only)
router.post('/pause', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    if (state.auctionStatus !== 'in_progress') {
      res.status(400).json({ message: 'Auction is not in progress' });
      return;
    }

    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        auctionStatus: 'paused',
        timerPausedAt: new Date(),
      },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Pause auction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resume auction (auctioneer only)
router.post('/resume', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    if (state.auctionStatus !== 'paused') {
      res.status(400).json({ message: 'Auction is not paused' });
      return;
    }

    // Calculate new end time based on remaining time
    const pausedAt = state.timerPausedAt!;
    const originalEnd = state.timerEndTime!;
    const remainingMs = originalEnd.getTime() - pausedAt.getTime();
    const newEndTime = new Date(Date.now() + remainingMs);

    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        auctionStatus: 'in_progress',
        timerEndTime: newEndTime,
        timerPausedAt: null,
      },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Resume auction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Skip player (auctioneer only)
router.post('/skip', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    if (!state.currentCricketerId) {
      res.status(400).json({ message: 'No cricketer currently up for auction' });
      return;
    }

    // Mark cricketer as skipped
    const cricketer = await prisma.cricketer.update({
      where: { id: state.currentCricketerId },
      data: { wasSkipped: true },
    });

    // Reset auction state
    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        currentCricketerId: null,
        auctionStatus: 'not_started',
        timerEndTime: null,
        timerPausedAt: null,
        currentHighBid: 0,
        currentHighBidderId: null,
      },
    });

    io.emit('auction:player_skipped', {
      cricketer: {
        id: cricketer.id,
        firstName: cricketer.firstName,
        lastName: cricketer.lastName,
        wasSkipped: cricketer.wasSkipped,
      },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Skip player error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete auction (auctioneer only)
router.post('/complete', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const io: Server = req.app.get('io');

    const state = await getAuctionState();

    const updatedState = await prisma.auctionState.update({
      where: { id: state.id },
      data: {
        auctionStatus: 'completed',
        currentCricketerId: null,
        timerEndTime: null,
        timerPausedAt: null,
        currentHighBid: 0,
        currentHighBidderId: null,
      },
    });

    // Update league mode
    await prisma.leagueState.updateMany({
      data: { mode: 'scoring' },
    });

    const formatted = await formatAuctionState(updatedState);
    io.emit('auction:update', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Complete auction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

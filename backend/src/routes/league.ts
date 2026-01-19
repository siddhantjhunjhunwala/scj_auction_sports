import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to get or create league state
async function getLeagueState() {
  let state = await prisma.leagueState.findFirst();
  if (!state) {
    state = await prisma.leagueState.create({
      data: {},
    });
  }
  return state;
}

// Get league state
router.get('/state', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await getLeagueState();
    res.json({
      id: state.id,
      mode: state.mode,
      subsPeriodActive: state.subsPeriodActive,
      currentSubUserId: state.currentSubUserId,
      currentSubRound: state.currentSubRound,
    });
  } catch (error) {
    console.error('Get league state error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set league mode (auctioneer only)
router.post('/mode', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mode } = req.body;

    const validModes = ['pre_auction', 'auction', 'scoring', 'subs', 'report'];
    if (!validModes.includes(mode)) {
      res.status(400).json({ message: 'Invalid mode' });
      return;
    }

    const state = await getLeagueState();
    const updatedState = await prisma.leagueState.update({
      where: { id: state.id },
      data: { mode },
    });

    res.json({
      id: updatedState.id,
      mode: updatedState.mode,
      subsPeriodActive: updatedState.subsPeriodActive,
      currentSubUserId: updatedState.currentSubUserId,
      currentSubRound: updatedState.currentSubRound,
    });
  } catch (error) {
    console.error('Set league mode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start substitution period (auctioneer only)
router.post('/subs/start', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { round } = req.body as { round: 1 | 2 };

    if (round !== 1 && round !== 2) {
      res.status(400).json({ message: 'Invalid round' });
      return;
    }

    const state = await getLeagueState();
    const updatedState = await prisma.leagueState.update({
      where: { id: state.id },
      data: {
        mode: 'subs',
        subsPeriodActive: true,
        currentSubRound: round,
      },
    });

    res.json({
      id: updatedState.id,
      mode: updatedState.mode,
      subsPeriodActive: updatedState.subsPeriodActive,
      currentSubUserId: updatedState.currentSubUserId,
      currentSubRound: updatedState.currentSubRound,
    });
  } catch (error) {
    console.error('Start subs period error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End substitution period (auctioneer only)
router.post('/subs/end', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await getLeagueState();
    const updatedState = await prisma.leagueState.update({
      where: { id: state.id },
      data: {
        subsPeriodActive: false,
        currentSubUserId: null,
        currentSubRound: null,
      },
    });

    res.json({
      id: updatedState.id,
      mode: updatedState.mode,
      subsPeriodActive: updatedState.subsPeriodActive,
      currentSubUserId: updatedState.currentSubUserId,
      currentSubRound: updatedState.currentSubRound,
    });
  } catch (error) {
    console.error('End subs period error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

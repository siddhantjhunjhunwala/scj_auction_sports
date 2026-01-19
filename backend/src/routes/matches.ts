import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';
import { calculatePoints } from '../utils/pointsCalculator.js';

const router = Router();
const prisma = new PrismaClient();

// Get all matches
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { matchNumber: 'asc' },
    });

    res.json(matches.map(m => ({
      id: m.id,
      matchNumber: m.matchNumber,
      team1: m.team1,
      team2: m.team2,
      matchDate: m.matchDate.toISOString().split('T')[0],
      scoresPopulated: m.scoresPopulated,
      isAutoPopulated: m.isAutoPopulated,
    })));
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get match by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchId = req.params.id as string;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }

    res.json({
      id: match.id,
      matchNumber: match.matchNumber,
      team1: match.team1,
      team2: match.team2,
      matchDate: match.matchDate.toISOString().split('T')[0],
      scoresPopulated: match.scoresPopulated,
      isAutoPopulated: match.isAutoPopulated,
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create match (auctioneer only)
router.post('/', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { matchNumber, team1, team2, matchDate } = req.body;

    // Check if match number already exists
    const existing = await prisma.match.findUnique({ where: { matchNumber } });
    if (existing) {
      res.status(400).json({ message: 'Match number already exists' });
      return;
    }

    const match = await prisma.match.create({
      data: {
        matchNumber,
        team1,
        team2,
        matchDate: new Date(matchDate),
      },
    });

    res.json({
      id: match.id,
      matchNumber: match.matchNumber,
      team1: match.team1,
      team2: match.team2,
      matchDate: match.matchDate.toISOString().split('T')[0],
      scoresPopulated: match.scoresPopulated,
      isAutoPopulated: match.isAutoPopulated,
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get match scores
router.get('/:id/scores', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchId = req.params.id as string;
    const scores = await prisma.playerMatchScore.findMany({
      where: { matchId },
      include: { cricketer: true },
    });

    res.json(scores.map(s => ({
      id: s.id,
      matchId: s.matchId,
      cricketerId: s.cricketerId,
      inPlayingXi: s.inPlayingXi,
      runs: s.runs,
      ballsFaced: s.ballsFaced,
      fours: s.fours,
      sixes: s.sixes,
      wickets: s.wickets,
      oversBowled: s.oversBowled,
      runsConceded: s.runsConceded,
      maidens: s.maidens,
      dotBalls: s.dotBalls,
      catches: s.catches,
      stumpings: s.stumpings,
      directRunouts: s.directRunouts,
      indirectRunouts: s.indirectRunouts,
      dismissalType: s.dismissalType,
      lbwBowledDismissals: s.lbwBowledDismissals,
      calculatedPoints: s.calculatedPoints,
      cricketer: {
        id: s.cricketer.id,
        firstName: s.cricketer.firstName,
        lastName: s.cricketer.lastName,
        playerType: s.cricketer.playerType,
        isForeign: s.cricketer.isForeign,
        iplTeam: s.cricketer.iplTeam,
      },
    })));
  } catch (error) {
    console.error('Get match scores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save match scores (auctioneer only)
router.post('/:id/scores', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchId = req.params.id as string;
    const { scores } = req.body as { scores: Array<{
      cricketerId: string;
      inPlayingXi?: boolean;
      runs?: number;
      ballsFaced?: number;
      fours?: number;
      sixes?: number;
      wickets?: number;
      oversBowled?: number;
      runsConceded?: number;
      maidens?: number;
      dotBalls?: number;
      catches?: number;
      stumpings?: number;
      directRunouts?: number;
      indirectRunouts?: number;
      dismissalType?: string | null;
      lbwBowledDismissals?: number;
    }> };

    const savedScores = [];

    for (const scoreData of scores) {
      const points = calculatePoints(scoreData);

      const score = await prisma.playerMatchScore.upsert({
        where: {
          matchId_cricketerId: {
            matchId,
            cricketerId: scoreData.cricketerId,
          },
        },
        update: {
          inPlayingXi: scoreData.inPlayingXi ?? true,
          runs: scoreData.runs ?? 0,
          ballsFaced: scoreData.ballsFaced ?? 0,
          fours: scoreData.fours ?? 0,
          sixes: scoreData.sixes ?? 0,
          wickets: scoreData.wickets ?? 0,
          oversBowled: scoreData.oversBowled ?? 0,
          runsConceded: scoreData.runsConceded ?? 0,
          maidens: scoreData.maidens ?? 0,
          dotBalls: scoreData.dotBalls ?? 0,
          catches: scoreData.catches ?? 0,
          stumpings: scoreData.stumpings ?? 0,
          directRunouts: scoreData.directRunouts ?? 0,
          indirectRunouts: scoreData.indirectRunouts ?? 0,
          dismissalType: scoreData.dismissalType ?? null,
          lbwBowledDismissals: scoreData.lbwBowledDismissals ?? 0,
          calculatedPoints: points,
        },
        create: {
          matchId,
          cricketerId: scoreData.cricketerId,
          inPlayingXi: scoreData.inPlayingXi ?? true,
          runs: scoreData.runs ?? 0,
          ballsFaced: scoreData.ballsFaced ?? 0,
          fours: scoreData.fours ?? 0,
          sixes: scoreData.sixes ?? 0,
          wickets: scoreData.wickets ?? 0,
          oversBowled: scoreData.oversBowled ?? 0,
          runsConceded: scoreData.runsConceded ?? 0,
          maidens: scoreData.maidens ?? 0,
          dotBalls: scoreData.dotBalls ?? 0,
          catches: scoreData.catches ?? 0,
          stumpings: scoreData.stumpings ?? 0,
          directRunouts: scoreData.directRunouts ?? 0,
          indirectRunouts: scoreData.indirectRunouts ?? 0,
          dismissalType: scoreData.dismissalType ?? null,
          lbwBowledDismissals: scoreData.lbwBowledDismissals ?? 0,
          calculatedPoints: points,
        },
      });

      savedScores.push(score);
    }

    // Mark match as scores populated
    await prisma.match.update({
      where: { id: matchId },
      data: { scoresPopulated: true },
    });

    res.json(savedScores.map(s => ({
      id: s.id,
      matchId: s.matchId,
      cricketerId: s.cricketerId,
      inPlayingXi: s.inPlayingXi,
      runs: s.runs,
      ballsFaced: s.ballsFaced,
      fours: s.fours,
      sixes: s.sixes,
      wickets: s.wickets,
      oversBowled: s.oversBowled,
      runsConceded: s.runsConceded,
      maidens: s.maidens,
      dotBalls: s.dotBalls,
      catches: s.catches,
      stumpings: s.stumpings,
      directRunouts: s.directRunouts,
      indirectRunouts: s.indirectRunouts,
      dismissalType: s.dismissalType,
      lbwBowledDismissals: s.lbwBowledDismissals,
      calculatedPoints: s.calculatedPoints,
    })));
  } catch (error) {
    console.error('Save match scores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Auto-populate scores (auctioneer only) - stub for now
router.post('/:id/auto-populate', auctioneerOnly, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically use the cricinfo scraper
    // For now, return an error indicating manual entry is needed
    res.status(501).json({
      message: 'Auto-populate not available. Please enter scores manually.',
    });
  } catch (error) {
    console.error('Auto-populate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

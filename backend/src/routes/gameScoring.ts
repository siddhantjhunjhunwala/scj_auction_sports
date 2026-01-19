import { Router, Response } from 'express';
import { PrismaClient, PointSystemConfig } from '@prisma/client';
import PDFDocument from 'pdfkit';
import {
  GameAuthRequest,
  gameAccessMiddleware,
  gameCreatorOnly,
} from '../middleware/gameAuth.js';
import { sendTeamsPdf } from '../services/emailService.js';
import { validateBody } from '../middleware/validate.js';
import { createMatchSchema, saveMatchScoresSchema } from '../validation/schemas.js';

const router = Router();
const prisma = new PrismaClient();

interface ScoreData {
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
}

// Calculate points with custom config
function calculatePointsWithConfig(score: ScoreData, config: PointSystemConfig): number {
  let total = 0;

  // Playing XI bonus
  if (score.inPlayingXi) {
    total += config.playingXiBonus;
  }

  // Batting points
  const runs = score.runs || 0;
  const ballsFaced = score.ballsFaced || 0;
  const fours = score.fours || 0;
  const sixes = score.sixes || 0;

  total += runs * config.runPoints;
  total += fours * config.fourBonus;
  total += sixes * config.sixBonus;

  // Runs bonus (exclusive tiers)
  if (runs >= 100) {
    total += config.runs100Bonus;
  } else if (runs >= 75) {
    total += config.runs75Bonus;
  } else if (runs >= 50) {
    total += config.runs50Bonus;
  } else if (runs >= 25) {
    total += config.runs25Bonus;
  }

  // Duck penalty
  if (runs === 0 && score.dismissalType && ballsFaced > 0) {
    total += config.duckPenalty; // Should be negative
  }

  // Strike rate bonus (minimum 10 balls faced)
  if (ballsFaced >= 10) {
    const strikeRate = (runs / ballsFaced) * 100;
    if (strikeRate >= 170) {
      total += config.sr170Bonus;
    } else if (strikeRate >= 150) {
      total += config.sr150Bonus;
    } else if (strikeRate >= 130) {
      total += config.sr130Bonus;
    }
  }

  // Bowling points
  const wickets = score.wickets || 0;
  const oversBowled = score.oversBowled || 0;
  const runsConceded = score.runsConceded || 0;
  const maidens = score.maidens || 0;
  const dotBalls = score.dotBalls || 0;
  const lbwBowledDismissals = score.lbwBowledDismissals || 0;

  total += wickets * config.wicketPoints;
  total += lbwBowledDismissals * config.lbwBowledBonus;
  total += maidens * config.maidenPoints;
  total += dotBalls * config.dotBallPoints;

  // Wickets bonus (exclusive tiers)
  if (wickets >= 5) {
    total += config.wickets5Bonus;
  } else if (wickets >= 4) {
    total += config.wickets4Bonus;
  } else if (wickets >= 3) {
    total += config.wickets3Bonus;
  }

  // Economy bonus (minimum 2 overs)
  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) {
      total += config.econ5Bonus;
    } else if (economy < 6) {
      total += config.econ6Bonus;
    } else if (economy < 7) {
      total += config.econ7Bonus;
    }
  }

  // Fielding points
  const catches = score.catches || 0;
  const stumpings = score.stumpings || 0;
  const directRunouts = score.directRunouts || 0;
  const indirectRunouts = score.indirectRunouts || 0;

  total += catches * config.catchPoints;
  if (catches >= 3) {
    total += config.catches3Bonus;
  }
  total += stumpings * config.stumpingPoints;
  total += directRunouts * config.directRunout;
  total += indirectRunouts * config.indirectRunout;

  return total;
}

// Get all matches for a game
router.get(
  '/:gameId/matches',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;

      const matches = await prisma.gameMatch.findMany({
        where: { gameId },
        orderBy: { matchNumber: 'asc' },
      });

      res.json(
        matches.map(m => ({
          id: m.id,
          gameId: m.gameId,
          matchNumber: m.matchNumber,
          team1: m.team1,
          team2: m.team2,
          matchDate: m.matchDate.toISOString().split('T')[0],
          scoresPopulated: m.scoresPopulated,
          isAutoPopulated: m.isAutoPopulated,
        }))
      );
    } catch (error) {
      console.error('Get game matches error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Create match (creator only)
router.post(
  '/:gameId/matches',
  gameAccessMiddleware,
  gameCreatorOnly,
  validateBody(createMatchSchema),
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;
      const { matchNumber, team1, team2, matchDate } = req.body;

      // Check if match number already exists for this game
      const existing = await prisma.gameMatch.findUnique({
        where: { gameId_matchNumber: { gameId, matchNumber } },
      });

      if (existing) {
        res.status(400).json({ message: 'Match number already exists for this game' });
        return;
      }

      // Update game status to scoring if needed
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'scoring' },
      });

      const match = await prisma.gameMatch.create({
        data: {
          gameId,
          matchNumber,
          team1,
          team2,
          matchDate: new Date(matchDate),
        },
      });

      res.json({
        id: match.id,
        gameId: match.gameId,
        matchNumber: match.matchNumber,
        team1: match.team1,
        team2: match.team2,
        matchDate: match.matchDate.toISOString().split('T')[0],
        scoresPopulated: match.scoresPopulated,
        isAutoPopulated: match.isAutoPopulated,
      });
    } catch (error) {
      console.error('Create game match error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get match scores
router.get(
  '/:gameId/matches/:matchId/scores',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { matchId } = req.params;

      const scores = await prisma.gamePlayerMatchScore.findMany({
        where: { gameMatchId: matchId },
        include: {
          cricketer: {
            include: {
              pickedBy: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      teamName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.json(
        scores.map(s => ({
          id: s.id,
          gameMatchId: s.gameMatchId,
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
            pickedBy: s.cricketer.pickedBy,
          },
        }))
      );
    } catch (error) {
      console.error('Get game match scores error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Save match scores (creator only)
router.post(
  '/:gameId/matches/:matchId/scores',
  gameAccessMiddleware,
  gameCreatorOnly,
  validateBody(saveMatchScoresSchema),
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId, matchId } = req.params;
      const { scores } = req.body as {
        scores: Array<
          ScoreData & {
            cricketerId: string;
          }
        >;
      };

      // Get point config for this game
      let config = await prisma.pointSystemConfig.findUnique({
        where: { gameId },
      });

      if (!config) {
        config = await prisma.pointSystemConfig.create({
          data: { gameId },
        });
      }

      const savedScores = [];

      for (const scoreData of scores) {
        const points = calculatePointsWithConfig(scoreData, config);

        const score = await prisma.gamePlayerMatchScore.upsert({
          where: {
            gameMatchId_cricketerId: {
              gameMatchId: matchId,
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
            gameMatchId: matchId,
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
      await prisma.gameMatch.update({
        where: { id: matchId },
        data: { scoresPopulated: true },
      });

      res.json(savedScores);
    } catch (error) {
      console.error('Save game match scores error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get leaderboard for a game (cumulative up to a specific match)
router.get(
  '/:gameId/leaderboard',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;
      const upToMatch = req.query.upToMatch ? parseInt(req.query.upToMatch as string) : undefined;

      // Get all participants with their teams
      const participants = await prisma.gameParticipant.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              teamName: true,
              avatarUrl: true,
            },
          },
          cricketers: true,
        },
      });

      // Get matches for filtering
      const matchFilter = upToMatch
        ? { gameId, matchNumber: { lte: upToMatch } }
        : { gameId };

      const matches = await prisma.gameMatch.findMany({
        where: matchFilter,
        select: { id: true, matchNumber: true },
      });

      const matchIds = matches.map(m => m.id);

      // Calculate points for each participant
      const leaderboard = await Promise.all(
        participants.map(async participant => {
          const cricketerIds = participant.cricketers.map(c => c.id);

          // Get scores for participant's cricketers in the specified matches
          const scores = await prisma.gamePlayerMatchScore.findMany({
            where: {
              gameMatchId: { in: matchIds },
              cricketerId: { in: cricketerIds },
            },
          });

          const totalPoints = scores.reduce((sum, s) => sum + s.calculatedPoints, 0);

          // Get points per match for chart data
          const pointsByMatch = matches.map(match => {
            const matchScores = scores.filter(s => s.gameMatchId === match.id);
            return {
              matchNumber: match.matchNumber,
              points: matchScores.reduce((sum, s) => sum + s.calculatedPoints, 0),
            };
          });

          return {
            participant: {
              id: participant.id,
              user: participant.user,
              budgetRemaining: participant.budgetRemaining,
            },
            totalPoints,
            pointsByMatch,
            teamSize: participant.cricketers.length,
          };
        })
      );

      // Sort by total points descending
      leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

      // Add rank
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      res.json({
        leaderboard: rankedLeaderboard,
        matchCount: matches.length,
        upToMatch: upToMatch || matches.length,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get participant's dashboard data
router.get(
  '/:gameId/dashboard/:participantId',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId, participantId } = req.params;
      const upToMatch = req.query.upToMatch ? parseInt(req.query.upToMatch as string) : undefined;

      const participant = await prisma.gameParticipant.findUnique({
        where: { id: participantId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              teamName: true,
              avatarUrl: true,
            },
          },
          cricketers: true,
        },
      });

      if (!participant || participant.gameId !== gameId) {
        res.status(404).json({ message: 'Participant not found' });
        return;
      }

      // Get matches
      const matchFilter = upToMatch
        ? { gameId, matchNumber: { lte: upToMatch } }
        : { gameId };

      const matches = await prisma.gameMatch.findMany({
        where: matchFilter,
        orderBy: { matchNumber: 'asc' },
      });

      const matchIds = matches.map(m => m.id);
      const cricketerIds = participant.cricketers.map(c => c.id);

      // Get all scores for this participant's team
      const scores = await prisma.gamePlayerMatchScore.findMany({
        where: {
          gameMatchId: { in: matchIds },
          cricketerId: { in: cricketerIds },
        },
        include: {
          cricketer: true,
          match: true,
        },
      });

      // Calculate player-wise stats
      const playerStats = participant.cricketers.map(cricketer => {
        const playerScores = scores.filter(s => s.cricketerId === cricketer.id);
        const totalPoints = playerScores.reduce((sum, s) => sum + s.calculatedPoints, 0);
        const matchesPlayed = playerScores.filter(s => s.inPlayingXi).length;

        return {
          cricketer: {
            id: cricketer.id,
            firstName: cricketer.firstName,
            lastName: cricketer.lastName,
            playerType: cricketer.playerType,
            isForeign: cricketer.isForeign,
            iplTeam: cricketer.iplTeam,
            pricePaid: cricketer.pricePaid,
          },
          totalPoints,
          matchesPlayed,
          pointsPerMatch: matchesPlayed > 0 ? totalPoints / matchesPlayed : 0,
          valueRatio: cricketer.pricePaid ? totalPoints / cricketer.pricePaid : 0,
        };
      });

      // Sort by total points
      playerStats.sort((a, b) => b.totalPoints - a.totalPoints);

      // Calculate total points
      const totalPoints = playerStats.reduce((sum, p) => sum + p.totalPoints, 0);

      // Get leaderboard position
      const allParticipants = await prisma.gameParticipant.findMany({
        where: { gameId },
        include: { cricketers: true },
      });

      const rankings = await Promise.all(
        allParticipants.map(async p => {
          const pCricketerIds = p.cricketers.map(c => c.id);
          const pScores = await prisma.gamePlayerMatchScore.findMany({
            where: {
              gameMatchId: { in: matchIds },
              cricketerId: { in: pCricketerIds },
            },
          });
          return {
            participantId: p.id,
            points: pScores.reduce((sum, s) => sum + s.calculatedPoints, 0),
          };
        })
      );

      rankings.sort((a, b) => b.points - a.points);
      const rank = rankings.findIndex(r => r.participantId === participantId) + 1;

      res.json({
        participant: {
          id: participant.id,
          user: participant.user,
          budgetRemaining: participant.budgetRemaining,
        },
        totalPoints,
        rank,
        totalParticipants: allParticipants.length,
        playerStats,
        matchCount: matches.length,
      });
    } catch (error) {
      console.error('Get participant dashboard error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Generate teams PDF
router.get(
  '/:gameId/reports/teams-pdf',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;

      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      const participants = await prisma.gameParticipant.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              teamName: true,
            },
          },
          cricketers: {
            orderBy: { pricePaid: 'desc' },
          },
        },
      });

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));

      // Title
      doc.fontSize(24).text(`${game?.name || 'Fantasy IPL'} - Team Summary`, {
        align: 'center',
      });
      doc.moveDown(2);

      // Each participant's team
      for (const participant of participants) {
        doc.fontSize(16).text(participant.user.teamName || participant.user.name, {
          underline: true,
        });
        doc.fontSize(10).text(`Budget Remaining: $${participant.budgetRemaining.toFixed(2)}`);
        doc.moveDown(0.5);

        // Table header
        doc.fontSize(10);
        const tableTop = doc.y;
        doc.text('Player', 50, tableTop, { width: 150 });
        doc.text('Type', 200, tableTop, { width: 80 });
        doc.text('Team', 280, tableTop, { width: 80 });
        doc.text('Price', 360, tableTop, { width: 60 });
        doc.moveDown(0.5);

        // Players
        for (const cricketer of participant.cricketers) {
          const y = doc.y;
          doc.text(`${cricketer.firstName} ${cricketer.lastName}${cricketer.isForeign ? ' *' : ''}`, 50, y, { width: 150 });
          doc.text(cricketer.playerType, 200, y, { width: 80 });
          doc.text(cricketer.iplTeam, 280, y, { width: 80 });
          doc.text(`$${cricketer.pricePaid?.toFixed(2) || '0.00'}`, 360, y, { width: 60 });
          doc.moveDown(0.3);
        }

        doc.moveDown(1);

        // Add page break if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      }

      doc.end();

      await new Promise<void>(resolve => doc.on('end', resolve));

      const pdfBuffer = Buffer.concat(chunks);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${game?.name || 'teams'}_summary.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Generate teams PDF error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Email teams PDF to all participants
router.post(
  '/:gameId/reports/email',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;

      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      const participants = await prisma.gameParticipant.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              teamName: true,
            },
          },
          cricketers: {
            orderBy: { pricePaid: 'desc' },
          },
        },
      });

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));

      doc.fontSize(24).text(`${game.name} - Team Summary`, { align: 'center' });
      doc.moveDown(2);

      for (const participant of participants) {
        doc.fontSize(16).text(participant.user.teamName || participant.user.name, {
          underline: true,
        });
        doc.fontSize(10).text(`Budget Remaining: $${participant.budgetRemaining.toFixed(2)}`);
        doc.moveDown(0.5);

        doc.fontSize(10);
        const tableTop = doc.y;
        doc.text('Player', 50, tableTop, { width: 150 });
        doc.text('Type', 200, tableTop, { width: 80 });
        doc.text('Team', 280, tableTop, { width: 80 });
        doc.text('Price', 360, tableTop, { width: 60 });
        doc.moveDown(0.5);

        for (const cricketer of participant.cricketers) {
          const y = doc.y;
          doc.text(`${cricketer.firstName} ${cricketer.lastName}${cricketer.isForeign ? ' *' : ''}`, 50, y, { width: 150 });
          doc.text(cricketer.playerType, 200, y, { width: 80 });
          doc.text(cricketer.iplTeam, 280, y, { width: 80 });
          doc.text(`$${cricketer.pricePaid?.toFixed(2) || '0.00'}`, 360, y, { width: 60 });
          doc.moveDown(0.3);
        }

        doc.moveDown(1);
        if (doc.y > 700) {
          doc.addPage();
        }
      }

      doc.end();

      await new Promise<void>(resolve => doc.on('end', resolve));

      const pdfBuffer = Buffer.concat(chunks);

      // Get all participant emails
      const emails = participants.map(p => p.user.email);

      // Send emails
      const results = await sendTeamsPdf(emails, pdfBuffer, game.name);

      res.json({
        message: 'Emails sent',
        success: results.success,
        failed: results.failed,
      });
    } catch (error) {
      console.error('Email teams PDF error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;

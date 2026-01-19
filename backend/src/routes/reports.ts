import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
];

// Helper to calculate rankings up to a specific match
async function calculateRankings(upToMatchNumber: number) {
  const players = await prisma.user.findMany({
    where: { role: 'player' },
  });

  const matches = await prisma.match.findMany({
    where: {
      matchNumber: { lte: upToMatchNumber },
      scoresPopulated: true,
    },
    orderBy: { matchNumber: 'asc' },
  });

  const playerData: {
    user: typeof players[0];
    totalPoints: number;
    previousPoints: number;
    pointsChange: number;
    pointsPerMatch: number[];
  }[] = [];

  for (const player of players) {
    const team = await prisma.cricketer.findMany({
      where: { pickedByUserId: player.id },
    });

    let totalPoints = 0;
    let previousPoints = 0;
    const pointsPerMatch: number[] = [];

    for (const match of matches) {
      let matchPoints = 0;
      for (const cricketer of team) {
        const score = await prisma.playerMatchScore.findUnique({
          where: {
            matchId_cricketerId: {
              matchId: match.id,
              cricketerId: cricketer.id,
            },
          },
        });
        if (score) {
          matchPoints += score.calculatedPoints;
        }
      }

      if (match.matchNumber < upToMatchNumber) {
        previousPoints += matchPoints;
      }
      totalPoints += matchPoints;
      pointsPerMatch.push(totalPoints);
    }

    playerData.push({
      user: player,
      totalPoints,
      previousPoints,
      pointsChange: totalPoints - previousPoints,
      pointsPerMatch,
    });
  }

  // Sort by total points (descending)
  playerData.sort((a, b) => b.totalPoints - a.totalPoints);

  // Calculate previous rankings
  const previousRankings = [...playerData]
    .sort((a, b) => b.previousPoints - a.previousPoints)
    .map((p, i) => ({ id: p.user.id, rank: i + 1 }));

  return playerData.map((p, i) => ({
    rank: i + 1,
    previousRank: previousRankings.find(pr => pr.id === p.user.id)?.rank || null,
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
    totalPoints: p.totalPoints,
    previousPoints: p.previousPoints,
    pointsChange: p.pointsChange,
    pointsPerMatch: p.pointsPerMatch,
  }));
}

// Helper to calculate fun stats
async function calculateFunStats(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return null;

  const players = await prisma.user.findMany({ where: { role: 'player' } });

  let topScorer: { user: typeof players[0]; points: number } | null = null;
  let mostBatsmanPoints: { user: typeof players[0]; points: number } | null = null;
  let mostBowlerPoints: { user: typeof players[0]; points: number } | null = null;
  let mostForeignerPoints: { user: typeof players[0]; points: number } | null = null;

  for (const player of players) {
    const team = await prisma.cricketer.findMany({
      where: { pickedByUserId: player.id },
    });

    let totalMatchPoints = 0;
    let batsmanPoints = 0;
    let bowlerPoints = 0;
    let foreignerPoints = 0;

    for (const cricketer of team) {
      const score = await prisma.playerMatchScore.findUnique({
        where: {
          matchId_cricketerId: {
            matchId,
            cricketerId: cricketer.id,
          },
        },
      });

      if (score) {
        totalMatchPoints += score.calculatedPoints;

        if (cricketer.playerType === 'batsman') {
          batsmanPoints += score.calculatedPoints;
        }
        if (cricketer.playerType === 'bowler') {
          bowlerPoints += score.calculatedPoints;
        }
        if (cricketer.isForeign) {
          foreignerPoints += score.calculatedPoints;
        }
      }
    }

    if (!topScorer || totalMatchPoints > topScorer.points) {
      topScorer = { user: player, points: totalMatchPoints };
    }
    if (!mostBatsmanPoints || batsmanPoints > mostBatsmanPoints.points) {
      mostBatsmanPoints = { user: player, points: batsmanPoints };
    }
    if (!mostBowlerPoints || bowlerPoints > mostBowlerPoints.points) {
      mostBowlerPoints = { user: player, points: bowlerPoints };
    }
    if (!mostForeignerPoints || foreignerPoints > mostForeignerPoints.points) {
      mostForeignerPoints = { user: player, points: foreignerPoints };
    }
  }

  // Best/Worst value picks
  const allPicked = await prisma.cricketer.findMany({
    where: { isPicked: true, pricePaid: { gt: 0 } },
  });

  let bestValue: { cricketer: typeof allPicked[0]; pointsPerDollar: number } | null = null;
  let worstValue: { cricketer: typeof allPicked[0]; pointsPerDollar: number } | null = null;

  for (const cricketer of allPicked) {
    const scores = await prisma.playerMatchScore.findMany({
      where: { cricketerId: cricketer.id },
    });
    const totalPoints = scores.reduce((sum, s) => sum + s.calculatedPoints, 0);
    const pointsPerDollar = totalPoints / (cricketer.pricePaid || 1);

    if (!bestValue || pointsPerDollar > bestValue.pointsPerDollar) {
      bestValue = { cricketer, pointsPerDollar };
    }
    if (!worstValue || pointsPerDollar < worstValue.pointsPerDollar) {
      worstValue = { cricketer, pointsPerDollar };
    }
  }

  const formatUser = (user: typeof players[0]) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    teamName: user.teamName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    budgetRemaining: user.budgetRemaining,
    createdAt: user.createdAt.toISOString(),
  });

  const formatCricketer = (c: typeof allPicked[0]) => ({
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
  });

  return {
    topScorer: topScorer ? { user: formatUser(topScorer.user), points: topScorer.points } : null,
    mostBatsmanPoints: mostBatsmanPoints ? { user: formatUser(mostBatsmanPoints.user), points: mostBatsmanPoints.points } : null,
    mostBowlerPoints: mostBowlerPoints ? { user: formatUser(mostBowlerPoints.user), points: mostBowlerPoints.points } : null,
    mostForeignerPoints: mostForeignerPoints ? { user: formatUser(mostForeignerPoints.user), points: mostForeignerPoints.points } : null,
    bestValuePick: bestValue ? { cricketer: formatCricketer(bestValue.cricketer), pointsPerDollar: bestValue.pointsPerDollar } : null,
    worstValuePick: worstValue ? { cricketer: formatCricketer(worstValue.cricketer), pointsPerDollar: worstValue.pointsPerDollar } : null,
  };
}

// Generate report data
router.get('/match/:matchNumber', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchNumberParam = req.params.matchNumber as string;
    const matchNumber = parseInt(matchNumberParam);

    const match = await prisma.match.findUnique({
      where: { matchNumber },
    });

    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }

    if (!match.scoresPopulated) {
      res.status(400).json({ message: 'Scores not yet populated for this match' });
      return;
    }

    const rankings = await calculateRankings(matchNumber);
    const funStats = await calculateFunStats(match.id);

    // Build points progression
    const pointsProgression = rankings.map((r, i) => ({
      userId: r.user.id,
      userName: r.user.name,
      teamName: r.user.teamName || r.user.name,
      color: COLORS[i % COLORS.length],
      points: r.pointsPerMatch,
    }));

    res.json({
      matchNumber,
      matchDate: match.matchDate.toISOString().split('T')[0],
      rankings,
      funStats,
      pointsProgression,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download PDF report
router.get('/match/:matchNumber/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchNumberParam = req.params.matchNumber as string;
    const matchNumber = parseInt(matchNumberParam);

    const match = await prisma.match.findUnique({
      where: { matchNumber },
    });

    if (!match || !match.scoresPopulated) {
      res.status(404).json({ message: 'Match not found or scores not populated' });
      return;
    }

    const rankings = await calculateRankings(matchNumber);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fantasy-ipl-report-match-${matchNumber}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).text('Fantasy IPL League Report', { align: 'center' });
    doc.fontSize(14).text(`Match ${matchNumber} - ${match.matchDate.toISOString().split('T')[0]}`, { align: 'center' });
    doc.moveDown();

    // Rankings table
    doc.fontSize(18).text('Current Rankings', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 100;
    const col3 = 200;
    const col4 = 350;
    const col5 = 450;

    // Header row
    doc.font('Helvetica-Bold');
    doc.text('Rank', col1, tableTop);
    doc.text('Player', col2, tableTop);
    doc.text('Team', col3, tableTop);
    doc.text('Points', col4, tableTop);
    doc.text('Change', col5, tableTop);
    doc.font('Helvetica');

    let y = tableTop + 20;

    for (const ranking of rankings) {
      doc.text(`#${ranking.rank}`, col1, y);
      doc.text(ranking.user.name, col2, y);
      doc.text(ranking.user.teamName || '-', col3, y);
      doc.text(ranking.totalPoints.toString(), col4, y);
      doc.text(`+${ranking.pointsChange}`, col5, y);
      y += 20;
    }

    doc.moveDown(2);

    // Footer
    doc.fontSize(10).text('Generated by Fantasy IPL Auction League App', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Email report to all players (auctioneer only)
router.post('/match/:matchNumber/email', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchNumberParam = req.params.matchNumber as string;
    const matchNumber = parseInt(matchNumberParam);

    const match = await prisma.match.findUnique({
      where: { matchNumber },
    });

    if (!match || !match.scoresPopulated) {
      res.status(404).json({ message: 'Match not found or scores not populated' });
      return;
    }

    const rankings = await calculateRankings(matchNumber);
    const players = await prisma.user.findMany({ where: { role: 'player' } });

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Build email content
    let rankingsHtml = '<table border="1" cellpadding="5"><tr><th>Rank</th><th>Player</th><th>Team</th><th>Points</th></tr>';
    for (const r of rankings) {
      rankingsHtml += `<tr><td>${r.rank}</td><td>${r.user.name}</td><td>${r.user.teamName || '-'}</td><td>${r.totalPoints}</td></tr>`;
    }
    rankingsHtml += '</table>';

    const html = `
      <h1>Fantasy IPL League Report - Match ${matchNumber}</h1>
      <p>Date: ${match.matchDate.toISOString().split('T')[0]}</p>
      <h2>Current Rankings</h2>
      ${rankingsHtml}
      <p>Generated by Fantasy IPL Auction League App</p>
    `;

    // Send to all players
    for (const player of players) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Fantasy IPL <noreply@example.com>',
        to: player.email,
        subject: `Fantasy IPL Report - Match ${matchNumber}`,
        html,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Email report error:', error);
    res.status(500).json({ message: 'Failed to send emails' });
  }
});

export default router;

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { gameAccessMiddleware, GameAuthRequest } from '../middleware/gameAuth.js';
import {
  getParticipantAchievements,
  getAchievementLeaderboard,
  seedAchievements,
  ACHIEVEMENT_DEFINITIONS,
} from '../services/achievementService.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Helper to extract param safely
function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const val = params[key];
  if (Array.isArray(val)) return val[0];
  return val || '';
}

// Seed achievements (admin/setup endpoint)
router.post('/seed', authMiddleware, async (req, res: Response): Promise<void> => {
  try {
    await seedAchievements();
    res.json({ message: 'Achievements seeded successfully' });
  } catch (error) {
    console.error('Error seeding achievements:', error);
    res.status(500).json({ message: 'Failed to seed achievements' });
  }
});

// Get all available achievement definitions
router.get('/definitions', authMiddleware, async (_req, res: Response): Promise<void> => {
  try {
    const definitions = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([type, def]) => ({
      type,
      ...def,
    }));
    res.json(definitions);
  } catch (error) {
    console.error('Error getting achievement definitions:', error);
    res.status(500).json({ message: 'Failed to get achievement definitions' });
  }
});

// Get achievements for current user in a game
router.get(
  '/game/:gameId/my-achievements',
  authMiddleware,
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getParam(req.params, 'gameId');
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Find participant
      const participant = await prisma.gameParticipant.findUnique({
        where: {
          gameId_userId: { gameId, userId },
        },
      });

      if (!participant) {
        res.status(404).json({ message: 'Participant not found' });
        return;
      }

      const achievements = await getParticipantAchievements(participant.id);

      // Get all definitions to show progress
      const allDefinitions = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([type, def]) => ({
        type,
        ...def,
      }));

      const earnedTypes = new Set(achievements.map((a) => a.achievement.type));

      const response = {
        earned: achievements.map((a) => ({
          type: a.achievement.type,
          name: a.achievement.name,
          description: a.achievement.description,
          iconEmoji: a.achievement.iconEmoji,
          rarity: a.achievement.rarity,
          points: a.achievement.points,
          earnedAt: a.earnedAt,
          metadata: a.metadata,
        })),
        available: allDefinitions.filter((d) => !earnedTypes.has(d.type as never)),
        totalEarned: achievements.length,
        totalPoints: achievements.reduce((sum, a) => sum + a.achievement.points, 0),
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting achievements:', error);
      res.status(500).json({ message: 'Failed to get achievements' });
    }
  }
);

// Get achievement leaderboard for a game
router.get(
  '/game/:gameId/leaderboard',
  authMiddleware,
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getParam(req.params, 'gameId');
      const leaderboard = await getAchievementLeaderboard(gameId);
      res.json(leaderboard);
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error);
      res.status(500).json({ message: 'Failed to get achievement leaderboard' });
    }
  }
);

// Get achievements for a specific participant (for viewing other players)
router.get(
  '/game/:gameId/participant/:participantId',
  authMiddleware,
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const participantId = getParam(req.params, 'participantId');

      const achievements = await getParticipantAchievements(participantId);

      const response = achievements.map((a) => ({
        type: a.achievement.type,
        name: a.achievement.name,
        description: a.achievement.description,
        iconEmoji: a.achievement.iconEmoji,
        rarity: a.achievement.rarity,
        points: a.achievement.points,
        earnedAt: a.earnedAt,
      }));

      res.json(response);
    } catch (error) {
      console.error('Error getting participant achievements:', error);
      res.status(500).json({ message: 'Failed to get participant achievements' });
    }
  }
);

// Get recent achievements across all participants in a game (for activity feed)
router.get(
  '/game/:gameId/recent',
  authMiddleware,
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getParam(req.params, 'gameId');
      const limit = parseInt(req.query.limit as string) || 20;

      const recentAchievements = await prisma.participantAchievement.findMany({
        where: {
          participant: {
            gameId,
          },
        },
        include: {
          achievement: true,
          participant: {
            include: {
              user: {
                select: {
                  name: true,
                  teamName: true,
                },
              },
            },
          },
        },
        orderBy: { earnedAt: 'desc' },
        take: limit,
      });

      const response = recentAchievements.map((a) => ({
        achievementType: a.achievement.type,
        achievementName: a.achievement.name,
        iconEmoji: a.achievement.iconEmoji,
        rarity: a.achievement.rarity,
        userName: a.participant.user.name,
        teamName: a.participant.user.teamName,
        earnedAt: a.earnedAt,
        metadata: a.metadata,
      }));

      res.json(response);
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      res.status(500).json({ message: 'Failed to get recent achievements' });
    }
  }
);

export default router;

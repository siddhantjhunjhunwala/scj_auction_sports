import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import {
  GameAuthRequest,
  gameAccessMiddleware,
  gameCreatorOnly,
  ensureParticipantInfo,
} from '../middleware/gameAuth.js';
import { validateBody } from '../middleware/validate.js';
import { placeBidSchema, startAuctionSchema } from '../validation/schemas.js';
import {
  checkAuctionAchievements,
  checkAuctionEndAchievements,
} from '../services/achievementService.js';

const router = Router();
const prisma = new PrismaClient();

const TEAM_SIZE = 12;
const MAX_FOREIGNERS = 4;
const MIN_BUDGET_PER_PLAYER = 0.5;

// Helper to safely get gameId from params
function getGameId(params: Record<string, string | string[] | undefined>): string {
  const gameId = params.gameId;
  if (Array.isArray(gameId)) return gameId[0];
  return gameId || '';
}

// Helper to get or create game auction state
async function getGameAuctionState(gameId: string) {
  let state = await prisma.gameAuctionState.findUnique({
    where: { gameId },
  });

  if (!state) {
    state = await prisma.gameAuctionState.create({
      data: { gameId },
    });
  }

  return state;
}

// Helper to format auction state response
async function formatGameAuctionState(state: Awaited<ReturnType<typeof getGameAuctionState>>) {
  const currentCricketer = state.currentCricketerId
    ? await prisma.gameCricketer.findUnique({
        where: { id: state.currentCricketerId },
      })
    : null;

  const currentHighBidder = state.currentHighBidderId
    ? await prisma.gameParticipant.findUnique({
        where: { id: state.currentHighBidderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              teamName: true,
              avatarUrl: true,
            },
          },
        },
      })
    : null;

  return {
    id: state.id,
    gameId: state.gameId,
    currentCricketerId: state.currentCricketerId,
    auctionStatus: state.auctionStatus,
    timerEndTime: state.timerEndTime?.toISOString() || null,
    timerPausedAt: state.timerPausedAt?.toISOString() || null,
    currentHighBid: state.currentHighBid,
    currentHighBidderId: state.currentHighBidderId,
    isFirstRound: state.isFirstRound,
    currentBiddingLog: state.currentBiddingLog || [],
    lastWinMessage: state.lastWinMessage,
    currentCricketer: currentCricketer
      ? {
          id: currentCricketer.id,
          firstName: currentCricketer.firstName,
          lastName: currentCricketer.lastName,
          playerType: currentCricketer.playerType,
          isForeign: currentCricketer.isForeign,
          iplTeam: currentCricketer.iplTeam,
          battingRecord: currentCricketer.battingRecord,
          bowlingRecord: currentCricketer.bowlingRecord,
          pictureUrl: currentCricketer.pictureUrl,
          isPicked: currentCricketer.isPicked,
          pricePaid: currentCricketer.pricePaid,
          wasSkipped: currentCricketer.wasSkipped,
        }
      : null,
    currentHighBidder: currentHighBidder
      ? {
          id: currentHighBidder.id,
          budgetRemaining: currentHighBidder.budgetRemaining,
          user: currentHighBidder.user,
        }
      : null,
  };
}

// Get auction state for a game
router.get(
  '/:gameId/auction/state',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const state = await getGameAuctionState(gameId);
      const formatted = await formatGameAuctionState(state);
      res.json(formatted);
    } catch (error) {
      console.error('Get game auction state error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Start auction for a cricketer (creator only)
router.post(
  '/:gameId/auction/start',
  gameAccessMiddleware,
  gameCreatorOnly,
  validateBody(startAuctionSchema),
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const { cricketerId } = req.body;
      const io: Server = req.app.get('io');

      // Verify cricketer exists and belongs to this game
      const cricketer = await prisma.gameCricketer.findFirst({
        where: { id: cricketerId, gameId },
      });

      if (!cricketer) {
        res.status(404).json({ message: 'Cricketer not found in this game' });
        return;
      }

      if (cricketer.isPicked) {
        res.status(400).json({ message: 'Cricketer already picked' });
        return;
      }

      // Update game status if needed
      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'auction_active',
          joiningAllowed: false,
        },
      });

      // Set 60 second timer
      const timerEnd = new Date(Date.now() + 60 * 1000);

      const state = await getGameAuctionState(gameId);
      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          currentCricketerId: cricketerId,
          auctionStatus: 'in_progress',
          timerEndTime: timerEnd,
          timerPausedAt: null,
          currentHighBid: 0,
          currentHighBidderId: null,
          currentBiddingLog: [],
          lastWinMessage: null,
        },
      });

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      res.json(formatted);
    } catch (error) {
      console.error('Start game auction error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Place bid
router.post(
  '/:gameId/auction/bid',
  gameAccessMiddleware,
  ensureParticipantInfo,
  validateBody(placeBidSchema),
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const { amount } = req.body;
      const io: Server = req.app.get('io');

      if (!req.participant) {
        res.status(403).json({ message: 'You must be a participant to bid' });
        return;
      }

      const participantId = req.participant.id;

      const state = await getGameAuctionState(gameId);

      // Validate auction is in progress
      if (state.auctionStatus !== 'in_progress') {
        res.status(400).json({ message: 'Auction is not in progress' });
        return;
      }

      if (!state.currentCricketerId) {
        res.status(400).json({ message: 'No cricketer currently up for auction' });
        return;
      }

      // Get participant and cricketer
      const participant = await prisma.gameParticipant.findUnique({
        where: { id: participantId },
        include: { user: true },
      });

      const cricketer = await prisma.gameCricketer.findUnique({
        where: { id: state.currentCricketerId },
      });

      if (!participant || !cricketer) {
        res.status(400).json({ message: 'Invalid participant or cricketer' });
        return;
      }

      // Get participant's current team in this game
      const participantTeam = await prisma.gameCricketer.findMany({
        where: { pickedByParticipantId: participantId },
      });

      const teamSize = participantTeam.length;
      const foreignCount = participantTeam.filter(c => c.isForeign).length;

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
      const minBid = state.currentHighBid === 0 ? 0.5 : state.currentHighBid + minIncrement;

      if (amount < minBid) {
        res.status(400).json({
          message: `Minimum bid is $${minBid.toFixed(2)}`,
        });
        return;
      }

      // Validate budget
      const remainingSlots = TEAM_SIZE - teamSize - 1;
      const minBudgetNeeded = remainingSlots * MIN_BUDGET_PER_PLAYER;
      const maxBidAllowed = participant.budgetRemaining - minBudgetNeeded;

      if (amount > maxBidAllowed) {
        res.status(400).json({
          message: `Maximum bid allowed is $${maxBidAllowed.toFixed(2)}`,
        });
        return;
      }

      // Create bid record
      await prisma.gameBid.create({
        data: {
          gameId,
          cricketerId: state.currentCricketerId,
          participantId,
          amount,
        },
      });

      // Update bidding log
      const currentLog = (state.currentBiddingLog as Array<{
        participantId: string;
        teamName: string;
        amount: number;
        timestamp: string;
      }>) || [];

      currentLog.push({
        participantId,
        teamName: participant.user.teamName || participant.user.name,
        amount,
        timestamp: new Date().toISOString(),
      });

      // Update auction state
      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          currentHighBid: amount,
          currentHighBidderId: participantId,
          currentBiddingLog: currentLog,
        },
      });

      const formatted = await formatGameAuctionState(updatedState);

      // Emit bid event to game room
      io.to(`game:${gameId}`).emit('auction:bid', {
        auctionState: formatted,
        bid: {
          participantId,
          teamName: participant.user.teamName || participant.user.name,
          amount,
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ success: true, auctionState: formatted });
    } catch (error) {
      console.error('Place game bid error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Add time (creator only)
router.post(
  '/:gameId/auction/add-time',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const { seconds } = req.body;
      const io: Server = req.app.get('io');

      const state = await getGameAuctionState(gameId);

      if (!state.timerEndTime) {
        res.status(400).json({ message: 'No active timer' });
        return;
      }

      const newEndTime = new Date(state.timerEndTime.getTime() + seconds * 1000);

      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: { timerEndTime: newEndTime },
      });

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      res.json(formatted);
    } catch (error) {
      console.error('Add time error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Pause auction (creator only)
router.post(
  '/:gameId/auction/pause',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const io: Server = req.app.get('io');

      const state = await getGameAuctionState(gameId);

      if (state.auctionStatus !== 'in_progress') {
        res.status(400).json({ message: 'Auction is not in progress' });
        return;
      }

      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'auction_paused' },
      });

      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          auctionStatus: 'paused',
          timerPausedAt: new Date(),
        },
      });

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      io.to(`game:${gameId}`).emit('auction:paused', { message: 'Auction paused. Back shortly!' });
      res.json(formatted);
    } catch (error) {
      console.error('Pause game auction error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Resume auction (creator only)
router.post(
  '/:gameId/auction/resume',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const io: Server = req.app.get('io');

      const state = await getGameAuctionState(gameId);

      if (state.auctionStatus !== 'paused') {
        res.status(400).json({ message: 'Auction is not paused' });
        return;
      }

      // Calculate new end time based on remaining time
      const pausedAt = state.timerPausedAt!;
      const originalEnd = state.timerEndTime!;
      const remainingMs = originalEnd.getTime() - pausedAt.getTime();
      const newEndTime = new Date(Date.now() + remainingMs);

      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'auction_active' },
      });

      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          auctionStatus: 'in_progress',
          timerEndTime: newEndTime,
          timerPausedAt: null,
        },
      });

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      res.json(formatted);
    } catch (error) {
      console.error('Resume game auction error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Skip player (creator only)
router.post(
  '/:gameId/auction/skip',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const io: Server = req.app.get('io');

      const state = await getGameAuctionState(gameId);

      if (!state.currentCricketerId) {
        res.status(400).json({ message: 'No cricketer currently up for auction' });
        return;
      }

      // Mark cricketer as skipped
      const cricketer = await prisma.gameCricketer.update({
        where: { id: state.currentCricketerId },
        data: { wasSkipped: true },
      });

      // Reset auction state
      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          currentCricketerId: null,
          auctionStatus: 'not_started',
          timerEndTime: null,
          timerPausedAt: null,
          currentHighBid: 0,
          currentHighBidderId: null,
          currentBiddingLog: [],
        },
      });

      io.to(`game:${gameId}`).emit('auction:player_skipped', {
        cricketer: {
          id: cricketer.id,
          firstName: cricketer.firstName,
          lastName: cricketer.lastName,
          wasSkipped: cricketer.wasSkipped,
        },
      });

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      res.json(formatted);
    } catch (error) {
      console.error('Skip player error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// End auction (creator only)
router.post(
  '/:gameId/auction/end',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const io: Server = req.app.get('io');

      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'auction_ended' },
      });

      const state = await getGameAuctionState(gameId);

      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          auctionStatus: 'completed',
          currentCricketerId: null,
          timerEndTime: null,
          timerPausedAt: null,
          currentHighBid: 0,
          currentHighBidderId: null,
          currentBiddingLog: [],
        },
      });

      // Check for auction-end achievements (like budget_master)
      const endAchievements = await checkAuctionEndAchievements(gameId);

      // Emit achievement notifications for each participant who earned them
      for (const [participantId, achievements] of endAchievements) {
        if (achievements.length > 0) {
          const participant = await prisma.gameParticipant.findUnique({
            where: { id: participantId },
            include: { user: true },
          });
          if (participant) {
            io.to(`game:${gameId}`).emit('achievements:awarded', {
              participantId,
              userId: participant.userId,
              teamName: participant.user.teamName || participant.user.name,
              achievements,
            });
          }
        }
      }

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:ended', { message: 'Auction has ended!' });
      io.to(`game:${gameId}`).emit('auction:update', formatted);
      res.json(formatted);
    } catch (error) {
      console.error('End game auction error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get bid log for current auction
router.get(
  '/:gameId/auction/bids',
  gameAccessMiddleware,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);

      const state = await getGameAuctionState(gameId);

      res.json({
        biddingLog: state.currentBiddingLog || [],
      });
    } catch (error) {
      console.error('Get bid log error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Assign player to highest bidder (called when timer ends)
router.post(
  '/:gameId/auction/assign',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const gameId = getGameId(req.params);
      const io: Server = req.app.get('io');

      const state = await getGameAuctionState(gameId);

      if (!state.currentCricketerId) {
        res.status(400).json({ message: 'No cricketer to assign' });
        return;
      }

      if (!state.currentHighBidderId || state.currentHighBid === 0) {
        // No bids - skip the player
        const cricketer = await prisma.gameCricketer.update({
          where: { id: state.currentCricketerId },
          data: { wasSkipped: true },
        });

        const updatedState = await prisma.gameAuctionState.update({
          where: { id: state.id },
          data: {
            currentCricketerId: null,
            auctionStatus: 'not_started',
            timerEndTime: null,
            timerPausedAt: null,
            currentHighBid: 0,
            currentHighBidderId: null,
            currentBiddingLog: [],
            lastWinMessage: `${cricketer.firstName} ${cricketer.lastName} - No bids, skipped`,
          },
        });

        const formatted = await formatGameAuctionState(updatedState);
        io.to(`game:${gameId}`).emit('auction:player_skipped', {
          cricketer: {
            id: cricketer.id,
            firstName: cricketer.firstName,
            lastName: cricketer.lastName,
          },
        });
        io.to(`game:${gameId}`).emit('auction:update', formatted);

        res.json(formatted);
        return;
      }

      // Assign player to highest bidder
      const cricketer = await prisma.gameCricketer.findUnique({
        where: { id: state.currentCricketerId },
      });

      const participant = await prisma.gameParticipant.findUnique({
        where: { id: state.currentHighBidderId },
        include: { user: true },
      });

      if (!cricketer || !participant) {
        res.status(400).json({ message: 'Invalid cricketer or participant' });
        return;
      }

      // Get current pick order
      const maxPickOrder = await prisma.gameCricketer.aggregate({
        where: { gameId, isPicked: true },
        _max: { pickOrder: true },
      });
      const nextPickOrder = (maxPickOrder._max.pickOrder || 0) + 1;

      // Update cricketer
      await prisma.gameCricketer.update({
        where: { id: state.currentCricketerId },
        data: {
          isPicked: true,
          pickedByParticipantId: state.currentHighBidderId,
          pricePaid: state.currentHighBid,
          pickOrder: nextPickOrder,
        },
      });

      // Update participant budget
      await prisma.gameParticipant.update({
        where: { id: state.currentHighBidderId },
        data: {
          budgetRemaining: participant.budgetRemaining - state.currentHighBid,
        },
      });

      const winMessage = `${cricketer.firstName} ${cricketer.lastName} = ${participant.user.teamName || participant.user.name}`;

      // Reset auction state
      const updatedState = await prisma.gameAuctionState.update({
        where: { id: state.id },
        data: {
          currentCricketerId: null,
          auctionStatus: 'not_started',
          timerEndTime: null,
          timerPausedAt: null,
          currentHighBid: 0,
          currentHighBidderId: null,
          currentBiddingLog: [],
          lastWinMessage: winMessage,
        },
      });

      // Check for achievements
      const bidCount = ((state.currentBiddingLog as unknown[]) || []).length;
      const awardedAchievements = await checkAuctionAchievements(
        gameId,
        participant.id,
        cricketer.id,
        state.currentHighBid,
        bidCount
      );

      io.to(`game:${gameId}`).emit('auction:player_picked', {
        message: winMessage,
        cricketer: {
          id: cricketer.id,
          firstName: cricketer.firstName,
          lastName: cricketer.lastName,
          pricePaid: state.currentHighBid,
        },
        winner: {
          id: participant.id,
          userId: participant.userId,
          teamName: participant.user.teamName || participant.user.name,
        },
        achievements: awardedAchievements,
      });

      // Emit achievement notifications if any were awarded
      if (awardedAchievements.length > 0) {
        io.to(`game:${gameId}`).emit('achievements:awarded', {
          participantId: participant.id,
          userId: participant.userId,
          teamName: participant.user.teamName || participant.user.name,
          achievements: awardedAchievements,
        });
      }

      const formatted = await formatGameAuctionState(updatedState);
      io.to(`game:${gameId}`).emit('auction:update', formatted);

      res.json(formatted);
    } catch (error) {
      console.error('Assign player error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
  currentGameId?: string;
}

// Game-specific timer management
const gameTimers: Map<string, NodeJS.Timeout> = new Map();

// Legacy single-game timer (for backwards compatibility)
let auctionTimer: NodeJS.Timeout | null = null;

// Assign player to highest bidder for a specific game
async function assignGamePlayerToHighestBidder(io: Server, gameId: string) {
  const state = await prisma.gameAuctionState.findUnique({
    where: { gameId },
  });

  if (!state || !state.currentCricketerId) {
    return;
  }

  if (!state.currentHighBidderId || state.currentHighBid === 0) {
    // No bids - skip the player
    const cricketer = await prisma.gameCricketer.update({
      where: { id: state.currentCricketerId },
      data: { wasSkipped: true },
    });

    await prisma.gameAuctionState.update({
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

    io.to(`game:${gameId}`).emit('auction:player_skipped', {
      cricketer: {
        id: cricketer.id,
        firstName: cricketer.firstName,
        lastName: cricketer.lastName,
      },
    });

    io.to(`game:${gameId}`).emit('auction:update', {
      gameId,
      auctionStatus: 'not_started',
      currentCricketerId: null,
      timerEndTime: null,
      currentHighBid: 0,
      currentHighBidderId: null,
      currentCricketer: null,
      currentHighBidder: null,
      currentBiddingLog: [],
      lastWinMessage: `${cricketer.firstName} ${cricketer.lastName} - No bids, skipped`,
    });

    return;
  }

  // Get current pick order
  const maxPickOrder = await prisma.gameCricketer.aggregate({
    where: { gameId, isPicked: true },
    _max: { pickOrder: true },
  });
  const newPickOrder = (maxPickOrder._max.pickOrder || 0) + 1;

  // Get cricketer and participant info
  const cricketer = await prisma.gameCricketer.findUnique({
    where: { id: state.currentCricketerId },
  });

  const participant = await prisma.gameParticipant.findUnique({
    where: { id: state.currentHighBidderId },
    include: { user: true },
  });

  if (!cricketer || !participant) {
    return;
  }

  // Assign cricketer to winner
  await prisma.gameCricketer.update({
    where: { id: state.currentCricketerId },
    data: {
      isPicked: true,
      pickedByParticipantId: state.currentHighBidderId,
      pricePaid: state.currentHighBid,
      pickOrder: newPickOrder,
    },
  });

  // Deduct budget from winner
  await prisma.gameParticipant.update({
    where: { id: state.currentHighBidderId },
    data: {
      budgetRemaining: participant.budgetRemaining - state.currentHighBid,
    },
  });

  const winMessage = `${cricketer.firstName} ${cricketer.lastName} = ${participant.user.teamName || participant.user.name}`;

  // Reset auction state
  await prisma.gameAuctionState.update({
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

  // Emit player picked event
  io.to(`game:${gameId}`).emit('auction:player_picked', {
    message: winMessage,
    cricketer: {
      id: cricketer.id,
      firstName: cricketer.firstName,
      lastName: cricketer.lastName,
      playerType: cricketer.playerType,
      isForeign: cricketer.isForeign,
      iplTeam: cricketer.iplTeam,
      pricePaid: state.currentHighBid,
      pickOrder: newPickOrder,
    },
    winner: {
      id: participant.id,
      participantId: participant.id,
      userId: participant.userId,
      teamName: participant.user.teamName || participant.user.name,
      budgetRemaining: participant.budgetRemaining - state.currentHighBid,
    },
  });

  // Emit updated auction state
  io.to(`game:${gameId}`).emit('auction:update', {
    id: state.id,
    gameId,
    currentCricketerId: null,
    auctionStatus: 'not_started',
    timerEndTime: null,
    timerPausedAt: null,
    currentHighBid: 0,
    currentHighBidderId: null,
    isFirstRound: state.isFirstRound,
    currentCricketer: null,
    currentHighBidder: null,
    currentBiddingLog: [],
    lastWinMessage: winMessage,
  });
}

// Check and process timer end for all active game auctions
async function checkAndProcessAllGameTimers(io: Server) {
  const activeAuctions = await prisma.gameAuctionState.findMany({
    where: {
      auctionStatus: 'in_progress',
      timerEndTime: { not: null },
    },
  });

  for (const auction of activeAuctions) {
    if (auction.timerEndTime && new Date() >= auction.timerEndTime) {
      await assignGamePlayerToHighestBidder(io, auction.gameId);
    }
  }
}

// Legacy: Assign player for backwards compatibility with single-game mode
async function assignPlayerToHighestBidder(io: Server) {
  const state = await prisma.auctionState.findFirst();

  if (!state || !state.currentCricketerId || !state.currentHighBidderId) {
    if (state) {
      await prisma.auctionState.update({
        where: { id: state.id },
        data: {
          currentCricketerId: null,
          auctionStatus: 'not_started',
          timerEndTime: null,
          currentHighBid: 0,
          currentHighBidderId: null,
        },
      });
    }
    return;
  }

  const maxPickOrder = await prisma.cricketer.aggregate({
    _max: { pickOrder: true },
  });
  const newPickOrder = (maxPickOrder._max.pickOrder || 0) + 1;

  const cricketer = await prisma.cricketer.update({
    where: { id: state.currentCricketerId },
    data: {
      isPicked: true,
      pickedByUserId: state.currentHighBidderId,
      pricePaid: state.currentHighBid,
      pickOrder: newPickOrder,
    },
  });

  const user = await prisma.user.update({
    where: { id: state.currentHighBidderId },
    data: {
      budgetRemaining: { decrement: state.currentHighBid },
    },
  });

  await prisma.auctionState.update({
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

  io.emit('auction:player_picked', {
    cricketer: {
      id: cricketer.id,
      firstName: cricketer.firstName,
      lastName: cricketer.lastName,
      playerType: cricketer.playerType,
      isForeign: cricketer.isForeign,
      iplTeam: cricketer.iplTeam,
      battingRecord: cricketer.battingRecord,
      bowlingRecord: cricketer.bowlingRecord,
      pictureUrl: cricketer.pictureUrl,
      newsArticles: cricketer.newsArticles || [],
      isPicked: cricketer.isPicked,
      pickedByUserId: cricketer.pickedByUserId,
      pricePaid: cricketer.pricePaid,
      pickOrder: cricketer.pickOrder,
      wasSkipped: cricketer.wasSkipped,
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      teamName: user.teamName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      budgetRemaining: user.budgetRemaining,
      createdAt: user.createdAt.toISOString(),
    },
  });

  io.emit('auction:update', {
    id: state.id,
    currentCricketerId: null,
    auctionStatus: 'not_started',
    timerEndTime: null,
    timerPausedAt: null,
    currentHighBid: 0,
    currentHighBidderId: null,
    isFirstRound: state.isFirstRound,
    currentCricketer: null,
    currentHighBidder: null,
  });
}

// Legacy: Check timer for single-game mode
async function checkAndProcessTimerEnd(io: Server) {
  const state = await prisma.auctionState.findFirst();

  if (!state || state.auctionStatus !== 'in_progress' || !state.timerEndTime) {
    return;
  }

  if (new Date() >= state.timerEndTime) {
    await assignPlayerToHighestBidder(io);
  }
}

export function setupAuctionSocket(io: Server) {
  // Middleware for authentication
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as {
        userId: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join a game room
    socket.on('game:join', async (data: { gameId: string }) => {
      const { gameId } = data;

      // Leave previous game room if any
      if (socket.currentGameId) {
        socket.leave(`game:${socket.currentGameId}`);
        console.log(`User ${socket.userId} left game room: ${socket.currentGameId}`);
      }

      // Verify user has access to this game
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const isCreator = game.createdById === socket.userId;
      const participant = await prisma.gameParticipant.findUnique({
        where: {
          gameId_userId: { gameId, userId: socket.userId! },
        },
      });

      if (!isCreator && !participant) {
        socket.emit('error', { message: 'You do not have access to this game' });
        return;
      }

      // Join the game room
      socket.join(`game:${gameId}`);
      socket.currentGameId = gameId;
      console.log(`User ${socket.userId} joined game room: ${gameId}`);

      // Notify others in the room
      socket.to(`game:${gameId}`).emit('player:online', {
        userId: socket.userId,
      });

      // Send current auction state
      const auctionState = await prisma.gameAuctionState.findUnique({
        where: { gameId },
      });

      if (auctionState) {
        const currentCricketer = auctionState.currentCricketerId
          ? await prisma.gameCricketer.findUnique({
              where: { id: auctionState.currentCricketerId },
            })
          : null;

        const currentHighBidder = auctionState.currentHighBidderId
          ? await prisma.gameParticipant.findUnique({
              where: { id: auctionState.currentHighBidderId },
              include: { user: { select: { id: true, name: true, teamName: true, avatarUrl: true } } },
            })
          : null;

        socket.emit('auction:update', {
          id: auctionState.id,
          gameId: auctionState.gameId,
          currentCricketerId: auctionState.currentCricketerId,
          auctionStatus: auctionState.auctionStatus,
          timerEndTime: auctionState.timerEndTime?.toISOString() || null,
          timerPausedAt: auctionState.timerPausedAt?.toISOString() || null,
          currentHighBid: auctionState.currentHighBid,
          currentHighBidderId: auctionState.currentHighBidderId,
          isFirstRound: auctionState.isFirstRound,
          currentBiddingLog: auctionState.currentBiddingLog || [],
          lastWinMessage: auctionState.lastWinMessage,
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
              }
            : null,
          currentHighBidder: currentHighBidder
            ? {
                id: currentHighBidder.id,
                budgetRemaining: currentHighBidder.budgetRemaining,
                user: currentHighBidder.user,
              }
            : null,
        });
      }
    });

    // Leave current game room
    socket.on('game:leave', () => {
      if (socket.currentGameId) {
        socket.leave(`game:${socket.currentGameId}`);
        socket.to(`game:${socket.currentGameId}`).emit('player:offline', {
          userId: socket.userId,
        });
        console.log(`User ${socket.userId} left game room: ${socket.currentGameId}`);
        socket.currentGameId = undefined;
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      if (socket.currentGameId) {
        socket.to(`game:${socket.currentGameId}`).emit('player:offline', {
          userId: socket.userId,
        });
      }
    });
  });

  // Start timer check interval for multi-game auctions
  setInterval(() => checkAndProcessAllGameTimers(io), 500);

  // Legacy: Start timer check interval for single-game mode
  setInterval(() => checkAndProcessTimerEnd(io), 500);
}

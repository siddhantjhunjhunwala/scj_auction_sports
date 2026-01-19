import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Timer management
let auctionTimer: NodeJS.Timeout | null = null;

async function assignPlayerToHighestBidder(io: Server) {
  const state = await prisma.auctionState.findFirst();

  if (!state || !state.currentCricketerId || !state.currentHighBidderId) {
    // No winner, reset
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

  // Get current pick order
  const maxPickOrder = await prisma.cricketer.aggregate({
    _max: { pickOrder: true },
  });
  const newPickOrder = (maxPickOrder._max.pickOrder || 0) + 1;

  // Assign cricketer to winner
  const cricketer = await prisma.cricketer.update({
    where: { id: state.currentCricketerId },
    data: {
      isPicked: true,
      pickedByUserId: state.currentHighBidderId,
      pricePaid: state.currentHighBid,
      pickOrder: newPickOrder,
    },
  });

  // Deduct budget from winner
  const user = await prisma.user.update({
    where: { id: state.currentHighBidderId },
    data: {
      budgetRemaining: { decrement: state.currentHighBid },
    },
  });

  // Reset auction state
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

  // Emit player picked event
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

  // Emit updated auction state
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

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  // Start timer check interval
  setInterval(() => checkAndProcessTimerEnd(io), 500);
}

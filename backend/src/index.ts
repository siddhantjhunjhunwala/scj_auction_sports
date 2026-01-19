import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import cricketersRoutes from './routes/cricketers.js';
import auctionRoutes from './routes/auction.js';
import leagueRoutes from './routes/league.js';
import matchesRoutes from './routes/matches.js';
import subsRoutes from './routes/subs.js';
import reportsRoutes from './routes/reports.js';
import { setupAuctionSocket } from './socket/auctionSocket.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/cricketers', authMiddleware, cricketersRoutes);
app.use('/api/auction', authMiddleware, auctionRoutes);
app.use('/api/league', authMiddleware, leagueRoutes);
app.use('/api/matches', authMiddleware, matchesRoutes);
app.use('/api/subs', authMiddleware, subsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Setup Socket.io
setupAuctionSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };

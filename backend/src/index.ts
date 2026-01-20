import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load env first
dotenv.config();

console.log('Starting Fantasy IPL Backend...');
console.log('Node version:', process.version);
console.log('PORT env:', process.env.PORT);

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import cricketersRoutes from './routes/cricketers.js';
import auctionRoutes from './routes/auction.js';
import leagueRoutes from './routes/league.js';
import matchesRoutes from './routes/matches.js';
import subsRoutes from './routes/subs.js';
import reportsRoutes from './routes/reports.js';
import gamesRoutes from './routes/games.js';
import gameAuctionRoutes from './routes/gameAuction.js';
import gameScoringRoutes from './routes/gameScoring.js';
import achievementsRoutes from './routes/achievements.js';
import { setupAuctionSocket } from './socket/auctionSocket.js';
import { authMiddleware } from './middleware/auth.js';

console.log('All imports loaded successfully');

const app = express();
const httpServer = createServer(app);

// CORS configuration - supports multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, log for debugging
      console.log('CORS request from:', origin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors(corsOptions));
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

// Multi-game routes
app.use('/api/games', authMiddleware, gamesRoutes);
app.use('/api/games', authMiddleware, gameAuctionRoutes);
app.use('/api/games', authMiddleware, gameScoringRoutes);
app.use('/api/achievements', authMiddleware, achievementsRoutes);

// Health check - must respond immediately without any dependencies
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (_, res) => {
  res.status(200).json({ message: 'Fantasy IPL API', status: 'running' });
});

// Setup Socket.io
setupAuctionSocket(io);

const PORT = parseInt(process.env.PORT || '3001', 10);

// Railway requires listening on 0.0.0.0
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started successfully`);
  console.log(`PORT: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at /health`);
});

export { io };

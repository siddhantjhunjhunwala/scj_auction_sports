import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load env first
dotenv.config();

console.log('=== Starting Fantasy IPL Backend ===');
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const app = express();
const httpServer = createServer(app);

// CORS configuration - supports multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

console.log('Allowed origins:', allowedOrigins);

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

// Health check - MUST be registered FIRST before any database-dependent routes
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (_, res) => {
  res.status(200).json({ message: 'Fantasy IPL API', status: 'running' });
});

console.log('Health check routes registered');

// Start server BEFORE loading database-dependent routes
const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on port ${PORT}`);

  try {
    // Now load database-dependent routes
    console.log('Loading route modules...');

    const authRoutes = (await import('./routes/auth.js')).default;
    const usersRoutes = (await import('./routes/users.js')).default;
    const cricketersRoutes = (await import('./routes/cricketers.js')).default;
    const auctionRoutes = (await import('./routes/auction.js')).default;
    const leagueRoutes = (await import('./routes/league.js')).default;
    const matchesRoutes = (await import('./routes/matches.js')).default;
    const subsRoutes = (await import('./routes/subs.js')).default;
    const reportsRoutes = (await import('./routes/reports.js')).default;
    const gamesRoutes = (await import('./routes/games.js')).default;
    const gameAuctionRoutes = (await import('./routes/gameAuction.js')).default;
    const gameScoringRoutes = (await import('./routes/gameScoring.js')).default;
    const achievementsRoutes = (await import('./routes/achievements.js')).default;
    const { authMiddleware } = await import('./middleware/auth.js');
    const { setupAuctionSocket } = await import('./socket/auctionSocket.js');

    console.log('All route modules loaded successfully');

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', authMiddleware, usersRoutes);
    app.use('/api/cricketers', authMiddleware, cricketersRoutes);
    app.use('/api/auction', authMiddleware, auctionRoutes);
    app.use('/api/league', authMiddleware, leagueRoutes);
    app.use('/api/matches', authMiddleware, matchesRoutes);
    app.use('/api/subs', authMiddleware, subsRoutes);
    app.use('/api/reports', authMiddleware, reportsRoutes);
    app.use('/api/games', authMiddleware, gamesRoutes);
    app.use('/api/games', authMiddleware, gameAuctionRoutes);
    app.use('/api/games', authMiddleware, gameScoringRoutes);
    app.use('/api/achievements', authMiddleware, achievementsRoutes);

    console.log('All routes registered');

    // Setup Socket.io
    setupAuctionSocket(io);
    console.log('Socket.io initialized');

    console.log('=== Server fully ready ===');
  } catch (error) {
    console.error('Failed to load routes:', error);
    // Server stays up with health check, but routes won't work
  }
});

export { io };

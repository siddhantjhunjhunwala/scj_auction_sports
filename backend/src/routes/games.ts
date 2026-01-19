import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import Papa from 'papaparse';
import { AuthRequest } from '../middleware/auth.js';
import {
  GameAuthRequest,
  gameAccessMiddleware,
  gameCreatorOnly,
} from '../middleware/gameAuth.js';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: 'Game name is required' });
      return;
    }

    // Generate unique game code
    let code = generateGameCode();
    let codeExists = await prisma.game.findUnique({ where: { code } });
    while (codeExists) {
      code = generateGameCode();
      codeExists = await prisma.game.findUnique({ where: { code } });
    }

    // Create game with default points config
    const game = await prisma.game.create({
      data: {
        name: name.trim(),
        code,
        createdById: userId,
        pointsConfig: {
          create: {},
        },
        auctionState: {
          create: {},
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
        pointsConfig: true,
        _count: {
          select: { participants: true, cricketers: true },
        },
      },
    });

    res.status(201).json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all games the user is part of (created or joined)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { participants: true, cricketers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add isCreator flag
    const gamesWithRole = games.map(game => ({
      ...game,
      isCreator: game.createdById === userId,
    }));

    res.json(gamesWithRole);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get joinable games (for players to browse)
router.get('/joinable', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const games = await prisma.game.findMany({
      where: {
        joiningAllowed: true,
        status: 'pre_auction',
        createdById: { not: userId },
        participants: {
          none: { userId },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            teamName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(games);
  } catch (error) {
    console.error('Get joinable games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a game by code
router.post('/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    if (!code) {
      res.status(400).json({ message: 'Game code is required' });
      return;
    }

    const game = await prisma.game.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    if (!game.joiningAllowed) {
      res.status(400).json({ message: 'This game is no longer accepting new players' });
      return;
    }

    if (game.status !== 'pre_auction') {
      res.status(400).json({ message: 'This game has already started' });
      return;
    }

    if (game.createdById === userId) {
      res.status(400).json({ message: 'You are the creator of this game' });
      return;
    }

    // Check if already joined
    const existingParticipant = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: { gameId: game.id, userId },
      },
    });

    if (existingParticipant) {
      res.status(400).json({ message: 'You have already joined this game' });
      return;
    }

    // Join the game
    const participant = await prisma.gameParticipant.create({
      data: {
        gameId: game.id,
        userId,
      },
      include: {
        game: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                teamName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: { participants: true, cricketers: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Emit socket event for new participant
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${game.id}`).emit('player:joined', {
        participant: {
          id: participant.id,
          user: participant.user,
          budgetRemaining: participant.budgetRemaining,
        },
      });
    }

    res.status(201).json(participant);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a game by ID
router.post('/:id/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const game = await prisma.game.findUnique({
      where: { id },
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    if (!game.joiningAllowed) {
      res.status(400).json({ message: 'This game is no longer accepting new players' });
      return;
    }

    if (game.status !== 'pre_auction') {
      res.status(400).json({ message: 'This game has already started' });
      return;
    }

    if (game.createdById === userId) {
      res.status(400).json({ message: 'You are the creator of this game' });
      return;
    }

    // Check if already joined
    const existingParticipant = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: { gameId: game.id, userId },
      },
    });

    if (existingParticipant) {
      res.status(400).json({ message: 'You have already joined this game' });
      return;
    }

    // Join the game
    const participant = await prisma.gameParticipant.create({
      data: {
        gameId: game.id,
        userId,
      },
      include: {
        game: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${game.id}`).emit('player:joined', {
        participant: {
          id: participant.id,
          user: participant.user,
          budgetRemaining: participant.budgetRemaining,
        },
      });
    }

    res.status(201).json(participant);
  } catch (error) {
    console.error('Join game by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific game
router.get('/:id', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
        participants: {
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
          },
        },
        pointsConfig: true,
        _count: {
          select: { cricketers: true, matches: true },
        },
      },
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.json({
      ...game,
      isCreator: req.isGameCreator,
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update game settings (creator only)
router.patch('/:id', gameAccessMiddleware, gameCreatorOnly, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, joiningAllowed } = req.body;

    const updateData: { name?: string; joiningAllowed?: boolean } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (joiningAllowed !== undefined) {
      updateData.joiningAllowed = joiningAllowed;
    }

    const game = await prisma.game.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { participants: true, cricketers: true },
        },
      },
    });

    res.json(game);
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete game (creator only)
router.delete('/:id', gameAccessMiddleware, gameCreatorOnly, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.game.delete({
      where: { id },
    });

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload cricketers CSV (creator only)
router.post(
  '/:id/cricketers/upload',
  gameAccessMiddleware,
  gameCreatorOnly,
  upload.single('file'),
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const csvText = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        res.status(400).json({ message: 'CSV parsing error', errors: parsed.errors });
        return;
      }

      const cricketers = parsed.data as Array<{
        firstName?: string;
        lastName?: string;
        playerType?: string;
        isForeign?: string;
        iplTeam?: string;
        battingRecord?: string;
        bowlingRecord?: string;
        pictureUrl?: string;
      }>;

      // Validate and create cricketers
      const validCricketers = cricketers
        .filter(c => c.firstName && c.lastName && c.playerType && c.iplTeam)
        .map((c, index) => ({
          gameId: id,
          firstName: c.firstName!.trim(),
          lastName: c.lastName!.trim(),
          playerType: c.playerType!.toLowerCase() as 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder',
          isForeign: c.isForeign?.toLowerCase() === 'true' || c.isForeign === '1',
          iplTeam: c.iplTeam!.trim(),
          battingRecord: c.battingRecord ? JSON.parse(c.battingRecord) : null,
          bowlingRecord: c.bowlingRecord ? JSON.parse(c.bowlingRecord) : null,
          pictureUrl: c.pictureUrl?.trim() || null,
          auctionOrder: index + 1,
        }));

      // Delete existing cricketers for this game
      await prisma.gameCricketer.deleteMany({
        where: { gameId: id },
      });

      // Create new cricketers
      await prisma.gameCricketer.createMany({
        data: validCricketers,
      });

      // Update game status
      await prisma.game.update({
        where: { id },
        data: { cricketersUploaded: true },
      });

      const createdCricketers = await prisma.gameCricketer.findMany({
        where: { gameId: id },
        orderBy: { auctionOrder: 'asc' },
      });

      res.json({
        message: `${createdCricketers.length} cricketers uploaded successfully`,
        cricketers: createdCricketers,
      });
    } catch (error) {
      console.error('Upload cricketers error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get cricketers for a game
router.get('/:id/cricketers', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cricketers = await prisma.gameCricketer.findMany({
      where: { gameId: id },
      include: {
        pickedBy: {
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
        },
      },
      orderBy: { auctionOrder: 'asc' },
    });

    res.json(cricketers);
  } catch (error) {
    console.error('Get cricketers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unpicked cricketers for a game
router.get('/:id/cricketers/unpicked', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cricketers = await prisma.gameCricketer.findMany({
      where: {
        gameId: id,
        isPicked: false,
        wasSkipped: false,
      },
      orderBy: { auctionOrder: 'asc' },
    });

    res.json(cricketers);
  } catch (error) {
    console.error('Get unpicked cricketers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get points config for a game
router.get('/:id/points-config', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let config = await prisma.pointSystemConfig.findUnique({
      where: { gameId: id },
    });

    if (!config) {
      config = await prisma.pointSystemConfig.create({
        data: { gameId: id },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Get points config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update points config (creator only)
router.put(
  '/:id/points-config',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const configData = req.body;

      // Remove id and gameId from update data
      delete configData.id;
      delete configData.gameId;

      const config = await prisma.pointSystemConfig.upsert({
        where: { gameId: id },
        create: { gameId: id, ...configData },
        update: configData,
      });

      res.json(config);
    } catch (error) {
      console.error('Update points config error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get participants of a game
router.get('/:id/participants', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const participants = await prisma.gameParticipant.findMany({
      where: { gameId: id },
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
      orderBy: { joinedAt: 'asc' },
    });

    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a game (participant only, before auction starts)
router.post('/:id/leave', gameAccessMiddleware, async (req: GameAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (req.isGameCreator) {
      res.status(400).json({ message: 'Game creator cannot leave the game' });
      return;
    }

    const game = await prisma.game.findUnique({ where: { id } });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    if (game.status !== 'pre_auction') {
      res.status(400).json({ message: 'Cannot leave after auction has started' });
      return;
    }

    await prisma.gameParticipant.delete({
      where: {
        gameId_userId: { gameId: id, userId },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${id}`).emit('player:left', { userId });
    }

    res.json({ message: 'Left game successfully' });
  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set auction order for cricketers (creator only)
router.post(
  '/:id/cricketers/auction-order',
  gameAccessMiddleware,
  gameCreatorOnly,
  async (req: GameAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { order } = req.body;

      if (!Array.isArray(order)) {
        res.status(400).json({ message: 'Order must be an array of cricketer IDs' });
        return;
      }

      // Update each cricketer's auction order
      await Promise.all(
        order.map((cricketerId: string, index: number) =>
          prisma.gameCricketer.update({
            where: { id: cricketerId },
            data: { auctionOrder: index + 1 },
          })
        )
      );

      const cricketers = await prisma.gameCricketer.findMany({
        where: { gameId: id },
        orderBy: { auctionOrder: 'asc' },
      });

      res.json(cricketers);
    } catch (error) {
      console.error('Set auction order error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;

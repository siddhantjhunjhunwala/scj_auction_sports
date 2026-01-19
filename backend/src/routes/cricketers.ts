import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import Papa from 'papaparse';
import { AuthRequest, auctioneerOnly } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Get all cricketers
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cricketers = await prisma.cricketer.findMany({
      orderBy: [{ auctionOrder: 'asc' }, { lastName: 'asc' }],
    });

    res.json(cricketers.map(c => ({
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
    })));
  } catch (error) {
    console.error('Get cricketers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unpicked cricketers
router.get('/unpicked', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cricketers = await prisma.cricketer.findMany({
      where: { isPicked: false },
      orderBy: [{ auctionOrder: 'asc' }, { lastName: 'asc' }],
    });

    res.json(cricketers.map(c => ({
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
    })));
  } catch (error) {
    console.error('Get unpicked cricketers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cricketer by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cricketerId = req.params.id as string;
    const cricketer = await prisma.cricketer.findUnique({
      where: { id: cricketerId },
    });

    if (!cricketer) {
      res.status(404).json({ message: 'Cricketer not found' });
      return;
    }

    res.json({
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
    });
  } catch (error) {
    console.error('Get cricketer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload CSV (auctioneer only)
router.post('/upload', auctioneerOnly, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      res.status(400).json({ message: 'CSV parsing error', errors: parseResult.errors });
      return;
    }

    const cricketers = parseResult.data as Array<{
      first_name: string;
      last_name: string;
      player_type: string;
      is_foreign: string;
      ipl_team: string;
      batting_avg?: string;
      batting_sr?: string;
      bowling_avg?: string;
      bowling_econ?: string;
    }>;

    // Clear existing cricketers (optional - could also update)
    await prisma.cricketer.deleteMany({});

    // Insert new cricketers
    let order = 1;
    for (const row of cricketers) {
      const playerType = row.player_type?.toLowerCase() || 'batsman';
      const validTypes = ['batsman', 'bowler', 'wicketkeeper', 'allrounder'];

      await prisma.cricketer.create({
        data: {
          firstName: row.first_name || '',
          lastName: row.last_name || '',
          playerType: validTypes.includes(playerType) ? playerType as 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder' : 'batsman',
          isForeign: row.is_foreign?.toLowerCase() === 'true',
          iplTeam: row.ipl_team || '',
          battingRecord: {
            average: row.batting_avg ? parseFloat(row.batting_avg) : undefined,
            strikeRate: row.batting_sr ? parseFloat(row.batting_sr) : undefined,
          },
          bowlingRecord: {
            average: row.bowling_avg ? parseFloat(row.bowling_avg) : undefined,
            economy: row.bowling_econ ? parseFloat(row.bowling_econ) : undefined,
          },
          auctionOrder: order++,
        },
      });
    }

    res.json({ count: cricketers.length });
  } catch (error) {
    console.error('Upload CSV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update cricketer (auctioneer only)
router.patch('/:id', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cricketerId = req.params.id as string;
    const cricketer = await prisma.cricketer.update({
      where: { id: cricketerId },
      data: req.body,
    });

    res.json({
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
    });
  } catch (error) {
    console.error('Update cricketer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set auction order (auctioneer only)
router.post('/auction-order', auctioneerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { order } = req.body as { order: { id: string; order: number }[] };

    for (const item of order) {
      await prisma.cricketer.update({
        where: { id: item.id },
        data: { auctionOrder: item.order },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Set auction order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for cricket data
interface PlayerScorecard {
  name: string;
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  dismissal?: string;
  overs?: number;
  maidens?: number;
  runsConceded?: number;
  wickets?: number;
  economy?: number;
  dotBalls?: number;
  catches?: number;
  stumpings?: number;
  runOuts?: number;
}

interface MatchScorecard {
  matchId: string;
  team1: string;
  team2: string;
  venue?: string;
  date?: string;
  battingScorecard: PlayerScorecard[];
  bowlingScorecard: PlayerScorecard[];
  fieldingScorecard?: PlayerScorecard[];
}

interface AutoPopulateResult {
  success: boolean;
  matchedPlayers: number;
  unmatchedPlayers: string[];
  scores: Array<{
    cricketerId: string;
    cricketerName: string;
    points: number;
  }>;
  error?: string;
}

// Normalize player names for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Match a player name against cricketers in the database
async function findMatchingCricketer(
  playerName: string,
  gameId: string
): Promise<string | null> {
  const normalizedInput = normalizeName(playerName);
  const nameParts = normalizedInput.split(' ');

  // Get all cricketers for this game
  const cricketers = await prisma.gameCricketer.findMany({
    where: { gameId, isPicked: true },
    select: { id: true, firstName: true, lastName: true },
  });

  // Try exact match first
  for (const cricketer of cricketers) {
    const fullName = normalizeName(`${cricketer.firstName} ${cricketer.lastName}`);
    if (fullName === normalizedInput) {
      return cricketer.id;
    }
  }

  // Try last name match with first initial
  if (nameParts.length >= 2) {
    const lastName = nameParts[nameParts.length - 1];
    const firstInitial = nameParts[0][0];

    for (const cricketer of cricketers) {
      const cricketerLastName = normalizeName(cricketer.lastName);
      const cricketerFirstInitial = normalizeName(cricketer.firstName)[0];

      if (
        cricketerLastName === lastName &&
        cricketerFirstInitial === firstInitial
      ) {
        return cricketer.id;
      }
    }
  }

  // Try just last name match (risky but sometimes needed)
  if (nameParts.length >= 1) {
    const lastName = nameParts[nameParts.length - 1];
    const matches = cricketers.filter(
      c => normalizeName(c.lastName) === lastName
    );
    if (matches.length === 1) {
      return matches[0].id;
    }
  }

  return null;
}

// Parse dismissal type to determine if LBW or Bowled
function parseDismissalType(dismissal?: string): {
  dismissalType: string | null;
  isLbwBowled: boolean;
} {
  if (!dismissal) {
    return { dismissalType: null, isLbwBowled: false };
  }

  const lower = dismissal.toLowerCase();

  if (lower.includes('not out')) {
    return { dismissalType: 'not_out', isLbwBowled: false };
  }
  if (lower.includes('lbw')) {
    return { dismissalType: 'lbw', isLbwBowled: true };
  }
  if (lower.includes('bowled') || lower.startsWith('b ')) {
    return { dismissalType: 'bowled', isLbwBowled: true };
  }
  if (lower.includes('caught')) {
    return { dismissalType: 'caught', isLbwBowled: false };
  }
  if (lower.includes('stumped')) {
    return { dismissalType: 'stumped', isLbwBowled: false };
  }
  if (lower.includes('run out')) {
    return { dismissalType: 'run_out', isLbwBowled: false };
  }
  if (lower.includes('hit wicket')) {
    return { dismissalType: 'hit_wicket', isLbwBowled: false };
  }

  return { dismissalType: 'other', isLbwBowled: false };
}

// Fetch from CricAPI (cricapi.com)
async function fetchFromCricAPI(matchUrl: string): Promise<MatchScorecard | null> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    console.log('CRICAPI_KEY not configured');
    return null;
  }

  try {
    // Parse match ID from URL or use directly
    const matchId = matchUrl.includes('/')
      ? matchUrl.split('/').pop()
      : matchUrl;

    const response = await axios.get(
      `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${matchId}`,
      { timeout: 10000 }
    );

    if (response.data.status !== 'success') {
      console.error('CricAPI error:', response.data.status);
      return null;
    }

    const data = response.data.data;
    const batting: PlayerScorecard[] = [];
    const bowling: PlayerScorecard[] = [];

    // Process batting scorecard
    for (const inning of data.scorecard || []) {
      for (const batter of inning.batting || []) {
        batting.push({
          name: batter.batsman?.name || batter.name,
          runs: batter.r || batter.runs || 0,
          balls: batter.b || batter.balls || 0,
          fours: batter['4s'] || batter.fours || 0,
          sixes: batter['6s'] || batter.sixes || 0,
          dismissal: batter.dismissal || batter['dismissal-text'],
        });
      }

      for (const bowler of inning.bowling || []) {
        bowling.push({
          name: bowler.bowler?.name || bowler.name,
          overs: parseFloat(bowler.o || bowler.overs || '0'),
          maidens: bowler.m || bowler.maidens || 0,
          runsConceded: bowler.r || bowler.runs || 0,
          wickets: bowler.w || bowler.wickets || 0,
        });
      }
    }

    return {
      matchId: matchId || '',
      team1: data.t1 || data.teamInfo?.[0]?.name || '',
      team2: data.t2 || data.teamInfo?.[1]?.name || '',
      battingScorecard: batting,
      bowlingScorecard: bowling,
    };
  } catch (error) {
    console.error('CricAPI fetch error:', error);
    return null;
  }
}

// Manual scorecard entry (for when APIs are not available)
// Allows auctioneer to paste ESPN Cricinfo format scorecard
export function parseESPNScorecard(text: string): MatchScorecard | null {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const batting: PlayerScorecard[] = [];
    const bowling: PlayerScorecard[] = [];

    let section: 'batting' | 'bowling' | null = null;

    for (const line of lines) {
      // Detect section headers
      if (line.toLowerCase().includes('batting')) {
        section = 'batting';
        continue;
      }
      if (line.toLowerCase().includes('bowling')) {
        section = 'bowling';
        continue;
      }

      if (section === 'batting') {
        // Parse batting line: "Name (c/wk) - dismissal - R - B - 4s - 6s - SR"
        // Or: "Name   c Fielder b Bowler   45   32   4   1   140.62"
        const battingMatch = line.match(
          /^([A-Za-z\s.'-]+)\s+(?:(?:c\s+.+\s+)?(?:b|lbw|st)\s+.+|not out|did not bat)\s+(\d+)?\s+(\d+)?\s+(\d+)?\s+(\d+)?/i
        );

        if (battingMatch) {
          batting.push({
            name: battingMatch[1].trim(),
            runs: parseInt(battingMatch[2]) || 0,
            balls: parseInt(battingMatch[3]) || 0,
            fours: parseInt(battingMatch[4]) || 0,
            sixes: parseInt(battingMatch[5]) || 0,
            dismissal: line.split(/\d/)[0]?.trim(),
          });
        }
      }

      if (section === 'bowling') {
        // Parse bowling line: "Name - O - M - R - W - Econ"
        const bowlingMatch = line.match(
          /^([A-Za-z\s.'-]+)\s+(\d+\.?\d*)\s+(\d+)\s+(\d+)\s+(\d+)/
        );

        if (bowlingMatch) {
          bowling.push({
            name: bowlingMatch[1].trim(),
            overs: parseFloat(bowlingMatch[2]),
            maidens: parseInt(bowlingMatch[3]),
            runsConceded: parseInt(bowlingMatch[4]),
            wickets: parseInt(bowlingMatch[5]),
          });
        }
      }
    }

    if (batting.length === 0 && bowling.length === 0) {
      return null;
    }

    return {
      matchId: 'manual',
      team1: '',
      team2: '',
      battingScorecard: batting,
      bowlingScorecard: bowling,
    };
  } catch (error) {
    console.error('ESPN scorecard parse error:', error);
    return null;
  }
}

// Main auto-populate function
export async function autoPopulateScores(
  gameId: string,
  matchId: string,
  source: 'cricapi' | 'manual',
  sourceData: string
): Promise<AutoPopulateResult> {
  try {
    let scorecard: MatchScorecard | null = null;

    if (source === 'cricapi') {
      scorecard = await fetchFromCricAPI(sourceData);
    } else if (source === 'manual') {
      scorecard = parseESPNScorecard(sourceData);
    }

    if (!scorecard) {
      return {
        success: false,
        matchedPlayers: 0,
        unmatchedPlayers: [],
        scores: [],
        error: 'Could not fetch or parse scorecard data',
      };
    }

    const matchedScores: Map<
      string,
      {
        cricketerId: string;
        name: string;
        inPlayingXi: boolean;
        runs: number;
        ballsFaced: number;
        fours: number;
        sixes: number;
        wickets: number;
        oversBowled: number;
        runsConceded: number;
        maidens: number;
        dotBalls: number;
        catches: number;
        stumpings: number;
        directRunouts: number;
        indirectRunouts: number;
        dismissalType: string | null;
        lbwBowledDismissals: number;
      }
    > = new Map();

    const unmatchedPlayers: string[] = [];

    // Process batting scorecard
    for (const batter of scorecard.battingScorecard) {
      const cricketerId = await findMatchingCricketer(batter.name, gameId);

      if (cricketerId) {
        const { dismissalType, isLbwBowled } = parseDismissalType(batter.dismissal);

        const existing = matchedScores.get(cricketerId) || {
          cricketerId,
          name: batter.name,
          inPlayingXi: true,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          dotBalls: 0,
          catches: 0,
          stumpings: 0,
          directRunouts: 0,
          indirectRunouts: 0,
          dismissalType: null,
          lbwBowledDismissals: 0,
        };

        existing.runs = batter.runs || 0;
        existing.ballsFaced = batter.balls || 0;
        existing.fours = batter.fours || 0;
        existing.sixes = batter.sixes || 0;
        existing.dismissalType = dismissalType;

        matchedScores.set(cricketerId, existing);
      } else {
        unmatchedPlayers.push(`(Bat) ${batter.name}`);
      }
    }

    // Process bowling scorecard
    for (const bowler of scorecard.bowlingScorecard) {
      const cricketerId = await findMatchingCricketer(bowler.name, gameId);

      if (cricketerId) {
        const existing = matchedScores.get(cricketerId) || {
          cricketerId,
          name: bowler.name,
          inPlayingXi: true,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          dotBalls: 0,
          catches: 0,
          stumpings: 0,
          directRunouts: 0,
          indirectRunouts: 0,
          dismissalType: null,
          lbwBowledDismissals: 0,
        };

        existing.wickets = bowler.wickets || 0;
        existing.oversBowled = bowler.overs || 0;
        existing.runsConceded = bowler.runsConceded || 0;
        existing.maidens = bowler.maidens || 0;
        existing.dotBalls = bowler.dotBalls || 0;

        // Count LBW/Bowled dismissals for this bowler
        // (This would need to be parsed from dismissal strings)

        matchedScores.set(cricketerId, existing);
      } else if (!unmatchedPlayers.includes(`(Bowl) ${bowler.name}`)) {
        unmatchedPlayers.push(`(Bowl) ${bowler.name}`);
      }
    }

    // Get point config
    let config = await prisma.pointSystemConfig.findUnique({
      where: { gameId },
    });

    if (!config) {
      config = await prisma.pointSystemConfig.create({
        data: { gameId },
      });
    }

    // Save scores and calculate points
    const savedScores: Array<{
      cricketerId: string;
      cricketerName: string;
      points: number;
    }> = [];

    for (const [cricketerId, scoreData] of matchedScores) {
      // Calculate points
      let total = 0;

      // Playing XI bonus
      if (scoreData.inPlayingXi) {
        total += config.playingXiBonus;
      }

      // Batting points
      total += scoreData.runs * config.runPoints;
      total += scoreData.fours * config.fourBonus;
      total += scoreData.sixes * config.sixBonus;

      // Runs bonus
      if (scoreData.runs >= 100) {
        total += config.runs100Bonus;
      } else if (scoreData.runs >= 75) {
        total += config.runs75Bonus;
      } else if (scoreData.runs >= 50) {
        total += config.runs50Bonus;
      } else if (scoreData.runs >= 25) {
        total += config.runs25Bonus;
      }

      // Duck penalty
      if (scoreData.runs === 0 && scoreData.dismissalType && scoreData.ballsFaced > 0) {
        total += config.duckPenalty;
      }

      // Strike rate bonus
      if (scoreData.ballsFaced >= 10) {
        const strikeRate = (scoreData.runs / scoreData.ballsFaced) * 100;
        if (strikeRate >= 170) {
          total += config.sr170Bonus;
        } else if (strikeRate >= 150) {
          total += config.sr150Bonus;
        } else if (strikeRate >= 130) {
          total += config.sr130Bonus;
        }
      }

      // Bowling points
      total += scoreData.wickets * config.wicketPoints;
      total += scoreData.lbwBowledDismissals * config.lbwBowledBonus;
      total += scoreData.maidens * config.maidenPoints;
      total += scoreData.dotBalls * config.dotBallPoints;

      // Wickets bonus
      if (scoreData.wickets >= 5) {
        total += config.wickets5Bonus;
      } else if (scoreData.wickets >= 4) {
        total += config.wickets4Bonus;
      } else if (scoreData.wickets >= 3) {
        total += config.wickets3Bonus;
      }

      // Economy bonus
      if (scoreData.oversBowled >= 2) {
        const economy = scoreData.runsConceded / scoreData.oversBowled;
        if (economy < 5) {
          total += config.econ5Bonus;
        } else if (economy < 6) {
          total += config.econ6Bonus;
        } else if (economy < 7) {
          total += config.econ7Bonus;
        }
      }

      // Fielding points
      total += scoreData.catches * config.catchPoints;
      if (scoreData.catches >= 3) {
        total += config.catches3Bonus;
      }
      total += scoreData.stumpings * config.stumpingPoints;
      total += scoreData.directRunouts * config.directRunout;
      total += scoreData.indirectRunouts * config.indirectRunout;

      // Save to database
      await prisma.gamePlayerMatchScore.upsert({
        where: {
          gameMatchId_cricketerId: {
            gameMatchId: matchId,
            cricketerId,
          },
        },
        update: {
          inPlayingXi: scoreData.inPlayingXi,
          runs: scoreData.runs,
          ballsFaced: scoreData.ballsFaced,
          fours: scoreData.fours,
          sixes: scoreData.sixes,
          wickets: scoreData.wickets,
          oversBowled: scoreData.oversBowled,
          runsConceded: scoreData.runsConceded,
          maidens: scoreData.maidens,
          dotBalls: scoreData.dotBalls,
          catches: scoreData.catches,
          stumpings: scoreData.stumpings,
          directRunouts: scoreData.directRunouts,
          indirectRunouts: scoreData.indirectRunouts,
          dismissalType: scoreData.dismissalType,
          lbwBowledDismissals: scoreData.lbwBowledDismissals,
          calculatedPoints: total,
        },
        create: {
          gameMatchId: matchId,
          cricketerId,
          inPlayingXi: scoreData.inPlayingXi,
          runs: scoreData.runs,
          ballsFaced: scoreData.ballsFaced,
          fours: scoreData.fours,
          sixes: scoreData.sixes,
          wickets: scoreData.wickets,
          oversBowled: scoreData.oversBowled,
          runsConceded: scoreData.runsConceded,
          maidens: scoreData.maidens,
          dotBalls: scoreData.dotBalls,
          catches: scoreData.catches,
          stumpings: scoreData.stumpings,
          directRunouts: scoreData.directRunouts,
          indirectRunouts: scoreData.indirectRunouts,
          dismissalType: scoreData.dismissalType,
          lbwBowledDismissals: scoreData.lbwBowledDismissals,
          calculatedPoints: total,
        },
      });

      savedScores.push({
        cricketerId,
        cricketerName: scoreData.name,
        points: total,
      });
    }

    // Mark match as auto-populated
    await prisma.gameMatch.update({
      where: { id: matchId },
      data: {
        scoresPopulated: true,
        isAutoPopulated: true,
      },
    });

    return {
      success: true,
      matchedPlayers: savedScores.length,
      unmatchedPlayers,
      scores: savedScores,
    };
  } catch (error) {
    console.error('Auto-populate error:', error);
    return {
      success: false,
      matchedPlayers: 0,
      unmatchedPlayers: [],
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get available IPL matches from API
export async function getAvailableMatches(): Promise<
  Array<{
    id: string;
    name: string;
    date: string;
    team1: string;
    team2: string;
    status: string;
  }>
> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await axios.get(
      `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=47b54677-34de-4378-9019-154e82b9cc1a`, // IPL series ID
      { timeout: 10000 }
    );

    if (response.data.status !== 'success') {
      return [];
    }

    return (response.data.data?.matchList || []).map(
      (m: {
        id: string;
        name: string;
        date: string;
        teamInfo: Array<{ name: string }>;
        status: string;
      }) => ({
        id: m.id,
        name: m.name,
        date: m.date,
        team1: m.teamInfo?.[0]?.name || '',
        team2: m.teamInfo?.[1]?.name || '',
        status: m.status,
      })
    );
  } catch (error) {
    console.error('Fetch available matches error:', error);
    return [];
  }
}

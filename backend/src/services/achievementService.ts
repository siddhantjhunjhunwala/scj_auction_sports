import { PrismaClient, AchievementType } from '@prisma/client';

const prisma = new PrismaClient();

// Achievement definitions with metadata
export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementType,
  { name: string; description: string; iconEmoji: string; rarity: string; points: number }
> = {
  // Auction achievements
  first_pick: {
    name: 'First Blood',
    description: 'First player picked in the auction',
    iconEmoji: '🎯',
    rarity: 'rare',
    points: 25,
  },
  big_spender: {
    name: 'Big Spender',
    description: 'Spent 50+ lakhs on a single player',
    iconEmoji: '💰',
    rarity: 'common',
    points: 10,
  },
  bargain_hunter: {
    name: 'Bargain Hunter',
    description: 'Won a player at base price',
    iconEmoji: '🏷️',
    rarity: 'common',
    points: 10,
  },
  bidding_war_winner: {
    name: 'Bidding War Veteran',
    description: 'Won a player after 10+ competing bids',
    iconEmoji: '⚔️',
    rarity: 'rare',
    points: 20,
  },
  full_squad: {
    name: 'Squad Complete',
    description: 'Built a full 12-player squad',
    iconEmoji: '✅',
    rarity: 'common',
    points: 15,
  },
  foreign_legion: {
    name: 'Foreign Legion',
    description: 'Picked 4 foreign players',
    iconEmoji: '🌍',
    rarity: 'rare',
    points: 20,
  },
  budget_master: {
    name: 'Budget Master',
    description: 'Finished auction with 20+ lakhs remaining',
    iconEmoji: '🏦',
    rarity: 'epic',
    points: 30,
  },

  // Scoring achievements
  century_club: {
    name: 'Century Club',
    description: 'Own a player who scored 100+ runs in a match',
    iconEmoji: '💯',
    rarity: 'rare',
    points: 25,
  },
  hat_trick_hero: {
    name: 'Hat-Trick Hero',
    description: 'Own a player who took 3+ wickets in a match',
    iconEmoji: '🎳',
    rarity: 'rare',
    points: 25,
  },
  match_winner: {
    name: 'Match Winner',
    description: 'Own the top scorer of a match',
    iconEmoji: '🏆',
    rarity: 'common',
    points: 15,
  },
  consistent_performer: {
    name: 'Consistent Performer',
    description: 'Own a player in playing XI for 5+ consecutive matches',
    iconEmoji: '📈',
    rarity: 'epic',
    points: 30,
  },
  points_milestone_500: {
    name: 'Rising Star',
    description: 'Reached 500 total fantasy points',
    iconEmoji: '⭐',
    rarity: 'common',
    points: 20,
  },
  points_milestone_1000: {
    name: 'Fantasy Legend',
    description: 'Reached 1000 total fantasy points',
    iconEmoji: '🌟',
    rarity: 'epic',
    points: 50,
  },
  weekly_champion: {
    name: 'Weekly Champion',
    description: 'Highest fantasy points in a single match',
    iconEmoji: '👑',
    rarity: 'rare',
    points: 25,
  },

  // Team achievements
  balanced_squad: {
    name: 'Balanced Squad',
    description: 'Have at least 2 players of each type',
    iconEmoji: '⚖️',
    rarity: 'common',
    points: 15,
  },
  ipl_collector: {
    name: 'IPL Collector',
    description: 'Have players from 5+ different IPL teams',
    iconEmoji: '🎨',
    rarity: 'rare',
    points: 20,
  },
  top_3_finish: {
    name: 'Podium Finish',
    description: 'Finished in top 3 of the leaderboard',
    iconEmoji: '🥉',
    rarity: 'epic',
    points: 40,
  },
  league_champion: {
    name: 'League Champion',
    description: 'Won the fantasy league!',
    iconEmoji: '🏅',
    rarity: 'legendary',
    points: 100,
  },
};

// Seed achievements into database
export async function seedAchievements(): Promise<void> {
  const types = Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementType[];

  for (const type of types) {
    const def = ACHIEVEMENT_DEFINITIONS[type];
    await prisma.achievement.upsert({
      where: { type },
      update: {
        name: def.name,
        description: def.description,
        iconEmoji: def.iconEmoji,
        rarity: def.rarity,
        points: def.points,
      },
      create: {
        type,
        name: def.name,
        description: def.description,
        iconEmoji: def.iconEmoji,
        rarity: def.rarity,
        points: def.points,
      },
    });
  }
}

// Award an achievement to a participant
export async function awardAchievement(
  participantId: string,
  achievementType: AchievementType,
  matchId?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { type: achievementType },
    });

    if (!achievement) {
      console.error(`Achievement type ${achievementType} not found`);
      return false;
    }

    // Check if already earned
    const existing = await prisma.participantAchievement.findUnique({
      where: {
        participantId_achievementId: {
          participantId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) {
      return false; // Already earned
    }

    await prisma.participantAchievement.create({
      data: {
        participantId,
        achievementId: achievement.id,
        matchId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });

    return true;
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return false;
  }
}

// Check auction-related achievements after a player is picked
export async function checkAuctionAchievements(
  gameId: string,
  participantId: string,
  cricketerId: string,
  pricePaid: number,
  bidCount: number,
  basePrice: number = 2
): Promise<AchievementType[]> {
  const awarded: AchievementType[] = [];

  // First pick achievement
  const pickOrder = await prisma.gameCricketer.count({
    where: { gameId, isPicked: true },
  });
  if (pickOrder === 1) {
    if (await awardAchievement(participantId, 'first_pick')) {
      awarded.push('first_pick');
    }
  }

  // Big spender (50+ lakhs)
  if (pricePaid >= 50) {
    if (await awardAchievement(participantId, 'big_spender', undefined, { pricePaid })) {
      awarded.push('big_spender');
    }
  }

  // Bargain hunter (base price)
  if (pricePaid <= basePrice) {
    if (await awardAchievement(participantId, 'bargain_hunter')) {
      awarded.push('bargain_hunter');
    }
  }

  // Bidding war winner (10+ bids)
  if (bidCount >= 10) {
    if (await awardAchievement(participantId, 'bidding_war_winner', undefined, { bidCount })) {
      awarded.push('bidding_war_winner');
    }
  }

  // Check team composition achievements
  const teamCricketers = await prisma.gameCricketer.findMany({
    where: { pickedByParticipantId: participantId },
  });

  // Full squad (12 players)
  if (teamCricketers.length >= 12) {
    if (await awardAchievement(participantId, 'full_squad')) {
      awarded.push('full_squad');
    }
  }

  // Foreign legion (4 foreign players)
  const foreignCount = teamCricketers.filter((c) => c.isForeign).length;
  if (foreignCount >= 4) {
    if (await awardAchievement(participantId, 'foreign_legion')) {
      awarded.push('foreign_legion');
    }
  }

  // Balanced squad check
  const typeCounts = teamCricketers.reduce(
    (acc, c) => {
      acc[c.playerType] = (acc[c.playerType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const hasBalanced =
    (typeCounts['batsman'] || 0) >= 2 &&
    (typeCounts['bowler'] || 0) >= 2 &&
    (typeCounts['allrounder'] || 0) >= 2 &&
    (typeCounts['wicketkeeper'] || 0) >= 2;
  if (hasBalanced) {
    if (await awardAchievement(participantId, 'balanced_squad')) {
      awarded.push('balanced_squad');
    }
  }

  // IPL collector (5+ different teams)
  const uniqueTeams = new Set(teamCricketers.map((c) => c.iplTeam));
  if (uniqueTeams.size >= 5) {
    if (await awardAchievement(participantId, 'ipl_collector')) {
      awarded.push('ipl_collector');
    }
  }

  return awarded;
}

// Check budget master at auction end
export async function checkAuctionEndAchievements(gameId: string): Promise<Map<string, AchievementType[]>> {
  const results = new Map<string, AchievementType[]>();

  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
  });

  for (const participant of participants) {
    const awarded: AchievementType[] = [];

    // Budget master (20+ remaining)
    if (participant.budgetRemaining >= 20) {
      if (await awardAchievement(participant.id, 'budget_master', undefined, { remaining: participant.budgetRemaining })) {
        awarded.push('budget_master');
      }
    }

    if (awarded.length > 0) {
      results.set(participant.id, awarded);
    }
  }

  return results;
}

// Check scoring achievements after match scores are saved
export async function checkScoringAchievements(
  gameId: string,
  matchId: string
): Promise<Map<string, AchievementType[]>> {
  const results = new Map<string, AchievementType[]>();

  // Get all scores for this match
  const matchScores = await prisma.gamePlayerMatchScore.findMany({
    where: { gameMatchId: matchId },
    include: {
      cricketer: {
        include: { pickedBy: true },
      },
    },
  });

  // Get match details
  const match = await prisma.gameMatch.findUnique({
    where: { id: matchId },
  });

  if (!match) return results;

  // Find top scorer
  let topScorer = matchScores[0];
  for (const score of matchScores) {
    if (score.calculatedPoints > topScorer.calculatedPoints) {
      topScorer = score;
    }
  }

  // Process each score
  for (const score of matchScores) {
    const participantId = score.cricketer.pickedByParticipantId;
    if (!participantId) continue;

    const awarded: AchievementType[] = [];

    // Century club (100+ runs)
    if (score.runs >= 100) {
      if (
        await awardAchievement(participantId, 'century_club', matchId, {
          playerName: `${score.cricketer.firstName} ${score.cricketer.lastName}`,
          runs: score.runs,
        })
      ) {
        awarded.push('century_club');
      }
    }

    // Hat-trick hero (3+ wickets)
    if (score.wickets >= 3) {
      if (
        await awardAchievement(participantId, 'hat_trick_hero', matchId, {
          playerName: `${score.cricketer.firstName} ${score.cricketer.lastName}`,
          wickets: score.wickets,
        })
      ) {
        awarded.push('hat_trick_hero');
      }
    }

    // Match winner (top scorer)
    if (score.id === topScorer.id && score.calculatedPoints > 0) {
      if (
        await awardAchievement(participantId, 'match_winner', matchId, {
          playerName: `${score.cricketer.firstName} ${score.cricketer.lastName}`,
          points: score.calculatedPoints,
        })
      ) {
        awarded.push('match_winner');
      }
    }

    if (awarded.length > 0) {
      const existing = results.get(participantId) || [];
      results.set(participantId, [...existing, ...awarded]);
    }
  }

  // Check participant-level achievements (points milestones, weekly champion)
  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
    include: {
      cricketers: {
        include: {
          matchScores: true,
        },
      },
    },
  });

  // Calculate total points per participant for this match
  const matchPointsByParticipant: Record<string, number> = {};
  let highestMatchPoints = 0;
  let weeklyChampionId: string | null = null;

  for (const participant of participants) {
    let totalPoints = 0;
    let matchPoints = 0;

    for (const cricketer of participant.cricketers) {
      for (const score of cricketer.matchScores) {
        totalPoints += score.calculatedPoints;
        if (score.gameMatchId === matchId) {
          matchPoints += score.calculatedPoints;
        }
      }
    }

    matchPointsByParticipant[participant.id] = matchPoints;
    if (matchPoints > highestMatchPoints) {
      highestMatchPoints = matchPoints;
      weeklyChampionId = participant.id;
    }

    const awarded: AchievementType[] = [];

    // Points milestones
    if (totalPoints >= 500) {
      if (await awardAchievement(participant.id, 'points_milestone_500', matchId, { totalPoints })) {
        awarded.push('points_milestone_500');
      }
    }
    if (totalPoints >= 1000) {
      if (await awardAchievement(participant.id, 'points_milestone_1000', matchId, { totalPoints })) {
        awarded.push('points_milestone_1000');
      }
    }

    // Check consistent performer (5+ matches in playing XI)
    for (const cricketer of participant.cricketers) {
      const playingXiCount = cricketer.matchScores.filter((s) => s.inPlayingXi).length;
      if (playingXiCount >= 5) {
        if (
          await awardAchievement(participant.id, 'consistent_performer', matchId, {
            playerName: `${cricketer.firstName} ${cricketer.lastName}`,
            matches: playingXiCount,
          })
        ) {
          awarded.push('consistent_performer');
        }
      }
    }

    if (awarded.length > 0) {
      const existing = results.get(participant.id) || [];
      results.set(participant.id, [...existing, ...awarded]);
    }
  }

  // Award weekly champion
  if (weeklyChampionId && highestMatchPoints > 0) {
    if (
      await awardAchievement(weeklyChampionId, 'weekly_champion', matchId, { points: highestMatchPoints })
    ) {
      const existing = results.get(weeklyChampionId) || [];
      results.set(weeklyChampionId, [...existing, 'weekly_champion']);
    }
  }

  return results;
}

// Check final standings achievements when game completes
export async function checkFinalStandingsAchievements(gameId: string): Promise<Map<string, AchievementType[]>> {
  const results = new Map<string, AchievementType[]>();

  // Calculate final standings
  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
    include: {
      cricketers: {
        include: {
          matchScores: true,
        },
      },
      user: true,
    },
  });

  const standings = participants
    .map((p) => ({
      participantId: p.id,
      totalPoints: p.cricketers.reduce(
        (sum, c) => sum + c.matchScores.reduce((s, m) => s + m.calculatedPoints, 0),
        0
      ),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Award top 3 and champion
  for (let i = 0; i < Math.min(3, standings.length); i++) {
    const { participantId, totalPoints } = standings[i];
    const awarded: AchievementType[] = [];

    if (i === 0) {
      if (await awardAchievement(participantId, 'league_champion', undefined, { totalPoints })) {
        awarded.push('league_champion');
      }
    }

    if (await awardAchievement(participantId, 'top_3_finish', undefined, { position: i + 1, totalPoints })) {
      awarded.push('top_3_finish');
    }

    if (awarded.length > 0) {
      results.set(participantId, awarded);
    }
  }

  return results;
}

// Get all achievements for a participant
export async function getParticipantAchievements(participantId: string) {
  return prisma.participantAchievement.findMany({
    where: { participantId },
    include: {
      achievement: true,
    },
    orderBy: { earnedAt: 'desc' },
  });
}

// Get achievement leaderboard for a game
export async function getAchievementLeaderboard(gameId: string) {
  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
    include: {
      user: true,
      achievements: {
        include: { achievement: true },
      },
    },
  });

  return participants
    .map((p) => ({
      participantId: p.id,
      userId: p.userId,
      userName: p.user.name,
      teamName: p.user.teamName,
      achievementCount: p.achievements.length,
      totalAchievementPoints: p.achievements.reduce((sum, a) => sum + a.achievement.points, 0),
      achievements: p.achievements.map((a) => ({
        type: a.achievement.type,
        name: a.achievement.name,
        iconEmoji: a.achievement.iconEmoji,
        rarity: a.achievement.rarity,
        earnedAt: a.earnedAt,
      })),
    }))
    .sort((a, b) => b.totalAchievementPoints - a.totalAchievementPoints);
}

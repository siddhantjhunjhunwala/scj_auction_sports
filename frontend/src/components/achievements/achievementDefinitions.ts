export interface AchievementDefinition {
  name: string;
  description: string;
  iconEmoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
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

export default ACHIEVEMENT_DEFINITIONS;

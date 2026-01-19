export type UserRole = 'player' | 'auctioneer';
export type PlayerType = 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder';
export type AuctionStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';
export type LeagueMode = 'pre_auction' | 'auction' | 'scoring' | 'subs' | 'report';
export type GameStatus = 'pre_auction' | 'auction_active' | 'auction_paused' | 'auction_ended' | 'scoring' | 'completed';

export interface User {
  id: string;
  email: string;
  name: string;
  teamName: string;
  avatarUrl: string | null;
  role: UserRole;
  budgetRemaining: number;
  createdAt: string;
}

export interface BattingRecord {
  matches?: number;
  runs?: number;
  average?: number;
  strikeRate?: number;
  hundreds?: number;
  fifties?: number;
}

export interface BowlingRecord {
  matches?: number;
  wickets?: number;
  average?: number;
  economy?: number;
  bestFigures?: string;
}

export interface Cricketer {
  id: string;
  firstName: string;
  lastName: string;
  playerType: PlayerType;
  isForeign: boolean;
  iplTeam: string;
  battingRecord: BattingRecord | null;
  bowlingRecord: BowlingRecord | null;
  pictureUrl: string | null;
  newsArticles: string[];
  isPicked: boolean;
  pickedByUserId: string | null;
  pricePaid: number | null;
  pickOrder: number | null;
  wasSkipped: boolean;
}

export interface Bid {
  id: string;
  cricketerId: string;
  userId: string;
  amount: number;
  timestamp: string;
  userName?: string;
  teamName?: string;
}

export interface Match {
  id: string;
  matchNumber: number;
  team1: string;
  team2: string;
  matchDate: string;
  scoresPopulated: boolean;
  isAutoPopulated: boolean;
}

export interface PlayerMatchScore {
  id: string;
  matchId: string;
  cricketerId: string;
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
  calculatedPoints: number;
  cricketer?: Cricketer;
}

export interface Substitution {
  id: string;
  userId: string;
  subOutCricketerId: string;
  subInCricketerId: string;
  subRound: 1 | 2;
  createdAt: string;
}

export interface AuctionState {
  id: string;
  currentCricketerId: string | null;
  auctionStatus: AuctionStatus;
  timerEndTime: string | null;
  timerPausedAt: string | null;
  currentHighBid: number;
  currentHighBidderId: string | null;
  isFirstRound: boolean;
  currentCricketer?: Cricketer;
  currentHighBidder?: User;
}

export interface LeagueState {
  id: string;
  mode: LeagueMode;
  subsPeriodActive: boolean;
  currentSubUserId: string | null;
  currentSubRound: number | null;
}

export interface TeamComposition {
  batsmen: number;
  bowlers: number;
  wicketkeepers: number;
  allrounders: number;
  foreigners: number;
  total: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PlayerRanking {
  rank: number;
  previousRank: number | null;
  user: User;
  totalPoints: number;
  previousPoints: number;
  pointsChange: number;
}

export interface ReportData {
  matchNumber: number;
  matchDate: string;
  rankings: PlayerRanking[];
  funStats: {
    topScorer: { user: User; points: number } | null;
    mostBatsmanPoints: { user: User; points: number } | null;
    mostBowlerPoints: { user: User; points: number } | null;
    mostForeignerPoints: { user: User; points: number } | null;
    bestValuePick: { cricketer: Cricketer; pointsPerDollar: number } | null;
    worstValuePick: { cricketer: Cricketer; pointsPerDollar: number } | null;
  };
  pointsProgression: {
    userId: string;
    userName: string;
    teamName: string;
    color: string;
    points: number[];
  }[];
}

// Multi-Game Types
export interface Game {
  id: string;
  name: string;
  code: string;
  createdById: string;
  status: GameStatus;
  joiningAllowed: boolean;
  cricketersUploaded: boolean;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email?: string;
    teamName?: string;
    avatarUrl?: string | null;
  };
  participants?: GameParticipant[];
  pointsConfig?: PointSystemConfig;
  _count?: {
    participants: number;
    cricketers: number;
    matches?: number;
  };
  isCreator?: boolean;
}

export interface GameParticipant {
  id: string;
  gameId: string;
  userId: string;
  budgetRemaining: number;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    teamName?: string;
    avatarUrl?: string | null;
  };
  cricketers?: GameCricketer[];
}

export interface GameCricketer {
  id: string;
  gameId: string;
  firstName: string;
  lastName: string;
  playerType: PlayerType;
  isForeign: boolean;
  iplTeam: string;
  battingRecord: BattingRecord | null;
  bowlingRecord: BowlingRecord | null;
  pictureUrl: string | null;
  isPicked: boolean;
  pickedByParticipantId: string | null;
  pricePaid: number | null;
  pickOrder: number | null;
  wasSkipped: boolean;
  auctionOrder: number | null;
  pickedBy?: GameParticipant;
}

export interface GameAuctionState {
  id: string;
  gameId: string;
  currentCricketerId: string | null;
  auctionStatus: AuctionStatus;
  timerEndTime: string | null;
  timerPausedAt: string | null;
  currentHighBid: number;
  currentHighBidderId: string | null;
  isFirstRound: boolean;
  currentBiddingLog: BidLogEntry[];
  lastWinMessage: string | null;
  currentCricketer?: GameCricketer | null;
  currentHighBidder?: {
    id: string;
    budgetRemaining: number;
    user?: {
      id: string;
      name: string;
      teamName?: string;
      avatarUrl?: string | null;
    };
  } | null;
}

export interface BidLogEntry {
  participantId: string;
  teamName: string;
  amount: number;
  timestamp: string;
}

export interface GameMatch {
  id: string;
  gameId: string;
  matchNumber: number;
  team1: string;
  team2: string;
  matchDate: string;
  scoresPopulated: boolean;
  isAutoPopulated: boolean;
}

export interface GamePlayerMatchScore {
  id: string;
  gameMatchId: string;
  cricketerId: string;
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
  calculatedPoints: number;
  cricketer?: GameCricketer;
}

export interface PointSystemConfig {
  id: string;
  gameId: string;
  // Batting
  runPoints: number;
  fourBonus: number;
  sixBonus: number;
  runs25Bonus: number;
  runs50Bonus: number;
  runs75Bonus: number;
  runs100Bonus: number;
  duckPenalty: number;
  sr130Bonus: number;
  sr150Bonus: number;
  sr170Bonus: number;
  // Bowling
  wicketPoints: number;
  lbwBowledBonus: number;
  maidenPoints: number;
  dotBallPoints: number;
  wickets3Bonus: number;
  wickets4Bonus: number;
  wickets5Bonus: number;
  econ5Bonus: number;
  econ6Bonus: number;
  econ7Bonus: number;
  // Fielding
  catchPoints: number;
  catches3Bonus: number;
  stumpingPoints: number;
  directRunout: number;
  indirectRunout: number;
  playingXiBonus: number;
}

export interface GameLeaderboardEntry {
  rank: number;
  participant: {
    id: string;
    user: {
      id: string;
      name: string;
      teamName?: string;
      avatarUrl?: string | null;
    };
    budgetRemaining: number;
  };
  totalPoints: number;
  pointsByMatch: {
    matchNumber: number;
    points: number;
  }[];
  teamSize: number;
}

export interface GameLeaderboard {
  leaderboard: GameLeaderboardEntry[];
  matchCount: number;
  upToMatch: number;
}

export interface PlayerDashboardData {
  participant: {
    id: string;
    user: {
      id: string;
      name: string;
      email?: string;
      teamName?: string;
      avatarUrl?: string | null;
    };
    budgetRemaining: number;
  };
  totalPoints: number;
  rank: number;
  totalParticipants: number;
  playerStats: {
    cricketer: {
      id: string;
      firstName: string;
      lastName: string;
      playerType: PlayerType;
      isForeign: boolean;
      iplTeam: string;
      pricePaid: number | null;
    };
    totalPoints: number;
    matchesPlayed: number;
    pointsPerMatch: number;
    valueRatio: number;
  }[];
  matchCount: number;
}

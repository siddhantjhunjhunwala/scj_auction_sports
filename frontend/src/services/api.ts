import axios from 'axios';
import type {
  User,
  Cricketer,
  Match,
  PlayerMatchScore,
  AuctionState,
  LeagueState,
  AuthResponse,
  ReportData,
  Substitution,
  Game,
  GameCricketer,
  GameAuctionState,
  GameMatch,
  GamePlayerMatchScore,
  PointSystemConfig,
  GameLeaderboard,
  PlayerDashboardData,
  GameParticipant,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  me: () => api.get<User>('/auth/me'),

  updateProfile: (data: { teamName?: string; avatarUrl?: string }) =>
    api.patch<User>('/auth/profile', data),
};

// Users
export const usersApi = {
  getAll: () => api.get<User[]>('/users'),

  getById: (id: string) => api.get<User>(`/users/${id}`),

  getTeam: (userId: string) => api.get<Cricketer[]>(`/users/${userId}/team`),
};

// Cricketers
export const cricketersApi = {
  getAll: () => api.get<Cricketer[]>('/cricketers'),

  getById: (id: string) => api.get<Cricketer>(`/cricketers/${id}`),

  getUnpicked: () => api.get<Cricketer[]>('/cricketers/unpicked'),

  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ count: number }>('/cricketers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (id: string, data: Partial<Cricketer>) =>
    api.patch<Cricketer>(`/cricketers/${id}`, data),

  setAuctionOrder: (order: { id: string; order: number }[]) =>
    api.post('/cricketers/auction-order', { order }),
};

// Auction
export const auctionApi = {
  getState: () => api.get<AuctionState>('/auction/state'),

  startAuction: (cricketerId: string) =>
    api.post<AuctionState>('/auction/start', { cricketerId }),

  placeBid: (amount: number) =>
    api.post<{ success: boolean; message?: string }>('/auction/bid', { amount }),

  addTime: (seconds: number) =>
    api.post<AuctionState>('/auction/add-time', { seconds }),

  pause: () => api.post<AuctionState>('/auction/pause'),

  resume: () => api.post<AuctionState>('/auction/resume'),

  skip: () => api.post<AuctionState>('/auction/skip'),

  complete: () => api.post<AuctionState>('/auction/complete'),
};

// League State
export const leagueApi = {
  getState: () => api.get<LeagueState>('/league/state'),

  setMode: (mode: LeagueState['mode']) =>
    api.post<LeagueState>('/league/mode', { mode }),

  startSubsPeriod: (round: 1 | 2) =>
    api.post<LeagueState>('/league/subs/start', { round }),

  endSubsPeriod: () =>
    api.post<LeagueState>('/league/subs/end'),
};

// Matches
export const matchesApi = {
  getAll: () => api.get<Match[]>('/matches'),

  getById: (id: string) => api.get<Match>(`/matches/${id}`),

  create: (data: { matchNumber: number; team1: string; team2: string; matchDate: string }) =>
    api.post<Match>('/matches', data),

  getScores: (matchId: string) =>
    api.get<PlayerMatchScore[]>(`/matches/${matchId}/scores`),

  saveScores: (matchId: string, scores: Partial<PlayerMatchScore>[]) =>
    api.post<PlayerMatchScore[]>(`/matches/${matchId}/scores`, { scores }),

  autoPopulate: (matchId: string) =>
    api.post<PlayerMatchScore[]>(`/matches/${matchId}/auto-populate`),
};

// Substitutions
export const subsApi = {
  getByUser: (userId: string) => api.get<Substitution[]>(`/subs/user/${userId}`),

  getSnakeOrder: (round: 1 | 2) =>
    api.get<{ userId: string; user: User; position: number }[]>(`/subs/snake-order/${round}`),

  validate: (data: { subOutId: string; subInId: string }) =>
    api.post<{ valid: boolean; message?: string }>('/subs/validate', data),

  create: (data: { subOutId: string; subInId: string; round: 1 | 2 }) =>
    api.post<Substitution>('/subs', data),

  skip: (round: 1 | 2) =>
    api.post<{ success: boolean }>('/subs/skip', { round }),
};

// Reports
export const reportsApi = {
  generate: (matchNumber: number) =>
    api.get<ReportData>(`/reports/match/${matchNumber}`),

  downloadPdf: (matchNumber: number) =>
    api.get(`/reports/match/${matchNumber}/pdf`, { responseType: 'blob' }),

  emailToAll: (matchNumber: number) =>
    api.post<{ success: boolean }>(`/reports/match/${matchNumber}/email`),
};

// Multi-Game APIs
export const gamesApi = {
  // Game CRUD
  create: (name: string) => api.post<Game>('/games', { name }),

  getAll: () => api.get<Game[]>('/games'),

  getJoinable: () => api.get<Game[]>('/games/joinable'),

  getById: (id: string) => api.get<Game>(`/games/${id}`),

  update: (id: string, data: { name?: string; joiningAllowed?: boolean }) =>
    api.patch<Game>(`/games/${id}`, data),

  delete: (id: string) => api.delete(`/games/${id}`),

  // Join/Leave
  joinByCode: (code: string) =>
    api.post<{ game: Game; participant: GameParticipant }>('/games/join', { code }),

  joinById: (id: string) => api.post<GameParticipant>(`/games/${id}/join`),

  leave: (id: string) => api.post(`/games/${id}/leave`),

  // Participants
  getParticipants: (gameId: string) =>
    api.get<GameParticipant[]>(`/games/${gameId}/participants`),

  // Cricketers
  uploadCricketers: (gameId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ message: string; cricketers: GameCricketer[] }>(
      `/games/${gameId}/cricketers/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getCricketers: (gameId: string) =>
    api.get<GameCricketer[]>(`/games/${gameId}/cricketers`),

  getUnpickedCricketers: (gameId: string) =>
    api.get<GameCricketer[]>(`/games/${gameId}/cricketers/unpicked`),

  setAuctionOrder: (gameId: string, order: string[]) =>
    api.post<GameCricketer[]>(`/games/${gameId}/cricketers/auction-order`, { order }),

  // Points Config
  getPointsConfig: (gameId: string) =>
    api.get<PointSystemConfig>(`/games/${gameId}/points-config`),

  updatePointsConfig: (gameId: string, config: Partial<PointSystemConfig>) =>
    api.put<PointSystemConfig>(`/games/${gameId}/points-config`, config),
};

// Game Auction APIs
export const gameAuctionApi = {
  getState: (gameId: string) =>
    api.get<GameAuctionState>(`/games/${gameId}/auction/state`),

  start: (gameId: string, cricketerId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/start`, { cricketerId }),

  bid: (gameId: string, amount: number) =>
    api.post<{ success: boolean; auctionState: GameAuctionState }>(
      `/games/${gameId}/auction/bid`,
      { amount }
    ),

  addTime: (gameId: string, seconds: number) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/add-time`, { seconds }),

  pause: (gameId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/pause`),

  resume: (gameId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/resume`),

  skip: (gameId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/skip`),

  end: (gameId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/end`),

  assign: (gameId: string) =>
    api.post<GameAuctionState>(`/games/${gameId}/auction/assign`),

  getBids: (gameId: string) =>
    api.get<{ biddingLog: Array<{ participantId: string; teamName: string; amount: number; timestamp: string }> }>(
      `/games/${gameId}/auction/bids`
    ),
};

// Game Scoring APIs
export const gameScoringApi = {
  // Matches
  getMatches: (gameId: string) =>
    api.get<GameMatch[]>(`/games/${gameId}/matches`),

  createMatch: (
    gameId: string,
    data: { matchNumber: number; team1: string; team2: string; matchDate: string }
  ) => api.post<GameMatch>(`/games/${gameId}/matches`, data),

  getMatchScores: (gameId: string, matchId: string) =>
    api.get<GamePlayerMatchScore[]>(`/games/${gameId}/matches/${matchId}/scores`),

  saveMatchScores: (
    gameId: string,
    matchId: string,
    scores: Partial<GamePlayerMatchScore>[]
  ) =>
    api.post<GamePlayerMatchScore[]>(`/games/${gameId}/matches/${matchId}/scores`, {
      scores,
    }),

  // Leaderboard
  getLeaderboard: (gameId: string, upToMatch?: number) =>
    api.get<GameLeaderboard>(`/games/${gameId}/leaderboard`, {
      params: upToMatch ? { upToMatch } : undefined,
    }),

  // Player Dashboard
  getDashboard: (gameId: string, participantId: string, upToMatch?: number) =>
    api.get<PlayerDashboardData>(
      `/games/${gameId}/dashboard/${participantId}`,
      { params: upToMatch ? { upToMatch } : undefined }
    ),

  // Reports
  downloadTeamsPdf: (gameId: string) =>
    api.get(`/games/${gameId}/reports/teams-pdf`, { responseType: 'blob' }),

  emailTeams: (gameId: string) =>
    api.post<{ message: string; success: string[]; failed: string[] }>(
      `/games/${gameId}/reports/email`
    ),
};

export default api;

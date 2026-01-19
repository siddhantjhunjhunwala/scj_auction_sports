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

export default api;

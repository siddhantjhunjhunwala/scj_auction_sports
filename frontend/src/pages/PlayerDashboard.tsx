import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gamesApi, gameScoringApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Game, GameParticipant, PlayerDashboardData, GameMatch } from '../types';
import Skeleton, { SkeletonLeaderboard } from '../components/ui/Skeleton';
import { NoTeamEmpty } from '../components/ui/EmptyState';

export default function PlayerDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [participant, setParticipant] = useState<GameParticipant | null>(null);
  const [dashboardData, setDashboardData] = useState<PlayerDashboardData | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (gameId && user) {
      loadInitialData();
    }
  }, [gameId, user]);

  useEffect(() => {
    if (participant) {
      loadDashboard();
    }
  }, [participant, selectedMatch]);

  const loadInitialData = async () => {
    if (!gameId || !user) return;

    try {
      setIsLoading(true);
      const [gameRes, participantsRes, matchesRes] = await Promise.all([
        gamesApi.getById(gameId),
        gamesApi.getParticipants(gameId),
        gameScoringApi.getMatches(gameId),
      ]);

      setGame(gameRes.data);
      setMatches(matchesRes.data);

      const userParticipant = participantsRes.data.find(p => p.userId === user.id);
      setParticipant(userParticipant || null);

      if (!userParticipant) {
        setError('You are not a participant in this game');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!gameId || !participant) return;

    try {
      const response = await gameScoringApi.getDashboard(
        gameId,
        participant.id,
        selectedMatch
      );
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  const getPlayerTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; text: string; icon: string }> = {
      batsman: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🏏' },
      bowler: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🎳' },
      allrounder: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⚡' },
      wicketkeeper: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🧤' },
    };
    return configs[type] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '🏏' };
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'from-yellow-500 to-amber-600', icon: '🥇' };
    if (rank === 2) return { bg: 'from-gray-400 to-gray-500', icon: '🥈' };
    if (rank === 3) return { bg: 'from-orange-500 to-orange-600', icon: '🥉' };
    return { bg: 'from-[var(--bg-tertiary)] to-[var(--bg-secondary)]', icon: '#' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-4">
              <Skeleton width={80} height={20} />
              <div className="h-6 w-px bg-[var(--glass-border)]" />
              <Skeleton width={150} height={28} />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-6">
                <Skeleton width="60%" height={16} className="mb-2" />
                <Skeleton width="40%" height={36} />
              </div>
            ))}
          </div>
          <SkeletonLeaderboard />
        </main>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-xl font-display text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error || 'Participant not found'}</p>
          <Link
            to={`/game/${gameId}/lobby`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7-7 7 7 7"/>
            </svg>
            Back to Game
          </Link>
        </div>
      </div>
    );
  }

  const rankBadge = dashboardData ? getRankBadge(dashboardData.rank) : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to={`/game/${gameId}/lobby`}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5m7-7-7 7 7 7"/>
                </svg>
                Back
              </Link>
              <div className="h-6 w-px bg-[var(--glass-border)]" />
              <div>
                <h1 className="text-xl font-display text-[var(--text-primary)]">My Dashboard</h1>
                <p className="text-sm text-[var(--text-tertiary)]">{game?.name}</p>
              </div>
            </div>
            <Link
              to={`/game/${gameId}/leaderboard`}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Toggle */}
        {matches.length > 0 && (
          <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Show stats as of:
              </label>
            </div>
            <select
              value={selectedMatch || ''}
              onChange={e =>
                setSelectedMatch(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="dropdown-select flex-1 min-w-[200px]"
            >
              <option value="">All Matches (Cumulative)</option>
              {matches.map(m => (
                <option key={m.id} value={m.matchNumber}>
                  Match {m.matchNumber}: {m.team1} vs {m.team2}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats Overview */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Total Points */}
              <div className="glass-card-glow p-6 animate-slide-up">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--accent-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">Total Points</span>
                </div>
                <p className="text-4xl font-display font-bold text-[var(--accent-gold)]">
                  {dashboardData.totalPoints}
                </p>
              </div>

              {/* League Rank */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${rankBadge?.bg} flex items-center justify-center`}>
                    <span className="text-lg">{rankBadge?.icon}</span>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">League Rank</span>
                </div>
                <p className="text-4xl font-display font-bold text-[var(--text-primary)]">
                  #{dashboardData.rank}
                  <span className="text-lg text-[var(--text-tertiary)] font-normal">
                    /{dashboardData.totalParticipants}
                  </span>
                </p>
              </div>

              {/* Budget Remaining */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 18V6"/>
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">Budget Left</span>
                </div>
                <p className="text-4xl font-display font-bold text-green-400">
                  ${dashboardData.participant.budgetRemaining.toFixed(1)}
                </p>
              </div>

              {/* Matches Played */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--accent-purple)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
                      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                      <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
                      <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
                      <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
                      <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                      <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/>
                      <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">Matches</span>
                </div>
                <p className="text-4xl font-display font-bold text-[var(--text-primary)]">
                  {dashboardData.matchCount}
                </p>
              </div>
            </div>

            {/* Player Stats Table */}
            {dashboardData.playerStats.length > 0 ? (
              <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                      <span className="text-xl">👥</span>
                    </div>
                    <div>
                      <h2 className="font-display text-[var(--text-primary)]">My Team</h2>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        {dashboardData.playerStats.length} players
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-tertiary)]">Total Value</p>
                    <p className="font-display text-[var(--accent-gold)]">
                      ${dashboardData.playerStats.reduce((sum, s) => sum + (s.cricketer.pricePaid || 0), 0).toFixed(1)}M
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--bg-tertiary)]/50">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Player
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Price
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Matches
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Points
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Avg/Match
                        </th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                      {dashboardData.playerStats.map((stat, i) => {
                        const typeConfig = getPlayerTypeConfig(stat.cricketer.playerType);
                        return (
                          <tr
                            key={stat.cricketer.id}
                            className="hover:bg-[var(--bg-tertiary)]/30 transition-colors animate-slide-up"
                            style={{ animationDelay: `${0.25 + i * 0.03}s` }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                                  <span className="text-lg">{typeConfig.icon}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      {stat.cricketer.firstName} {stat.cricketer.lastName}
                                    </span>
                                    {stat.cricketer.isForeign && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                        OS
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-[var(--text-tertiary)]">{stat.cricketer.iplTeam}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${typeConfig.bg} ${typeConfig.text}`}>
                                {stat.cricketer.playerType}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-[var(--text-primary)]">
                              ${stat.cricketer.pricePaid?.toFixed(1) || '0.0'}
                            </td>
                            <td className="px-4 py-4 text-right text-[var(--text-secondary)]">
                              {stat.matchesPlayed}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="font-display font-bold text-lg text-[var(--text-primary)]">
                                {stat.totalPoints}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-[var(--text-secondary)]">
                              {stat.pointsPerMatch.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-mono font-bold ${
                                stat.valueRatio >= 10
                                  ? 'text-green-400'
                                  : stat.valueRatio >= 5
                                  ? 'text-[var(--accent-cyan)]'
                                  : 'text-[var(--text-secondary)]'
                              }`}>
                                {stat.valueRatio.toFixed(1)}x
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[var(--bg-tertiary)]/50 border-t border-[var(--glass-border)]">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 font-display font-semibold text-[var(--text-primary)]">
                          Total
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-display font-bold text-xl text-[var(--accent-gold)]">
                            {dashboardData.totalPoints}
                          </span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <NoTeamEmpty />
            )}
          </>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { gamesApi, gameScoringApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import type { Game, GameLeaderboard, GameMatch } from '../types';
import Skeleton, { SkeletonLeaderboard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { ScoreUpdateNotification } from '../components/scoring';
import AuctionNavigation from '../components/auction/AuctionNavigation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Stadium Night themed colors
const TEAM_COLORS = [
  { border: '#FFD700', bg: 'rgba(255, 215, 0, 0.1)' },   // gold
  { border: '#00D4FF', bg: 'rgba(0, 212, 255, 0.1)' },   // cyan
  { border: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)' },  // purple
  { border: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' },   // green
  { border: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },  // orange
  { border: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },  // pink
  { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },  // blue
  { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },   // red
];

export default function Leaderboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboard | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const toast = useToast();
  const { joinGameRoom } = useSocket();

  const isCreator = game?.createdById === user?.id;

  // Join socket room for real-time updates
  useEffect(() => {
    if (gameId) {
      joinGameRoom(gameId);
    }
  }, [gameId, joinGameRoom]);

  useEffect(() => {
    if (gameId) {
      loadData();
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId) {
      loadLeaderboard();
    }
  }, [gameId, selectedMatch]);

  const loadData = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const [gameRes, matchesRes] = await Promise.all([
        gamesApi.getById(gameId),
        gameScoringApi.getMatches(gameId),
      ]);
      setGame(gameRes.data);
      setMatches(matchesRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    if (!gameId) return;

    try {
      const response = await gameScoringApi.getLeaderboard(gameId, selectedMatch);
      setLeaderboard(response.data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  // Prepare chart data with Stadium Night styling
  const chartData = {
    labels: Array.from(
      { length: leaderboard?.matchCount || 0 },
      (_, i) => `M${i + 1}`
    ),
    datasets:
      leaderboard?.leaderboard.map((entry, index) => {
        const cumulativePoints: number[] = [];
        let total = 0;
        entry.pointsByMatch.forEach(pm => {
          total += pm.points;
          cumulativePoints.push(total);
        });

        const colorScheme = TEAM_COLORS[index % TEAM_COLORS.length];

        return {
          label: entry.participant.user.teamName || entry.participant.user.name,
          data: cumulativePoints,
          borderColor: colorScheme.border,
          backgroundColor: colorScheme.bg,
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: colorScheme.border,
          pointBorderColor: 'rgba(10, 15, 28, 0.8)',
          pointBorderWidth: 2,
        };
      }) || [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(148, 163, 184, 1)',
          font: {
            family: "'Space Grotesk', sans-serif",
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 15, 28, 0.95)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(148, 163, 184, 1)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: "'Space Grotesk', sans-serif",
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          family: "'Space Grotesk', sans-serif",
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(148, 163, 184, 0.7)',
          font: {
            family: "'Space Mono', monospace",
            size: 11,
          },
        },
        title: {
          display: true,
          text: 'Total Points',
          color: 'rgba(148, 163, 184, 0.7)',
          font: {
            family: "'Space Grotesk', sans-serif",
            size: 12,
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(148, 163, 184, 0.7)',
          font: {
            family: "'Space Mono', monospace",
            size: 11,
          },
        },
        title: {
          display: true,
          text: 'Match',
          color: 'rgba(148, 163, 184, 0.7)',
          font: {
            family: "'Space Grotesk', sans-serif",
            size: 12,
          },
        },
      },
    },
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/50', icon: '🥇' };
    if (rank === 2) return { bg: 'bg-gradient-to-r from-gray-400/20 to-gray-500/20', border: 'border-gray-400/50', icon: '🥈' };
    if (rank === 3) return { bg: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20', border: 'border-orange-500/50', icon: '🥉' };
    return { bg: '', border: 'border-[var(--glass-border)]', icon: '' };
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
          <div className="glass-card p-6 mb-6">
            <Skeleton height={320} />
          </div>
          <SkeletonLeaderboard />
        </main>
      </div>
    );
  }

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
                <h1 className="text-xl font-display text-[var(--text-primary)]">Leaderboard</h1>
                <p className="text-sm text-[var(--text-tertiary)]">{game?.name}</p>
              </div>
            </div>
            <Link
              to={`/game/${gameId}/dashboard`}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              My Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        {gameId && game && (
          <AuctionNavigation
            gameId={gameId}
            gameStatus={game.status as 'pre_auction' | 'auction_active' | 'auction_paused' | 'auction_ended' | 'scoring' | 'completed'}
            isCreator={isCreator}
          />
        )}

        {/* Match Toggle */}
        {matches.length > 0 && (
          <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Show standings as of:
              </label>
            </div>
            <select
              value={selectedMatch || ''}
              onChange={e =>
                setSelectedMatch(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="dropdown-select flex-1 min-w-[200px]"
            >
              <option value="">All Matches (Current)</option>
              {matches.map(m => (
                <option key={m.id} value={m.matchNumber}>
                  Match {m.matchNumber}: {m.team1} vs {m.team2}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Points Chart */}
        {leaderboard && leaderboard.matchCount > 0 && (
          <div className="glass-card-glow p-6 mb-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-purple)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
              <div>
                <h2 className="font-display text-[var(--text-primary)]">Points Progression</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Cumulative points over matches</p>
              </div>
            </div>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {leaderboard && (
          <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                  <span className="text-xl">🏆</span>
                </div>
                <div>
                  <h2 className="font-display text-[var(--text-primary)]">
                    Standings
                    {selectedMatch && ` (After Match ${selectedMatch})`}
                  </h2>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {leaderboard.leaderboard.length} teams competing
                  </p>
                </div>
              </div>
              {leaderboard.matchCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-[var(--text-tertiary)]">Total Matches</p>
                  <p className="font-display text-lg text-[var(--text-primary)]">{leaderboard.matchCount}</p>
                </div>
              )}
            </div>

            {leaderboard.leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-tertiary)]/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Team
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Players
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {leaderboard.leaderboard.map((entry, index) => {
                      const isCurrentUser = entry.participant.user.id === user?.id;
                      const rankStyle = getRankStyle(entry.rank);
                      const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];

                      return (
                        <tr
                          key={entry.participant.id}
                          className={`transition-colors animate-slide-up ${
                            isCurrentUser ? 'bg-[var(--accent-gold)]/5' : 'hover:bg-[var(--bg-tertiary)]/30'
                          } ${rankStyle.bg}`}
                          style={{ animationDelay: `${0.15 + index * 0.03}s` }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {entry.rank <= 3 ? (
                                <div className={`w-10 h-10 rounded-xl ${rankStyle.bg} border ${rankStyle.border} flex items-center justify-center`}>
                                  <span className="text-xl">{rankStyle.icon}</span>
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                                  <span className="font-display font-bold text-[var(--text-secondary)]">
                                    {entry.rank}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg-deep)]"
                                style={{
                                  backgroundColor: teamColor.border,
                                  boxShadow: `0 0 10px ${teamColor.border}50`,
                                }}
                              />
                              <div>
                                <p className="font-semibold text-[var(--text-primary)]">
                                  {entry.participant.user.teamName || entry.participant.user.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]">
                                      You
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-[var(--text-secondary)]">{entry.teamSize}</span>
                            <span className="text-[var(--text-muted)]">/11</span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-green-400">
                            ${entry.participant.budgetRemaining.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-display font-bold text-2xl ${
                              entry.rank === 1 ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                            }`}>
                              {entry.totalPoints}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12">
                <EmptyState
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 20V10M12 20V4M6 20v-6"/>
                    </svg>
                  }
                  title="No Scores Yet"
                  message="The leaderboard will update once match scores are entered by the auctioneer."
                />
              </div>
            )}
          </div>
        )}

        {/* Top Performers Section (when we have data) */}
        {leaderboard && leaderboard.leaderboard.length >= 3 && leaderboard.matchCount > 0 && (
          <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-display text-lg text-[var(--text-primary)] mb-4">Top 3 Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaderboard.leaderboard.slice(0, 3).map((entry, index) => {
                const rankStyle = getRankStyle(index + 1);
                const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];
                const isCurrentUser = entry.participant.user.id === user?.id;

                return (
                  <div
                    key={entry.participant.id}
                    className={`glass-card p-6 border ${rankStyle.border} ${rankStyle.bg} relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                      <span className="text-6xl">{rankStyle.icon}</span>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: teamColor.border }}
                        />
                        <span className="text-3xl">{rankStyle.icon}</span>
                      </div>
                      <h4 className="font-display text-lg text-[var(--text-primary)] mb-1">
                        {entry.participant.user.teamName || entry.participant.user.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]">
                            You
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-[var(--text-tertiary)] mb-4">
                        {entry.teamSize} players • ${entry.participant.budgetRemaining.toFixed(1)}M remaining
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-display text-4xl font-bold ${
                          index === 0 ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                        }`}>
                          {entry.totalPoints}
                        </span>
                        <span className="text-sm text-[var(--text-tertiary)]">points</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Real-time score update notification */}
      <ScoreUpdateNotification onRefresh={loadLeaderboard} />
    </div>
  );
}

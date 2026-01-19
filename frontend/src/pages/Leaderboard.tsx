import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'chart.js';
import { gamesApi, gameScoringApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Game, GameLeaderboard, GameMatch } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export default function Leaderboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboard | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Prepare chart data
  const chartData = {
    labels: Array.from(
      { length: leaderboard?.matchCount || 0 },
      (_, i) => `M${i + 1}`
    ),
    datasets:
      leaderboard?.leaderboard.map((entry, index) => {
        // Calculate cumulative points
        const cumulativePoints: number[] = [];
        let total = 0;
        entry.pointsByMatch.forEach(pm => {
          total += pm.points;
          cumulativePoints.push(total);
        });

        return {
          label: entry.participant.user.teamName || entry.participant.user.name,
          data: cumulativePoints,
          borderColor: COLORS[index % COLORS.length],
          backgroundColor: COLORS[index % COLORS.length],
          tension: 0.3,
        };
      }) || [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Points',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Match',
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/game/${gameId}/lobby`)}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
              <p className="text-gray-600">{game?.name}</p>
            </div>
          </div>
        </div>

        {/* Match Toggle */}
        {matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <label className="text-sm font-medium text-gray-700 mr-4">
              Show standings as of:
            </label>
            <select
              value={selectedMatch || ''}
              onChange={e =>
                setSelectedMatch(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Matches</option>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Points Progression</h2>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {leaderboard && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Standings
                {selectedMatch && ` (After Match ${selectedMatch})`}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Team
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Players
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Budget
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.participant.user.id === user?.id;

                    return (
                      <tr
                        key={entry.participant.id}
                        className={`border-t border-gray-100 ${
                          isCurrentUser ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {entry.rank <= 3 ? (
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                  entry.rank === 1
                                    ? 'bg-yellow-500'
                                    : entry.rank === 2
                                    ? 'bg-gray-400'
                                    : 'bg-orange-400'
                                }`}
                              >
                                {entry.rank}
                              </span>
                            ) : (
                              <span className="w-8 h-8 flex items-center justify-center text-gray-500 font-medium">
                                {entry.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {entry.participant.user.teamName ||
                                  entry.participant.user.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-blue-600">(You)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {entry.teamSize}/11
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          ${entry.participant.budgetRemaining.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xl font-bold text-gray-900">
                            {entry.totalPoints}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {leaderboard.leaderboard.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                No scores yet. Leaderboard will update after match scores are entered.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

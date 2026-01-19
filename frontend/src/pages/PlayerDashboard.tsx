import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi, gameScoringApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Game, GameParticipant, PlayerDashboardData, GameMatch } from '../types';

export default function PlayerDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [participant, setParticipant] = useState<GameParticipant | null>(null);
  const [dashboardData, setDashboardData] = useState<PlayerDashboardData | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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

      // Find current user's participant
      const userParticipant = participantsRes.data.find(p => p.userId === user.id);
      setParticipant(userParticipant || null);

      if (!userParticipant) {
        setError('You are not a participant in this game');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load dashboard data');
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

  const getPlayerTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      batsman: 'bg-blue-100 text-blue-800',
      bowler: 'bg-green-100 text-green-800',
      allrounder: 'bg-purple-100 text-purple-800',
      wicketkeeper: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Participant not found'}</p>
          <button
            onClick={() => navigate(`/game/${gameId}/lobby`)}
            className="text-blue-600 hover:underline"
          >
            Back to Game
          </button>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">{game?.name}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/game/${gameId}/leaderboard`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Leaderboard
          </button>
        </div>

        {/* Match Toggle */}
        {matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <label className="text-sm font-medium text-gray-700 mr-4">
              Show stats as of:
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

        {/* Stats Overview */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.totalPoints}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500">League Rank</p>
                <p className="text-3xl font-bold text-gray-900">
                  #{dashboardData.rank}
                  <span className="text-lg text-gray-500">
                    /{dashboardData.totalParticipants}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Budget Remaining</p>
                <p className="text-3xl font-bold text-green-600">
                  ${dashboardData.participant.budgetRemaining.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Matches Played</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.matchCount}
                </p>
              </div>
            </div>

            {/* Player Stats Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Team</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Player
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Price
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Matches
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Points
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Avg/Match
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.playerStats.map(stat => (
                      <tr key={stat.cricketer.id} className="border-t border-gray-100">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {stat.cricketer.firstName} {stat.cricketer.lastName}
                            </span>
                            {stat.cricketer.isForeign && (
                              <span className="text-xs text-orange-600">*</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{stat.cricketer.iplTeam}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPlayerTypeColor(
                              stat.cricketer.playerType
                            )}`}
                          >
                            {stat.cricketer.playerType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900">
                          ${stat.cricketer.pricePaid?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900">
                          {stat.matchesPlayed}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {stat.totalPoints}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {stat.pointsPerMatch.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-medium ${
                              stat.valueRatio >= 10
                                ? 'text-green-600'
                                : stat.valueRatio >= 5
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {stat.valueRatio.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 font-semibold text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {dashboardData.totalPoints}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { gameScoringApi, gamesApi } from '../../services/api';
import { PlayerTrendChart } from './PlayerTrendChart';
import type { GameMatch, GameCricketer, GamePlayerMatchScore } from '../../types';

interface HistoricalStatsPanelProps {
  gameId: string;
  participantId: string;
}

interface PlayerStats {
  cricketer: GameCricketer;
  scores: GamePlayerMatchScore[];
  totalPoints: number;
  matchesPlayed: number;
  avgPoints: number;
  bestScore: number;
  worstScore: number;
  trend: Array<{ matchNumber: number; points: number }>;
  consistency: number; // Standard deviation
}

export function HistoricalStatsPanel({ gameId, participantId }: HistoricalStatsPanelProps) {
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [allScores, setAllScores] = useState<Map<string, GamePlayerMatchScore[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'players' | 'trends'>('overview');

  useEffect(() => {
    loadData();
  }, [gameId, participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [matchesRes, cricketersRes] = await Promise.all([
        gameScoringApi.getMatches(gameId),
        gamesApi.getCricketers(gameId),
      ]);

      const myTeam = cricketersRes.data.filter((c) => c.pickedByParticipantId === participantId);
      setCricketers(myTeam);
      setMatches(matchesRes.data);

      // Load scores for each match
      const scoresMap = new Map<string, GamePlayerMatchScore[]>();
      for (const match of matchesRes.data) {
        if (match.scoresPopulated) {
          const scoresRes = await gameScoringApi.getMatchScores(gameId, match.id);
          scoresMap.set(match.id, scoresRes.data);
        }
      }
      setAllScores(scoresMap);
    } catch (error) {
      console.error('Failed to load historical stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate player stats
  const playerStats = useMemo((): PlayerStats[] => {
    return cricketers.map((cricketer) => {
      const scores: GamePlayerMatchScore[] = [];
      const trend: Array<{ matchNumber: number; points: number }> = [];

      matches.forEach((match) => {
        const matchScores = allScores.get(match.id) || [];
        const playerScore = matchScores.find((s) => s.cricketerId === cricketer.id);
        if (playerScore) {
          scores.push(playerScore);
          trend.push({ matchNumber: match.matchNumber, points: playerScore.calculatedPoints });
        }
      });

      const points = scores.map((s) => s.calculatedPoints);
      const totalPoints = points.reduce((sum, p) => sum + p, 0);
      const matchesPlayed = scores.filter((s) => s.inPlayingXi).length;
      const avgPoints = matchesPlayed > 0 ? totalPoints / matchesPlayed : 0;
      const bestScore = points.length > 0 ? Math.max(...points) : 0;
      const worstScore = points.length > 0 ? Math.min(...points) : 0;

      // Calculate consistency (inverse of standard deviation)
      const mean = avgPoints;
      const variance =
        points.length > 0
          ? points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length
          : 0;
      const stdDev = Math.sqrt(variance);
      const consistency = avgPoints > 0 ? (avgPoints / (stdDev + 1)) * 10 : 0;

      return {
        cricketer,
        scores,
        totalPoints,
        matchesPlayed,
        avgPoints,
        bestScore,
        worstScore,
        trend,
        consistency,
      };
    });
  }, [cricketers, matches, allScores]);

  // Calculate team-level stats
  const teamStats = useMemo(() => {
    const totalPoints = playerStats.reduce((sum, p) => sum + p.totalPoints, 0);
    const totalValue = cricketers.reduce((sum, c) => sum + (c.pricePaid || 0), 0);
    const avgValueRatio = totalValue > 0 ? totalPoints / totalValue : 0;

    const pointsByMatch = matches.map((match) => {
      const matchScores = allScores.get(match.id) || [];
      const myScores = matchScores.filter((s) =>
        cricketers.some((c) => c.id === s.cricketerId)
      );
      return {
        matchNumber: match.matchNumber,
        team1: match.team1,
        team2: match.team2,
        points: myScores.reduce((sum, s) => sum + s.calculatedPoints, 0),
      };
    });

    const bestMatch =
      pointsByMatch.length > 0
        ? pointsByMatch.reduce((best, m) => (m.points > best.points ? m : best))
        : null;
    const worstMatch =
      pointsByMatch.length > 0
        ? pointsByMatch.reduce((worst, m) => (m.points < worst.points ? m : worst))
        : null;

    return {
      totalPoints,
      totalValue,
      avgValueRatio,
      pointsByMatch,
      bestMatch,
      worstMatch,
      avgPointsPerMatch:
        pointsByMatch.length > 0
          ? totalPoints / pointsByMatch.filter((m) => m.points > 0).length
          : 0,
    };
  }, [playerStats, cricketers, matches, allScores]);

  // Top performers
  const topPerformers = useMemo(() => {
    const sorted = [...playerStats].sort((a, b) => b.totalPoints - a.totalPoints);
    return sorted.slice(0, 5);
  }, [playerStats]);

  // Most consistent
  const mostConsistent = useMemo(() => {
    const sorted = [...playerStats]
      .filter((p) => p.matchesPlayed >= 2)
      .sort((a, b) => b.consistency - a.consistency);
    return sorted.slice(0, 3);
  }, [playerStats]);

  // Best value picks
  const bestValue = useMemo(() => {
    const sorted = [...playerStats]
      .filter((p) => p.cricketer.pricePaid && p.cricketer.pricePaid > 0)
      .map((p) => ({
        ...p,
        valueRatio: p.totalPoints / (p.cricketer.pricePaid || 1),
      }))
      .sort((a, b) => b.valueRatio - a.valueRatio);
    return sorted.slice(0, 3);
  }, [playerStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (matches.length === 0 || cricketers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-4xl mb-2">📊</p>
        <p>No historical data available yet</p>
        <p className="text-sm">Stats will appear once matches are scored</p>
      </div>
    );
  }

  const getPlayerTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; text: string; icon: string }> = {
      batsman: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🏏' },
      bowler: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🎳' },
      allrounder: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⚡' },
      wicketkeeper: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🧤' },
    };
    return configs[type] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '🏏' };
  };

  return (
    <div className="space-y-6">
      {/* View tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-4">
        {(['overview', 'players', 'trends'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors
              ${
                selectedView === view
                  ? 'bg-[var(--accent-cyan)] text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            {view === 'overview' && '📊 '}
            {view === 'players' && '👤 '}
            {view === 'trends' && '📈 '}
            {view}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[var(--accent-gold)]/20 to-transparent rounded-xl p-4 border border-[var(--accent-gold)]/20">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Total Points</p>
              <p className="text-3xl font-display font-bold text-[var(--accent-gold)]">
                {teamStats.totalPoints}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Avg/Match</p>
              <p className="text-3xl font-display font-bold text-white">
                {teamStats.avgPointsPerMatch.toFixed(1)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Team Value</p>
              <p className="text-3xl font-display font-bold text-green-400">
                ${teamStats.totalValue.toFixed(1)}M
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Value Ratio</p>
              <p className="text-3xl font-display font-bold text-[var(--accent-cyan)]">
                {teamStats.avgValueRatio.toFixed(1)}x
              </p>
            </div>
          </div>

          {/* Best & Worst Matches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamStats.bestMatch && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔥</span>
                  <p className="text-sm font-medium text-green-400">Best Match</p>
                </div>
                <p className="text-2xl font-display font-bold text-white">
                  {teamStats.bestMatch.points} pts
                </p>
                <p className="text-sm text-gray-400">
                  Match {teamStats.bestMatch.matchNumber}: {teamStats.bestMatch.team1} vs{' '}
                  {teamStats.bestMatch.team2}
                </p>
              </div>
            )}
            {teamStats.worstMatch && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📉</span>
                  <p className="text-sm font-medium text-red-400">Worst Match</p>
                </div>
                <p className="text-2xl font-display font-bold text-white">
                  {teamStats.worstMatch.points} pts
                </p>
                <p className="text-sm text-gray-400">
                  Match {teamStats.worstMatch.matchNumber}: {teamStats.worstMatch.team1} vs{' '}
                  {teamStats.worstMatch.team2}
                </p>
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              🏆 Top Performers
            </h3>
            <div className="space-y-3">
              {topPerformers.map((player, i) => {
                const config = getPlayerTypeConfig(player.cricketer.playerType);
                return (
                  <div key={player.cricketer.id} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <span>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {player.cricketer.firstName} {player.cricketer.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{player.matchesPlayed} matches</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-[var(--accent-gold)]">
                        {player.totalPoints}
                      </p>
                      <p className="text-xs text-gray-500">{player.avgPoints.toFixed(1)} avg</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Value & Most Consistent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                💰 Best Value
              </h3>
              <div className="space-y-3">
                {bestValue.map((player) => {
                  const config = getPlayerTypeConfig(player.cricketer.playerType);
                  return (
                    <div key={player.cricketer.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <span>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate text-sm">
                          {player.cricketer.firstName} {player.cricketer.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${player.cricketer.pricePaid?.toFixed(1)}M
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-green-400">
                          {player.valueRatio.toFixed(1)}x
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                📊 Most Consistent
              </h3>
              <div className="space-y-3">
                {mostConsistent.map((player) => {
                  const config = getPlayerTypeConfig(player.cricketer.playerType);
                  return (
                    <div key={player.cricketer.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <span>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate text-sm">
                          {player.cricketer.firstName} {player.cricketer.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{player.matchesPlayed} matches</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-[var(--accent-purple)]">
                          {player.consistency.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Players View */}
      {selectedView === 'players' && (
        <div className="space-y-3">
          {playerStats
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((player) => {
              const config = getPlayerTypeConfig(player.cricketer.playerType);
              return (
                <div
                  key={player.cricketer.id}
                  className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {player.cricketer.firstName} {player.cricketer.lastName}
                        </p>
                        {player.cricketer.isForeign && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                            OS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{player.cricketer.iplTeam}</span>
                        <span>•</span>
                        <span>${player.cricketer.pricePaid?.toFixed(1)}M</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-[var(--accent-gold)]">
                        {player.totalPoints}
                      </p>
                      <p className="text-xs text-gray-500">{player.matchesPlayed} matches</p>
                    </div>
                    <div className="w-32">
                      <PlayerTrendChart data={player.trend} height={40} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Average</p>
                      <p className="font-medium text-white">{player.avgPoints.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Best</p>
                      <p className="font-medium text-green-400">{player.bestScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Worst</p>
                      <p className="font-medium text-red-400">{player.worstScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Value</p>
                      <p className="font-medium text-[var(--accent-cyan)]">
                        {((player.totalPoints / (player.cricketer.pricePaid || 1))).toFixed(1)}x
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="space-y-6">
          {/* Team trend chart */}
          <div className="bg-gray-800/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Team Points by Match</h3>
            <div className="h-48">
              <PlayerTrendChart
                data={teamStats.pointsByMatch}
                width={600}
                height={180}
                color="#06b6d4"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {teamStats.pointsByMatch.map((m) => (
                <div key={m.matchNumber} className="text-xs bg-gray-700 rounded px-2 py-1">
                  <span className="text-gray-400">M{m.matchNumber}:</span>{' '}
                  <span className="text-white font-medium">{m.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Match-by-match breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Match-by-Match Breakdown
            </h3>
            {teamStats.pointsByMatch.map((match) => (
              <div
                key={match.matchNumber}
                className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Match {match.matchNumber}</p>
                    <p className="text-sm text-gray-500">
                      {match.team1} vs {match.team2}
                    </p>
                  </div>
                  <p className="text-2xl font-display font-bold text-[var(--accent-gold)]">
                    {match.points}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoricalStatsPanel;

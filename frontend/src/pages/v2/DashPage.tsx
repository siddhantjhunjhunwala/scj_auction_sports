import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { gameScoringApi, gamesApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { PlayerDashboardData, GameCricketer, GameMatch, PlayerType } from '../../types';

function DashPageContent() {
  const { currentGame, participant } = useGame();
  const [dashboardData, setDashboardData] = useState<PlayerDashboardData | null>(null);
  const [myTeam, setMyTeam] = useState<GameCricketer[]>([]);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentGame || !participant) return;
      try {
        setIsLoading(true);
        const [dashRes, cricketersRes, matchesRes] = await Promise.all([
          gameScoringApi.getDashboard(currentGame.id, participant.id, selectedMatch || undefined),
          gamesApi.getCricketers(currentGame.id),
          gameScoringApi.getMatches(currentGame.id),
        ]);

        setDashboardData(dashRes.data);
        setMyTeam(cricketersRes.data.filter((c) => c.pickedByParticipantId === participant.id));
        setMatches(matchesRes.data);

        // Set default selected match to latest
        if (!selectedMatch && matchesRes.data.length > 0) {
          const populatedMatches = matchesRes.data.filter((m) => m.scoresPopulated);
          if (populatedMatches.length > 0) {
            setSelectedMatch(Math.max(...populatedMatches.map((m) => m.matchNumber)));
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentGame, participant, selectedMatch]);

  const getTypeLabel = (type: PlayerType): string => {
    switch (type) {
      case 'batsman': return 'BAT';
      case 'bowler': return 'BOWL';
      case 'allrounder': return 'AR';
      case 'wicketkeeper': return 'WK';
      default: return String(type).toUpperCase();
    }
  };

  const getTypeColor = (type: PlayerType): string => {
    switch (type) {
      case 'batsman': return 'text-[var(--accent-gold)]';
      case 'bowler': return 'text-[var(--accent-cyan)]';
      case 'allrounder': return 'text-[var(--accent-purple)]';
      case 'wicketkeeper': return 'text-[var(--accent-emerald)]';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  const openIplProfile = (cricketer: GameCricketer) => {
    // Use the players URL format: /players/{firstname}-{lastname}
    const playerSlug = `${cricketer.firstName}-${cricketer.lastName}`.toLowerCase().replace(/\s+/g, '-');
    const iplUrl = `https://www.iplt20.com/players/${playerSlug}`;
    window.open(iplUrl, '_blank');
  };

  // Team composition
  const teamComposition = useMemo(() => {
    return {
      batsmen: myTeam.filter((c) => c.playerType === 'batsman').length,
      bowlers: myTeam.filter((c) => c.playerType === 'bowler').length,
      allrounders: myTeam.filter((c) => c.playerType === 'allrounder').length,
      wicketkeepers: myTeam.filter((c) => c.playerType === 'wicketkeeper').length,
      foreigners: myTeam.filter((c) => c.isForeign).length,
      total: myTeam.length,
    };
  }, [myTeam]);

  // Sort players by points
  const sortedPlayers = useMemo(() => {
    if (!dashboardData?.playerStats) return [];
    return [...dashboardData.playerStats].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [dashboardData?.playerStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="text-center py-20 text-[var(--text-tertiary)]">
        You are not a participant in this game
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Match Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display text-[var(--text-primary)]">My Dashboard</h2>
          <p className="text-[var(--text-tertiary)] mt-1">
            Track your team's performance
          </p>
        </div>

        {/* Match Selector */}
        {matches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)]">As of Match:</span>
            <select
              value={selectedMatch || ''}
              onChange={(e) => setSelectedMatch(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
            >
              {matches.filter((m) => m.scoresPopulated).map((match) => (
                <option key={match.id} value={match.matchNumber}>
                  Match {match.matchNumber} - {match.team1} vs {match.team2}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">Total Points</div>
          <div className="text-3xl font-display font-bold text-[var(--accent-gold)]">
            {dashboardData?.totalPoints || 0}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">Rank</div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)]">
            #{dashboardData?.rank || '-'}
            <span className="text-sm text-[var(--text-tertiary)] font-normal ml-2">
              of {dashboardData?.totalParticipants || 0}
            </span>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">Budget Remaining</div>
          <div className="text-3xl font-display font-bold text-[var(--accent-emerald)]">
            ${(participant.budgetRemaining || 0).toFixed(1)}M
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">Team Size</div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)]">
            {teamComposition.total}
            <span className="text-sm text-[var(--text-tertiary)] font-normal ml-2">
              players
            </span>
          </div>
        </div>
      </div>

      {/* Team Composition */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
          Team Composition
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-gold)]"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              {teamComposition.batsmen} Batsmen
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-cyan)]"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              {teamComposition.bowlers} Bowlers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-purple)]"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              {teamComposition.allrounders} All-rounders
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-emerald)]"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              {teamComposition.wicketkeepers} Wicketkeepers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-rose)]"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              {teamComposition.foreigners} Overseas
            </span>
          </div>
        </div>
      </div>

      {/* Player Stats Table */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
          Player Performance
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
                <th className="pb-3 pr-4">Player</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4 text-center">Matches</th>
                <th className="pb-3 pr-4 text-right">Points</th>
                <th className="pb-3 pr-4 text-right">Avg/Match</th>
                <th className="pb-3 pr-4 text-right">Price</th>
                <th className="pb-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]/30">
              {sortedPlayers.map((stat, index) => {
                const cricketer = myTeam.find((c) => c.id === stat.cricketer.id);
                return (
                  <tr
                    key={stat.cricketer.id}
                    onClick={() => cricketer && openIplProfile(cricketer)}
                    className="hover:bg-[var(--bg-tertiary)] cursor-pointer"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-tertiary)] w-6">{index + 1}.</span>
                        <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                          🏏
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">
                            {stat.cricketer.firstName} {stat.cricketer.lastName}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {stat.cricketer.iplTeam}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium ${getTypeColor(stat.cricketer.playerType)}`}>
                        {getTypeLabel(stat.cricketer.playerType)}
                      </span>
                      {stat.cricketer.isForeign && (
                        <span className="ml-1 text-xs text-[var(--accent-rose)]">OS</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-center text-sm text-[var(--text-secondary)]">
                      {stat.matchesPlayed}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-lg font-bold text-[var(--accent-gold)]">
                        {stat.totalPoints}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-sm text-[var(--text-secondary)]">
                      {stat.pointsPerMatch.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4 text-right text-sm text-[var(--text-secondary)]">
                      ${(stat.cricketer.pricePaid || 0).toFixed(1)}M
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-sm font-medium ${
                        stat.valueRatio > 10 ? 'text-[var(--accent-emerald)]' :
                        stat.valueRatio > 5 ? 'text-[var(--text-primary)]' :
                        'text-[var(--accent-rose)]'
                      }`}>
                        {stat.valueRatio.toFixed(1)}x
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            {matches.filter((m) => m.scoresPopulated).length === 0
              ? 'No match scores have been entered yet'
              : 'No player stats available'}
          </div>
        )}
      </div>

      {/* Top Performers */}
      {sortedPlayers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Best Value */}
          <div className="glass-card p-5">
            <h4 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Best Value Pick
            </h4>
            {sortedPlayers.sort((a, b) => b.valueRatio - a.valueRatio)[0] && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-emerald)]/20 flex items-center justify-center text-lg">
                  🌟
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {sortedPlayers[0]?.cricketer.firstName} {sortedPlayers[0]?.cricketer.lastName}
                  </div>
                  <div className="text-sm text-[var(--accent-emerald)]">
                    {Math.max(...sortedPlayers.map((p) => p.valueRatio)).toFixed(1)}x value
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Scorer */}
          <div className="glass-card p-5">
            <h4 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Top Scorer
            </h4>
            {sortedPlayers[0] && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {sortedPlayers[0].cricketer.firstName} {sortedPlayers[0].cricketer.lastName}
                  </div>
                  <div className="text-sm text-[var(--accent-gold)]">
                    {sortedPlayers[0].totalPoints} points
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Most Consistent */}
          <div className="glass-card p-5">
            <h4 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Most Consistent
            </h4>
            {sortedPlayers.filter((p) => p.matchesPlayed > 0).sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0] && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center text-lg">
                  📈
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {sortedPlayers.filter((p) => p.matchesPlayed > 0).sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0]?.cricketer.firstName}{' '}
                    {sortedPlayers.filter((p) => p.matchesPlayed > 0).sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0]?.cricketer.lastName}
                  </div>
                  <div className="text-sm text-[var(--accent-cyan)]">
                    {sortedPlayers.filter((p) => p.matchesPlayed > 0).sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0]?.pointsPerMatch.toFixed(1)} pts/match
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashPage() {
  return (
    <GamePageWrapper>
      <DashPageContent />
    </GamePageWrapper>
  );
}

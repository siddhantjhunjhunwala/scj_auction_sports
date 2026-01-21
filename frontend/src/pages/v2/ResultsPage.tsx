import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { gamesApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { GameCricketer, GameParticipant, PlayerType } from '../../types';

interface TeamSummary {
  participant: GameParticipant;
  cricketers: GameCricketer[];
  totalSpent: number;
  remaining: number;
  playerBreakdown: {
    batsmen: number;
    bowlers: number;
    allrounders: number;
    wicketkeepers: number;
    foreigners: number;
  };
}

function ResultsPageContent() {
  const { currentGame, participant } = useGame();
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'teams' | 'all'>('teams');

  useEffect(() => {
    const loadCricketers = async () => {
      if (!currentGame) return;
      try {
        setIsLoading(true);
        const response = await gamesApi.getCricketers(currentGame.id);
        setCricketers(response.data);
      } catch (err) {
        console.error('Failed to load cricketers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCricketers();
  }, [currentGame]);

  const teamSummaries = useMemo((): TeamSummary[] => {
    if (!currentGame?.participants) return [];

    return currentGame.participants.map((p) => {
      const teamCricketers = cricketers.filter((c) => c.pickedByParticipantId === p.id);
      const totalSpent = teamCricketers.reduce((sum, c) => sum + (c.pricePaid || 0), 0);

      return {
        participant: p,
        cricketers: teamCricketers,
        totalSpent,
        remaining: p.budgetRemaining,
        playerBreakdown: {
          batsmen: teamCricketers.filter((c) => c.playerType === 'batsman').length,
          bowlers: teamCricketers.filter((c) => c.playerType === 'bowler').length,
          allrounders: teamCricketers.filter((c) => c.playerType === 'allrounder').length,
          wicketkeepers: teamCricketers.filter((c) => c.playerType === 'wicketkeeper').length,
          foreigners: teamCricketers.filter((c) => c.isForeign).length,
        },
      };
    }).sort((a, b) => b.cricketers.length - a.cricketers.length);
  }, [currentGame?.participants, cricketers]);

  const pickedCricketers = useMemo(() => {
    return cricketers.filter((c) => c.isPicked).sort((a, b) => (a.pickOrder || 0) - (b.pickOrder || 0));
  }, [cricketers]);

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
      case 'batsman': return 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]';
      case 'bowler': return 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]';
      case 'allrounder': return 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]';
      case 'wicketkeeper': return 'bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]';
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
    }
  };

  const openIplProfile = (cricketer: GameCricketer) => {
    // Use the players URL format: /players/{firstname}-{lastname}
    const playerSlug = `${cricketer.firstName}-${cricketer.lastName}`.toLowerCase().replace(/\s+/g, '-');
    const iplUrl = `https://www.iplt20.com/players/${playerSlug}`;
    window.open(iplUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display text-[var(--text-primary)]">Auction Results</h2>
          <p className="text-[var(--text-tertiary)] mt-1">
            {pickedCricketers.length} players picked by {currentGame?.participants?.length || 0} teams
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('teams')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              viewMode === 'teams'
                ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
            }`}
          >
            By Team
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              viewMode === 'all'
                ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
            }`}
          >
            All Picks
          </button>
        </div>
      </div>

      {viewMode === 'teams' ? (
        /* Team View */
        <div className="space-y-6">
          {teamSummaries.map((team) => (
            <div
              key={team.participant.id}
              className={`glass-card p-6 ${
                team.participant.id === participant?.id ? 'border-[var(--accent-gold)]/50' : ''
              }`}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-xl">
                    {team.participant.user?.avatarUrl || '👤'}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">
                      {team.participant.user?.teamName || team.participant.user?.name}
                      {team.participant.id === participant?.id && (
                        <span className="ml-2 text-xs text-[var(--accent-gold)]">(You)</span>
                      )}
                    </h3>
                    <div className="flex gap-4 text-xs text-[var(--text-tertiary)]">
                      <span>{team.cricketers.length} players</span>
                      <span>Spent: ${team.totalSpent.toFixed(1)}M</span>
                      <span>Left: ${team.remaining.toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                {/* Player Breakdown */}
                <div className="flex gap-2">
                  {team.playerBreakdown.batsmen > 0 && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded">
                      {team.playerBreakdown.batsmen} BAT
                    </span>
                  )}
                  {team.playerBreakdown.bowlers > 0 && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] rounded">
                      {team.playerBreakdown.bowlers} BOWL
                    </span>
                  )}
                  {team.playerBreakdown.allrounders > 0 && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded">
                      {team.playerBreakdown.allrounders} AR
                    </span>
                  )}
                  {team.playerBreakdown.wicketkeepers > 0 && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] rounded">
                      {team.playerBreakdown.wicketkeepers} WK
                    </span>
                  )}
                  {team.playerBreakdown.foreigners > 0 && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-rose)]/20 text-[var(--accent-rose)] rounded">
                      {team.playerBreakdown.foreigners} OS
                    </span>
                  )}
                </div>
              </div>

              {/* Team Players */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {team.cricketers.map((cricketer) => (
                  <div
                    key={cricketer.id}
                    onClick={() => openIplProfile(cricketer)}
                    className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                      {cricketer.pictureUrl ? (
                        <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '🏏'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {cricketer.firstName} {cricketer.lastName}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-1 py-0.5 rounded ${getTypeColor(cricketer.playerType)}`}>
                          {getTypeLabel(cricketer.playerType)}
                        </span>
                        {cricketer.isForeign && (
                          <span className="text-xs text-[var(--accent-rose)]">OS</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[var(--accent-gold)]">
                      ${cricketer.pricePaid?.toFixed(1)}M
                    </div>
                  </div>
                ))}
              </div>

              {team.cricketers.length === 0 && (
                <div className="text-center py-4 text-[var(--text-tertiary)]">
                  No players picked
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* All Picks View */
        <div className="glass-card p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Player</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Team</th>
                  <th className="pb-3 pr-4">Picked By</th>
                  <th className="pb-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]/30">
                {pickedCricketers.map((cricketer, index) => {
                  const team = currentGame?.participants?.find(
                    (p) => p.id === cricketer.pickedByParticipantId
                  );
                  return (
                    <tr
                      key={cricketer.id}
                      onClick={() => openIplProfile(cricketer)}
                      className="hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    >
                      <td className="py-3 pr-4 text-[var(--text-tertiary)]">{index + 1}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                            {cricketer.pictureUrl ? (
                              <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              '🏏'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">
                              {cricketer.firstName} {cricketer.lastName}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)]">{cricketer.iplTeam}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-1 rounded ${getTypeColor(cricketer.playerType)}`}>
                          {getTypeLabel(cricketer.playerType)}
                        </span>
                        {cricketer.isForeign && (
                          <span className="ml-1 text-xs text-[var(--accent-rose)]">OS</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-[var(--text-secondary)]">
                        {cricketer.iplTeam}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-sm ${
                          team?.id === participant?.id ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                        }`}>
                          {team?.user?.teamName || team?.user?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-[var(--accent-gold)]">
                        ${cricketer.pricePaid?.toFixed(1)}M
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pickedCricketers.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No players have been picked yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <GamePageWrapper>
      <ResultsPageContent />
    </GamePageWrapper>
  );
}

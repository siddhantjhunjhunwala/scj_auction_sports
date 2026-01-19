import { useState } from 'react';
import type { User, Cricketer } from '../../types';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import { getTeamComposition, getPlayerTypeLabel } from '../../utils/validation';

interface PlayerSummaryProps {
  players: User[];
  teams: Record<string, Cricketer[]>;
  currentUserId: string;
}

const getPlayerTypeConfig = (type: string) => {
  const configs: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    batsman: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
    bowler: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
    allrounder: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    wicketkeeper: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  };
  return configs[type] || configs.batsman;
};

export default function PlayerSummary({ players, teams, currentUserId }: PlayerSummaryProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);

  const sortedPlayers = [...players].sort((a, b) => b.budgetRemaining - a.budgetRemaining);

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-display text-white tracking-wide">Leaderboard</h3>
            <p className="text-sm text-slate-500">{players.length} players competing</p>
          </div>
        </div>

        {/* Player List */}
        <div className="divide-y divide-white/5">
          {sortedPlayers.map((player, index) => {
            const team = teams[player.id] || [];
            const composition = getTeamComposition(team);
            const isCurrentUser = player.id === currentUserId;

            return (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`w-full flex items-center gap-3 p-4 transition-all text-left group hover:bg-white/5 ${
                  isCurrentUser ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''
                }`}
              >
                {/* Rank */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display ${
                  index === 0 ? 'bg-amber-500/20 text-amber-400' :
                  index === 1 ? 'bg-slate-400/20 text-slate-300' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-slate-500'
                }`}>
                  {index + 1}
                </div>

                <Avatar url={player.avatarUrl} name={player.name} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate group-hover:text-amber-400 transition-colors">
                      {player.teamName || player.name}
                    </p>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-display bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {composition.total}/11 players
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-mono text-emerald-400">
                    ${player.budgetRemaining.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Budget</p>
                </div>

                <svg className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Detail Modal */}
      <Modal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        title={`${selectedPlayer?.teamName || selectedPlayer?.name}'s Team`}
        size="lg"
      >
        {selectedPlayer && (
          <div className="space-y-6">
            {/* Player Info Header */}
            <div className="flex items-center gap-5 pb-6 border-b border-white/5">
              <Avatar url={selectedPlayer.avatarUrl} name={selectedPlayer.name} size="lg" />
              <div className="flex-1">
                <h3 className="text-2xl font-display text-white tracking-wide">{selectedPlayer.teamName}</h3>
                <p className="text-slate-500">{selectedPlayer.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-lg font-mono">
                    ${selectedPlayer.budgetRemaining.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500">remaining</span>
                </div>
              </div>
            </div>

            {/* Team Composition Stats */}
            {(() => {
              const team = teams[selectedPlayer.id] || [];
              const composition = getTeamComposition(team);
              return (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-2xl font-display text-red-400">{composition.batsmen}</p>
                      <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Batsmen</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-2xl font-display text-blue-400">{composition.bowlers}</p>
                      <p className="text-[10px] text-blue-400/70 uppercase tracking-wider">Bowlers</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-2xl font-display text-emerald-400">{composition.wicketkeepers}</p>
                      <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Keepers</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-2xl font-display text-purple-400">{composition.allrounders}</p>
                      <p className="text-[10px] text-purple-400/70 uppercase tracking-wider">Allrounder</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-2xl font-display text-amber-400">{composition.foreigners}</p>
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">Foreign</p>
                    </div>
                  </div>

                  {/* Player List */}
                  {team.length > 0 ? (
                    <div className="space-y-2">
                      {team.map((cricketer) => {
                        const typeConfig = getPlayerTypeConfig(cricketer.playerType);
                        return (
                          <div
                            key={cricketer.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800">
                                {cricketer.pictureUrl ? (
                                  <img
                                    src={cricketer.pictureUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600 font-display text-sm">
                                    {cricketer.firstName[0]}{cricketer.lastName[0]}
                                  </div>
                                )}
                                {cricketer.isForeign && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {cricketer.firstName} {cricketer.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeConfig.bgColor} ${typeConfig.borderColor} border ${typeConfig.color}`}>
                                    {getPlayerTypeLabel(cricketer.playerType)}
                                  </span>
                                  <span className="text-xs text-slate-500">{cricketer.iplTeam}</span>
                                </div>
                              </div>
                            </div>
                            <p className="font-mono text-amber-400 text-lg">
                              {cricketer.pricePaid ? `$${cricketer.pricePaid.toFixed(0)}` : '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-slate-500">No players picked yet</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </>
  );
}

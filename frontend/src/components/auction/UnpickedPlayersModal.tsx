import { useState, useMemo } from 'react';
import type { Cricketer, PlayerType } from '../../types';
import Modal from '../common/Modal';
import { getPlayerTypeLabel } from '../../utils/validation';

interface UnpickedPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  cricketers: Cricketer[];
}

type FilterType = 'all' | PlayerType | 'foreign';

const filterConfig: Record<FilterType, { color: string; bgColor: string; borderColor: string; activeColor: string }> = {
  all: { color: 'text-white', bgColor: 'bg-white/5', borderColor: 'border-white/10', activeColor: 'bg-white/20' },
  batsman: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', activeColor: 'bg-red-500/20' },
  bowler: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', activeColor: 'bg-blue-500/20' },
  wicketkeeper: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', activeColor: 'bg-emerald-500/20' },
  allrounder: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', activeColor: 'bg-purple-500/20' },
  foreign: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', activeColor: 'bg-amber-500/20' },
};

export default function UnpickedPlayersModal({
  isOpen,
  onClose,
  cricketers,
}: UnpickedPlayersModalProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filteredCricketers = useMemo(() => {
    let result = cricketers.filter((c) => !c.isPicked);

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.iplTeam.toLowerCase().includes(searchLower)
      );
    }

    if (filter === 'foreign') {
      result = result.filter((c) => c.isForeign);
    } else if (filter !== 'all') {
      result = result.filter((c) => c.playerType === filter);
    }

    return result;
  }, [cricketers, filter, search]);

  const counts = useMemo(() => {
    const unpicked = cricketers.filter((c) => !c.isPicked);
    return {
      all: unpicked.length,
      batsman: unpicked.filter((c) => c.playerType === 'batsman').length,
      bowler: unpicked.filter((c) => c.playerType === 'bowler').length,
      wicketkeeper: unpicked.filter((c) => c.playerType === 'wicketkeeper').length,
      allrounder: unpicked.filter((c) => c.playerType === 'allrounder').length,
      foreign: unpicked.filter((c) => c.isForeign).length,
    };
  }, [cricketers]);

  const filters: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'batsman', label: 'Batsmen', count: counts.batsman },
    { value: 'bowler', label: 'Bowlers', count: counts.bowler },
    { value: 'wicketkeeper', label: 'Keepers', count: counts.wicketkeeper },
    { value: 'allrounder', label: 'All-rounders', count: counts.allrounder },
    { value: 'foreign', label: 'Foreign', count: counts.foreign },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Available Players" size="xl">
      <div className="space-y-5">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const config = filterConfig[f.value];
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? `${config.activeColor} ${config.borderColor} ${config.color}`
                    : `${config.bgColor} border-transparent ${config.color} opacity-60 hover:opacity-100`
                }`}
              >
                {f.label}
                <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${isActive ? 'bg-black/20' : 'bg-black/10'}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Player List */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
          {filteredCricketers.length > 0 ? (
            <div className="grid gap-2">
              {filteredCricketers.map((cricketer) => {
                const typeConfig = filterConfig[cricketer.playerType as FilterType] || filterConfig.all;
                return (
                  <div
                    key={cricketer.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all group"
                  >
                    {/* Player Image */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                      {cricketer.pictureUrl ? (
                        <img
                          src={cricketer.pictureUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 font-display">
                          {cricketer.firstName[0]}{cricketer.lastName[0]}
                        </div>
                      )}
                      {cricketer.isForeign && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                          <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-amber-400 transition-colors">
                        {cricketer.firstName} {cricketer.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${typeConfig.bgColor} ${typeConfig.borderColor} ${typeConfig.color}`}>
                          {getPlayerTypeLabel(cricketer.playerType)}
                        </span>
                        <span className="text-xs text-slate-500">{cricketer.iplTeam}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right text-sm space-y-1">
                      {cricketer.battingRecord?.average !== undefined && (
                        <p className="text-slate-400">
                          <span className="text-red-400/70 text-xs mr-1">BAT</span>
                          <span className="font-mono text-white">{cricketer.battingRecord.average.toFixed(1)}</span>
                        </p>
                      )}
                      {cricketer.bowlingRecord?.economy !== undefined && (
                        <p className="text-slate-400">
                          <span className="text-blue-400/70 text-xs mr-1">ECON</span>
                          <span className="font-mono text-white">{cricketer.bowlingRecord.economy.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-slate-500">No players found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="text-white font-mono">{filteredCricketers.length}</span> of <span className="text-white font-mono">{counts.all}</span> available players
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-xs text-slate-500">Foreign Player</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

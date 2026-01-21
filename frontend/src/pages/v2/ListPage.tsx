import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { gamesApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import { getTypeSymbol, getTypeLabel, getTypeColor, FOREIGN_SYMBOL } from '../../utils/playerSymbols';
import type { GameCricketer, PlayerType } from '../../types';

type FilterType = 'all' | PlayerType;
type StatusFilter = 'all' | 'picked' | 'unpicked';

function ListPageContent() {
  const { currentGame } = useGame();
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [foreignOnly, setForeignOnly] = useState(false);

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

  const filteredCricketers = useMemo(() => {
    return cricketers.filter((c) => {
      // Search filter
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && c.playerType !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'picked' && !c.isPicked) {
        return false;
      }
      if (statusFilter === 'unpicked' && c.isPicked) {
        return false;
      }
      // Foreign filter
      if (foreignOnly && !c.isForeign) {
        return false;
      }
      return true;
    });
  }, [cricketers, searchQuery, typeFilter, statusFilter, foreignOnly]);

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
      <div className="mb-6">
        <h2 className="text-2xl font-display text-[var(--text-primary)]">Cricketer List</h2>
        <p className="text-[var(--text-tertiary)] mt-1">
          {cricketers.length} cricketers in this auction
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-1">
            {(['all', 'batsman', 'bowler', 'allrounder', 'wicketkeeper'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === type
                    ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type === 'all' ? 'All' : getTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            {(['all', 'picked', 'unpicked'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:text-[var(--text-primary)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Foreign Filter */}
          <button
            onClick={() => setForeignOnly(!foreignOnly)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              foreignOnly
                ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border border-[var(--accent-purple)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:text-[var(--text-primary)]'
            }`}
          >
            Foreign Only
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-[var(--text-tertiary)]">
        Showing {filteredCricketers.length} of {cricketers.length} cricketers
      </div>

      {/* Cricketer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCricketers.map((cricketer) => (
          <div
            key={cricketer.id}
            onClick={() => openIplProfile(cricketer)}
            className={`glass-card p-4 cursor-pointer hover:border-[var(--accent-gold)]/50 transition-all ${
              cricketer.isPicked ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                {cricketer.pictureUrl ? (
                  <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  '🏏'
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[var(--text-primary)] truncate">
                    {cricketer.firstName} {cricketer.lastName}
                  </h3>
                  {cricketer.isForeign && (
                    <span className="text-sm">{FOREIGN_SYMBOL}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm ${getTypeColor(cricketer.playerType)}`}>
                    {getTypeSymbol(cricketer.playerType)}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{cricketer.iplTeam}</span>
                </div>

                {cricketer.isPicked && cricketer.pickedBy?.user && (
                  <div className="mt-2 text-xs text-[var(--accent-emerald)]">
                    Picked by {cricketer.pickedBy.user.teamName || cricketer.pickedBy.user.name} for ${cricketer.pricePaid?.toFixed(1)}M
                  </div>
                )}
              </div>

              {/* Price or Status */}
              <div className="text-right flex-shrink-0">
                {cricketer.isPicked ? (
                  <span className="text-lg font-bold text-[var(--accent-emerald)]">
                    ${cricketer.pricePaid?.toFixed(1)}M
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">Available</span>
                )}
              </div>
            </div>

            {/* Stats Preview */}
            {(cricketer.battingRecord || cricketer.bowlingRecord) && (
              <div className="mt-3 pt-3 border-t border-[var(--glass-border)]/30 flex gap-4 text-xs text-[var(--text-tertiary)]">
                {cricketer.battingRecord && (
                  <div>
                    <span className="text-[var(--text-secondary)]">{cricketer.battingRecord.runs || 0}</span> runs
                    {cricketer.battingRecord.average && (
                      <span className="ml-2">@ {cricketer.battingRecord.average.toFixed(1)}</span>
                    )}
                  </div>
                )}
                {cricketer.bowlingRecord && cricketer.bowlingRecord.wickets && (
                  <div>
                    <span className="text-[var(--text-secondary)]">{cricketer.bowlingRecord.wickets}</span> wkts
                    {cricketer.bowlingRecord.economy && (
                      <span className="ml-2">@ {cricketer.bowlingRecord.economy.toFixed(1)}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCricketers.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          No cricketers match your filters
        </div>
      )}
    </div>
  );
}

export default function ListPage() {
  return (
    <GamePageWrapper>
      <ListPageContent />
    </GamePageWrapper>
  );
}

import { useState } from 'react';
import type { Cricketer, AuctionState } from '../../types';
import { getPlayerTypeLabel } from '../../utils/validation';

interface AuctioneerControlsProps {
  auctionState: AuctionState;
  unpickedCricketers: Cricketer[];
  onStartAuction: (cricketerId: string) => void;
  onAddTime: (seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export default function AuctioneerControls({
  auctionState,
  unpickedCricketers,
  onStartAuction,
  onAddTime,
  onPause,
  onResume,
  onSkip,
  onComplete,
  isLoading,
}: AuctioneerControlsProps) {
  const [selectedCricketerId, setSelectedCricketerId] = useState<string>('');

  const isAuctionActive = auctionState.auctionStatus === 'in_progress';
  const isPaused = auctionState.auctionStatus === 'paused';
  const hasCurrentPlayer = !!auctionState.currentCricketerId;

  const handleStartAuction = () => {
    if (selectedCricketerId) {
      onStartAuction(selectedCricketerId);
      setSelectedCricketerId('');
    }
  };

  return (
    <div className="glass-card overflow-hidden border-amber-500/20">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-display text-white tracking-wide">Auctioneer Controls</h3>
            <p className="text-sm text-amber-400/70">Manage the live auction</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Player Selection - Show when no current player */}
        {!hasCurrentPlayer && (
          <div className="space-y-4">
            <label className="block">
              <span className="input-label mb-2 block">Select Next Player</span>
              <div className="relative">
                <select
                  value={selectedCricketerId}
                  onChange={(e) => setSelectedCricketerId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Choose a player...</option>
                  {unpickedCricketers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.firstName} {c.lastName} ({getPlayerTypeLabel(c.playerType)}) - {c.iplTeam}
                      {c.isForeign ? ' *' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </label>

            <button
              onClick={handleStartAuction}
              disabled={!selectedCricketerId || isLoading}
              className="w-full py-4 rounded-xl font-display text-lg tracking-wide bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Auction (60s Timer)
            </button>
          </div>
        )}

        {/* Timer Controls - Show when auction is active */}
        {hasCurrentPlayer && (
          <div className="space-y-4">
            {/* Add Time Buttons */}
            <div>
              <span className="input-label mb-2 block">Add Time</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onAddTime(30)}
                  disabled={isLoading || isPaused}
                  className="py-3 px-4 rounded-xl font-display tracking-wide bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                  +30 sec
                </button>
                <button
                  onClick={() => onAddTime(60)}
                  disabled={isLoading || isPaused}
                  className="py-3 px-4 rounded-xl font-display tracking-wide bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                  +60 sec
                </button>
              </div>
            </div>

            {/* Pause/Resume Button */}
            {isAuctionActive && (
              <button
                onClick={onPause}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-display tracking-wide bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause Auction
              </button>
            )}

            {isPaused && (
              <button
                onClick={onResume}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-display tracking-wide bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume Auction
              </button>
            )}

            {/* Skip Player Button */}
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-display tracking-wide bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Skip Player (No Sale)
            </button>
          </div>
        )}

        {/* Complete Auction */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={onComplete}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-display tracking-wide bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Complete Auction
          </button>
          <p className="text-xs text-slate-600 mt-3 text-center">
            This will end the auction and move to scoring mode
          </p>
        </div>

        {/* Stats */}
        <div className="pt-4 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <p className="text-2xl font-display text-amber-400">{unpickedCricketers.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Players Left</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <p className={`text-sm font-display uppercase tracking-wider ${
                isAuctionActive ? 'text-emerald-400' :
                isPaused ? 'text-yellow-400' :
                'text-slate-400'
              }`}>
                {auctionState.auctionStatus.replace('_', ' ')}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

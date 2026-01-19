import { useState, useEffect, useCallback } from 'react';
import type { AuctionState, User, Cricketer } from '../../types';
import { validateBid, formatCurrency } from '../../utils/validation';

interface BiddingPanelProps {
  auctionState: AuctionState;
  currentUser: User;
  currentTeam: Cricketer[];
  onBid: (amount: number) => void;
  disabled?: boolean;
}

export default function BiddingPanel({
  auctionState,
  currentUser,
  currentTeam,
  onBid,
  disabled,
}: BiddingPanelProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const currentBid = auctionState.currentHighBid || 0;
  const minIncrement = currentBid < 10 ? 0.5 : 1;
  const minBid = currentBid + minIncrement;

  useEffect(() => {
    setBidAmount(minBid.toFixed(2));
    setError(null);
  }, [auctionState.currentCricketerId, minBid]);

  const handleBidChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setBidAmount(value);
      setError(null);
    }
  };

  const handleBid = useCallback(() => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setError('Please enter a valid amount');
      return;
    }

    if (!auctionState.currentCricketer) {
      setError('No player is currently up for auction');
      return;
    }

    const validation = validateBid(
      amount,
      currentBid,
      currentUser,
      currentTeam,
      auctionState.currentCricketer
    );

    if (!validation.valid) {
      setError(validation.message || 'Invalid bid');
      return;
    }

    setError(null);
    onBid(amount);
  }, [bidAmount, currentBid, currentUser, currentTeam, auctionState.currentCricketer, onBid]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !disabled) {
        handleBid();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleBid, disabled]);

  const isHighBidder = auctionState.currentHighBidderId === currentUser.id;
  const foreignCount = currentTeam.filter(c => c.isForeign).length;
  const slotsRemaining = 11 - currentTeam.length;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-display text-white tracking-wide">Place Your Bid</h3>
            <p className="text-sm text-slate-500">Press Enter to submit</p>
          </div>
        </div>
        {auctionState.auctionStatus === 'in_progress' && (
          <div className="live-indicator">LIVE</div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Current Bid Display */}
        <div className="relative rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/5 p-6 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />

          <div className="relative">
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-2">Current Highest Bid</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-display text-white">
                {formatCurrency(currentBid)}
              </span>
            </div>
            {auctionState.currentHighBidder && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-500">by</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isHighBidder
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}>
                  {isHighBidder ? 'You' : auctionState.currentHighBidder.teamName || auctionState.currentHighBidder.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Winning Status */}
        {isHighBidder && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-emerald-400 font-display tracking-wide">You're Winning!</p>
              <p className="text-sm text-emerald-500/70">You have the highest bid</p>
            </div>
          </div>
        )}

        {/* Bid Input */}
        <div className="space-y-4">
          <div>
            <label className="input-label mb-2 block">
              Your Bid
              <span className="text-slate-600 font-normal ml-2">(Min: {formatCurrency(minBid)})</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-2xl font-display text-amber-400">$</span>
              </div>
              <input
                type="text"
                value={bidAmount}
                onChange={(e) => handleBidChange(e.target.value)}
                disabled={disabled || isHighBidder}
                className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-xl text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder={minBid.toFixed(2)}
              />
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm animate-scale-in">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Quick Bid Buttons */}
          <div className="flex flex-wrap gap-2">
            {[minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10].map((inc) => {
              const quickBid = currentBid + inc;
              return (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setBidAmount(quickBid.toFixed(2))}
                  disabled={disabled || isHighBidder}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-mono hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  +{formatCurrency(inc)}
                </button>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleBid}
            disabled={disabled || isHighBidder}
            className={`w-full py-4 rounded-xl font-display text-lg tracking-wide transition-all ${
              isHighBidder
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'btn-primary'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isHighBidder ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Winning
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Place Bid
                <kbd className="px-2 py-0.5 rounded bg-black/30 text-xs font-mono">Enter</kbd>
              </span>
            )}
          </button>
        </div>

        {/* Budget & Team Info */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Budget</p>
            <p className="text-lg font-mono text-white">${currentUser.budgetRemaining.toFixed(0)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Team</p>
            <p className="text-lg font-mono text-white">{currentTeam.length}<span className="text-slate-500">/11</span></p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Foreign</p>
            <p className="text-lg font-mono text-white">{foreignCount}<span className="text-slate-500">/4</span></p>
          </div>
        </div>

        {/* Reserve Notice */}
        {slotsRemaining > 0 && (
          <p className="text-xs text-slate-600 text-center">
            Reserve ${(slotsRemaining * 0.5).toFixed(2)} for {slotsRemaining} remaining slot{slotsRemaining > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

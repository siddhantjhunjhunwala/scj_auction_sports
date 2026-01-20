import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuctionState, User, Cricketer } from '../../types';
import { validateBid, formatCurrency, TEAM_SIZE } from '../../utils/validation';

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
  const [bidSuccess, setBidSuccess] = useState(false);
  const [lastBidAmount, setLastBidAmount] = useState<number | null>(null);

  const currentBid = auctionState.currentHighBid || 0;
  const minIncrement = currentBid < 10 ? 0.5 : 1;
  const minBid = currentBid + minIncrement;

  // Real-time validation status
  const validationStatus = useMemo(() => {
    const amount = parseFloat(bidAmount);

    // Check for non-numeric input
    if (bidAmount === '' || isNaN(amount)) {
      return { isValid: false, reason: 'empty' };
    }

    // Check for invalid decimal format (more than 2 decimal places or not a valid currency amount)
    if (!/^\d+(\.\d{1,2})?$/.test(bidAmount)) {
      return { isValid: false, reason: 'Invalid format' };
    }

    // Check minimum bid increment
    const validIncrements = currentBid < 10
      ? [0.5] // Only 0.5 increments below $10
      : [1];  // Only $1 increments at $10+

    const bidIncrement = amount - currentBid;
    const minInc = validIncrements[0];

    // Check if bid is at least minimum bid
    if (amount < minBid) {
      return { isValid: false, reason: `Min bid: $${minBid.toFixed(2)}` };
    }

    // Check if increment is valid (must be whole increment of minIncrement)
    const incrementMultiple = bidIncrement / minInc;
    if (Math.abs(incrementMultiple - Math.round(incrementMultiple)) > 0.001) {
      return { isValid: false, reason: `Bid in $${minInc.toFixed(2)} increments` };
    }

    // Validate with full business logic
    if (!auctionState.currentCricketer) {
      return { isValid: false, reason: 'No player up for auction' };
    }

    const validation = validateBid(
      amount,
      currentBid,
      currentUser,
      currentTeam,
      auctionState.currentCricketer
    );

    if (!validation.valid) {
      return { isValid: false, reason: validation.message || 'Invalid' };
    }

    return { isValid: true, reason: null };
  }, [bidAmount, currentBid, minBid, auctionState.currentCricketer, currentUser, currentTeam]);

  useEffect(() => {
    setBidAmount(minBid.toFixed(2));
    setError(null);
    setBidSuccess(false);
  }, [auctionState.currentCricketerId, minBid]);

  // Clear success indicator after delay
  useEffect(() => {
    if (bidSuccess) {
      const timer = setTimeout(() => setBidSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [bidSuccess]);

  const handleBidChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setBidAmount(value);
      setError(null);
      setBidSuccess(false);
    }
  };

  // Computed values
  const isHighBidder = auctionState.currentHighBidderId === currentUser.id;
  const foreignCount = currentTeam.filter(c => c.isForeign).length;
  const slotsRemaining = TEAM_SIZE - currentTeam.length;

  // Determine button state
  const isButtonDisabled = disabled || isHighBidder || !validationStatus.isValid;

  const handleBid = useCallback(() => {
    if (!validationStatus.isValid) {
      setError(validationStatus.reason || 'Invalid bid');
      return;
    }

    const amount = parseFloat(bidAmount);
    setError(null);
    setLastBidAmount(amount);
    setBidSuccess(true);
    onBid(amount);
  }, [bidAmount, validationStatus, onBid]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !disabled && validationStatus.isValid && !isHighBidder) {
        handleBid();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleBid, disabled, validationStatus.isValid, isHighBidder]);

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

        {/* Bid Success Indicator */}
        {bidSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-cyan-400 font-display tracking-wide">Bid Placed!</p>
              <p className="text-sm text-cyan-500/70">
                Your bid of ${lastBidAmount?.toFixed(2)} has been submitted
              </p>
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
                <span className={`text-2xl font-display ${validationStatus.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>$</span>
              </div>
              <input
                type="text"
                value={bidAmount}
                onChange={(e) => handleBidChange(e.target.value)}
                disabled={disabled || isHighBidder}
                className={`w-full pl-12 pr-12 py-4 bg-slate-800/50 border rounded-xl text-2xl font-mono text-white placeholder-slate-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  error
                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20'
                    : validationStatus.isValid
                    ? 'border-emerald-500/50 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20'
                }`}
                placeholder={minBid.toFixed(2)}
              />
              {/* Validation indicator */}
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                {bidAmount && !error && validationStatus.isValid && (
                  <svg className="w-6 h-6 text-emerald-400 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {bidAmount && !validationStatus.isValid && validationStatus.reason !== 'empty' && (
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {/* Validation feedback */}
            {error ? (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm animate-scale-in">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            ) : !validationStatus.isValid && validationStatus.reason && validationStatus.reason !== 'empty' ? (
              <div className="mt-3 flex items-center gap-2 text-amber-400/70 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationStatus.reason}
              </div>
            ) : validationStatus.isValid && bidAmount ? (
              <div className="mt-3 flex items-center gap-2 text-emerald-400/70 text-sm animate-scale-in">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Valid bid - press Enter to submit
              </div>
            ) : null}
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
            disabled={isButtonDisabled}
            className={`w-full py-4 rounded-xl font-display text-lg tracking-wide transition-all ${
              isHighBidder
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : validationStatus.isValid
                ? 'btn-primary'
                : 'bg-slate-700/50 text-slate-500 border border-slate-600/30 cursor-not-allowed'
            } ${!isHighBidder && !validationStatus.isValid ? 'opacity-60' : ''}`}
          >
            {isHighBidder ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Winning
              </span>
            ) : !validationStatus.isValid ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Enter Valid Bid
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
            <p className="text-lg font-mono text-white">{currentTeam.length}<span className="text-slate-500">/12</span></p>
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

import { useState, useEffect } from 'react';

interface AuctionTimerProps {
  endTime: string | null;
  isPaused: boolean;
  pausedAt: string | null;
}

export default function AuctionTimer({ endTime, isPaused, pausedAt }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      if (isPaused && pausedAt) {
        const end = new Date(endTime).getTime();
        const paused = new Date(pausedAt).getTime();
        return Math.max(0, Math.floor((end - paused) / 1000));
      }

      const end = new Date(endTime).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 100);

    return () => clearInterval(interval);
  }, [endTime, isPaused, pausedAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft <= 10 && timeLeft > 0;
  const isCritical = timeLeft <= 5 && timeLeft > 0;
  const isExpired = timeLeft === 0 && endTime;

  // Calculate progress for the ring
  const maxTime = 60; // Assume 60 second timer
  const progress = Math.min(timeLeft / maxTime, 1);
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative">
      {/* Timer Container */}
      <div className={`relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 ${
        isExpired
          ? 'bg-slate-800/50'
          : isCritical
          ? 'bg-red-500/10 border border-red-500/30 animate-glow-pulse'
          : isLowTime
          ? 'bg-amber-500/10 border border-amber-500/30'
          : isPaused
          ? 'bg-yellow-500/10 border border-yellow-500/30'
          : 'bg-white/5 border border-white/10'
      }`}
      style={isCritical ? { boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)' } : {}}
      >
        {/* Circular Progress Ring */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background Ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-800"
            />
            {/* Progress Ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#timerGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-100 ${
                isExpired ? 'opacity-30' : ''
              }`}
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isCritical ? '#EF4444' : isLowTime ? '#F59E0B' : '#F59E0B'} />
                <stop offset="100%" stopColor={isCritical ? '#DC2626' : isLowTime ? '#D97706' : '#FBBF24'} />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-4xl font-bold tracking-tighter transition-colors ${
              isExpired
                ? 'text-slate-600'
                : isCritical
                ? 'text-red-400'
                : isLowTime
                ? 'text-amber-400'
                : isPaused
                ? 'text-yellow-400'
                : 'text-white'
            } ${isCritical ? 'animate-pulse' : ''}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Status Label */}
        <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-display tracking-widest ${
          isExpired
            ? 'bg-slate-700 text-slate-400'
            : isCritical
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : isLowTime
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : isPaused
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isPaused ? 'PAUSED' : isExpired ? 'TIME UP' : isCritical ? 'HURRY!' : isLowTime ? 'LOW TIME' : 'BIDDING OPEN'}
        </div>
      </div>

      {/* Animated Glow Effect for Critical Time */}
      {isCritical && !isExpired && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-red-500/20 animate-ping" style={{ animationDuration: '1s' }} />
        </div>
      )}
    </div>
  );
}

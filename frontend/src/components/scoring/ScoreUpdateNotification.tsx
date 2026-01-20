import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import type { ScoresUpdatedData } from '../../context/SocketContext';

interface ScoreUpdateNotificationProps {
  onRefresh?: () => void;
}

export function ScoreUpdateNotification({ onRefresh }: ScoreUpdateNotificationProps) {
  const { scoresUpdate, clearScoresUpdate } = useSocket();
  const [isVisible, setIsVisible] = useState(false);
  const [notification, setNotification] = useState<ScoresUpdatedData | null>(null);

  useEffect(() => {
    if (scoresUpdate) {
      setNotification(scoresUpdate);
      setIsVisible(true);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [scoresUpdate]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      clearScoresUpdate();
      setNotification(null);
    }, 300);
  };

  const handleRefresh = () => {
    onRefresh?.();
    handleDismiss();
  };

  if (!notification || !isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-40 max-w-sm
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <div className="bg-gradient-to-r from-[var(--accent-cyan)]/90 to-[var(--accent-purple)]/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl animate-pulse">📊</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">Scores Updated!</p>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
              <p className="text-sm text-white/80 mt-0.5">
                Match {notification.matchNumber}: {notification.team1} vs {notification.team2}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {notification.scoresCount} player scores updated
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Refresh Dashboard
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div className="h-full bg-white/60 animate-shrink" style={{ animationDuration: '10s' }} />
        </div>
      </div>
    </div>
  );
}

// Add shrink animation
const shrinkKeyframes = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}

.animate-shrink {
  animation: shrink linear forwards;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('score-notification-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'score-notification-styles';
    style.textContent = shrinkKeyframes;
    document.head.appendChild(style);
  }
}

export default ScoreUpdateNotification;

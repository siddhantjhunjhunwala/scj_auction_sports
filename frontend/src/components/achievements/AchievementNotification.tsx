import { useState, useEffect, useCallback } from 'react';
import { ACHIEVEMENT_DEFINITIONS } from './achievementDefinitions';

interface AchievementNotificationProps {
  achievementTypes: string[];
  teamName: string;
  onClose: () => void;
}

const rarityColors: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'from-slate-700 to-slate-900', border: 'border-slate-500', text: 'text-slate-300' },
  rare: { bg: 'from-blue-700 to-blue-900', border: 'border-blue-400', text: 'text-blue-300' },
  epic: { bg: 'from-purple-700 to-purple-900', border: 'border-purple-400', text: 'text-purple-300' },
  legendary: { bg: 'from-amber-600 to-orange-800', border: 'border-amber-400', text: 'text-amber-300' },
};

export function AchievementNotification({
  achievementTypes,
  teamName,
  onClose,
}: AchievementNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const currentType = achievementTypes[currentIndex];
  const achievement = ACHIEVEMENT_DEFINITIONS[currentType];

  const handleNext = useCallback(() => {
    if (currentIndex < achievementTypes.length - 1) {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsExiting(false);
      }, 300);
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 300);
    }
  }, [currentIndex, achievementTypes.length, onClose]);

  useEffect(() => {
    const timer = setTimeout(handleNext, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, handleNext]);

  if (!isVisible || !achievement) return null;

  const colors = rarityColors[achievement.rarity] || rarityColors.common;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${isExiting ? 'opacity-0' : 'opacity-100'}
        `}
      />

      {/* Achievement Card */}
      <div
        className={`
          relative pointer-events-auto
          transform transition-all duration-500 ease-out
          ${isExiting ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}
        `}
      >
        <div
          className={`
            bg-gradient-to-br ${colors.bg} ${colors.border}
            border-2 rounded-2xl p-6 shadow-2xl
            min-w-[320px] max-w-[400px]
          `}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full mb-2">
              <span className="text-yellow-400 animate-pulse">★</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Achievement Unlocked
              </span>
              <span className="text-yellow-400 animate-pulse">★</span>
            </div>
            <p className="text-sm text-gray-400">{teamName}</p>
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-4">
            <div
              className={`
                w-24 h-24 rounded-2xl flex items-center justify-center
                bg-gradient-to-br from-white/20 to-white/5
                border-2 ${colors.border} shadow-lg
                animate-bounce-slow
              `}
            >
              <span className="text-5xl">{achievement.iconEmoji}</span>
            </div>
          </div>

          {/* Achievement Info */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-1">{achievement.name}</h3>
            <p className="text-sm text-gray-300 mb-3">{achievement.description}</p>

            <div className="flex items-center justify-center gap-3">
              <span
                className={`
                  text-xs font-bold uppercase px-2 py-1 rounded
                  ${colors.text} bg-black/30
                `}
              >
                {achievement.rarity}
              </span>
              <span className="text-sm font-bold text-green-400">
                +{achievement.points} pts
              </span>
            </div>
          </div>

          {/* Progress indicator */}
          {achievementTypes.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {achievementTypes.map((_, idx) => (
                <div
                  key={idx}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/30'}
                  `}
                />
              ))}
            </div>
          )}

          {/* Click to continue */}
          <button
            onClick={handleNext}
            className="w-full mt-4 text-center text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            Click to continue ({currentIndex + 1}/{achievementTypes.length})
          </button>
        </div>

        {/* Decorative particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Add animation styles
const animationStyles = `
@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes particle {
  0% {
    transform: translateY(100%) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(1);
    opacity: 0;
  }
}

.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}

.animate-particle {
  animation: particle 3s ease-out infinite;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('achievement-notification-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'achievement-notification-styles';
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}

export default AchievementNotification;

import { useMemo } from 'react';
import type { Achievement, EarnedAchievement } from '../../services/api';

interface AchievementBadgeProps {
  achievement: Achievement | EarnedAchievement;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  earned?: boolean;
}

const rarityColors: Record<string, { bg: string; border: string; glow: string }> = {
  common: {
    bg: 'bg-gradient-to-br from-slate-600 to-slate-800',
    border: 'border-slate-500',
    glow: '',
  },
  rare: {
    bg: 'bg-gradient-to-br from-blue-600 to-blue-800',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/30',
  },
  epic: {
    bg: 'bg-gradient-to-br from-purple-600 to-purple-900',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/40',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600',
    border: 'border-amber-400',
    glow: 'shadow-amber-500/50',
  },
};

const sizeStyles = {
  sm: {
    container: 'w-12 h-12',
    emoji: 'text-xl',
    points: 'text-[8px]',
  },
  md: {
    container: 'w-16 h-16',
    emoji: 'text-2xl',
    points: 'text-[10px]',
  },
  lg: {
    container: 'w-20 h-20',
    emoji: 'text-3xl',
    points: 'text-xs',
  },
};

export function AchievementBadge({
  achievement,
  size = 'md',
  showDetails = false,
  earned = true,
}: AchievementBadgeProps) {
  const colors = useMemo(
    () => rarityColors[achievement.rarity] || rarityColors.common,
    [achievement.rarity]
  );
  const styles = sizeStyles[size];

  const isEarned = earned && 'earnedAt' in achievement;

  return (
    <div className={`relative group ${showDetails ? 'flex items-center gap-3' : ''}`}>
      {/* Badge */}
      <div
        className={`
          ${styles.container} ${colors.bg} ${colors.border}
          rounded-xl border-2 flex items-center justify-center
          transition-all duration-300 relative overflow-hidden
          ${isEarned ? `shadow-lg ${colors.glow}` : 'opacity-40 grayscale'}
          ${isEarned ? 'hover:scale-110 cursor-pointer' : ''}
        `}
      >
        {/* Shimmer effect for legendary */}
        {achievement.rarity === 'legendary' && isEarned && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}

        {/* Emoji */}
        <span className={`${styles.emoji} relative z-10`}>{achievement.iconEmoji}</span>

        {/* Points badge */}
        <div
          className={`
            absolute -bottom-1 -right-1 ${styles.points}
            bg-black/80 text-white px-1.5 py-0.5 rounded-full
            font-bold border border-white/20
          `}
        >
          +{achievement.points}
        </div>

        {/* Lock overlay for unearned */}
        {!isEarned && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white/60 text-lg">🔒</span>
          </div>
        )}
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white truncate">{achievement.name}</h4>
            <span
              className={`
                text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
                ${achievement.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' : ''}
                ${achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' : ''}
                ${achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' : ''}
                ${achievement.rarity === 'common' ? 'bg-slate-500/20 text-slate-400' : ''}
              `}
            >
              {achievement.rarity}
            </span>
          </div>
          <p className="text-sm text-gray-400 truncate">{achievement.description}</p>
          {'earnedAt' in achievement && achievement.earnedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Earned {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Tooltip on hover (only for non-details mode) */}
      {!showDetails && (
        <div
          className={`
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            bg-gray-900 border border-gray-700 rounded-lg p-3
            opacity-0 group-hover:opacity-100 pointer-events-none
            transition-opacity duration-200 min-w-[200px] max-w-[250px]
          `}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{achievement.name}</span>
            <span
              className={`
                text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
                ${achievement.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' : ''}
                ${achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' : ''}
                ${achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' : ''}
                ${achievement.rarity === 'common' ? 'bg-slate-500/20 text-slate-400' : ''}
              `}
            >
              {achievement.rarity}
            </span>
          </div>
          <p className="text-sm text-gray-400">{achievement.description}</p>
          <div className="text-xs text-green-400 mt-1 font-medium">+{achievement.points} pts</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// Shimmer animation
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// Add to document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes + `
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  document.head.appendChild(style);
}

export default AchievementBadge;

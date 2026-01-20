import { useState, useEffect } from 'react';
import { AchievementBadge } from './AchievementBadge';
import { achievementsApi } from '../../services/api';
import type { Achievement, EarnedAchievement } from '../../services/api';

interface AchievementsListProps {
  gameId: string;
  participantId?: string;
  showAll?: boolean;
}

export function AchievementsList({ gameId, participantId, showAll = true }: AchievementsListProps) {
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [available, setAvailable] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        if (participantId) {
          const response = await achievementsApi.getParticipantAchievements(gameId, participantId);
          setEarned(response.data);
          setAvailable([]);
          setTotalPoints(response.data.reduce((sum, a) => sum + a.points, 0));
        } else {
          const response = await achievementsApi.getMyAchievements(gameId);
          setEarned(response.data.earned);
          setAvailable(response.data.available);
          setTotalPoints(response.data.totalPoints);
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setError('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [gameId, participantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  // Group achievements by category
  const categories = {
    auction: ['first_pick', 'big_spender', 'bargain_hunter', 'bidding_war_winner', 'full_squad', 'foreign_legion', 'budget_master'],
    scoring: ['century_club', 'hat_trick_hero', 'match_winner', 'consistent_performer', 'points_milestone_500', 'points_milestone_1000', 'weekly_champion'],
    team: ['balanced_squad', 'ipl_collector', 'top_3_finish', 'league_champion'],
  };

  const filterAchievements = (achievements: (Achievement | EarnedAchievement)[], isEarned: boolean) => {
    if (filter === 'all') return achievements;
    if (filter === 'earned') return isEarned ? achievements : [];
    if (filter === 'locked') return isEarned ? [] : achievements;
    return achievements;
  };

  const renderCategory = (name: string, types: string[]) => {
    const earnedInCategory = earned.filter(a => types.includes(a.type));
    const availableInCategory = available.filter(a => types.includes(a.type));

    const filteredEarned = filterAchievements(earnedInCategory, true);
    const filteredAvailable = filterAchievements(availableInCategory, false);

    if (filteredEarned.length === 0 && filteredAvailable.length === 0 && !showAll) {
      return null;
    }

    return (
      <div key={name} className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <span>
            {name === 'auction' && '🏏'}
            {name === 'scoring' && '📊'}
            {name === 'team' && '👥'}
          </span>
          {name} Achievements
          <span className="text-xs text-gray-500">
            ({earnedInCategory.length}/{types.length})
          </span>
        </h3>
        <div className="flex flex-wrap gap-3">
          {(filteredEarned as EarnedAchievement[]).map((achievement) => (
            <AchievementBadge key={achievement.type} achievement={achievement} earned />
          ))}
          {showAll && (filteredAvailable as Achievement[]).map((achievement) => (
            <AchievementBadge key={achievement.type} achievement={achievement} earned={false} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <p className="text-sm text-gray-400">
            {earned.length} / {earned.length + available.length} unlocked
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">+{totalPoints}</div>
          <div className="text-xs text-gray-500">Achievement Points</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'earned', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 text-sm rounded-lg font-medium transition-colors
              ${filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            {f === 'all' && 'All'}
            {f === 'earned' && `Earned (${earned.length})`}
            {f === 'locked' && `Locked (${available.length})`}
          </button>
        ))}
      </div>

      {/* Achievement categories */}
      <div className="space-y-6 pt-2">
        {renderCategory('auction', categories.auction)}
        {renderCategory('scoring', categories.scoring)}
        {renderCategory('team', categories.team)}
      </div>

      {/* Empty state */}
      {earned.length === 0 && filter === 'earned' && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🏆</p>
          <p>No achievements earned yet</p>
          <p className="text-sm">Keep playing to unlock badges!</p>
        </div>
      )}
    </div>
  );
}

export default AchievementsList;

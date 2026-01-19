import type { GameParticipant, GameCricketer } from '../../types';

interface Props {
  participant: GameParticipant;
  cricketers: GameCricketer[];
  totalPoints: number;
  rank: number;
  isCurrentUser?: boolean;
}

export default function TeamCard({
  participant,
  cricketers,
  totalPoints,
  rank,
  isCurrentUser,
}: Props) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-6 ${
        isCurrentUser ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-400">#{rank}</span>
            <h3 className="text-lg font-semibold text-gray-900">
              {participant.user?.teamName || participant.user?.name}
            </h3>
            {isCurrentUser && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Budget: ${participant.budgetRemaining.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
          <p className="text-sm text-gray-500">points</p>
        </div>
      </div>

      {cricketers.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Team ({cricketers.length}/11)
          </p>
          <div className="flex flex-wrap gap-1">
            {cricketers.slice(0, 6).map(c => (
              <span
                key={c.id}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {c.firstName.charAt(0)}. {c.lastName}
              </span>
            ))}
            {cricketers.length > 6 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                +{cricketers.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

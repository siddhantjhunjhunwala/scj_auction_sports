import { useNavigate } from 'react-router-dom';
import type { Game } from '../../types';

interface Props {
  game: Game;
  showJoinButton?: boolean;
  onJoin?: (gameId: string) => void;
  onDelete?: (gameId: string) => void;
}

export default function GameCard({ game, showJoinButton, onJoin, onDelete }: Props) {
  const navigate = useNavigate();

  const getStatusBadge = (status: Game['status']) => {
    const badges: Record<Game['status'], { text: string; class: string }> = {
      pre_auction: { text: 'Pre-Auction', class: 'bg-yellow-100 text-yellow-800' },
      auction_active: { text: 'Auction Active', class: 'bg-green-100 text-green-800' },
      auction_paused: { text: 'Auction Paused', class: 'bg-orange-100 text-orange-800' },
      auction_ended: { text: 'Auction Ended', class: 'bg-blue-100 text-blue-800' },
      scoring: { text: 'Scoring', class: 'bg-purple-100 text-purple-800' },
      completed: { text: 'Completed', class: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
        {getStatusBadge(game.status)}
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {game.isCreator ? (
          <p>
            Code: <span className="font-mono font-bold text-blue-600">{game.code}</span>
          </p>
        ) : (
          <p>Host: {game.creator?.name || 'Unknown'}</p>
        )}
        <p>{game._count?.participants || 0} participants</p>
        {game._count?.cricketers !== undefined && <p>{game._count.cricketers} cricketers</p>}
      </div>

      <div className="flex gap-2">
        {showJoinButton ? (
          <button
            onClick={() => onJoin?.(game.id)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Join
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate(`/game/${game.id}/lobby`)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              {game.isCreator ? 'Manage' : 'Enter'}
            </button>
            {game.isCreator && game.status === 'pre_auction' && onDelete && (
              <button
                onClick={() => onDelete(game.id)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

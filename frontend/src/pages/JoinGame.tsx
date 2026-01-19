import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import type { Game } from '../types';

export default function JoinGame() {
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadJoinableGames();
  }, []);

  const loadJoinableGames = async () => {
    try {
      setIsLoading(true);
      const response = await gamesApi.getJoinable();
      setJoinableGames(response.data);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim()) return;

    try {
      setIsJoining(true);
      setError(null);
      const response = await gamesApi.joinByCode(gameCode.trim().toUpperCase());
      navigate(`/game/${response.data.game.id}/lobby`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to join game';
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinById = async (gameId: string) => {
    try {
      setIsJoining(true);
      setError(null);
      await gamesApi.joinById(gameId);
      navigate(`/game/${gameId}/lobby`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to join game';
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Join Game</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Join by Code */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Join with Code</h2>
          <form onSubmit={handleJoinByCode} className="flex gap-4">
            <input
              type="text"
              value={gameCode}
              onChange={e => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={gameCode.length !== 6 || isJoining}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          </form>
        </div>

        {/* Browse Games */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Open Games</h2>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading games...</div>
          ) : joinableGames.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No open games available. Ask the host for a game code.
            </div>
          ) : (
            <div className="space-y-4">
              {joinableGames.map(game => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{game.name}</h3>
                    <p className="text-sm text-gray-600">
                      Hosted by {game.creator?.name || 'Unknown'} •{' '}
                      {game._count?.participants || 0} participants
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinById(game.id)}
                    disabled={isJoining}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

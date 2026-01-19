import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Game } from '../types';

export default function AuctioneerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      const response = await gamesApi.getAll();
      setGames(response.data);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) return;

    try {
      setIsCreating(true);
      const response = await gamesApi.create(newGameName.trim());
      setShowCreateModal(false);
      setNewGameName('');
      navigate(`/game/${response.data.id}/lobby`);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      await gamesApi.delete(gameId);
      setGames(games.filter(g => g.id !== gameId));
    } catch (err) {
      console.error('Failed to delete game:', err);
      setError('Failed to delete game');
    }
  };

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

  const myGames = games.filter(g => g.createdById === user?.id);
  const joinedGames = games.filter(g => g.createdById !== user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Games</h1>
            <p className="text-gray-600 mt-1">Manage your Fantasy IPL auctions</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/join')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Join Game
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Game
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* My Created Games */}
        {myGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Games I Created</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myGames.map(game => (
                <div
                  key={game.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
                    {getStatusBadge(game.status)}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    <p>
                      Code: <span className="font-mono font-bold text-blue-600">{game.code}</span>
                    </p>
                    <p>{game._count?.participants || 0} participants</p>
                    <p>{game._count?.cricketers || 0} cricketers</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/game/${game.id}/lobby`)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Manage
                    </button>
                    {game.status === 'pre_auction' && (
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joined Games */}
        {joinedGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Games I Joined</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedGames.map(game => (
                <div
                  key={game.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
                    {getStatusBadge(game.status)}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    <p>Host: {game.creator?.name || 'Unknown'}</p>
                    <p>{game._count?.participants || 0} participants</p>
                  </div>
                  <button
                    onClick={() => navigate(`/game/${game.id}/lobby`)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Enter Game
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {games.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">You haven't created or joined any games yet.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Game
              </button>
              <button
                onClick={() => navigate('/join')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Join a Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
            <form onSubmit={handleCreateGame}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Name
                </label>
                <input
                  type="text"
                  value={newGameName}
                  onChange={e => setNewGameName(e.target.value)}
                  placeholder="e.g., IPL 2025 Auction"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGameName.trim() || isCreating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

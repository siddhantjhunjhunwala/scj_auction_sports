import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { Game, GameParticipant, GameCricketer } from '../types';

export default function GameLobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinGameRoom } = useSocket();

  const isCreator = game?.createdById === user?.id;

  useEffect(() => {
    if (gameId) {
      loadGame();
      joinGameRoom(gameId);
    }
  }, [gameId, joinGameRoom]);

  useEffect(() => {
    if (!socket) return;

    socket.on('player:joined', (data) => {
      setParticipants(prev => [...prev, data.participant]);
    });

    socket.on('player:left', (data) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    return () => {
      socket.off('player:joined');
      socket.off('player:left');
    };
  }, [socket]);

  const loadGame = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const [gameRes, participantsRes, cricketersRes] = await Promise.all([
        gamesApi.getById(gameId),
        gamesApi.getParticipants(gameId),
        gamesApi.getCricketers(gameId),
      ]);
      setGame(gameRes.data);
      setParticipants(participantsRes.data);
      setCricketers(cricketersRes.data);
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gameId) return;

    try {
      setIsUploading(true);
      setError(null);
      const response = await gamesApi.uploadCricketers(gameId, file);
      setCricketers(response.data.cricketers);
      setGame(prev => prev ? { ...prev, cricketersUploaded: true } : null);
    } catch (err) {
      console.error('Failed to upload cricketers:', err);
      setError('Failed to upload cricketers');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleJoining = async () => {
    if (!gameId || !game) return;

    try {
      const response = await gamesApi.update(gameId, {
        joiningAllowed: !game.joiningAllowed,
      });
      setGame(response.data);
    } catch (err) {
      console.error('Failed to update game:', err);
      setError('Failed to update game settings');
    }
  };

  const handleLeaveGame = async () => {
    if (!gameId || !confirm('Are you sure you want to leave this game?')) return;

    try {
      await gamesApi.leave(gameId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave game:', err);
      setError('Failed to leave game');
    }
  };

  const canStartAuction = isCreator && game?.cricketersUploaded && participants.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{game.name}</h1>
            <p className="text-gray-600 mt-1">
              Game Code:{' '}
              <span className="font-mono font-bold text-blue-600 text-lg">{game.code}</span>
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => navigate(`/game/${gameId}/points`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Configure Points
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Game Info & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Status Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Setup</h2>

              <div className="space-y-4">
                {/* Joining Toggle */}
                {isCreator && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Allow New Players</p>
                      <p className="text-sm text-gray-500">
                        {game.joiningAllowed
                          ? 'Players can join using the game code'
                          : 'No new players can join'}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleJoining}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        game.joiningAllowed ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          game.joiningAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Cricketers Upload */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Cricketers</p>
                    <p className="text-sm text-gray-500">
                      {cricketers.length > 0
                        ? `${cricketers.length} cricketers uploaded`
                        : 'No cricketers uploaded yet'}
                    </p>
                  </div>
                  {isCreator && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Upload CSV'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Participants Count */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">Participants</p>
                    <p className="text-sm text-gray-500">
                      {participants.length} player{participants.length !== 1 ? 's' : ''} joined
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-wrap gap-4">
                {isCreator ? (
                  <>
                    <button
                      onClick={() => navigate(`/game/${gameId}/auction`)}
                      disabled={!canStartAuction}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {game.status === 'pre_auction' ? 'Start Auction' : 'Continue Auction'}
                    </button>
                    {(game.status === 'auction_ended' || game.status === 'scoring') && (
                      <button
                        onClick={() => navigate(`/game/${gameId}/scoring`)}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Enter Scores
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {game.status !== 'pre_auction' && (
                      <button
                        onClick={() => navigate(`/game/${gameId}/auction`)}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Join Auction
                      </button>
                    )}
                    {game.status === 'pre_auction' && (
                      <button
                        onClick={handleLeaveGame}
                        className="flex-1 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Leave Game
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => navigate(`/game/${gameId}/leaderboard`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Leaderboard
                </button>
              </div>
              {!canStartAuction && isCreator && (
                <p className="text-sm text-gray-500 mt-4">
                  {!game.cricketersUploaded && 'Upload cricketers to start the auction. '}
                  {participants.length === 0 && 'Wait for players to join. '}
                </p>
              )}
            </div>

            {/* Cricketers Preview */}
            {cricketers.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Cricketers ({cricketers.length})
                </h2>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Team</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cricketers.slice(0, 20).map(c => (
                        <tr key={c.id} className="border-t border-gray-100">
                          <td className="p-2">
                            {c.firstName} {c.lastName}
                            {c.isForeign && (
                              <span className="ml-1 text-xs text-orange-600">*</span>
                            )}
                          </td>
                          <td className="p-2 capitalize">{c.playerType}</td>
                          <td className="p-2">{c.iplTeam}</td>
                          <td className="p-2 text-center">
                            {c.isPicked ? (
                              <span className="text-green-600">Picked</span>
                            ) : c.wasSkipped ? (
                              <span className="text-gray-400">Skipped</span>
                            ) : (
                              <span className="text-blue-600">Available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cricketers.length > 20 && (
                    <p className="text-center text-gray-500 text-sm mt-4">
                      And {cricketers.length - 20} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Participants */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Participants ({participants.length})
              </h2>
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No players have joined yet. Share the game code!
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {p.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {p.user?.teamName || p.user?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Budget: ${p.budgetRemaining.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share Code Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Invite Players</h3>
              <p className="text-sm text-blue-700 mb-3">
                Share this code with friends to let them join:
              </p>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="font-mono text-3xl font-bold text-blue-600 tracking-widest">
                  {game.code}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

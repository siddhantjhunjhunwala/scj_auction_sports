import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import type { Game, GameParticipant, GameCricketer } from '../types';
import { SkeletonTable } from '../components/ui/Skeleton';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import SearchInput from '../components/ui/SearchInput';

export default function GameLobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [filteredCricketers, setFilteredCricketers] = useState<GameCricketer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinGameRoom } = useSocket();
  const toast = useToast();

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
      toast.info('Player joined', `${data.participant.user?.name || 'A player'} has joined the game`);
    });

    socket.on('player:left', (data) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    return () => {
      socket.off('player:joined');
      socket.off('player:left');
    };
  }, [socket, toast]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCricketers(cricketers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCricketers(
        cricketers.filter(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.iplTeam.toLowerCase().includes(query) ||
          c.playerType.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, cricketers]);

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
      setFilteredCricketers(cricketersRes.data);
    } catch (err) {
      console.error('Failed to load game:', err);
      toast.error('Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gameId) return;

    try {
      setIsUploading(true);
      const response = await gamesApi.uploadCricketers(gameId, file);
      setCricketers(response.data.cricketers);
      setFilteredCricketers(response.data.cricketers);
      setGame(prev => prev ? { ...prev, cricketersUploaded: true } : null);
      toast.success('Upload complete', `${response.data.cricketers.length} cricketers added`);
    } catch (err) {
      console.error('Failed to upload cricketers:', err);
      toast.error('Upload failed', 'Please check your CSV file format');
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
      toast.success(response.data.joiningAllowed ? 'Joining enabled' : 'Joining disabled');
    } catch (err) {
      console.error('Failed to update game:', err);
      toast.error('Failed to update settings');
    }
  };

  const handleLeaveGame = async () => {
    if (!gameId || !confirm('Are you sure you want to leave this game?')) return;

    try {
      await gamesApi.leave(gameId);
      toast.success('Left game');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave game:', err);
      toast.error('Failed to leave game');
    }
  };

  const canStartAuction = isCreator && game?.cricketersUploaded && participants.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <SkeletonTable rows={5} columns={4} />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-4">🏏</div>
          <h2 className="text-xl font-display text-[var(--text-primary)] mb-2">Game Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-4">This game may have been deleted or you don't have access.</p>
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: Game['status']) => {
    const configs: Record<Game['status'], { text: string; class: string }> = {
      pre_auction: { text: 'Pre-Auction', class: 'badge-gold' },
      auction_active: { text: 'Auction Live', class: 'badge-emerald' },
      auction_paused: { text: 'Auction Paused', class: 'badge-gold' },
      auction_ended: { text: 'Auction Complete', class: 'badge-cyan' },
      scoring: { text: 'Scoring Phase', class: 'badge-purple' },
      completed: { text: 'Completed', class: 'badge' },
    };
    return configs[status];
  };

  const statusConfig = getStatusConfig(game.status);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5m7-7-7 7 7 7"/>
                </svg>
                Back
              </Link>
              <div className="h-6 w-px bg-[var(--glass-border)]" />
              <div>
                <h1 className="text-lg font-display text-[var(--text-primary)]">{game.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[var(--accent-gold)]">{game.code}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(game.code);
                      toast.success('Code copied!');
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <span className={statusConfig.class}>{statusConfig.text}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="glass-card-glow p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-pattern-grid opacity-20" />
              <div className="relative z-10">
                <div className="flex flex-wrap gap-3">
                  {isCreator ? (
                    <>
                      <LoadingButton
                        onClick={() => navigate(`/game/${gameId}/auction`)}
                        disabled={!canStartAuction}
                        className="flex-1 min-w-[150px]"
                      >
                        {game.status === 'pre_auction' ? '🎤 Start Auction' : '🎤 Continue Auction'}
                      </LoadingButton>
                      <button
                        onClick={() => navigate(`/game/${gameId}/points`)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20V10M18 20V4M6 20v-4"/>
                        </svg>
                        Points Config
                      </button>
                      {(game.status === 'auction_ended' || game.status === 'scoring') && (
                        <button
                          onClick={() => navigate(`/game/${gameId}/scoring`)}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Enter Scores
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {game.status !== 'pre_auction' && (
                        <button
                          onClick={() => navigate(`/game/${gameId}/auction`)}
                          className="btn-primary flex-1"
                        >
                          🎤 Join Auction
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/game/${gameId}/dashboard`)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="M3 9h18M9 21V9"/>
                        </svg>
                        My Dashboard
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/game/${gameId}/leaderboard`)}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                    </svg>
                    Leaderboard
                  </button>
                </div>

                {!canStartAuction && isCreator && game.status === 'pre_auction' && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-4">
                    {!game.cricketersUploaded && '📋 Upload cricketers to start. '}
                    {participants.length === 0 && '👥 Waiting for players to join.'}
                  </p>
                )}
              </div>
            </div>

            {/* Game Setup (for Creator) */}
            {isCreator && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-display text-[var(--text-primary)] mb-4">Game Settings</h2>
                <div className="space-y-4">
                  {/* Joining Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Allow New Players</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        {game.joiningAllowed ? 'Players can join using the game code' : 'No new players can join'}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleJoining}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        game.joiningAllowed ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          game.joiningAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Upload Cricketers */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Cricketers</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        {cricketers.length > 0 ? `${cricketers.length} cricketers uploaded` : 'No cricketers yet'}
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <LoadingButton
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={isUploading}
                        loadingText="Uploading..."
                        variant="secondary"
                        className="text-sm"
                      >
                        📁 Upload CSV
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cricketers Table */}
            {cricketers.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display text-[var(--text-primary)]">
                    Cricketers ({cricketers.length})
                  </h2>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search players..."
                    className="w-64"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Team</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCricketers.slice(0, 20).map((c, i) => (
                        <tr key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.02}s` }}>
                          <td>
                            <span className="text-[var(--text-primary)] font-medium">
                              {c.firstName} {c.lastName}
                            </span>
                            {c.isForeign && (
                              <span className="ml-2 text-xs text-[var(--accent-gold)]">🌍</span>
                            )}
                          </td>
                          <td className="capitalize">{c.playerType.replace('_', ' ')}</td>
                          <td>{c.iplTeam}</td>
                          <td className="text-center">
                            {c.isPicked ? (
                              <span className="badge badge-emerald">Picked</span>
                            ) : c.wasSkipped ? (
                              <span className="badge">Skipped</span>
                            ) : (
                              <span className="badge badge-cyan">Available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredCricketers.length > 20 && (
                  <p className="text-center text-[var(--text-tertiary)] text-sm mt-4">
                    Showing 20 of {filteredCricketers.length} cricketers
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display text-[var(--text-primary)]">
                  Participants
                </h2>
                <span className="badge badge-cyan">{participants.length}</span>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-[var(--text-tertiary)]">No players yet</p>
                  <p className="text-sm text-[var(--text-muted)]">Share the code to invite!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] animate-slide-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center text-[var(--bg-deep)] font-bold">
                        {p.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {p.user?.teamName || p.user?.name}
                          {p.userId === user?.id && (
                            <span className="ml-2 text-xs text-[var(--accent-cyan)]">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--accent-gold)] font-mono">
                          ${p.budgetRemaining.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isCreator && game.status === 'pre_auction' && (
                <button
                  onClick={handleLeaveGame}
                  className="w-full mt-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Leave Game
                </button>
              )}
            </div>

            {/* Share Code Card */}
            <div className="glass-card-glow p-6 text-center">
              <h3 className="font-display text-[var(--text-primary)] mb-2">Invite Players</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">
                Share this code with friends
              </p>
              <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 mb-4">
                <p className="font-mono text-3xl font-bold text-gradient-gold tracking-[0.3em]">
                  {game.code}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Join my Fantasy IPL game! Code: ${game.code}`);
                  toast.success('Copied to clipboard!');
                }}
                className="btn-secondary w-full text-sm"
              >
                📋 Copy Invite Message
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

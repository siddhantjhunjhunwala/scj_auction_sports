import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useForm } from '../hooks/useForm';
import { createGameSchema, gameCodeSchema, type CreateGameInput } from '../validation/schemas';
import type { Game } from '../types';
import { SkeletonCard } from '../components/ui/Skeleton';
import Skeleton from '../components/ui/Skeleton';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import JoinGameModal from '../components/game/JoinGameModal';

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingJoinable, setIsLoadingJoinable] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{ type: 'code' | 'id'; value: string; gameName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'my-games' | 'browse'>('my-games');

  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const createGameForm = useForm<CreateGameInput>({
    schema: createGameSchema,
    initialValues: { name: '' },
    onSubmit: async (values) => {
      try {
        const response = await gamesApi.create(values.name.trim());
        setShowCreateModal(false);
        createGameForm.reset();
        toast.success('Game created!', `Join code: ${response.data.code}`);
        navigate(`/game/${response.data.id}/setup`);
      } catch (err) {
        console.error('Failed to create game:', err);
        toast.error('Failed to create game', 'Please try again');
      }
    },
  });

  useEffect(() => {
    loadGames();
    loadJoinableGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      const response = await gamesApi.getAll();
      setGames(response.data);
    } catch (err) {
      console.error('Failed to load games:', err);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const loadJoinableGames = async () => {
    try {
      setIsLoadingJoinable(true);
      const response = await gamesApi.getJoinable();
      setJoinableGames(response.data);
    } catch (err) {
      console.error('Failed to load joinable games:', err);
    } finally {
      setIsLoadingJoinable(false);
    }
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!confirm(`Are you sure you want to delete "${gameName}"?`)) return;

    try {
      await gamesApi.delete(gameId);
      setGames(games.filter(g => g.id !== gameId));
      toast.success('Game deleted', `"${gameName}" has been removed`);
    } catch (err) {
      console.error('Failed to delete game:', err);
      toast.error('Failed to delete game');
    }
  };

  // Code input handlers
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setGameCode(pasted);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
      return;
    }

    const char = value.toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;

    const newCode = gameCode.split('');
    newCode[index] = char;
    setGameCode(newCode.join(''));

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !gameCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateCode = (code: string): boolean => {
    const result = gameCodeSchema.safeParse({ code });
    if (!result.success) {
      setCodeError(result.error.issues[0]?.message || 'Invalid code');
      return false;
    }
    setCodeError(null);
    return true;
  };

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCode(gameCode)) return;
    setPendingJoin({ type: 'code', value: gameCode, gameName: 'the game' });
    setShowJoinModal(true);
  };

  const handleJoinByIdClick = (gameId: string, gameName: string) => {
    setPendingJoin({ type: 'id', value: gameId, gameName });
    setShowJoinModal(true);
  };

  const handleJoinWithProfile = async (teamName: string, avatarUrl: string) => {
    if (!pendingJoin) return;

    try {
      const profileResponse = await authApi.updateProfile({ teamName, avatarUrl });
      updateUser(profileResponse.data);

      if (pendingJoin.type === 'code') {
        setIsJoining(true);
        const response = await gamesApi.joinByCode(pendingJoin.value, teamName, avatarUrl);
        toast.success('Joined game!', `Welcome to ${response.data.game.name}`);
        setShowJoinModal(false);
        setGameCode('');
        navigate(`/game/${response.data.game.id}/setup`);
      } else {
        setJoiningGameId(pendingJoin.value);
        await gamesApi.joinById(pendingJoin.value, teamName, avatarUrl);
        toast.success('Joined game!', `Welcome to ${pendingJoin.gameName}`);
        setShowJoinModal(false);
        navigate(`/game/${pendingJoin.value}/setup`);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to join game';
      toast.error('Failed to join', errorMessage);
      throw err;
    } finally {
      setIsJoining(false);
      setJoiningGameId(null);
    }
  };

  const getStatusConfig = (status: Game['status']) => {
    const configs: Record<Game['status'], { text: string; class: string; icon: string }> = {
      pre_auction: { text: 'Pre-Auction', class: 'badge-gold', icon: '⏳' },
      auction_active: { text: 'Live', class: 'badge-emerald', icon: '🔴' },
      auction_paused: { text: 'Paused', class: 'badge-gold', icon: '⏸️' },
      auction_ended: { text: 'Auction Done', class: 'badge-cyan', icon: '✓' },
      scoring: { text: 'Scoring', class: 'badge-purple', icon: '📊' },
      completed: { text: 'Completed', class: 'badge', icon: '🏆' },
    };
    return configs[status];
  };

  const myGames = games.filter(g => g.createdById === user?.id);
  const joinedGames = games.filter(g => g.createdById !== user?.id);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-display text-[var(--text-primary)] mb-2">My Games</h1>
          <p className="text-[var(--text-secondary)]">
            Create, join, and manage your Fantasy IPL leagues
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
          Create Game
        </button>
      </div>

      {/* Join by Code - Compact */}
      <div className="glass-card p-5 mb-6">
        <form onSubmit={handleJoinByCodeSubmit} className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">Join with code:</span>
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                maxLength={6}
                value={gameCode[i] || ''}
                onChange={e => {
                  handleCodeChange(i, e.target.value);
                  setCodeError(null);
                }}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                className={`w-9 h-11 text-center text-lg font-mono font-bold
                  bg-[var(--bg-tertiary)] border-2 rounded-lg
                  text-[var(--text-primary)] focus:ring-2
                  focus:outline-none transition-all placeholder:text-[var(--text-muted)]
                  ${codeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[var(--glass-border)] focus:border-[var(--accent-gold)] focus:ring-[var(--accent-gold)]/20'}`}
                placeholder="•"
              />
            ))}
          </div>

          <LoadingButton
            type="submit"
            isLoading={isJoining}
            loadingText="..."
            disabled={gameCode.length !== 6}
            className="flex-shrink-0"
          >
            Join
          </LoadingButton>

          {codeError && (
            <p className="text-sm text-red-400 animate-slide-up">{codeError}</p>
          )}
        </form>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'my-games' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-games')}
        >
          My Games ({games.length})
        </button>
        <button
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Open ({joinableGames.length})
        </button>
      </div>

      {/* My Games Tab */}
      {activeTab === 'my-games' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">🏏</div>
              <h3 className="text-xl font-display text-[var(--text-primary)] mb-2">No Games Yet</h3>
              <p className="text-[var(--text-tertiary)] mb-6 max-w-sm mx-auto">
                Create your own Fantasy IPL auction or join an existing game with a code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Game
                </button>
                <button onClick={() => setActiveTab('browse')} className="btn-secondary">
                  Browse Games
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Games I Created */}
              {myGames.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">👑</span>
                    <h3 className="text-lg font-display text-[var(--text-primary)]">Created by Me</h3>
                    <span className="badge badge-gold">{myGames.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {myGames.map((game, i) => {
                      const statusConfig = getStatusConfig(game.status);
                      return (
                        <div
                          key={game.id}
                          className="glass-card hover-lift p-5 animate-slide-up"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                                {game.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-sm text-[var(--accent-gold)] font-bold">
                                  {game.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(game.code);
                                    toast.success('Code copied!');
                                  }}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                  title="Copy code"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <span className={statusConfig.class}>
                              {statusConfig.icon} {statusConfig.text}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="stat-box">
                              <div className="stat-value text-lg">{game._count?.participants || 0}</div>
                              <div className="stat-label">Players</div>
                            </div>
                            <div className="stat-box">
                              <div className="stat-value text-lg">{game._count?.cricketers || 0}</div>
                              <div className="stat-label">Cricketers</div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/game/${game.id}/setup`)}
                              className="btn-primary flex-1 text-sm py-2"
                            >
                              Manage
                            </button>
                            {game.status === 'pre_auction' && (
                              <button
                                onClick={() => handleDeleteGame(game.id, game.name)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Delete game"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Games I Joined */}
              {joinedGames.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">🤝</span>
                    <h3 className="text-lg font-display text-[var(--text-primary)]">Joined</h3>
                    <span className="badge badge-cyan">{joinedGames.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {joinedGames.map((game, i) => {
                      const statusConfig = getStatusConfig(game.status);
                      return (
                        <div
                          key={game.id}
                          className="glass-card hover-lift p-5 animate-slide-up"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                                {game.name}
                              </h4>
                              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                                Hosted by {game.creator?.name || 'Unknown'}
                              </p>
                            </div>
                            <span className={statusConfig.class}>
                              {statusConfig.icon} {statusConfig.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"/>
                            </svg>
                            {game._count?.participants || 0} participants
                          </div>

                          <button
                            onClick={() => navigate(`/game/${game.id}/setup`)}
                            className="btn-secondary w-full text-sm py-2"
                          >
                            Enter Game
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Browse Open Games Tab */}
      {activeTab === 'browse' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-display text-[var(--text-primary)]">Open Games</h3>
                <p className="text-sm text-[var(--text-tertiary)]">Games currently accepting players</p>
              </div>
            </div>
            <button
              onClick={loadJoinableGames}
              className="btn-ghost text-sm"
              disabled={isLoadingJoinable}
            >
              <svg className={`w-4 h-4 ${isLoadingJoinable ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {isLoadingJoinable ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl">
                  <div className="flex-1">
                    <Skeleton width="60%" height={20} className="mb-2" />
                    <Skeleton width="40%" height={16} />
                  </div>
                  <Skeleton width={80} height={36} />
                </div>
              ))}
            </div>
          ) : joinableGames.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">😕</div>
              <h4 className="text-lg font-display text-[var(--text-secondary)] mb-2">No Open Games</h4>
              <p className="text-[var(--text-tertiary)] max-w-sm mx-auto">
                There are no games currently accepting players. Ask a host for a game code or create your own.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {joinableGames.map((game, i) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 border border-[var(--glass-border)]
                    rounded-xl hover:border-[var(--accent-gold)]/30 hover:bg-[var(--bg-tertiary)]/50
                    transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20
                      flex items-center justify-center">
                      <span className="text-xl">🏏</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{game.name}</h3>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        Hosted by <span className="text-[var(--text-secondary)]">{game.creator?.name || 'Unknown'}</span>
                        <span className="mx-2">•</span>
                        <span className="text-[var(--accent-cyan)]">{game._count?.participants || 0}</span> players
                      </p>
                    </div>
                  </div>
                  <LoadingButton
                    onClick={() => handleJoinByIdClick(game.id, game.name)}
                    isLoading={joiningGameId === game.id}
                    loadingText="..."
                    variant="secondary"
                    className="text-sm px-4 py-2"
                  >
                    Join
                  </LoadingButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content glass-card-glow p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--bg-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14m-7-7h14"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-display text-[var(--text-primary)]">Create New Game</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Start a new Fantasy IPL auction</p>
              </div>
            </div>

            <form onSubmit={createGameForm.handleSubmit}>
              <div className="mb-6">
                <label className="input-label">Game Name</label>
                <input
                  type="text"
                  {...createGameForm.getFieldProps('name')}
                  placeholder="e.g., IPL 2025 Auction"
                  className={`input-field pl-4 ${createGameForm.getFieldState('name').hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  autoFocus
                />
                {createGameForm.getFieldState('name').hasError && (
                  <p className="text-sm text-red-400 mt-1 animate-slide-up">{createGameForm.getFieldState('name').error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    createGameForm.reset();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={createGameForm.isSubmitting}
                  loadingText="Creating..."
                  disabled={!createGameForm.isValid}
                  className="flex-1"
                >
                  Create Game
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Game Modal */}
      <JoinGameModal
        isOpen={showJoinModal}
        gameName={pendingJoin?.gameName || ''}
        onJoin={handleJoinWithProfile}
        onCancel={() => {
          setShowJoinModal(false);
          setPendingJoin(null);
        }}
      />
    </div>
  );
}

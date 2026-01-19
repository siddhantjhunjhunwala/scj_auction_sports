import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useForm } from '../hooks/useForm';
import { createGameSchema, type CreateGameInput } from '../validation/schemas';
import type { Game } from '../types';
import { SkeletonCard } from '../components/ui/Skeleton';
import { NoGamesEmpty } from '../components/ui/EmptyState';
import { LoadingButton } from '../components/ui/LoadingSpinner';

export default function AuctioneerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();

  const createGameForm = useForm<CreateGameInput>({
    schema: createGameSchema,
    initialValues: { name: '' },
    onSubmit: async (values) => {
      try {
        const response = await gamesApi.create(values.name.trim());
        setShowCreateModal(false);
        createGameForm.reset();
        toast.success('Game created!', `Join code: ${response.data.code}`);
        navigate(`/game/${response.data.id}/lobby`);
      } catch (err) {
        console.error('Failed to create game:', err);
        toast.error('Failed to create game', 'Please try again');
      }
    },
  });

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
      toast.error('Failed to load games', 'Please try refreshing the page');
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--bg-deep)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h1 className="text-xl font-display text-[var(--text-primary)]">Fantasy IPL</h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[var(--text-secondary)] text-sm hidden sm:block">
                Welcome, <span className="text-[var(--text-primary)] font-medium">{user?.name}</span>
              </span>
              <button
                onClick={logout}
                className="btn-ghost text-sm px-3 py-1.5"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="glass-card-glow p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-grid opacity-30" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-display text-gradient-gold mb-2">
                  My Dashboard
                </h2>
                <p className="text-[var(--text-secondary)] max-w-md">
                  Create and manage your Fantasy IPL auctions. Invite friends with unique game codes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/join" className="btn-secondary flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-5-4 5-5-5-5m5 5H3"/>
                  </svg>
                  Join Game
                </Link>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-7-7h14"/>
                  </svg>
                  Create Game
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Games', value: games.length, icon: '🎮' },
            { label: 'Created', value: myGames.length, icon: '👑' },
            { label: 'Joined', value: joinedGames.length, icon: '🤝' },
            { label: 'Active', value: games.filter(g => g.status === 'auction_active').length, icon: '🔴' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 text-center animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Games I Created */}
        {!isLoading && myGames.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                <span className="text-lg">👑</span>
              </div>
              <h3 className="text-xl font-display text-[var(--text-primary)]">Games I Created</h3>
              <span className="badge badge-gold">{myGames.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myGames.map((game, i) => {
                const statusConfig = getStatusConfig(game.status);
                return (
                  <div
                    key={game.id}
                    className="glass-card hover-lift p-6 animate-slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex justify-between items-start mb-4">
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
                        onClick={() => navigate(`/game/${game.id}/lobby`)}
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
        {!isLoading && joinedGames.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <span className="text-lg">🤝</span>
              </div>
              <h3 className="text-xl font-display text-[var(--text-primary)]">Games I Joined</h3>
              <span className="badge badge-cyan">{joinedGames.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedGames.map((game, i) => {
                const statusConfig = getStatusConfig(game.status);
                return (
                  <div
                    key={game.id}
                    className="glass-card hover-lift p-6 animate-slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex justify-between items-start mb-4">
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
                      onClick={() => navigate(`/game/${game.id}/lobby`)}
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

        {/* Empty State */}
        {!isLoading && games.length === 0 && (
          <NoGamesEmpty onCreateGame={() => setShowCreateModal(true)} />
        )}
      </main>

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
    </div>
  );
}

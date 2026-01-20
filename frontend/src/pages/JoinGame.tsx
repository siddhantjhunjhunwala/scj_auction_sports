import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gamesApi, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { gameCodeSchema } from '../validation/schemas';
import type { Game } from '../types';
import Skeleton from '../components/ui/Skeleton';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import JoinGameModal from '../components/game/JoinGameModal';

export default function JoinGame() {
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);
  const [gameCode, setGameCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{ type: 'code' | 'id'; value: string; gameName: string } | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { updateUser } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
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

    // Auto-focus next input
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

    // Show modal to get team name and avatar
    setPendingJoin({ type: 'code', value: gameCode, gameName: 'the game' });
    setShowJoinModal(true);
  };

  const handleJoinByIdClick = (gameId: string, gameName: string) => {
    // Show modal to get team name and avatar
    setPendingJoin({ type: 'id', value: gameId, gameName });
    setShowJoinModal(true);
  };

  const handleJoinWithProfile = async (teamName: string, avatarUrl: string) => {
    if (!pendingJoin) return;

    try {
      // Update user profile with team name and avatar
      const profileResponse = await authApi.updateProfile({ teamName, avatarUrl });
      updateUser(profileResponse.data);

      if (pendingJoin.type === 'code') {
        setIsJoining(true);
        const response = await gamesApi.joinByCode(pendingJoin.value, teamName, avatarUrl);
        toast.success('Joined game!', `Welcome to ${response.data.game.name}`);
        setShowJoinModal(false);
        navigate(`/game/${response.data.game.id}/lobby`);
      } else {
        setJoiningGameId(pendingJoin.value);
        await gamesApi.joinById(pendingJoin.value, teamName, avatarUrl);
        toast.success('Joined game!', `Welcome to ${pendingJoin.gameName}`);
        setShowJoinModal(false);
        navigate(`/game/${pendingJoin.value}/lobby`);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to join game';
      toast.error('Failed to join', errorMessage);
      throw err; // Re-throw to let modal handle it
    } finally {
      setIsJoining(false);
      setJoiningGameId(null);
    }
  };

  const handleCancelJoin = () => {
    setShowJoinModal(false);
    setPendingJoin(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
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
            <h1 className="text-xl font-display text-[var(--text-primary)]">Join Game</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Join by Code */}
        <div className="glass-card-glow p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-grid opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--bg-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-display text-[var(--text-primary)]">Enter Game Code</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Get the 6-character code from the host</p>
              </div>
            </div>

            <form onSubmit={handleJoinByCodeSubmit}>
              <div className="flex justify-center gap-2 sm:gap-3 mb-2">
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
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold
                      bg-[var(--bg-tertiary)] border-2 rounded-xl
                      text-[var(--text-primary)] focus:ring-2
                      focus:outline-none transition-all placeholder:text-[var(--text-muted)]
                      ${codeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[var(--glass-border)] focus:border-[var(--accent-gold)] focus:ring-[var(--accent-gold)]/20'}`}
                    placeholder="•"
                  />
                ))}
              </div>
              {codeError && (
                <p className="text-center text-sm text-red-400 mb-4 animate-slide-up">{codeError}</p>
              )}
              {!codeError && <div className="mb-4" />}

              <LoadingButton
                type="submit"
                isLoading={isJoining}
                loadingText="Joining..."
                disabled={gameCode.length !== 6}
                className="w-full"
              >
                Join Game
              </LoadingButton>
            </form>
          </div>
        </div>

        {/* Browse Games */}
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
                <h2 className="text-lg font-display text-[var(--text-primary)]">Browse Open Games</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Find games accepting new players</p>
              </div>
            </div>
            <button
              onClick={loadJoinableGames}
              className="btn-ghost text-sm flex items-center gap-2"
              disabled={isLoading}
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {isLoading ? (
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
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 9h.01M15 9h.01M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1"/>
                </svg>
              }
              title="No Open Games"
              message="There are no games currently accepting players. Ask a host for a game code or create your own."
            />
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
      </main>

      {/* Join Game Modal */}
      <JoinGameModal
        isOpen={showJoinModal}
        gameName={pendingJoin?.gameName || ''}
        onJoin={handleJoinWithProfile}
        onCancel={handleCancelJoin}
      />
    </div>
  );
}

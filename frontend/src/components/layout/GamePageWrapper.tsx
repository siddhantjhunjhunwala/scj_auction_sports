import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';

interface GamePageWrapperProps {
  children: React.ReactNode;
}

/**
 * GamePageWrapper handles loading game data when navigating to game-specific pages.
 * It does NOT include layout - that's handled by AppLayout at the top level.
 */
export default function GamePageWrapper({ children }: GamePageWrapperProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { currentGame, isLoading, error, loadGame } = useGame();

  useEffect(() => {
    if (gameId && (!currentGame || currentGame.id !== gameId)) {
      loadGame(gameId).catch(() => {
        // If game loading fails, redirect to home
        navigate('/home');
      });
    }
  }, [gameId, currentGame, loadGame, navigate]);

  if (isLoading && !currentGame) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error && !currentGame) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-[var(--text-primary)] text-lg mb-2">Failed to load game</p>
          <p className="text-[var(--text-tertiary)] mb-4">{error}</p>
          <button
            onClick={() => navigate('/home')}
            className="btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return null;
  }

  return <>{children}</>;
}

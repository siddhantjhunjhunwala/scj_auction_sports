import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { gamesApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import type { Game, GameParticipant } from '../types';

interface GameContextType {
  currentGame: Game | null;
  participant: GameParticipant | null;
  isCreator: boolean;
  isLoading: boolean;
  error: string | null;
  setCurrentGame: (game: Game | null) => void;
  joinGame: (gameId: string) => Promise<void>;
  joinGameByCode: (code: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  refreshGame: () => Promise<void>;
  clearGame: () => void;
}

const GameContext = createContext<GameContextType>({
  currentGame: null,
  participant: null,
  isCreator: false,
  isLoading: false,
  error: null,
  setCurrentGame: () => {},
  joinGame: async () => {},
  joinGameByCode: async () => {},
  leaveGame: async () => {},
  refreshGame: async () => {},
  clearGame: () => {},
});

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [currentGame, setCurrentGameState] = useState<Game | null>(null);
  const [participant, setParticipant] = useState<GameParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { joinGameRoom, leaveGameRoom } = useSocket();

  const isCreator = currentGame?.createdById === user?.id;

  const setCurrentGame = useCallback((game: Game | null) => {
    setCurrentGameState(game);
    if (game) {
      // Find participant info if user is a participant
      const userParticipant = game.participants?.find(p => p.userId === user?.id);
      setParticipant(userParticipant || null);
      // Join socket room
      joinGameRoom(game.id);
    } else {
      setParticipant(null);
      leaveGameRoom();
    }
  }, [user, joinGameRoom, leaveGameRoom]);

  const refreshGame = useCallback(async () => {
    if (!currentGame) return;

    try {
      setIsLoading(true);
      const response = await gamesApi.getById(currentGame.id);
      setCurrentGameState(response.data);
      const userParticipant = response.data.participants?.find(p => p.userId === user?.id);
      setParticipant(userParticipant || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh game';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, user]);

  const joinGame = useCallback(async (gameId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await gamesApi.joinById(gameId);
      // Fetch full game details
      const gameResponse = await gamesApi.getById(response.data.gameId);
      setCurrentGame(gameResponse.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentGame]);

  const joinGameByCode = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await gamesApi.joinByCode(code);
      // Fetch full game details
      const gameResponse = await gamesApi.getById(response.data.game.id);
      setCurrentGame(gameResponse.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentGame]);

  const leaveGame = useCallback(async () => {
    if (!currentGame) return;

    try {
      setIsLoading(true);
      await gamesApi.leave(currentGame.id);
      setCurrentGameState(null);
      setParticipant(null);
      leaveGameRoom();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave game';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, leaveGameRoom]);

  const clearGame = useCallback(() => {
    setCurrentGameState(null);
    setParticipant(null);
    leaveGameRoom();
  }, [leaveGameRoom]);

  // Clear game state when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentGameState(null);
      setParticipant(null);
    }
  }, [user]);

  return (
    <GameContext.Provider
      value={{
        currentGame,
        participant,
        isCreator,
        isLoading,
        error,
        setCurrentGame,
        joinGame,
        joinGameByCode,
        leaveGame,
        refreshGame,
        clearGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}

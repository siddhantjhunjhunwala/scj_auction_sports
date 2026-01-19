import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentGameId: string | null;
  joinGameRoom: (gameId: string) => void;
  leaveGameRoom: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  currentGameId: null,
  joinGameRoom: () => {},
  leaveGameRoom: () => {},
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setCurrentGameId(null);
      }
      return;
    }

    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  const joinGameRoom = useCallback((gameId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      // Leave current room if different
      if (currentGameId && currentGameId !== gameId) {
        socketRef.current.emit('game:leave');
      }
      socketRef.current.emit('game:join', { gameId });
      setCurrentGameId(gameId);
      console.log(`Joining game room: ${gameId}`);
    }
  }, [currentGameId]);

  const leaveGameRoom = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && currentGameId) {
      socketRef.current.emit('game:leave');
      setCurrentGameId(null);
      console.log('Left game room');
    }
  }, [currentGameId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, currentGameId, joinGameRoom, leaveGameRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

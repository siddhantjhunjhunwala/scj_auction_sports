import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AchievementNotificationWrapper } from './components/achievements/AchievementNotificationWrapper';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Legacy Pages (kept for backwards compatibility)
import Setup from './pages/Setup';
import Auction from './pages/Auction';
import Scoring from './pages/Scoring';
import Subs from './pages/Subs';
import Reports from './pages/Reports';

// New Multi-Game Pages
import AuctioneerDashboard from './pages/AuctioneerDashboard';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import PointsConfig from './pages/PointsConfig';
import GameAuction from './pages/GameAuction';
import PlayerDashboard from './pages/PlayerDashboard';
import Leaderboard from './pages/Leaderboard';
import GameScoring from './pages/GameScoring';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Main Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuctioneerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Join Game */}
      <Route
        path="/join"
        element={
          <ProtectedRoute>
            <JoinGame />
          </ProtectedRoute>
        }
      />

      {/* Game-Specific Routes */}
      <Route
        path="/game/:gameId/lobby"
        element={
          <ProtectedRoute>
            <GameLobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/points"
        element={
          <ProtectedRoute>
            <PointsConfig />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/auction"
        element={
          <ProtectedRoute>
            <GameAuction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/dashboard"
        element={
          <ProtectedRoute>
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/scoring"
        element={
          <ProtectedRoute>
            <GameScoring />
          </ProtectedRoute>
        }
      />

      {/* Legacy Routes (kept for backwards compatibility) */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <Setup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auction"
        element={
          <ProtectedRoute>
            <Auction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scoring"
        element={
          <ProtectedRoute>
            <Scoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subs"
        element={
          <ProtectedRoute>
            <Subs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <GameProvider>
              <ToastProvider>
                <AppRoutes />
                <AchievementNotificationWrapper />
              </ToastProvider>
            </GameProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

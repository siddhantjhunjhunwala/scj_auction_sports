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
import HomePage from './pages/HomePage';
import GameLobby from './pages/GameLobby';
import GameAuction from './pages/GameAuction';
import PlayerDashboard from './pages/PlayerDashboard';
import GameScoring from './pages/GameScoring';

// V2 Pages
import SetupPage from './pages/v2/SetupPage';
import PointsPage from './pages/v2/PointsPage';
import ListPage from './pages/v2/ListPage';
import LivePage from './pages/v2/LivePage';
import ResultsPage from './pages/v2/ResultsPage';
import DashPage from './pages/v2/DashPage';
import LeaderboardPage from './pages/v2/LeaderboardPage';
import SubsPage from './pages/v2/SubsPage';

// Layout
import AppLayout from './components/layout/AppLayout';

function ProtectedRoute({ children, useLayout = true }: { children: React.ReactNode; useLayout?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (useLayout) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
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

      {/* Home - My Games */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      {/* Legacy redirect from /dashboard */}
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/join" element={<Navigate to="/home" replace />} />

      {/* Legacy Game-Specific Routes (lobby, auction, scoring use old UI) */}
      <Route
        path="/game/:gameId/lobby"
        element={
          <ProtectedRoute>
            <GameLobby />
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
        path="/game/:gameId/scoring"
        element={
          <ProtectedRoute>
            <GameScoring />
          </ProtectedRoute>
        }
      />

      {/* V2 Game Routes - New UI */}
      <Route
        path="/game/:gameId/setup"
        element={
          <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/points"
        element={
          <ProtectedRoute>
            <PointsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/list"
        element={
          <ProtectedRoute>
            <ListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/live"
        element={
          <ProtectedRoute>
            <LivePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/dash"
        element={
          <ProtectedRoute>
            <DashPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameId/subs"
        element={
          <ProtectedRoute>
            <SubsPage />
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
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
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

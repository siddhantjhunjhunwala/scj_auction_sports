import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { auctionApi, cricketersApi, usersApi } from '../services/api';
import type { AuctionState, Cricketer, User } from '../types';
import CricketerCard from '../components/auction/CricketerCard';
import AuctionTimer from '../components/auction/AuctionTimer';
import BiddingPanel from '../components/auction/BiddingPanel';
import PlayerSummary from '../components/auction/PlayerSummary';
import UnpickedPlayersModal from '../components/auction/UnpickedPlayersModal';
import AuctioneerControls from '../components/auction/AuctioneerControls';
import Navbar from '../components/common/Navbar';

export default function Auction() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [cricketers, setCricketers] = useState<Cricketer[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Record<string, Cricketer[]>>({});
  const [myTeam, setMyTeam] = useState<Cricketer[]>([]);
  const [showUnpickedModal, setShowUnpickedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuctioneer = user?.role === 'auctioneer';
  const unpickedCricketers = cricketers.filter((c) => !c.isPicked);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [auctionRes, cricketersRes, playersRes] = await Promise.all([
        auctionApi.getState(),
        cricketersApi.getAll(),
        usersApi.getAll(),
      ]);

      setAuctionState(auctionRes.data);
      setCricketers(cricketersRes.data);
      setPlayers(playersRes.data.filter((p) => p.role === 'player'));

      const teamsData: Record<string, Cricketer[]> = {};
      for (const player of playersRes.data.filter((p) => p.role === 'player')) {
        const teamRes = await usersApi.getTeam(player.id);
        teamsData[player.id] = teamRes.data;
      }
      setTeams(teamsData);

      if (user) {
        const myTeamRes = await usersApi.getTeam(user.id);
        setMyTeam(myTeamRes.data);
      }
    } catch (err) {
      setError('Failed to load auction data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleAuctionUpdate = (state: AuctionState) => {
      setAuctionState(state);
    };

    const handleBidPlaced = (data: { auctionState: AuctionState; bid: { userId: string; amount: number } }) => {
      setAuctionState(data.auctionState);
    };

    const handlePlayerPicked = (data: { cricketer: Cricketer; user: User }) => {
      setCricketers((prev) =>
        prev.map((c) =>
          c.id === data.cricketer.id ? { ...c, ...data.cricketer } : c
        )
      );

      setTeams((prev) => ({
        ...prev,
        [data.user.id]: [...(prev[data.user.id] || []), data.cricketer],
      }));

      setPlayers((prev) =>
        prev.map((p) => (p.id === data.user.id ? { ...p, ...data.user } : p))
      );

      if (user && data.user.id === user.id) {
        setMyTeam((prev) => [...prev, data.cricketer]);
      }
    };

    const handlePlayerSkipped = (data: { cricketer: Cricketer }) => {
      setCricketers((prev) =>
        prev.map((c) =>
          c.id === data.cricketer.id ? { ...c, wasSkipped: true } : c
        )
      );
    };

    socket.on('auction:update', handleAuctionUpdate);
    socket.on('auction:bid', handleBidPlaced);
    socket.on('auction:player_picked', handlePlayerPicked);
    socket.on('auction:player_skipped', handlePlayerSkipped);

    return () => {
      socket.off('auction:update', handleAuctionUpdate);
      socket.off('auction:bid', handleBidPlaced);
      socket.off('auction:player_picked', handlePlayerPicked);
      socket.off('auction:player_skipped', handlePlayerSkipped);
    };
  }, [socket, user]);

  // Action handlers
  const handlePlaceBid = async (amount: number) => {
    try {
      await auctionApi.placeBid(amount);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to place bid';
      alert(errorMessage);
    }
  };

  const handleStartAuction = async (cricketerId: string) => {
    try {
      await auctionApi.startAuction(cricketerId);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to start auction';
      alert(errorMessage);
    }
  };

  const handleAddTime = async (seconds: number) => {
    try {
      await auctionApi.addTime(seconds);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add time';
      alert(errorMessage);
    }
  };

  const handlePause = async () => {
    try {
      await auctionApi.pause();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to pause auction';
      alert(errorMessage);
    }
  };

  const handleResume = async () => {
    try {
      await auctionApi.resume();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resume auction';
      alert(errorMessage);
    }
  };

  const handleSkip = async () => {
    try {
      await auctionApi.skip();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to skip player';
      alert(errorMessage);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Are you sure you want to complete the auction?')) return;
    try {
      await auctionApi.complete();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to complete auction';
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <div className="spinner mb-4" />
          <p className="text-slate-500 font-body">Loading auction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Connection Status Warning */}
        {!isConnected && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-yellow-400 font-medium">Connection Lost</p>
              <p className="text-sm text-yellow-500/70">Reconnecting to auction server...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Player & Bidding */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {auctionState?.auctionStatus === 'in_progress' && (
                  <div className="live-indicator">LIVE AUCTION</div>
                )}
                <h2 className="text-2xl font-display text-white tracking-wide">
                  {auctionState?.currentCricketer ? 'Now Bidding' : 'Auction Room'}
                </h2>
              </div>
              {auctionState?.currentCricketer && (
                <AuctionTimer
                  endTime={auctionState.timerEndTime}
                  isPaused={auctionState.auctionStatus === 'paused'}
                  pausedAt={auctionState.timerPausedAt}
                />
              )}
            </div>

            {/* Current Player Card */}
            {auctionState?.currentCricketer ? (
              <div className="animate-scale-in">
                <CricketerCard cricketer={auctionState.currentCricketer} />
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-display text-white mb-2">
                  Waiting for Next Player
                </h3>
                <p className="text-slate-500">
                  {isAuctioneer
                    ? 'Select a player below to start the auction'
                    : 'The auctioneer will start the next bid soon'}
                </p>
              </div>
            )}

            {/* Bidding Panel */}
            {auctionState?.currentCricketer && user && !isAuctioneer && (
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <BiddingPanel
                  auctionState={auctionState}
                  currentUser={user}
                  currentTeam={myTeam}
                  onBid={handlePlaceBid}
                  disabled={
                    auctionState.auctionStatus !== 'in_progress' ||
                    user.role === 'auctioneer'
                  }
                />
              </div>
            )}

            {/* Auctioneer Controls */}
            {isAuctioneer && auctionState && (
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <AuctioneerControls
                  auctionState={auctionState}
                  unpickedCricketers={unpickedCricketers}
                  onStartAuction={handleStartAuction}
                  onAddTime={handleAddTime}
                  onPause={handlePause}
                  onResume={handleResume}
                  onSkip={handleSkip}
                  onComplete={handleComplete}
                />
              </div>
            )}
          </div>

          {/* Right Column - Players Summary */}
          <div className="space-y-4">
            {user && (
              <PlayerSummary
                players={players}
                teams={teams}
                currentUserId={user.id}
              />
            )}

            {/* View Unpicked Players Button */}
            <button
              onClick={() => setShowUnpickedModal(true)}
              className="w-full p-4 glass-card hover:border-amber-500/30 transition-all flex items-center justify-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Available Players</p>
                <p className="text-sm text-slate-500">{unpickedCricketers.length} players remaining</p>
              </div>
              <svg className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 text-center">
                <p className="text-3xl font-display text-amber-400">{cricketers.filter(c => c.isPicked).length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Players Sold</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-3xl font-display text-cyan-400">{unpickedCricketers.length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Remaining</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Unpicked Players Modal */}
      <UnpickedPlayersModal
        isOpen={showUnpickedModal}
        onClose={() => setShowUnpickedModal(false)}
        cricketers={cricketers}
      />
    </div>
  );
}

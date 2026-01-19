import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gamesApi, gameAuctionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useSound, SoundIndicator } from '../hooks/useSound';
import { useConfetti } from '../hooks/useConfetti';
import LiveBiddingTable from '../components/auction/LiveBiddingTable';
import ConfirmDialog from '../components/auction/ConfirmDialog';
import PlayerWonMessage from '../components/auction/PlayerWonMessage';
import AuctionStatusBanner from '../components/auction/AuctionStatusBanner';
import SearchInput from '../components/ui/SearchInput';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import type { Game, GameCricketer, GameAuctionState, GameParticipant, BidLogEntry } from '../types';

export default function GameAuction() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [auctionState, setAuctionState] = useState<GameAuctionState | null>(null);
  const [unpickedCricketers, setUnpickedCricketers] = useState<GameCricketer[]>([]);
  const [filteredCricketers, setFilteredCricketers] = useState<GameCricketer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const previousBidRef = useRef<number>(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinGameRoom } = useSocket();
  const toast = useToast();
  const { play } = useSound();
  const { fireWinnerConfetti, fireBidConfetti } = useConfetti();

  const isCreator = game?.createdById === user?.id;
  const currentParticipant = participants.find(p => p.userId === user?.id);

  // Filter cricketers
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCricketers(unpickedCricketers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCricketers(
        unpickedCricketers.filter(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.iplTeam.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, unpickedCricketers]);

  // Load initial data
  useEffect(() => {
    if (gameId) {
      loadData();
      joinGameRoom(gameId);
    }
  }, [gameId, joinGameRoom]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('auction:update', (data: GameAuctionState) => {
      setAuctionState(data);
    });

    socket.on('auction:bid', (data: { auctionState: GameAuctionState; bid: BidLogEntry }) => {
      setAuctionState(data.auctionState);
      if (data.auctionState.currentHighBid !== previousBidRef.current) {
        play('bid');
        fireBidConfetti();
        previousBidRef.current = data.auctionState.currentHighBid;
      }
    });

    socket.on('auction:player_picked', (data: { message: string }) => {
      play('win');
      fireWinnerConfetti();
      setWinMessage(data.message);
      setShowWinMessage(true);
      setTimeout(() => setShowWinMessage(false), 4000);
      loadUnpickedCricketers();
      loadParticipants();
    });

    socket.on('auction:player_skipped', () => {
      loadUnpickedCricketers();
      toast.info('Player skipped');
    });

    socket.on('auction:paused', () => {
      toast.warning('Auction paused', 'The auctioneer has paused the auction');
    });

    socket.on('auction:ended', () => {
      toast.success('Auction ended', 'The auction has been completed');
    });

    return () => {
      socket.off('auction:update');
      socket.off('auction:bid');
      socket.off('auction:player_picked');
      socket.off('auction:player_skipped');
      socket.off('auction:paused');
      socket.off('auction:ended');
    };
  }, [socket, play, fireWinnerConfetti, fireBidConfetti, toast]);

  // Timer countdown with sound
  useEffect(() => {
    if (!auctionState?.timerEndTime || auctionState.auctionStatus !== 'in_progress') {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const end = new Date(auctionState.timerEndTime!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));

      // Play countdown sound at 5, 4, 3, 2, 1
      if (remaining <= 5 && remaining > 0 && remaining !== timeRemaining) {
        play('countdown');
      }

      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [auctionState?.timerEndTime, auctionState?.auctionStatus, timeRemaining, play]);

  const loadData = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const [gameRes, auctionRes, crickRes, partRes] = await Promise.all([
        gamesApi.getById(gameId),
        gameAuctionApi.getState(gameId),
        gamesApi.getUnpickedCricketers(gameId),
        gamesApi.getParticipants(gameId),
      ]);
      setGame(gameRes.data);
      setAuctionState(auctionRes.data);
      setUnpickedCricketers(crickRes.data);
      setFilteredCricketers(crickRes.data);
      setParticipants(partRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load auction data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnpickedCricketers = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await gamesApi.getUnpickedCricketers(gameId);
      setUnpickedCricketers(response.data);
      setFilteredCricketers(response.data);
    } catch (err) {
      console.error('Failed to load cricketers:', err);
    }
  }, [gameId]);

  const loadParticipants = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await gamesApi.getParticipants(gameId);
      setParticipants(response.data);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  }, [gameId]);

  const handleStartAuction = async (cricketerId: string) => {
    if (!gameId) return;
    try {
      await gameAuctionApi.start(gameId, cricketerId);
      play('notification');
    } catch (err) {
      console.error('Failed to start auction:', err);
      toast.error('Failed to start auction');
    }
  };

  const handleBid = async () => {
    if (!gameId || !bidAmount) return;
    try {
      await gameAuctionApi.bid(gameId, parseFloat(bidAmount));
      setBidAmount('');
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to place bid';
      toast.error('Bid failed', errorMessage);
    }
  };

  const handleQuickBid = (increment: number) => {
    const currentBid = auctionState?.currentHighBid || 0;
    const newBid = currentBid + increment;
    setBidAmount(newBid.toFixed(2));
  };

  const handlePause = async () => {
    if (!gameId) return;
    try {
      await gameAuctionApi.pause(gameId);
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  };

  const handleResume = async () => {
    if (!gameId) return;
    try {
      await gameAuctionApi.resume(gameId);
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  };

  const handleSkip = async () => {
    if (!gameId) return;
    try {
      await gameAuctionApi.skip(gameId);
    } catch (err) {
      console.error('Failed to skip:', err);
    }
  };

  const handleAddTime = async (seconds: number) => {
    if (!gameId) return;
    try {
      await gameAuctionApi.addTime(gameId, seconds);
      toast.info(`Added ${seconds} seconds`);
    } catch (err) {
      console.error('Failed to add time:', err);
    }
  };

  const handleEndAuction = async () => {
    if (!gameId) return;
    try {
      await gameAuctionApi.end(gameId);
      setShowEndConfirm(false);
      navigate(`/game/${gameId}/lobby`);
    } catch (err) {
      console.error('Failed to end auction:', err);
    }
  };

  const getMinBid = () => {
    if (!auctionState) return 0.5;
    if (auctionState.currentHighBid === 0) return 0.5;
    return auctionState.currentHighBid + (auctionState.currentHighBid < 10 ? 0.5 : 1);
  };

  const getMaxBid = () => {
    if (!currentParticipant) return 0;
    const pickedCount = participants
      .find(p => p.id === currentParticipant.id)
      ?.cricketers?.length || 0;
    const remainingSlots = 11 - pickedCount - 1;
    const minNeeded = remainingSlots * 0.5;
    return currentParticipant.budgetRemaining - minNeeded;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading auction...</p>
        </div>
      </div>
    );
  }

  const timerClass = timeRemaining <= 5 && timeRemaining > 0
    ? 'auction-timer warning countdown-critical countdown-glow'
    : 'auction-timer';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link
                to={`/game/${gameId}/lobby`}
                className="flex items-center gap-1 sm:gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5m7-7-7 7 7 7"/>
                </svg>
                <span className="hidden sm:inline">Exit</span>
              </Link>
              <div className="h-6 w-px bg-[var(--glass-border)] hidden sm:block" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-display text-[var(--text-primary)] truncate">{game?.name}</h1>
                {auctionState?.auctionStatus === 'in_progress' && (
                  <span className="live-indicator text-[10px] sm:text-xs">LIVE</span>
                )}
              </div>
            </div>
            {isCreator && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0"
              >
                <span className="hidden sm:inline">End Auction</span>
                <span className="sm:hidden">End</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Banner */}
        <AuctionStatusBanner
          status={auctionState?.auctionStatus || 'not_started'}
          message={auctionState?.auctionStatus === 'paused' ? 'Auction paused by auctioneer' : undefined}
        />

        {/* Winner Message */}
        <PlayerWonMessage message={winMessage} isVisible={showWinMessage} />

        {/* Last Win Message */}
        {auctionState?.lastWinMessage && !auctionState.currentCricketerId && (
          <div className="glass-card-glow p-4 mb-6 text-center border-[var(--accent-emerald)]">
            <p className="text-lg font-display text-[var(--accent-emerald)]">
              {auctionState.lastWinMessage}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Player & Bidding */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Cricketer Card */}
            {auctionState?.currentCricketer ? (
              <div className="cricketer-card card-holographic p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  {/* Timer on mobile - shown at top */}
                  <div className="text-center sm:hidden order-first w-full">
                    <div className={timerClass}>
                      {timeRemaining}s
                    </div>
                    {auctionState.auctionStatus === 'paused' && (
                      <span className="badge badge-gold mt-2">PAUSED</span>
                    )}
                  </div>

                  {auctionState.currentCricketer.pictureUrl ? (
                    <img
                      src={auctionState.currentCricketer.pictureUrl}
                      alt={`${auctionState.currentCricketer.firstName} ${auctionState.currentCricketer.lastName}`}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-[var(--glass-border)]"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl sm:text-4xl">
                      🏏
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-display text-[var(--text-primary)]">
                      {auctionState.currentCricketer.firstName}{' '}
                      {auctionState.currentCricketer.lastName}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className={`badge badge-${
                        auctionState.currentCricketer.playerType === 'batsman' ? 'gold' :
                        auctionState.currentCricketer.playerType === 'bowler' ? 'cyan' :
                        auctionState.currentCricketer.playerType === 'allrounder' ? 'purple' : 'emerald'
                      }`}>
                        {auctionState.currentCricketer.playerType}
                      </span>
                      <span className="badge">{auctionState.currentCricketer.iplTeam}</span>
                      {auctionState.currentCricketer.isForeign && (
                        <span className="badge badge-gold">🌍 Overseas</span>
                      )}
                    </div>
                  </div>

                  {/* Timer on desktop - shown on right */}
                  <div className="text-center hidden sm:block">
                    <div className={timerClass}>
                      {timeRemaining}s
                    </div>
                    {auctionState.auctionStatus === 'paused' && (
                      <span className="badge badge-gold mt-2">PAUSED</span>
                    )}
                  </div>
                </div>

                {/* Current Bid Info */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">Current Bid</p>
                      <p className="bid-amount-highlight text-3xl sm:text-4xl">
                        ${auctionState.currentHighBid.toFixed(2)}
                      </p>
                    </div>
                    {auctionState.currentHighBidder && (
                      <div className="text-center sm:text-right">
                        <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">Leading Bidder</p>
                        <p className="text-lg sm:text-xl font-display text-[var(--text-primary)]">
                          {auctionState.currentHighBidder.user?.teamName ||
                            auctionState.currentHighBidder.user?.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bid Input */}
                {currentParticipant && auctionState.auctionStatus === 'in_progress' && (
                  <div className="mt-4 sm:mt-6">
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          placeholder={`Min: ${getMinBid().toFixed(2)}`}
                          step="0.5"
                          min={getMinBid()}
                          max={getMaxBid()}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-7 sm:pl-8 text-lg sm:text-xl font-mono text-center
                            bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl
                            text-[var(--text-primary)] focus:border-[var(--accent-gold)]
                            focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none"
                        />
                      </div>
                      <LoadingButton
                        onClick={handleBid}
                        disabled={
                          !bidAmount ||
                          parseFloat(bidAmount) < getMinBid() ||
                          parseFloat(bidAmount) > getMaxBid()
                        }
                        className="px-4 sm:px-8 text-base sm:text-xl"
                      >
                        BID
                      </LoadingButton>
                    </div>

                    {/* Quick Bid Buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[0.5, 1, 2, 5].map(inc => (
                        <button
                          key={inc}
                          onClick={() => handleQuickBid(inc)}
                          className="py-2 text-sm sm:text-base bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
                            rounded-lg hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]
                            border border-[var(--glass-border)] transition-all font-mono"
                        >
                          +${inc}
                        </button>
                      ))}
                    </div>

                    <p className="text-[var(--text-tertiary)] text-xs sm:text-sm mt-3 text-center sm:text-left">
                      Budget: <span className="text-[var(--accent-gold)] font-mono">${currentParticipant.budgetRemaining.toFixed(2)}</span>
                      <span className="mx-1 sm:mx-2">•</span>
                      Max: <span className="text-[var(--accent-gold)] font-mono">${getMaxBid().toFixed(2)}</span>
                    </p>
                  </div>
                )}

                {/* Auctioneer Controls */}
                {isCreator && (
                  <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                    {auctionState.auctionStatus === 'in_progress' ? (
                      <button onClick={handlePause} className="btn-secondary text-sm sm:text-base py-2 sm:py-3">
                        <span className="hidden sm:inline">⏸️ </span>Pause
                      </button>
                    ) : auctionState.auctionStatus === 'paused' ? (
                      <button onClick={handleResume} className="btn-primary text-sm sm:text-base py-2 sm:py-3">
                        <span className="hidden sm:inline">▶️ </span>Resume
                      </button>
                    ) : (
                      <div />
                    )}
                    <button onClick={() => handleAddTime(15)} className="btn-secondary text-sm sm:text-base py-2 sm:py-3">
                      +15s
                    </button>
                    <button onClick={handleSkip} className="btn-ghost text-sm sm:text-base py-2 sm:py-3">
                      <span className="hidden sm:inline">⏭️ </span>Skip
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <div className="text-4xl mb-4">🎤</div>
                <p className="text-[var(--text-secondary)] text-lg">
                  {isCreator
                    ? 'Select a cricketer below to start bidding'
                    : 'Waiting for auctioneer to start...'}
                </p>
              </div>
            )}

            {/* Live Bidding Table */}
            {auctionState?.currentCricketer && (
              <LiveBiddingTable
                biddingLog={auctionState.currentBiddingLog || []}
                currentParticipantId={currentParticipant?.id}
              />
            )}

            {/* Available Cricketers (for auctioneer) */}
            {isCreator && !auctionState?.currentCricketerId && (
              <div className="glass-card p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                  <h3 className="text-base sm:text-lg font-display text-[var(--text-primary)]">
                    Available ({unpickedCricketers.length})
                  </h3>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search..."
                    className="w-full sm:w-64"
                  />
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                  {filteredCricketers.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]
                        border border-[var(--glass-border)] hover:border-[var(--accent-gold)]/30
                        transition-all animate-slide-up"
                      style={{ animationDelay: `${i * 0.02}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-lg">
                          {c.playerType === 'batsman' ? '🏏' :
                           c.playerType === 'bowler' ? '🎳' :
                           c.playerType === 'allrounder' ? '⭐' : '🧤'}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {c.firstName} {c.lastName}
                            {c.isForeign && <span className="ml-2 text-xs text-[var(--accent-gold)]">🌍</span>}
                          </p>
                          <p className="text-sm text-[var(--text-tertiary)]">
                            {c.playerType} • {c.iplTeam}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartAuction(c.id)}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Teams */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-display text-[var(--text-primary)] mb-4">Teams</h3>
              <div className="space-y-3">
                {participants.map(p => {
                  const pickedCount = p.cricketers?.length || 0;
                  const isHighBidder = auctionState?.currentHighBidderId === p.id;
                  const isYou = p.userId === user?.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl transition-all ${
                        isHighBidder
                          ? 'bg-[var(--accent-emerald)]/10 border-2 border-[var(--accent-emerald)] pulse-ring'
                          : isYou
                          ? 'bg-[var(--accent-gold)]/5 border border-[var(--accent-gold)]/30'
                          : 'bg-[var(--bg-tertiary)] border border-[var(--glass-border)]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {p.user?.teamName || p.user?.name}
                            {isYou && <span className="ml-2 text-xs text-[var(--accent-cyan)]">(You)</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {pickedCount}/11 players
                            </span>
                            {isHighBidder && (
                              <span className="badge badge-emerald text-xs">Leading</span>
                            )}
                          </div>
                        </div>
                        <p className="font-mono font-bold text-[var(--accent-gold)]">
                          ${p.budgetRemaining.toFixed(2)}
                        </p>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(pickedCount / 11) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-display text-[var(--text-primary)] mb-4">Auction Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Players Available</span>
                  <span className="font-mono text-[var(--text-primary)]">{unpickedCricketers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Players Picked</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {participants.reduce((sum, p) => sum + (p.cricketers?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Total Budget Spent</span>
                  <span className="font-mono text-[var(--accent-gold)]">
                    ${(participants.reduce((sum, p) => sum + (200 - p.budgetRemaining), 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sound Indicator */}
      <SoundIndicator />

      {/* End Auction Confirmation */}
      <ConfirmDialog
        isOpen={showEndConfirm}
        title="End Auction?"
        message="Are you sure you want to end the auction? This action cannot be undone. Any current bidding will be cancelled."
        confirmText="End Auction"
        confirmVariant="danger"
        onConfirm={handleEndAuction}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}

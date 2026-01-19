import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi, gameAuctionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LiveBiddingTable from '../components/auction/LiveBiddingTable';
import type { Game, GameCricketer, GameAuctionState, GameParticipant, BidLogEntry } from '../types';

export default function GameAuction() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [auctionState, setAuctionState] = useState<GameAuctionState | null>(null);
  const [unpickedCricketers, setUnpickedCricketers] = useState<GameCricketer[]>([]);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinGameRoom } = useSocket();

  const isCreator = game?.createdById === user?.id;
  const currentParticipant = participants.find(p => p.userId === user?.id);

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
    });

    socket.on('auction:player_picked', () => {
      loadUnpickedCricketers();
      loadParticipants();
    });

    socket.on('auction:player_skipped', () => {
      loadUnpickedCricketers();
    });

    socket.on('auction:paused', () => {
      // Could show a toast notification
    });

    socket.on('auction:ended', () => {
      // Could redirect or show completion UI
    });

    return () => {
      socket.off('auction:update');
      socket.off('auction:bid');
      socket.off('auction:player_picked');
      socket.off('auction:player_skipped');
      socket.off('auction:paused');
      socket.off('auction:ended');
    };
  }, [socket]);

  // Timer countdown
  useEffect(() => {
    if (!auctionState?.timerEndTime || auctionState.auctionStatus !== 'in_progress') {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const end = new Date(auctionState.timerEndTime!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [auctionState?.timerEndTime, auctionState?.auctionStatus]);

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
      setParticipants(partRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load auction data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnpickedCricketers = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await gamesApi.getUnpickedCricketers(gameId);
      setUnpickedCricketers(response.data);
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
      setError(null);
      await gameAuctionApi.start(gameId, cricketerId);
    } catch (err) {
      console.error('Failed to start auction:', err);
      setError('Failed to start auction');
    }
  };

  const handleBid = async () => {
    if (!gameId || !bidAmount) return;
    try {
      setError(null);
      await gameAuctionApi.bid(gameId, parseFloat(bidAmount));
      setBidAmount('');
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to place bid';
      setError(errorMessage);
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading auction...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/game/${gameId}/lobby`)}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">{game?.name} - Auction</h1>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              End Auction
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Last Win Message */}
        {auctionState?.lastWinMessage && auctionState.auctionStatus === 'not_started' && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center text-xl font-semibold">
            {auctionState.lastWinMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Player & Bidding */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Cricketer Card */}
            {auctionState?.currentCricketer ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-6">
                  {auctionState.currentCricketer.pictureUrl ? (
                    <img
                      src={auctionState.currentCricketer.pictureUrl}
                      alt={`${auctionState.currentCricketer.firstName} ${auctionState.currentCricketer.lastName}`}
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">
                      {auctionState.currentCricketer.firstName}{' '}
                      {auctionState.currentCricketer.lastName}
                      {auctionState.currentCricketer.isForeign && (
                        <span className="ml-2 text-orange-400 text-sm">OVERSEAS</span>
                      )}
                    </h2>
                    <p className="text-gray-400 capitalize">
                      {auctionState.currentCricketer.playerType} •{' '}
                      {auctionState.currentCricketer.iplTeam}
                    </p>
                  </div>

                  {/* Timer */}
                  <div className="text-center">
                    <div
                      className={`text-5xl font-mono font-bold ${
                        timeRemaining <= 10 ? 'text-red-500' : 'text-green-400'
                      }`}
                    >
                      {timeRemaining}s
                    </div>
                    {auctionState.auctionStatus === 'paused' && (
                      <p className="text-yellow-400 mt-2">PAUSED</p>
                    )}
                  </div>
                </div>

                {/* Current Bid Info */}
                <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm">Current Bid</p>
                      <p className="text-3xl font-bold text-green-400">
                        ${auctionState.currentHighBid.toFixed(2)}
                      </p>
                    </div>
                    {auctionState.currentHighBidder && (
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Leading Bidder</p>
                        <p className="text-xl font-semibold text-white">
                          {auctionState.currentHighBidder.user?.teamName ||
                            auctionState.currentHighBidder.user?.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bid Input (for non-creators or participant creators) */}
                {currentParticipant && auctionState.auctionStatus === 'in_progress' && (
                  <div className="mt-6">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          placeholder={`Min: $${getMinBid().toFixed(2)}`}
                          step="0.5"
                          min={getMinBid()}
                          max={getMaxBid()}
                          className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg text-xl text-center"
                        />
                      </div>
                      <button
                        onClick={handleBid}
                        disabled={
                          !bidAmount ||
                          parseFloat(bidAmount) < getMinBid() ||
                          parseFloat(bidAmount) > getMaxBid()
                        }
                        className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-xl"
                      >
                        BID
                      </button>
                    </div>

                    {/* Quick Bid Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleQuickBid(0.5)}
                        className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        +$0.50
                      </button>
                      <button
                        onClick={() => handleQuickBid(1)}
                        className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        +$1
                      </button>
                      <button
                        onClick={() => handleQuickBid(2)}
                        className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        +$2
                      </button>
                      <button
                        onClick={() => handleQuickBid(5)}
                        className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        +$5
                      </button>
                    </div>

                    <p className="text-gray-400 text-sm mt-2">
                      Your budget: ${currentParticipant.budgetRemaining.toFixed(2)} | Max bid: $
                      {getMaxBid().toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Auctioneer Controls */}
                {isCreator && (
                  <div className="mt-6 flex gap-4">
                    {auctionState.auctionStatus === 'in_progress' ? (
                      <button
                        onClick={handlePause}
                        className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Pause
                      </button>
                    ) : auctionState.auctionStatus === 'paused' ? (
                      <button
                        onClick={handleResume}
                        className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Resume
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleAddTime(15)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      +15 sec
                    </button>
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-lg">
                  {isCreator
                    ? 'Select a cricketer to start the auction'
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

            {/* Unpicked Cricketers (for auctioneer) */}
            {isCreator && !auctionState?.currentCricketer && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Available Cricketers ({unpickedCricketers.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {unpickedCricketers.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {c.firstName} {c.lastName}
                          {c.isForeign && (
                            <span className="ml-2 text-xs text-orange-400">OVERSEAS</span>
                          )}
                        </p>
                        <p className="text-gray-400 text-sm capitalize">
                          {c.playerType} • {c.iplTeam}
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartAuction(c.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Participants */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Teams</h3>
              <div className="space-y-3">
                {participants.map(p => {
                  const pickedCount = p.cricketers?.length || 0;
                  const isHighBidder =
                    auctionState?.currentHighBidderId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg ${
                        isHighBidder
                          ? 'bg-green-900/50 border border-green-500'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">
                            {p.user?.teamName || p.user?.name}
                            {p.userId === user?.id && (
                              <span className="ml-2 text-xs text-blue-400">(You)</span>
                            )}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {pickedCount}/11 players
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">
                            ${p.budgetRemaining.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End Auction Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">End Auction?</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to end the auction? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEndAuction}
                className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                End Auction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { gamesApi, gameAuctionApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { GameCricketer, GameAuctionState, BidLogEntry, PlayerType } from '../../types';

function LivePageContent() {
  const { currentGame, participant, isCreator, refreshGame } = useGame();
  const { socket } = useSocket();
  const toast = useToast();

  const [auctionState, setAuctionState] = useState<GameAuctionState | null>(null);
  const [unpickedCricketers, setUnpickedCricketers] = useState<GameCricketer[]>([]);
  const [myTeam, setMyTeam] = useState<GameCricketer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isBidding, setIsBidding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const bidsContainerRef = useRef<HTMLDivElement>(null);

  // Load auction state and data
  const loadAuctionData = useCallback(async () => {
    if (!currentGame) return;
    try {
      const [stateRes, cricketerRes] = await Promise.all([
        gameAuctionApi.getState(currentGame.id),
        gamesApi.getCricketers(currentGame.id),
      ]);
      setAuctionState(stateRes.data);

      const allCricketers = cricketerRes.data;
      setUnpickedCricketers(allCricketers.filter((c) => !c.isPicked));

      // Get my team
      const myPicks = allCricketers.filter(
        (c) => c.isPicked && c.pickedByParticipantId === participant?.id
      );
      setMyTeam(myPicks);

      // Set initial bid amount
      if (stateRes.data.currentHighBid > 0) {
        setBidAmount(stateRes.data.currentHighBid + 0.5);
      } else {
        setBidAmount(0.5);
      }
    } catch (err) {
      console.error('Failed to load auction data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, participant]);

  useEffect(() => {
    loadAuctionData();
  }, [loadAuctionData]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !currentGame) return;

    const handleAuctionUpdate = (data: GameAuctionState) => {
      setAuctionState(data);
      if (data.currentHighBid > 0) {
        setBidAmount(data.currentHighBid + 0.5);
      }
    };

    // FIX: Extract auctionState from bid event and update state
    const handleBid = (data: { auctionState: GameAuctionState; bid: BidLogEntry }) => {
      // Update auction state from bid event
      if (data.auctionState) {
        setAuctionState(data.auctionState);
        if (data.auctionState.currentHighBid > 0) {
          setBidAmount(data.auctionState.currentHighBid + 0.5);
        }
      }
      // Scroll to latest bid
      setTimeout(() => {
        if (bidsContainerRef.current) {
          bidsContainerRef.current.scrollTop = bidsContainerRef.current.scrollHeight;
        }
      }, 50);
    };

    const handlePlayerPicked = () => {
      loadAuctionData();
      refreshGame();
    };

    socket.on('auction:update', handleAuctionUpdate);
    socket.on('auction:bid', handleBid);
    socket.on('auction:player_picked', handlePlayerPicked);

    return () => {
      socket.off('auction:update', handleAuctionUpdate);
      socket.off('auction:bid', handleBid);
      socket.off('auction:player_picked', handlePlayerPicked);
    };
  }, [socket, currentGame, loadAuctionData, refreshGame]);

  // Timer countdown
  useEffect(() => {
    if (!auctionState?.timerEndTime || auctionState.auctionStatus !== 'in_progress') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(auctionState.timerEndTime!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [auctionState?.timerEndTime, auctionState?.auctionStatus]);

  const handleBid = async () => {
    if (!currentGame || !bidAmount) return;
    try {
      setIsBidding(true);
      await gameAuctionApi.bid(currentGame.id, bidAmount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place bid';
      toast.error(message);
    } finally {
      setIsBidding(false);
    }
  };

  const handleStartCricketer = async (cricketerId: string) => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.start(currentGame.id, cricketerId);
      toast.success('Auction started');
    } catch (err) {
      toast.error('Failed to start auction');
    }
  };

  const handlePause = async () => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.pause(currentGame.id);
    } catch (err) {
      toast.error('Failed to pause');
    }
  };

  const handleResume = async () => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.resume(currentGame.id);
    } catch (err) {
      toast.error('Failed to resume');
    }
  };

  const handleSkip = async () => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.skip(currentGame.id);
      loadAuctionData();
    } catch (err) {
      toast.error('Failed to skip');
    }
  };

  const handleAssign = async () => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.assign(currentGame.id);
      loadAuctionData();
    } catch (err) {
      toast.error('Failed to assign player');
    }
  };

  const handleAddTime = async (seconds: number) => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.addTime(currentGame.id, seconds);
    } catch (err) {
      toast.error('Failed to add time');
    }
  };

  const getTypeLabel = (type: PlayerType): string => {
    switch (type) {
      case 'batsman': return 'BAT';
      case 'bowler': return 'BOWL';
      case 'allrounder': return 'AR';
      case 'wicketkeeper': return 'WK';
      default: return String(type).toUpperCase();
    }
  };

  const getTypeColor = (type: PlayerType): string => {
    switch (type) {
      case 'batsman': return 'text-[var(--accent-gold)]';
      case 'bowler': return 'text-[var(--accent-cyan)]';
      case 'allrounder': return 'text-[var(--accent-purple)]';
      case 'wicketkeeper': return 'text-[var(--accent-emerald)]';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  const openIplProfile = (cricketer: GameCricketer) => {
    const playerSlug = `${cricketer.firstName}-${cricketer.lastName}`.toLowerCase().replace(/\s+/g, '-');
    const iplUrl = `https://www.iplt20.com/players/${playerSlug}`;
    window.open(iplUrl, '_blank');
  };

  // Get high bidder name from auction state
  const getHighBidderName = (): string | null => {
    if (!auctionState?.currentHighBidderId) return null;

    // Try to get from currentHighBidder
    if (auctionState.currentHighBidder?.user) {
      return auctionState.currentHighBidder.user.teamName || auctionState.currentHighBidder.user.name;
    }

    // Fallback: get from the last bid in the log
    const biddingLog = auctionState.currentBiddingLog || [];
    if (biddingLog.length > 0) {
      const lastBid = biddingLog[biddingLog.length - 1];
      return lastBid.teamName;
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  const currentCricketer = auctionState?.currentCricketer;
  const biddingLog = auctionState?.currentBiddingLog || [];
  const isAuctionActive = auctionState?.auctionStatus === 'in_progress';
  const isPaused = auctionState?.auctionStatus === 'paused';
  const canBid = isAuctionActive && !isPaused && participant && bidAmount > (auctionState?.currentHighBid || 0);
  const isHighBidder = auctionState?.currentHighBidderId === participant?.id;
  const highBidderName = getHighBidderName();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Win Message Banner */}
      {auctionState?.lastWinMessage && (
        <div className="mb-2 p-2 bg-[var(--accent-emerald)]/20 border border-[var(--accent-emerald)] rounded-lg text-center flex-shrink-0">
          <span className="text-[var(--accent-emerald)] font-medium text-sm">{auctionState.lastWinMessage}</span>
        </div>
      )}

      {/* 4-Quadrant Layout */}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
        {/* Q1: Current Player */}
        <div className="glass-card p-3 flex flex-col overflow-hidden min-h-0">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2 flex-shrink-0">
            Current Player
          </h3>

          {currentCricketer ? (
            <div
              className="flex-1 flex flex-col cursor-pointer overflow-hidden"
              onClick={() => openIplProfile(currentCricketer)}
            >
              {/* Player Card - Compact */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                  {currentCricketer.pictureUrl ? (
                    <img src={currentCricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '🏏'
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-display text-[var(--text-primary)] truncate">
                    {currentCricketer.firstName} {currentCricketer.lastName}
                  </h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-medium ${getTypeColor(currentCricketer.playerType)}`}>
                      {getTypeLabel(currentCricketer.playerType)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{currentCricketer.iplTeam}</span>
                    {currentCricketer.isForeign && (
                      <span className="text-[10px] px-1 py-0.5 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded">
                        OS
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats - Compact */}
              <div className="grid grid-cols-2 gap-2 text-xs flex-shrink-0">
                {currentCricketer.battingRecord && (
                  <div className="bg-[var(--bg-tertiary)] rounded p-2">
                    <div className="text-[var(--text-tertiary)] text-[10px] mb-0.5">Batting</div>
                    <div className="text-[var(--text-primary)] text-xs">
                      {currentCricketer.battingRecord.runs || 0} @ {currentCricketer.battingRecord.average?.toFixed(1) || '-'}
                    </div>
                  </div>
                )}
                {currentCricketer.bowlingRecord && currentCricketer.bowlingRecord.wickets && (
                  <div className="bg-[var(--bg-tertiary)] rounded p-2">
                    <div className="text-[var(--text-tertiary)] text-[10px] mb-0.5">Bowling</div>
                    <div className="text-[var(--text-primary)] text-xs">
                      {currentCricketer.bowlingRecord.wickets} wkts @ {currentCricketer.bowlingRecord.average?.toFixed(1) || '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
              {isCreator ? (
                <div className="text-center w-full">
                  <p className="mb-2 text-xs">Select a player</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {unpickedCricketers.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleStartCricketer(c.id)}
                        className="w-full p-1.5 text-left text-xs bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <span className="text-[var(--text-primary)]">{c.firstName} {c.lastName}</span>
                        <span className={`ml-1 text-[10px] ${getTypeColor(c.playerType)}`}>{getTypeLabel(c.playerType)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                'Waiting for auctioneer'
              )}
            </div>
          )}
        </div>

        {/* Q2: Bid Controls & Timer */}
        <div className="glass-card p-3 flex flex-col overflow-hidden min-h-0 relative">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2 flex-shrink-0">
            Bidding
          </h3>

          {currentCricketer ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Timer & Current Bid Row */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="text-center">
                  <div className={`text-3xl font-display font-bold ${
                    timeRemaining !== null && timeRemaining <= 5 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-gold)]'
                  }`}>
                    {timeRemaining !== null ? timeRemaining : '--'}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">seconds</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-tertiary)]">Current Bid</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    ${(auctionState?.currentHighBid || 0).toFixed(1)}M
                  </div>
                  {highBidderName && (
                    <div className={`text-[10px] ${isHighBidder ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-secondary)]'}`}>
                      {isHighBidder ? 'You are winning!' : `by ${highBidderName}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Bid Input - Players Only */}
              {!isCreator && (
                <div className="flex-shrink-0">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                    step={0.5}
                    min={(auctionState?.currentHighBid || 0) + 0.5}
                    className="w-full px-2 py-1.5 text-center text-base bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none mb-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="flex gap-1 mb-2">
                    {[0.5, 1, 2, 5].map((increment) => (
                      <button
                        key={increment}
                        onClick={() => setBidAmount((prev) => prev + increment)}
                        className="flex-1 py-1 text-[10px] bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      >
                        +{increment}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleBid}
                    disabled={!canBid || isBidding}
                    className="w-full py-2 text-sm font-bold btn-primary disabled:opacity-50"
                  >
                    {isBidding ? '...' : `Bid $${bidAmount.toFixed(1)}M`}
                  </button>
                  <div className="text-center text-[10px] text-[var(--text-tertiary)] mt-1">
                    Budget: ${(participant?.budgetRemaining || 0).toFixed(1)}M
                  </div>
                </div>
              )}

              {/* Auctioneer Controls */}
              {isCreator && (
                <div className="flex-shrink-0 space-y-2">
                  <div className="flex gap-1.5">
                    {isPaused ? (
                      <button onClick={handleResume} className="flex-1 py-1.5 text-xs btn-primary">
                        Resume
                      </button>
                    ) : (
                      <button onClick={handlePause} className="flex-1 py-1.5 text-xs btn-secondary">
                        Pause
                      </button>
                    )}
                    <button onClick={handleSkip} className="flex-1 py-1.5 text-xs btn-secondary">
                      Skip
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAddTime(10)} className="flex-1 py-1.5 text-[10px] bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded hover:bg-[var(--bg-elevated)]">
                      +10s
                    </button>
                    <button onClick={() => handleAddTime(30)} className="flex-1 py-1.5 text-[10px] bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded hover:bg-[var(--bg-elevated)]">
                      +30s
                    </button>
                  </div>
                  {auctionState?.currentHighBid && auctionState.currentHighBid > 0 && (
                    <button onClick={handleAssign} className="w-full py-2 text-xs btn-primary bg-[var(--accent-emerald)]">
                      Assign to Winner
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
              No active auction
            </div>
          )}

          {/* Paused Banner */}
          {isPaused && (
            <div className="absolute inset-0 bg-[var(--bg-deep)]/80 flex items-center justify-center rounded-xl">
              <div className="text-lg font-display text-[var(--accent-gold)]">
                Paused
              </div>
            </div>
          )}
        </div>

        {/* Q3: All Bids */}
        <div className="glass-card p-3 flex flex-col overflow-hidden min-h-0">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2 flex-shrink-0">
            All Bids ({biddingLog.length})
          </h3>

          <div
            ref={bidsContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar space-y-1 min-h-0"
          >
            {biddingLog.length > 0 ? (
              biddingLog.map((bid: BidLogEntry, index: number) => (
                <div
                  key={`${bid.participantId}-${bid.timestamp}`}
                  className={`p-2 rounded ${
                    bid.participantId === participant?.id
                      ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30'
                      : 'bg-[var(--bg-tertiary)]'
                  } ${index === biddingLog.length - 1 ? 'animate-slide-up' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      bid.participantId === participant?.id ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                    }`}>
                      {bid.teamName}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      ${bid.amount.toFixed(1)}M
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                No bids yet
              </div>
            )}
          </div>
        </div>

        {/* Q4: My Team */}
        <div className="glass-card p-3 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {isCreator ? 'Teams' : 'My Team'}
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              {myTeam.length} players
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {myTeam.length > 0 ? (
              <div className="space-y-1">
                {myTeam.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => openIplProfile(player)}
                    className="flex items-center gap-2 p-1.5 bg-[var(--bg-tertiary)] rounded cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {player.pictureUrl ? (
                        <img src={player.pictureUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '🏏'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {player.firstName} {player.lastName}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[var(--accent-gold)]">
                      ${player.pricePaid?.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                No players yet
              </div>
            )}
          </div>

          {/* Team Stats - Compact */}
          {!isCreator && myTeam.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--glass-border)] flex-shrink-0">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-[var(--text-tertiary)]">Spent: </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    ${myTeam.reduce((sum, p) => sum + (p.pricePaid || 0), 0).toFixed(1)}M
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Left: </span>
                  <span className="font-bold text-[var(--accent-emerald)]">
                    ${(participant?.budgetRemaining || 0).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <GamePageWrapper>
      <LivePageContent />
    </GamePageWrapper>
  );
}

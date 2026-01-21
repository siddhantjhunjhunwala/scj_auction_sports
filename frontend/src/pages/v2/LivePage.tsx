import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { gamesApi, gameAuctionApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { GameCricketer, GameAuctionState, BidLogEntry, PlayerType, GameParticipant } from '../../types';

const TOTAL_BUDGET = 200;

function LivePageContent() {
  const { currentGame, participant, isCreator, refreshGame } = useGame();
  const { socket } = useSocket();
  const toast = useToast();

  const [auctionState, setAuctionState] = useState<GameAuctionState | null>(null);
  const [unpickedCricketers, setUnpickedCricketers] = useState<GameCricketer[]>([]);
  const [myTeam, setMyTeam] = useState<GameCricketer[]>([]);
  const [allPickedCricketers, setAllPickedCricketers] = useState<GameCricketer[]>([]);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isBidding, setIsBidding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const bidsContainerRef = useRef<HTMLDivElement>(null);

  // Load auction state and data
  const loadAuctionData = useCallback(async () => {
    if (!currentGame) return;
    try {
      const [stateRes, cricketerRes, gameRes] = await Promise.all([
        gameAuctionApi.getState(currentGame.id),
        gamesApi.getCricketers(currentGame.id),
        gamesApi.getById(currentGame.id),
      ]);
      setAuctionState(stateRes.data);

      const allCricketers = cricketerRes.data;
      setUnpickedCricketers(allCricketers.filter((c) => !c.isPicked));

      const pickedCricketers = allCricketers
        .filter((c) => c.isPicked)
        .sort((a, b) => (b.pickOrder || 0) - (a.pickOrder || 0));
      setAllPickedCricketers(pickedCricketers);

      setParticipants(gameRes.data.participants || []);

      const myPicks = allCricketers.filter(
        (c) => c.isPicked && c.pickedByParticipantId === participant?.id
      );
      setMyTeam(myPicks);

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

    const handleBid = (data: { auctionState: GameAuctionState; bid: BidLogEntry }) => {
      if (data.auctionState) {
        setAuctionState(data.auctionState);
        if (data.auctionState.currentHighBid > 0) {
          setBidAmount(data.auctionState.currentHighBid + 0.5);
        }
      }
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

  const handleSellNow = async () => {
    if (!currentGame || !isCreator) return;
    try {
      await gameAuctionApi.assign(currentGame.id);
      loadAuctionData();
    } catch (err) {
      toast.error('Failed to sell');
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

  const getParticipantName = (participantId: string | null): string => {
    if (!participantId) return 'Unknown';
    const p = participants.find(p => p.id === participantId);
    return p?.user?.teamName || p?.user?.name || 'Unknown';
  };

  const getHighBidderName = (): string | null => {
    if (!auctionState?.currentHighBidderId) return null;
    if (auctionState.currentHighBidder?.user) {
      return auctionState.currentHighBidder.user.teamName || auctionState.currentHighBidder.user.name;
    }
    const biddingLog = auctionState.currentBiddingLog || [];
    if (biddingLog.length > 0) {
      return biddingLog[biddingLog.length - 1].teamName;
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
  const totalSpent = myTeam.reduce((sum, p) => sum + (p.pricePaid || 0), 0);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Win Banner - Compact */}
      {auctionState?.lastWinMessage && (
        <div className="mb-1.5 px-3 py-1.5 bg-[var(--accent-emerald)]/20 border border-[var(--accent-emerald)] rounded text-center">
          <span className="text-[var(--accent-emerald)] font-medium text-xs">{auctionState.lastWinMessage}</span>
        </div>
      )}

      {/* 4-Quadrant Grid */}
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1 min-h-0">

        {/* Q1: Current Player - Ultra Compact */}
        <div className="glass-card p-2 flex flex-col overflow-hidden">
          <h3 className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Player</h3>
          {currentCricketer ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                  {currentCricketer.pictureUrl ? (
                    <img src={currentCricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                  ) : '🏏'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {currentCricketer.firstName} {currentCricketer.lastName}
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className={getTypeColor(currentCricketer.playerType)}>{getTypeLabel(currentCricketer.playerType)}</span>
                    <span className="text-[var(--text-tertiary)]">• {currentCricketer.iplTeam}</span>
                    {currentCricketer.isForeign && <span className="text-[var(--accent-purple)]">OS</span>}
                  </div>
                </div>
              </div>
              {/* Compact Stats */}
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {currentCricketer.battingRecord && (
                  <div className="bg-[var(--bg-tertiary)] rounded px-1.5 py-1">
                    <span className="text-[var(--text-tertiary)]">Bat:</span>{' '}
                    <span className="text-[var(--text-primary)]">{currentCricketer.battingRecord.runs || 0}r</span>
                  </div>
                )}
                {currentCricketer.bowlingRecord?.wickets && (
                  <div className="bg-[var(--bg-tertiary)] rounded px-1.5 py-1">
                    <span className="text-[var(--text-tertiary)]">Bowl:</span>{' '}
                    <span className="text-[var(--text-primary)]">{currentCricketer.bowlingRecord.wickets}w</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {isCreator ? (
                <div className="w-full">
                  <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Select player:</div>
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {unpickedCricketers.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleStartCricketer(c.id)}
                        className="w-full p-1 text-left text-[10px] bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-elevated)]"
                      >
                        {c.firstName} {c.lastName} <span className={getTypeColor(c.playerType)}>{getTypeLabel(c.playerType)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-tertiary)]">Waiting...</span>
              )}
            </div>
          )}
        </div>

        {/* Q2: Bidding - Ultra Compact */}
        <div className="glass-card p-2 flex flex-col overflow-hidden relative">
          <h3 className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Bidding</h3>
          {currentCricketer ? (
            <div className="flex-1 flex flex-col">
              {/* Timer + Bid Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${timeRemaining !== null && timeRemaining <= 5 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-gold)]'}`}>
                    {timeRemaining ?? '--'}
                  </div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">sec</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[var(--text-primary)]">${(auctionState?.currentHighBid || 0).toFixed(1)}M</div>
                  {highBidderName && (
                    <div className={`text-[10px] ${isHighBidder ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-secondary)]'}`}>
                      {isHighBidder ? 'You!' : highBidderName}
                    </div>
                  )}
                </div>
              </div>

              {/* Player Bid Controls */}
              {!isCreator && (
                <div className="space-y-1">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                    step={0.5}
                    className="w-full px-2 py-1 text-center text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="flex gap-0.5">
                    {[0.5, 1, 2, 5].map((inc) => (
                      <button key={inc} onClick={() => setBidAmount(p => p + inc)} className="flex-1 py-0.5 text-[9px] bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-elevated)]">+{inc}</button>
                    ))}
                  </div>
                  <button onClick={handleBid} disabled={!canBid || isBidding} className="w-full py-1.5 text-xs font-bold btn-primary disabled:opacity-50">
                    {isBidding ? '...' : `Bid $${bidAmount.toFixed(1)}M`}
                  </button>
                  <div className="text-center text-[9px] text-[var(--text-tertiary)]">Budget: ${(TOTAL_BUDGET - totalSpent).toFixed(1)}M</div>
                </div>
              )}

              {/* Auctioneer Controls - Compact */}
              {isCreator && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {isPaused ? (
                      <button onClick={handleResume} className="flex-1 py-1 text-[10px] btn-primary">Resume</button>
                    ) : (
                      <button onClick={handlePause} className="flex-1 py-1 text-[10px] btn-secondary">Pause</button>
                    )}
                    <button onClick={handleSkip} className="flex-1 py-1 text-[10px] btn-secondary">Skip</button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleAddTime(10)} className="flex-1 py-1 text-[9px] bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-elevated)]">+10s</button>
                    <button onClick={() => handleAddTime(30)} className="flex-1 py-1 text-[9px] bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-elevated)]">+30s</button>
                  </div>
                  {/* SELL NOW - Always visible when auction is active */}
                  <button
                    onClick={handleSellNow}
                    className="w-full py-1.5 text-xs font-bold btn-primary bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/80"
                  >
                    {auctionState?.currentHighBid && auctionState.currentHighBid > 0
                      ? `SELL NOW → ${highBidderName || 'Winner'}`
                      : 'SKIP (No Bids)'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-tertiary)]">No auction</div>
          )}
          {isPaused && (
            <div className="absolute inset-0 bg-[var(--bg-deep)]/80 flex items-center justify-center rounded">
              <span className="text-sm font-bold text-[var(--accent-gold)]">PAUSED</span>
            </div>
          )}
        </div>

        {/* Q3: Bids - Ultra Compact */}
        <div className="glass-card p-2 flex flex-col overflow-hidden">
          <h3 className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Bids ({biddingLog.length})</h3>
          <div ref={bidsContainerRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 min-h-0">
            {biddingLog.length > 0 ? biddingLog.map((bid: BidLogEntry, i: number) => (
              <div key={`${bid.participantId}-${bid.timestamp}`} className={`flex items-center justify-between px-1.5 py-1 rounded text-[10px] ${bid.participantId === participant?.id ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'} ${i === biddingLog.length - 1 ? 'animate-slide-up' : ''}`}>
                <span className="truncate">{bid.teamName}</span>
                <span className="font-bold">${bid.amount.toFixed(1)}M</span>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-tertiary)]">No bids</div>
            )}
          </div>
        </div>

        {/* Q4: Picks/Team - Ultra Compact */}
        <div className="glass-card p-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {isCreator ? 'Picks' : 'Team'}
            </h3>
            <span className="text-[10px] text-[var(--text-secondary)]">{isCreator ? allPickedCricketers.length : myTeam.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 min-h-0">
            {isCreator ? (
              allPickedCricketers.length > 0 ? allPickedCricketers.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-1.5 py-1 bg-[var(--bg-tertiary)] rounded text-[10px]">
                  <div className="truncate flex-1">
                    <span className="text-[var(--text-primary)]">{p.firstName} {p.lastName}</span>
                    <span className="text-[var(--accent-cyan)] ml-1">→ {getParticipantName(p.pickedByParticipantId)}</span>
                  </div>
                  <span className="font-bold text-[var(--accent-gold)]">${p.pricePaid?.toFixed(1)}</span>
                </div>
              )) : <div className="flex items-center justify-center h-full text-xs text-[var(--text-tertiary)]">No picks</div>
            ) : (
              myTeam.length > 0 ? myTeam.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-1.5 py-1 bg-[var(--bg-tertiary)] rounded text-[10px]">
                  <span className="truncate text-[var(--text-primary)]">{p.firstName} {p.lastName}</span>
                  <span className="font-bold text-[var(--accent-gold)]">${p.pricePaid?.toFixed(1)}</span>
                </div>
              )) : <div className="flex items-center justify-center h-full text-xs text-[var(--text-tertiary)]">No players</div>
            )}
          </div>
          {/* Budget Stats for Players */}
          {!isCreator && myTeam.length > 0 && (
            <div className="flex justify-between text-[10px] pt-1 border-t border-[var(--glass-border)] mt-1">
              <span className="text-[var(--text-tertiary)]">Spent: <b className="text-[var(--text-primary)]">${totalSpent.toFixed(1)}M</b></span>
              <span className="text-[var(--text-tertiary)]">Left: <b className="text-[var(--accent-emerald)]">${(TOTAL_BUDGET - totalSpent).toFixed(1)}M</b></span>
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

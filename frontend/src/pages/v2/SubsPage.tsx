import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
// Auth context available if needed
// import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { gamesApi, gameScoringApi, subsApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import { getTypeSymbol, getTypeColor, FOREIGN_SYMBOL } from '../../utils/playerSymbols';
import type { GameCricketer, GameParticipant, GameLeaderboard } from '../../types';

interface SnakeOrderEntry {
  position: number;
  participant: GameParticipant;
  hasPicked: boolean;
}

function SubsPageContent() {
  const { currentGame, participant, isCreator, refreshGame } = useGame();
  const toast = useToast();

  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subRound, setSubRound] = useState<1 | 2>(1);
  const [selectedSubOut, setSelectedSubOut] = useState<string | null>(null);
  const [selectedSubIn, setSelectedSubIn] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!currentGame) return;
      try {
        setIsLoading(true);
        const [cricketersRes, leaderboardRes] = await Promise.all([
          gamesApi.getCricketers(currentGame.id),
          gameScoringApi.getLeaderboard(currentGame.id),
        ]);
        setCricketers(cricketersRes.data);
        setLeaderboard(leaderboardRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentGame]);

  // My team
  const myTeam = useMemo(() => {
    return cricketers.filter((c) => c.pickedByParticipantId === participant?.id);
  }, [cricketers, participant]);

  // Unpicked cricketers
  const unpickedCricketers = useMemo(() => {
    return cricketers.filter((c) => !c.isPicked);
  }, [cricketers]);

  // Snake order (based on reverse leaderboard for round 1, reverse for round 2)
  const snakeOrder = useMemo((): SnakeOrderEntry[] => {
    if (!leaderboard?.leaderboard || !currentGame?.participants) return [];

    const sortedByPoints = [...leaderboard.leaderboard].sort((a, b) => a.totalPoints - b.totalPoints);

    // Round 1: Worst to best (ascending points)
    // Round 2: Best to worst (descending points)
    const ordered = subRound === 1 ? sortedByPoints : [...sortedByPoints].reverse();

    return ordered.map((entry, index) => ({
      position: index + 1,
      participant: currentGame.participants!.find((p) => p.id === entry.participant.id)!,
      hasPicked: false, // TODO: Track this from backend
    }));
  }, [leaderboard, currentGame?.participants, subRound]);

  // Current picker
  const currentPickerIndex = snakeOrder.findIndex((e) => !e.hasPicked);
  const isMyTurn = snakeOrder[currentPickerIndex]?.participant.id === participant?.id;

  const openIplProfile = (cricketer: GameCricketer) => {
    // Use the players URL format: /players/{firstname}-{lastname}
    const playerSlug = `${cricketer.firstName}-${cricketer.lastName}`.toLowerCase().replace(/\s+/g, '-');
    const iplUrl = `https://www.iplt20.com/players/${playerSlug}`;
    window.open(iplUrl, '_blank');
  };

  const handleSubmitSub = async () => {
    if (!selectedSubOut || !selectedSubIn || !currentGame) return;

    try {
      setIsSubmitting(true);
      await subsApi.create({
        subOutId: selectedSubOut,
        subInId: selectedSubIn,
        round: subRound,
      });
      toast.success('Substitution completed');
      setSelectedSubOut(null);
      setSelectedSubIn(null);
      await refreshGame();
      // Reload data
      const cricketersRes = await gamesApi.getCricketers(currentGame.id);
      setCricketers(cricketersRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to make substitution';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipTurn = async () => {
    if (!currentGame) return;
    try {
      setIsSubmitting(true);
      await subsApi.skip(subRound);
      toast.info('Turn skipped');
      await refreshGame();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to skip turn';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display text-[var(--text-primary)]">Substitutions</h2>
          <p className="text-[var(--text-tertiary)] mt-1">
            Snake order substitution system
          </p>
        </div>

        {/* Round Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSubRound(1)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              subRound === 1
                ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
            }`}
          >
            Round 1
          </button>
          <button
            onClick={() => setSubRound(2)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              subRound === 2
                ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
            }`}
          >
            Round 2
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Snake Order */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
            Pick Order (Round {subRound})
          </h3>
          <div className="space-y-2">
            {snakeOrder.map((entry, index) => {
              const isMe = entry.participant.id === participant?.id;
              const isCurrent = index === currentPickerIndex;

              return (
                <div
                  key={entry.participant.id}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)]/50'
                      : entry.hasPicked
                      ? 'bg-[var(--bg-tertiary)] opacity-50'
                      : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span className="w-6 text-center text-sm font-bold text-[var(--text-tertiary)]">
                    {entry.position}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-sm">
                    {entry.participant.user?.avatarUrl || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate ${
                      isMe ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                    }`}>
                      {entry.participant.user?.teamName || entry.participant.user?.name}
                      {isMe && ' (You)'}
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-1 text-xs bg-[var(--accent-gold)] text-[var(--bg-deep)] rounded font-medium">
                      Now
                    </span>
                  )}
                  {entry.hasPicked && (
                    <span className="text-xs text-[var(--accent-emerald)]">Done</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* My Substitution Panel */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
            {isMyTurn ? 'Make Your Substitution' : 'Your Team'}
          </h3>

          {isMyTurn && (
            <div className="mb-4 p-3 bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 rounded-lg">
              <p className="text-sm text-[var(--accent-gold)]">
                It's your turn to make a substitution!
              </p>
            </div>
          )}

          {/* Sub Out Selection */}
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Select Player to Drop
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {myTeam.map((cricketer) => (
                <button
                  key={cricketer.id}
                  onClick={() => setSelectedSubOut(cricketer.id === selectedSubOut ? null : cricketer.id)}
                  disabled={!isMyTurn}
                  className={`w-full p-2 text-left rounded-lg transition-colors flex items-center gap-2 ${
                    selectedSubOut === cricketer.id
                      ? 'bg-[var(--accent-red)]/20 border border-[var(--accent-red)]'
                      : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                  } ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-sm overflow-hidden">
                    {cricketer.pictureUrl ? (
                      <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '🏏'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {cricketer.firstName} {cricketer.lastName}
                      {cricketer.isForeign && <span className="ml-1">{FOREIGN_SYMBOL}</span>}
                    </div>
                    <div className={`text-sm ${getTypeColor(cricketer.playerType)}`}>
                      {getTypeSymbol(cricketer.playerType)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {isMyTurn && (
            <div className="space-y-2 mt-4">
              <button
                onClick={handleSubmitSub}
                disabled={!selectedSubOut || !selectedSubIn || isSubmitting}
                className="w-full py-3 btn-primary disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Substitution'}
              </button>
              <button
                onClick={handleSkipTurn}
                disabled={isSubmitting}
                className="w-full py-2 text-sm btn-secondary"
              >
                Skip Turn
              </button>
            </div>
          )}

          {/* Auctioneer Controls */}
          {isCreator && (
            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
              <h4 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Auctioneer Controls
              </h4>
              <div className="space-y-2">
                <button className="w-full py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg hover:bg-[var(--bg-elevated)]">
                  Start Sub Period
                </button>
                <button className="w-full py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg hover:bg-[var(--bg-elevated)]">
                  End Sub Period
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unpicked Players */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
            Available Players ({unpickedCricketers.length})
          </h3>

          {/* Sub In Selection */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {unpickedCricketers.map((cricketer) => (
              <button
                key={cricketer.id}
                onClick={() => {
                  if (isMyTurn) {
                    setSelectedSubIn(cricketer.id === selectedSubIn ? null : cricketer.id);
                  } else {
                    openIplProfile(cricketer);
                  }
                }}
                className={`w-full p-2 text-left rounded-lg transition-colors flex items-center gap-2 ${
                  selectedSubIn === cricketer.id
                    ? 'bg-[var(--accent-emerald)]/20 border border-[var(--accent-emerald)]'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                  {cricketer.pictureUrl ? (
                    <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '🏏'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {cricketer.firstName} {cricketer.lastName}
                    {cricketer.isForeign && <span className="ml-1">{FOREIGN_SYMBOL}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getTypeColor(cricketer.playerType)}`}>
                      {getTypeSymbol(cricketer.playerType)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{cricketer.iplTeam}</span>
                  </div>
                </div>
                {isMyTurn && selectedSubIn === cricketer.id && (
                  <span className="text-xs text-[var(--accent-emerald)]">Selected</span>
                )}
              </button>
            ))}
          </div>

          {unpickedCricketers.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No unpicked players available
            </div>
          )}
        </div>
      </div>

      {/* Selected Summary */}
      {(selectedSubOut || selectedSubIn) && isMyTurn && (
        <div className="mt-6 glass-card p-4">
          <h4 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Substitution Preview
          </h4>
          <div className="flex items-center justify-center gap-8">
            {/* Sub Out */}
            <div className={`text-center ${selectedSubOut ? '' : 'opacity-50'}`}>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">Dropping</div>
              {selectedSubOut ? (
                <>
                  <div className="w-16 h-16 mx-auto rounded-lg bg-[var(--accent-red)]/20 flex items-center justify-center text-2xl overflow-hidden">
                    {myTeam.find((c) => c.id === selectedSubOut)?.pictureUrl ? (
                      <img src={myTeam.find((c) => c.id === selectedSubOut)?.pictureUrl || undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '🏏'
                    )}
                  </div>
                  <div className="text-sm font-medium text-[var(--text-primary)] mt-2">
                    {myTeam.find((c) => c.id === selectedSubOut)?.firstName}{' '}
                    {myTeam.find((c) => c.id === selectedSubOut)?.lastName}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl">
                    ?
                  </div>
                  <div className="text-sm text-[var(--text-tertiary)] mt-2">Select player</div>
                </>
              )}
            </div>

            {/* Arrow */}
            <div className="text-3xl text-[var(--text-tertiary)]">→</div>

            {/* Sub In */}
            <div className={`text-center ${selectedSubIn ? '' : 'opacity-50'}`}>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">Adding</div>
              {selectedSubIn ? (
                <>
                  <div className="w-16 h-16 mx-auto rounded-lg bg-[var(--accent-emerald)]/20 flex items-center justify-center text-2xl overflow-hidden">
                    {unpickedCricketers.find((c) => c.id === selectedSubIn)?.pictureUrl ? (
                      <img src={unpickedCricketers.find((c) => c.id === selectedSubIn)?.pictureUrl || undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '🏏'
                    )}
                  </div>
                  <div className="text-sm font-medium text-[var(--text-primary)] mt-2">
                    {unpickedCricketers.find((c) => c.id === selectedSubIn)?.firstName}{' '}
                    {unpickedCricketers.find((c) => c.id === selectedSubIn)?.lastName}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl">
                    ?
                  </div>
                  <div className="text-sm text-[var(--text-tertiary)] mt-2">Select player</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubsPage() {
  return (
    <GamePageWrapper>
      <SubsPageContent />
    </GamePageWrapper>
  );
}

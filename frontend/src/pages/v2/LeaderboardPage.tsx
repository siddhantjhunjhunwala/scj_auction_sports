import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { gameScoringApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { GameLeaderboard, GameMatch } from '../../types';

function LeaderboardPageContent() {
  const { currentGame, participant } = useGame();
  const [leaderboard, setLeaderboard] = useState<GameLeaderboard | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentGame) return;
      try {
        setIsLoading(true);
        const [leaderboardRes, matchesRes] = await Promise.all([
          gameScoringApi.getLeaderboard(currentGame.id, selectedMatch || undefined),
          gameScoringApi.getMatches(currentGame.id),
        ]);

        setLeaderboard(leaderboardRes.data);
        setMatches(matchesRes.data);

        // Set default selected match to latest
        if (!selectedMatch && matchesRes.data.length > 0) {
          const populatedMatches = matchesRes.data.filter((m) => m.scoresPopulated);
          if (populatedMatches.length > 0) {
            setSelectedMatch(Math.max(...populatedMatches.map((m) => m.matchNumber)));
          }
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentGame, selectedMatch]);

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'text-[var(--accent-gold)]';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  const entries = leaderboard?.leaderboard || [];
  const maxPoints = entries.length > 0 ? Math.max(...entries.map((e) => e.totalPoints)) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Match Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display text-[var(--text-primary)]">Leaderboard</h2>
          <p className="text-[var(--text-tertiary)] mt-1">
            {entries.length} teams competing
          </p>
        </div>

        {/* Match Selector */}
        {matches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)]">As of Match:</span>
            <select
              value={selectedMatch || ''}
              onChange={(e) => setSelectedMatch(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
            >
              {matches.filter((m) => m.scoresPopulated).map((match) => (
                <option key={match.id} value={match.matchNumber}>
                  Match {match.matchNumber}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="glass-card p-5 text-center order-1">
            <div className="text-4xl mb-2">🥈</div>
            <div className="w-16 h-16 mx-auto rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl mb-3">
              {entries[1]?.participant.user.avatarUrl || '👤'}
            </div>
            <div className="font-medium text-[var(--text-primary)] truncate">
              {entries[1]?.participant.user.teamName || entries[1]?.participant.user.name}
            </div>
            <div className="text-2xl font-bold text-gray-400 mt-1">
              {entries[1]?.totalPoints || 0}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">points</div>
          </div>

          {/* 1st Place */}
          <div className="glass-card p-5 text-center order-0 md:order-1 border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
            <div className="text-5xl mb-2">🥇</div>
            <div className="w-20 h-20 mx-auto rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl mb-3 ring-2 ring-[var(--accent-gold)]/50">
              {entries[0]?.participant.user.avatarUrl || '👤'}
            </div>
            <div className="font-medium text-[var(--text-primary)] truncate">
              {entries[0]?.participant.user.teamName || entries[0]?.participant.user.name}
            </div>
            <div className="text-3xl font-bold text-[var(--accent-gold)] mt-1">
              {entries[0]?.totalPoints || 0}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">points</div>
          </div>

          {/* 3rd Place */}
          <div className="glass-card p-5 text-center order-2">
            <div className="text-4xl mb-2">🥉</div>
            <div className="w-16 h-16 mx-auto rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl mb-3">
              {entries[2]?.participant.user.avatarUrl || '👤'}
            </div>
            <div className="font-medium text-[var(--text-primary)] truncate">
              {entries[2]?.participant.user.teamName || entries[2]?.participant.user.name}
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {entries[2]?.totalPoints || 0}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">points</div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="glass-card p-6">
        <div className="space-y-3">
          {entries.map((entry) => {
            const isMe = entry.participant.id === participant?.id;
            const progressWidth = maxPoints > 0 ? (entry.totalPoints / maxPoints) * 100 : 0;

            return (
              <div
                key={entry.participant.id}
                className={`relative p-4 rounded-xl transition-colors ${
                  isMe
                    ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-0 rounded-xl bg-[var(--accent-gold)]/5 transition-all"
                  style={{ width: `${progressWidth}%` }}
                />

                <div className="relative flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-8 text-center font-bold text-lg ${getRankColor(entry.rank)}`}>
                    {getRankIcon(entry.rank) || `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-xl">
                    {entry.participant.user.avatarUrl || '👤'}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {entry.participant.user.teamName || entry.participant.user.name}
                      {isMe && (
                        <span className="ml-2 text-xs text-[var(--accent-gold)]">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {entry.teamSize} players
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isMe ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                      {entry.totalPoints}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">points</div>
                  </div>
                </div>

                {/* Points by Match (expandable) */}
                {entry.pointsByMatch && entry.pointsByMatch.length > 0 && (
                  <div className="relative mt-3 pt-3 border-t border-[var(--glass-border)]/30">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                      {entry.pointsByMatch.map((mp) => (
                        <div
                          key={mp.matchNumber}
                          className={`flex-shrink-0 px-3 py-1 rounded text-xs ${
                            mp.matchNumber === selectedMatch
                              ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                          }`}
                        >
                          M{mp.matchNumber}: {mp.points}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            {matches.filter((m) => m.scoresPopulated).length === 0
              ? 'No match scores have been entered yet. Check back after the first match!'
              : 'No leaderboard data available'}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="glass-card p-4 text-center">
            <div className="text-sm text-[var(--text-tertiary)]">Total Points</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {entries.reduce((sum, e) => sum + e.totalPoints, 0)}
            </div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-sm text-[var(--text-tertiary)]">Avg Points</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {(entries.reduce((sum, e) => sum + e.totalPoints, 0) / entries.length).toFixed(0)}
            </div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-sm text-[var(--text-tertiary)]">Matches Scored</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {leaderboard?.upToMatch || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <GamePageWrapper>
      <LeaderboardPageContent />
    </GamePageWrapper>
  );
}

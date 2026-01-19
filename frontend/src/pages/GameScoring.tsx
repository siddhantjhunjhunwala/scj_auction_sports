import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gamesApi, gameScoringApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Game, GameMatch, GameCricketer } from '../types';
import Skeleton from '../components/ui/Skeleton';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import { NoPlayersEmpty, NoMatchesEmpty } from '../components/ui/EmptyState';

interface ScoreInput {
  cricketerId: string;
  inPlayingXi: boolean;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
  dotBalls: number;
  catches: number;
  stumpings: number;
  directRunouts: number;
  indirectRunouts: number;
  dismissalType: string;
  lbwBowledDismissals: number;
}

export default function GameScoring() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [cricketers, setCricketers] = useState<GameCricketer[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [scores, setScores] = useState<Map<string, ScoreInput>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchNumber: 1,
    team1: '',
    team2: '',
    matchDate: new Date().toISOString().split('T')[0],
  });
  const toast = useToast();

  useEffect(() => {
    if (gameId) {
      loadData();
    }
  }, [gameId]);

  useEffect(() => {
    if (selectedMatchId) {
      loadMatchScores();
    }
  }, [selectedMatchId]);

  const loadData = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const [gameRes, matchesRes, cricketersRes] = await Promise.all([
        gamesApi.getById(gameId),
        gameScoringApi.getMatches(gameId),
        gamesApi.getCricketers(gameId),
      ]);
      setGame(gameRes.data);
      setMatches(matchesRes.data);
      setCricketers(cricketersRes.data.filter(c => c.isPicked));

      if (matchesRes.data.length > 0) {
        setSelectedMatchId(matchesRes.data[matchesRes.data.length - 1].id);
      }

      setNewMatch(prev => ({
        ...prev,
        matchNumber: matchesRes.data.length + 1,
      }));
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load scoring data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatchScores = async () => {
    if (!gameId || !selectedMatchId) return;

    try {
      const response = await gameScoringApi.getMatchScores(gameId, selectedMatchId);
      const scoreMap = new Map<string, ScoreInput>();

      cricketers.forEach(c => {
        const existing = response.data.find(s => s.cricketerId === c.id);
        scoreMap.set(c.id, {
          cricketerId: c.id,
          inPlayingXi: existing?.inPlayingXi ?? true,
          runs: existing?.runs ?? 0,
          ballsFaced: existing?.ballsFaced ?? 0,
          fours: existing?.fours ?? 0,
          sixes: existing?.sixes ?? 0,
          wickets: existing?.wickets ?? 0,
          oversBowled: existing?.oversBowled ?? 0,
          runsConceded: existing?.runsConceded ?? 0,
          maidens: existing?.maidens ?? 0,
          dotBalls: existing?.dotBalls ?? 0,
          catches: existing?.catches ?? 0,
          stumpings: existing?.stumpings ?? 0,
          directRunouts: existing?.directRunouts ?? 0,
          indirectRunouts: existing?.indirectRunouts ?? 0,
          dismissalType: existing?.dismissalType ?? '',
          lbwBowledDismissals: existing?.lbwBowledDismissals ?? 0,
        });
      });

      setScores(scoreMap);
    } catch (err) {
      console.error('Failed to load scores:', err);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId) return;

    try {
      setIsCreatingMatch(true);
      const response = await gameScoringApi.createMatch(gameId, newMatch);
      setMatches([...matches, response.data]);
      setSelectedMatchId(response.data.id);
      setShowCreateMatch(false);
      setNewMatch({
        matchNumber: matches.length + 2,
        team1: '',
        team2: '',
        matchDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Match created', `${newMatch.team1} vs ${newMatch.team2}`);
    } catch (err) {
      console.error('Failed to create match:', err);
      toast.error('Failed to create match');
    } finally {
      setIsCreatingMatch(false);
    }
  };

  const handleScoreChange = (
    cricketerId: string,
    field: keyof ScoreInput,
    value: string | number | boolean
  ) => {
    setScores(prev => {
      const newScores = new Map(prev);
      const current = newScores.get(cricketerId);
      if (current) {
        newScores.set(cricketerId, { ...current, [field]: value });
      }
      return newScores;
    });
  };

  const handleSaveScores = async () => {
    if (!gameId || !selectedMatchId) return;

    try {
      setIsSaving(true);
      const scoreArray = Array.from(scores.values());
      await gameScoringApi.saveMatchScores(gameId, selectedMatchId, scoreArray);
      toast.success('Scores saved', 'All player scores have been updated');

      const matchesRes = await gameScoringApi.getMatches(gameId);
      setMatches(matchesRes.data);
    } catch (err) {
      console.error('Failed to save scores:', err);
      toast.error('Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  const getPlayerTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; text: string; icon: string }> = {
      batsman: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🏏' },
      bowler: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🎳' },
      allrounder: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⚡' },
      wicketkeeper: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🧤' },
    };
    return configs[type] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '🏏' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-4">
              <Skeleton width={80} height={20} />
              <div className="h-6 w-px bg-[var(--glass-border)]" />
              <Skeleton width={150} height={28} />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="glass-card p-4 mb-6">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} width={60} height={40} />
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <Skeleton height={400} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to={`/game/${gameId}/lobby`}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5m7-7-7 7 7 7"/>
                </svg>
                Back
              </Link>
              <div className="h-6 w-px bg-[var(--glass-border)]" />
              <div>
                <h1 className="text-xl font-display text-[var(--text-primary)]">Match Scoring</h1>
                <p className="text-sm text-[var(--text-tertiary)]">{game?.name}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateMatch(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Match
              </button>
              <LoadingButton
                onClick={handleSaveScores}
                isLoading={isSaving}
                loadingText="Saving..."
                disabled={!selectedMatchId}
              >
                Save Scores
              </LoadingButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Selector */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">Select Match:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {matches.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    selectedMatchId === m.id
                      ? 'bg-[var(--accent-gold)] text-[var(--bg-deep)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  M{m.matchNumber}
                  {m.scoresPopulated && (
                    <svg className={`w-4 h-4 ${selectedMatchId === m.id ? 'text-[var(--bg-deep)]' : 'text-green-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
              {matches.length === 0 && (
                <span className="text-[var(--text-muted)] text-sm">No matches created yet</span>
              )}
            </div>
          </div>
          {selectedMatch && (
            <div className="mt-4 pt-4 border-t border-[var(--glass-border)] flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏏</span>
                <span className="font-display text-[var(--text-primary)]">{selectedMatch.team1}</span>
              </div>
              <span className="text-[var(--text-muted)]">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-[var(--text-primary)]">{selectedMatch.team2}</span>
                <span className="text-lg">🏏</span>
              </div>
              <span className="text-[var(--text-tertiary)] text-sm ml-auto">
                {new Date(selectedMatch.matchDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Scoring Table */}
        {selectedMatchId && cricketers.length > 0 ? (
          <div className="glass-card overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h2 className="font-display text-[var(--text-primary)]">Player Scores</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">{cricketers.length} players to score</p>
                </div>
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">
                Scroll horizontally to see all fields →
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-tertiary)]/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider sticky left-0 bg-[var(--bg-tertiary)] z-10 min-w-[200px]">
                      Player
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center" title="Playing XI">
                      XI
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-blue-500/10">
                      Runs
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-blue-500/10">
                      Balls
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-blue-500/10">
                      4s
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-blue-500/10">
                      6s
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10">
                      Wkts
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10">
                      Overs
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10">
                      Runs
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10">
                      Mdn
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10">
                      Dots
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-green-500/10" title="LBW/Bowled Dismissals">
                      LBW/B
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-orange-500/10">
                      Catch
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-orange-500/10">
                      Stmp
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-orange-500/10" title="Direct Runouts">
                      DRO
                    </th>
                    <th className="px-3 py-3 font-semibold text-[var(--text-tertiary)] uppercase text-xs tracking-wider text-center bg-orange-500/10" title="Indirect Runouts">
                      IRO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {cricketers.map((c, i) => {
                    const score = scores.get(c.id);
                    if (!score) return null;
                    const typeConfig = getPlayerTypeConfig(c.playerType);

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-[var(--bg-tertiary)]/30 transition-colors animate-slide-up ${
                          !score.inPlayingXi ? 'opacity-50' : ''
                        }`}
                        style={{ animationDelay: `${i * 0.02}s` }}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-[var(--bg-deep)] z-10">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-sm">{typeConfig.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--text-primary)] truncate">
                                {c.firstName} {c.lastName}
                              </div>
                              <div className="text-xs text-[var(--text-muted)] capitalize truncate">
                                {c.playerType} • {c.iplTeam}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={score.inPlayingXi}
                            onChange={e => handleScoreChange(c.id, 'inPlayingXi', e.target.checked)}
                            className="w-5 h-5 rounded border-[var(--glass-border)] bg-[var(--bg-tertiary)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        {/* Batting Stats */}
                        <td className="px-2 py-3 bg-blue-500/5">
                          <input
                            type="number"
                            value={score.runs}
                            onChange={e => handleScoreChange(c.id, 'runs', parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-blue-500/5">
                          <input
                            type="number"
                            value={score.ballsFaced}
                            onChange={e => handleScoreChange(c.id, 'ballsFaced', parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-blue-500/5">
                          <input
                            type="number"
                            value={score.fours}
                            onChange={e => handleScoreChange(c.id, 'fours', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-blue-500/5">
                          <input
                            type="number"
                            value={score.sixes}
                            onChange={e => handleScoreChange(c.id, 'sixes', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        {/* Bowling Stats */}
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.wickets}
                            onChange={e => handleScoreChange(c.id, 'wickets', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.oversBowled}
                            onChange={e => handleScoreChange(c.id, 'oversBowled', parseFloat(e.target.value) || 0)}
                            className="w-14 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                            step={0.1}
                          />
                        </td>
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.runsConceded}
                            onChange={e => handleScoreChange(c.id, 'runsConceded', parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.maidens}
                            onChange={e => handleScoreChange(c.id, 'maidens', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.dotBalls}
                            onChange={e => handleScoreChange(c.id, 'dotBalls', parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-green-500/5">
                          <input
                            type="number"
                            value={score.lbwBowledDismissals}
                            onChange={e => handleScoreChange(c.id, 'lbwBowledDismissals', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        {/* Fielding Stats */}
                        <td className="px-2 py-3 bg-orange-500/5">
                          <input
                            type="number"
                            value={score.catches}
                            onChange={e => handleScoreChange(c.id, 'catches', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-orange-500/5">
                          <input
                            type="number"
                            value={score.stumpings}
                            onChange={e => handleScoreChange(c.id, 'stumpings', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-orange-500/5">
                          <input
                            type="number"
                            value={score.directRunouts}
                            onChange={e => handleScoreChange(c.id, 'directRunouts', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-3 bg-orange-500/5">
                          <input
                            type="number"
                            value={score.indirectRunouts}
                            onChange={e => handleScoreChange(c.id, 'indirectRunouts', parseInt(e.target.value) || 0)}
                            className="w-12 px-2 py-1.5 text-center font-mono text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] focus:outline-none"
                            min={0}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="px-6 py-4 border-t border-[var(--glass-border)] bg-[var(--bg-tertiary)]/30">
              <div className="flex flex-wrap gap-6 text-xs text-[var(--text-tertiary)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/20"></div>
                  <span>Batting Stats</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500/20"></div>
                  <span>Bowling Stats</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500/20"></div>
                  <span>Fielding Stats</span>
                </div>
              </div>
            </div>
          </div>
        ) : cricketers.length === 0 ? (
          <NoPlayersEmpty />
        ) : (
          <NoMatchesEmpty onCreateMatch={() => setShowCreateMatch(true)} />
        )}
      </main>

      {/* Create Match Modal */}
      {showCreateMatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-glow p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--bg-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-display text-[var(--text-primary)]">Create New Match</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Add match details</p>
              </div>
            </div>
            <form onSubmit={handleCreateMatch}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Match Number
                  </label>
                  <input
                    type="number"
                    value={newMatch.matchNumber}
                    onChange={e => setNewMatch({ ...newMatch, matchNumber: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none transition-all"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Team 1
                  </label>
                  <input
                    type="text"
                    value={newMatch.team1}
                    onChange={e => setNewMatch({ ...newMatch, team1: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none transition-all"
                    placeholder="e.g., Mumbai Indians"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Team 2
                  </label>
                  <input
                    type="text"
                    value={newMatch.team2}
                    onChange={e => setNewMatch({ ...newMatch, team2: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none transition-all"
                    placeholder="e.g., Chennai Super Kings"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={newMatch.matchDate}
                    onChange={e => setNewMatch({ ...newMatch, matchDate: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateMatch(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isCreatingMatch}
                  loadingText="Creating..."
                  disabled={!newMatch.team1 || !newMatch.team2}
                  className="flex-1"
                >
                  Create Match
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

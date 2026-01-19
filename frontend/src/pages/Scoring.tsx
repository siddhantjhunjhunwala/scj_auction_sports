import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchesApi, cricketersApi } from '../services/api';
import type { Match, Cricketer, PlayerMatchScore } from '../types';
import Navbar from '../components/common/Navbar';
import ScoreEntryForm from '../components/scoring/ScoreEntryForm';
import Modal from '../components/common/Modal';

const IPL_TEAMS = [
  'Chennai Super Kings',
  'Delhi Capitals',
  'Gujarat Titans',
  'Kolkata Knight Riders',
  'Lucknow Super Giants',
  'Mumbai Indians',
  'Punjab Kings',
  'Rajasthan Royals',
  'Royal Challengers Bengaluru',
  'Sunrisers Hyderabad',
];

export default function Scoring() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [cricketers, setCricketers] = useState<Cricketer[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [existingScores, setExistingScores] = useState<PlayerMatchScore[]>([]);
  const [scores, setScores] = useState<Record<string, Partial<PlayerMatchScore>>>({});

  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchNumber: 1,
    team1: '',
    team2: '',
    matchDate: new Date().toISOString().split('T')[0],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'auctioneer') {
      navigate('/auction');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [matchesRes, cricketersRes] = await Promise.all([
          matchesApi.getAll(),
          cricketersApi.getAll(),
        ]);
        setMatches(matchesRes.data);
        setCricketers(cricketersRes.data.filter((c) => c.isPicked));
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMatchScores = async () => {
      if (!selectedMatchId) {
        setSelectedMatch(null);
        setExistingScores([]);
        return;
      }

      const match = matches.find((m) => m.id === selectedMatchId);
      setSelectedMatch(match || null);

      if (match) {
        try {
          const scoresRes = await matchesApi.getScores(match.id);
          setExistingScores(scoresRes.data);

          const scoresMap: Record<string, Partial<PlayerMatchScore>> = {};
          scoresRes.data.forEach((s) => {
            scoresMap[s.cricketerId] = s;
          });
          setScores(scoresMap);
        } catch (err) {
          console.error('Failed to fetch scores', err);
        }
      }
    };
    fetchMatchScores();
  }, [selectedMatchId, matches]);

  const relevantCricketers = selectedMatch
    ? cricketers.filter(
        (c) =>
          c.iplTeam === selectedMatch.team1 || c.iplTeam === selectedMatch.team2
      )
    : [];

  const handleCreateMatch = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await matchesApi.create(newMatch);
      setMatches((prev) => [...prev, res.data]);
      setSelectedMatchId(res.data.id);
      setIsCreatingMatch(false);
      setSuccess('Match created successfully');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create match';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChange = useCallback((cricketerId: string, score: Partial<PlayerMatchScore>) => {
    setScores((prev) => ({ ...prev, [cricketerId]: score }));
  }, []);

  const handleSaveScores = async () => {
    if (!selectedMatch) return;

    try {
      setIsSaving(true);
      setError(null);
      const scoresToSave = Object.values(scores).filter((s) => s.cricketerId);
      await matchesApi.saveScores(selectedMatch.id, scoresToSave);
      setSuccess('Scores saved successfully');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save scores';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoPopulate = async () => {
    if (!selectedMatch) return;

    try {
      setIsSaving(true);
      setError(null);
      const res = await matchesApi.autoPopulate(selectedMatch.id);
      setExistingScores(res.data);
      const scoresMap: Record<string, Partial<PlayerMatchScore>> = {};
      res.data.forEach((s) => {
        scoresMap[s.cricketerId] = s;
      });
      setScores(scoresMap);
      setSuccess('Scores auto-populated from Cricinfo');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Auto-populate failed. Please enter scores manually.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <div className="spinner mb-4" />
          <p className="text-slate-500 font-body">Loading scoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-display text-white tracking-wide">Match Scoring</h1>
            <p className="text-slate-500">Enter player performances and calculate fantasy points</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-400">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300 p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Match Selection */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="input-label mb-2 block">Select Match</label>
              <div className="relative">
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select a match...</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id} className="bg-slate-900">
                      Match {match.matchNumber}: {match.team1} vs {match.team2} ({match.matchDate})
                      {match.scoresPopulated ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCreatingMatch(true)}
              className="px-6 py-3 rounded-xl font-display tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Match
            </button>
          </div>
        </div>

        {/* Create Match Modal */}
        <Modal
          isOpen={isCreatingMatch}
          onClose={() => setIsCreatingMatch(false)}
          title="Create New Match"
        >
          <div className="space-y-5">
            <div>
              <label className="input-label mb-2 block">Match Number</label>
              <input
                type="number"
                min="1"
                value={newMatch.matchNumber}
                onChange={(e) =>
                  setNewMatch({ ...newMatch, matchNumber: parseInt(e.target.value) || 1 })
                }
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
            <div>
              <label className="input-label mb-2 block">Team 1</label>
              <div className="relative">
                <select
                  value={newMatch.team1}
                  onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select team...</option>
                  {IPL_TEAMS.map((team) => (
                    <option key={team} value={team} className="bg-slate-900">{team}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="input-label mb-2 block">Team 2</label>
              <div className="relative">
                <select
                  value={newMatch.team2}
                  onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select team...</option>
                  {IPL_TEAMS.filter((t) => t !== newMatch.team1).map((team) => (
                    <option key={team} value={team} className="bg-slate-900">{team}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="input-label mb-2 block">Match Date</label>
              <input
                type="date"
                value={newMatch.matchDate}
                onChange={(e) => setNewMatch({ ...newMatch, matchDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setIsCreatingMatch(false)}
                className="px-6 py-3 rounded-xl font-display tracking-wide bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMatch}
                disabled={!newMatch.team1 || !newMatch.team2 || isSaving}
                className="px-6 py-3 rounded-xl font-display tracking-wide bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              >
                Create Match
              </button>
            </div>
          </div>
        </Modal>

        {/* Score Entry */}
        {selectedMatch && (
          <div className="space-y-6">
            {/* Match Header */}
            <div className="glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-display">
                      Match {selectedMatch.matchNumber}
                    </span>
                    {selectedMatch.scoresPopulated && (
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-display flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Scored
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-display text-white tracking-wide">
                    {selectedMatch.team1} <span className="text-slate-500">vs</span> {selectedMatch.team2}
                  </h2>
                  <p className="text-slate-500 mt-1">{new Date(selectedMatch.matchDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAutoPopulate}
                    disabled={isSaving}
                    className="px-5 py-3 rounded-xl font-display tracking-wide bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Auto-populate
                  </button>
                  <button
                    onClick={handleSaveScores}
                    disabled={isSaving}
                    className="px-5 py-3 rounded-xl font-display tracking-wide bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save All Scores
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {relevantCricketers.length > 0 ? (
              <div className="space-y-8">
                {/* Team 1 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <span className="text-black font-display text-sm">1</span>
                    </div>
                    <h3 className="text-xl font-display text-white tracking-wide">{selectedMatch.team1}</h3>
                    <span className="text-sm text-slate-500">
                      {relevantCricketers.filter((c) => c.iplTeam === selectedMatch.team1).length} players
                    </span>
                  </div>
                  {relevantCricketers
                    .filter((c) => c.iplTeam === selectedMatch.team1)
                    .map((cricketer) => (
                      <ScoreEntryForm
                        key={cricketer.id}
                        cricketer={cricketer}
                        existingScore={existingScores.find((s) => s.cricketerId === cricketer.id)}
                        onChange={(score) => handleScoreChange(cricketer.id, score)}
                      />
                    ))}
                </div>

                {/* Team 2 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                      <span className="text-black font-display text-sm">2</span>
                    </div>
                    <h3 className="text-xl font-display text-white tracking-wide">{selectedMatch.team2}</h3>
                    <span className="text-sm text-slate-500">
                      {relevantCricketers.filter((c) => c.iplTeam === selectedMatch.team2).length} players
                    </span>
                  </div>
                  {relevantCricketers
                    .filter((c) => c.iplTeam === selectedMatch.team2)
                    .map((cricketer) => (
                      <ScoreEntryForm
                        key={cricketer.id}
                        cricketer={cricketer}
                        existingScore={existingScores.find((s) => s.cricketerId === cricketer.id)}
                        onChange={(score) => handleScoreChange(cricketer.id, score)}
                      />
                    ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-slate-500">No picked players from these teams</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

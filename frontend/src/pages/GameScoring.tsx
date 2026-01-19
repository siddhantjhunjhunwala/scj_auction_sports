import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi, gameScoringApi } from '../services/api';
import type { Game, GameMatch, GameCricketer, GamePlayerMatchScore } from '../types';

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
  const [newMatch, setNewMatch] = useState({
    matchNumber: 1,
    team1: '',
    team2: '',
    matchDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

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

      // Set next match number
      setNewMatch(prev => ({
        ...prev,
        matchNumber: matchesRes.data.length + 1,
      }));
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load scoring data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatchScores = async () => {
    if (!gameId || !selectedMatchId) return;

    try {
      const response = await gameScoringApi.getMatchScores(gameId, selectedMatchId);
      const scoreMap = new Map<string, ScoreInput>();

      // Initialize with existing scores or defaults
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
      setError(null);
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
      setSuccess('Match created successfully');
    } catch (err) {
      console.error('Failed to create match:', err);
      setError('Failed to create match');
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
      setError(null);
      const scoreArray = Array.from(scores.values());
      await gameScoringApi.saveMatchScores(gameId, selectedMatchId, scoreArray);
      setSuccess('Scores saved successfully');

      // Reload matches to update scoresPopulated flag
      const matchesRes = await gameScoringApi.getMatches(gameId);
      setMatches(matchesRes.data);
    } catch (err) {
      console.error('Failed to save scores:', err);
      setError('Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/game/${gameId}/lobby`)}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Match Scoring</h1>
              <p className="text-gray-600">{game?.name}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateMatch(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              New Match
            </button>
            <button
              onClick={handleSaveScores}
              disabled={!selectedMatchId || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Scores'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Match Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Select Match:</label>
            <div className="flex gap-2 flex-wrap">
              {matches.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`px-4 py-2 rounded ${
                    selectedMatchId === m.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  M{m.matchNumber}
                  {m.scoresPopulated && <span className="ml-1 text-green-300">✓</span>}
                </button>
              ))}
            </div>
          </div>
          {selectedMatch && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedMatch.team1} vs {selectedMatch.team2} •{' '}
              {new Date(selectedMatch.matchDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Scoring Table */}
        {selectedMatchId && cricketers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 sticky left-0 bg-gray-50">
                      Player
                    </th>
                    <th className="px-2 py-3 font-medium text-gray-700">XI</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Runs</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Balls</th>
                    <th className="px-2 py-3 font-medium text-gray-700">4s</th>
                    <th className="px-2 py-3 font-medium text-gray-700">6s</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Wkts</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Overs</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Conc</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Mdn</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Dots</th>
                    <th className="px-2 py-3 font-medium text-gray-700">LBW/B</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Catch</th>
                    <th className="px-2 py-3 font-medium text-gray-700">Stmp</th>
                    <th className="px-2 py-3 font-medium text-gray-700">DRO</th>
                    <th className="px-2 py-3 font-medium text-gray-700">IRO</th>
                  </tr>
                </thead>
                <tbody>
                  {cricketers.map(c => {
                    const score = scores.get(c.id);
                    if (!score) return null;

                    return (
                      <tr key={c.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 sticky left-0 bg-white">
                          <div className="font-medium">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {c.playerType} • {c.iplTeam}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={score.inPlayingXi}
                            onChange={e =>
                              handleScoreChange(c.id, 'inPlayingXi', e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.runs}
                            onChange={e =>
                              handleScoreChange(c.id, 'runs', parseInt(e.target.value) || 0)
                            }
                            className="w-14 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.ballsFaced}
                            onChange={e =>
                              handleScoreChange(c.id, 'ballsFaced', parseInt(e.target.value) || 0)
                            }
                            className="w-14 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.fours}
                            onChange={e =>
                              handleScoreChange(c.id, 'fours', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.sixes}
                            onChange={e =>
                              handleScoreChange(c.id, 'sixes', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.wickets}
                            onChange={e =>
                              handleScoreChange(c.id, 'wickets', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.oversBowled}
                            onChange={e =>
                              handleScoreChange(
                                c.id,
                                'oversBowled',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-14 px-1 py-1 border rounded text-center"
                            min={0}
                            step={0.1}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.runsConceded}
                            onChange={e =>
                              handleScoreChange(
                                c.id,
                                'runsConceded',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-14 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.maidens}
                            onChange={e =>
                              handleScoreChange(c.id, 'maidens', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.dotBalls}
                            onChange={e =>
                              handleScoreChange(c.id, 'dotBalls', parseInt(e.target.value) || 0)
                            }
                            className="w-14 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.lbwBowledDismissals}
                            onChange={e =>
                              handleScoreChange(
                                c.id,
                                'lbwBowledDismissals',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.catches}
                            onChange={e =>
                              handleScoreChange(c.id, 'catches', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.stumpings}
                            onChange={e =>
                              handleScoreChange(c.id, 'stumpings', parseInt(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.directRunouts}
                            onChange={e =>
                              handleScoreChange(
                                c.id,
                                'directRunouts',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={score.indirectRunouts}
                            onChange={e =>
                              handleScoreChange(
                                c.id,
                                'indirectRunouts',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 px-1 py-1 border rounded text-center"
                            min={0}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {cricketers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No players have been picked yet.</p>
          </div>
        )}
      </div>

      {/* Create Match Modal */}
      {showCreateMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Match</h2>
            <form onSubmit={handleCreateMatch}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Number
                  </label>
                  <input
                    type="number"
                    value={newMatch.matchNumber}
                    onChange={e =>
                      setNewMatch({ ...newMatch, matchNumber: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team 1
                  </label>
                  <input
                    type="text"
                    value={newMatch.team1}
                    onChange={e => setNewMatch({ ...newMatch, team1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Mumbai Indians"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team 2
                  </label>
                  <input
                    type="text"
                    value={newMatch.team2}
                    onChange={e => setNewMatch({ ...newMatch, team2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Chennai Super Kings"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={newMatch.matchDate}
                    onChange={e => setNewMatch({ ...newMatch, matchDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateMatch(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMatch.team1 || !newMatch.team2}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

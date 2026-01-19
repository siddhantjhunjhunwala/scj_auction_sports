import { useState, useEffect } from 'react';
import type { Cricketer, PlayerMatchScore } from '../../types';
import { calculatePoints, formatPointsBreakdown } from '../../utils/pointsCalculator';

interface ScoreEntryFormProps {
  cricketer: Cricketer;
  existingScore?: PlayerMatchScore;
  onChange: (score: Partial<PlayerMatchScore>) => void;
}

export default function ScoreEntryForm({
  cricketer,
  existingScore,
  onChange,
}: ScoreEntryFormProps) {
  const [score, setScore] = useState<Partial<PlayerMatchScore>>({
    cricketerId: cricketer.id,
    inPlayingXi: existingScore?.inPlayingXi ?? true,
    runs: existingScore?.runs ?? 0,
    ballsFaced: existingScore?.ballsFaced ?? 0,
    fours: existingScore?.fours ?? 0,
    sixes: existingScore?.sixes ?? 0,
    wickets: existingScore?.wickets ?? 0,
    oversBowled: existingScore?.oversBowled ?? 0,
    runsConceded: existingScore?.runsConceded ?? 0,
    maidens: existingScore?.maidens ?? 0,
    dotBalls: existingScore?.dotBalls ?? 0,
    catches: existingScore?.catches ?? 0,
    stumpings: existingScore?.stumpings ?? 0,
    directRunouts: existingScore?.directRunouts ?? 0,
    indirectRunouts: existingScore?.indirectRunouts ?? 0,
    dismissalType: existingScore?.dismissalType ?? null,
    lbwBowledDismissals: existingScore?.lbwBowledDismissals ?? 0,
  });

  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    onChange(score);
  }, [score, onChange]);

  const handleChange = (field: keyof PlayerMatchScore, value: number | boolean | string | null) => {
    setScore((prev) => ({ ...prev, [field]: value }));
  };

  const breakdown = calculatePoints(score);
  const breakdownLines = formatPointsBreakdown(breakdown);

  const fullName = `${cricketer.firstName} ${cricketer.lastName}`;

  return (
    <div className={`glass-card p-5 mb-4 transition-all ${!score.inPlayingXi ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800">
            {cricketer.pictureUrl ? (
              <img src={cricketer.pictureUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 font-display">
                {cricketer.firstName[0]}{cricketer.lastName[0]}
              </div>
            )}
            {cricketer.isForeign && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-white">{fullName}</p>
            <p className="text-sm text-slate-500">{cricketer.iplTeam}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative w-12 h-6 rounded-full transition-colors ${score.inPlayingXi ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${score.inPlayingXi ? 'left-7' : 'left-1'}`} />
            </div>
            <input
              type="checkbox"
              checked={score.inPlayingXi}
              onChange={(e) => handleChange('inPlayingXi', e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Playing XI</span>
          </label>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-amber-400">{breakdown.total}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Points</p>
          </div>
        </div>
      </div>

      {score.inPlayingXi && (
        <div className="space-y-4">
          {/* Batting Stats */}
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-display text-red-400 uppercase tracking-wider">Batting</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Runs</label>
                <input
                  type="number"
                  min="0"
                  value={score.runs || 0}
                  onChange={(e) => handleChange('runs', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Balls</label>
                <input
                  type="number"
                  min="0"
                  value={score.ballsFaced || 0}
                  onChange={(e) => handleChange('ballsFaced', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">4s</label>
                <input
                  type="number"
                  min="0"
                  value={score.fours || 0}
                  onChange={(e) => handleChange('fours', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">6s</label>
                <input
                  type="number"
                  min="0"
                  value={score.sixes || 0}
                  onChange={(e) => handleChange('sixes', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dismissal</label>
                <select
                  value={score.dismissalType || ''}
                  onChange={(e) => handleChange('dismissalType', e.target.value || null)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Not Out</option>
                  <option value="bowled" className="bg-slate-900">Bowled</option>
                  <option value="caught" className="bg-slate-900">Caught</option>
                  <option value="lbw" className="bg-slate-900">LBW</option>
                  <option value="run_out" className="bg-slate-900">Run Out</option>
                  <option value="stumped" className="bg-slate-900">Stumped</option>
                  <option value="hit_wicket" className="bg-slate-900">Hit Wicket</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bowling Stats */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-display text-blue-400 uppercase tracking-wider">Bowling</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Wickets</label>
                <input
                  type="number"
                  min="0"
                  value={score.wickets || 0}
                  onChange={(e) => handleChange('wickets', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Overs</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={score.oversBowled || 0}
                  onChange={(e) => handleChange('oversBowled', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Runs</label>
                <input
                  type="number"
                  min="0"
                  value={score.runsConceded || 0}
                  onChange={(e) => handleChange('runsConceded', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Maidens</label>
                <input
                  type="number"
                  min="0"
                  value={score.maidens || 0}
                  onChange={(e) => handleChange('maidens', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dots</label>
                <input
                  type="number"
                  min="0"
                  value={score.dotBalls || 0}
                  onChange={(e) => handleChange('dotBalls', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">LBW/Bowled</label>
                <input
                  type="number"
                  min="0"
                  value={score.lbwBowledDismissals || 0}
                  onChange={(e) => handleChange('lbwBowledDismissals', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Fielding Stats */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-display text-emerald-400 uppercase tracking-wider">Fielding</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Catches</label>
                <input
                  type="number"
                  min="0"
                  value={score.catches || 0}
                  onChange={(e) => handleChange('catches', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Stumpings</label>
                <input
                  type="number"
                  min="0"
                  value={score.stumpings || 0}
                  onChange={(e) => handleChange('stumpings', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Direct RO</label>
                <input
                  type="number"
                  min="0"
                  value={score.directRunouts || 0}
                  onChange={(e) => handleChange('directRunouts', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Indirect RO</label>
                <input
                  type="number"
                  min="0"
                  value={score.indirectRunouts || 0}
                  onChange={(e) => handleChange('indirectRunouts', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Points Breakdown */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showBreakdown ? 'Hide' : 'Show'} Points Breakdown
        </button>
        {showBreakdown && (
          <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/5">
            {breakdownLines.length > 0 ? (
              <ul className="space-y-1.5">
                {breakdownLines.map((line, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                    {line}
                  </li>
                ))}
                <li className="font-mono text-amber-400 pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                  <span>Total</span>
                  <span className="text-lg font-bold">{breakdown.total} pts</span>
                </li>
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No points scored</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

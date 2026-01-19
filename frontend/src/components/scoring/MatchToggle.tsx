import type { GameMatch } from '../../types';

interface Props {
  matches: GameMatch[];
  selectedMatch: number | undefined;
  onChange: (matchNumber: number | undefined) => void;
}

export default function MatchToggle({ matches, selectedMatch, onChange }: Props) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <label className="text-sm font-medium text-gray-700 mr-4">Show stats as of:</label>
      <select
        value={selectedMatch || ''}
        onChange={e => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Matches</option>
        {matches.map(m => (
          <option key={m.id} value={m.matchNumber}>
            Match {m.matchNumber}: {m.team1} vs {m.team2}
          </option>
        ))}
      </select>
    </div>
  );
}

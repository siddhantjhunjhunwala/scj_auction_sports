import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import type { PointSystemConfig } from '../types';

interface PointField {
  key: keyof PointSystemConfig;
  label: string;
  min?: number;
  max?: number;
}

const BATTING_FIELDS: PointField[] = [
  { key: 'runPoints', label: 'Per Run' },
  { key: 'fourBonus', label: 'Four Bonus' },
  { key: 'sixBonus', label: 'Six Bonus' },
  { key: 'runs25Bonus', label: '25 Runs' },
  { key: 'runs50Bonus', label: '50 Runs' },
  { key: 'runs75Bonus', label: '75 Runs' },
  { key: 'runs100Bonus', label: '100 Runs' },
  { key: 'duckPenalty', label: 'Duck', min: -20 },
];

const SR_FIELDS: PointField[] = [
  { key: 'sr130Bonus', label: 'SR 130-149' },
  { key: 'sr150Bonus', label: 'SR 150-169' },
  { key: 'sr170Bonus', label: 'SR 170+' },
];

const BOWLING_FIELDS: PointField[] = [
  { key: 'wicketPoints', label: 'Per Wicket' },
  { key: 'lbwBowledBonus', label: 'LBW/Bowled' },
  { key: 'maidenPoints', label: 'Maiden Over' },
  { key: 'dotBallPoints', label: 'Dot Ball' },
  { key: 'wickets3Bonus', label: '3 Wickets' },
  { key: 'wickets4Bonus', label: '4 Wickets' },
  { key: 'wickets5Bonus', label: '5 Wickets' },
];

const ECON_FIELDS: PointField[] = [
  { key: 'econ5Bonus', label: 'Econ < 5' },
  { key: 'econ6Bonus', label: 'Econ 5-5.99' },
  { key: 'econ7Bonus', label: 'Econ 6-6.99' },
];

const FIELDING_FIELDS: PointField[] = [
  { key: 'catchPoints', label: 'Catch' },
  { key: 'catches3Bonus', label: '3+ Catches' },
  { key: 'stumpingPoints', label: 'Stumping' },
  { key: 'directRunout', label: 'Direct RO' },
  { key: 'indirectRunout', label: 'Indirect RO' },
  { key: 'playingXiBonus', label: 'Playing XI' },
];

export default function PointsConfig() {
  const { gameId } = useParams<{ gameId: string }>();
  const [config, setConfig] = useState<PointSystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (gameId) {
      loadConfig();
    }
  }, [gameId]);

  const loadConfig = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      const response = await gamesApi.getPointsConfig(gameId);
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load points configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof PointSystemConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!gameId || !config) return;

    try {
      setIsSaving(true);
      setError(null);
      await gamesApi.updatePointsConfig(gameId, config);
      setHasChanges(false);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('Failed to save points configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: PointField) => {
    if (!config) return null;
    const value = config[field.key] as number;

    return (
      <div key={field.key} className="flex items-center justify-between py-2">
        <label className="text-sm text-gray-700">{field.label}</label>
        <input
          type="number"
          value={value}
          onChange={e => handleChange(field.key, parseInt(e.target.value) || 0)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/game/${gameId}/lobby`)}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Point System Configuration</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 underline">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
            Configuration saved successfully!
          </div>
        )}

        {/* Grid Layout - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Batting */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Batting
            </h2>
            <div className="space-y-1">{BATTING_FIELDS.map(renderField)}</div>
          </div>

          {/* Bowling */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Bowling
            </h2>
            <div className="space-y-1">{BOWLING_FIELDS.map(renderField)}</div>
          </div>

          {/* Fielding */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Fielding
            </h2>
            <div className="space-y-1">{FIELDING_FIELDS.map(renderField)}</div>
          </div>

          {/* Strike Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Strike Rate
            </h2>
            <p className="text-xs text-gray-500 mb-3">(Min 10 balls faced)</p>
            <div className="space-y-1">{SR_FIELDS.map(renderField)}</div>
          </div>

          {/* Economy */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Economy
            </h2>
            <p className="text-xs text-gray-500 mb-3">(Min 2 overs bowled)</p>
            <div className="space-y-1">{ECON_FIELDS.map(renderField)}</div>
          </div>

          {/* Summary Card */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Quick Reference</h2>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Runs:</strong> {config?.runPoints || 1} per run
              </p>
              <p>
                <strong>Wickets:</strong> {config?.wicketPoints || 25} per wicket
              </p>
              <p>
                <strong>Catches:</strong> {config?.catchPoints || 8} per catch
              </p>
              <p>
                <strong>Playing XI:</strong> {config?.playingXiBonus || 4} bonus
              </p>
            </div>
            {hasChanges && (
              <p className="mt-4 text-orange-600 text-sm">
                You have unsaved changes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

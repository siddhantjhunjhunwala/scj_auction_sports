import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { PointSystemConfig } from '../types';
import { LoadingButton } from '../components/ui/LoadingSpinner';
import Skeleton from '../components/ui/Skeleton';

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
  const toast = useToast();

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
      toast.error('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof PointSystemConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!gameId || !config) return;

    try {
      setIsSaving(true);
      await gamesApi.updatePointsConfig(gameId, config);
      setHasChanges(false);
      toast.success('Configuration saved!');
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: PointField) => {
    if (!config) return null;
    const value = config[field.key] as number;

    return (
      <div key={field.key} className="flex items-center justify-between py-2">
        <label className="text-sm text-[var(--text-secondary)]">{field.label}</label>
        <input
          type="number"
          value={value}
          onChange={e => handleChange(field.key, parseInt(e.target.value) || 0)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          className="w-20 px-3 py-2 text-center font-mono font-bold text-[var(--text-primary)]
            bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg
            focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-none
            transition-all"
        />
      </div>
    );
  };

  const renderSection = (title: string, icon: string, fields: PointField[], subtitle?: string) => (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--glass-border)]">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="font-display text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-1">{fields.map(renderField)}</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card p-5">
                <Skeleton width="50%" height={24} className="mb-4" />
                <div className="space-y-3">
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-xl font-display text-[var(--text-primary)]">Point Configuration</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {hasChanges && (
                <span className="text-xs sm:text-sm text-[var(--accent-gold)] animate-pulse hidden sm:block">
                  Unsaved changes
                </span>
              )}
              <LoadingButton
                onClick={handleSave}
                isLoading={isSaving}
                loadingText="Saving..."
                disabled={!hasChanges}
                className="text-sm sm:text-base px-3 sm:px-6"
              >
                <span className="hidden sm:inline">Save Configuration</span>
                <span className="sm:hidden">Save</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="glass-card-glow p-3 sm:p-4 mb-4 sm:mb-6 flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <p className="text-sm sm:text-base text-[var(--text-primary)] font-medium">Configure your scoring system</p>
            <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">
              Set point values for different actions.
            </p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderSection('Batting', '🏏', BATTING_FIELDS)}
          {renderSection('Bowling', '🎳', BOWLING_FIELDS)}
          {renderSection('Fielding', '🧤', FIELDING_FIELDS)}
          {renderSection('Strike Rate', '⚡', SR_FIELDS, 'Min 10 balls faced')}
          {renderSection('Economy', '📊', ECON_FIELDS, 'Min 2 overs bowled')}

          {/* Summary Card */}
          <div className="glass-card-glow p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--glass-border)]">
              <span className="text-xl">📋</span>
              <h2 className="font-display text-[var(--text-primary)]">Quick Reference</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Per Run</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.runPoints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Per Wicket</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.wicketPoints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Per Catch</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.catchPoints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Playing XI</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.playingXiBonus || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Century Bonus</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.runs100Bonus || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">5-Wicket Haul</span>
                <span className="font-mono text-[var(--accent-gold)]">{config?.wickets5Bonus || 0}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Example: 50 runs + 2 wickets = {((config?.runPoints || 0) * 50) + (config?.runs50Bonus || 0) + ((config?.wicketPoints || 0) * 2)} pts
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

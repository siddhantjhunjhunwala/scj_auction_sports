import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../../context/ToastContext';
import { gamesApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';
import type { PointSystemConfig } from '../../types';

// Default point values
const DEFAULT_CONFIG: Omit<PointSystemConfig, 'id' | 'gameId'> = {
  // Batting
  runPoints: 1,
  fourBonus: 4,
  sixBonus: 6,
  runs25Bonus: 4,
  runs50Bonus: 8,
  runs75Bonus: 12,
  runs100Bonus: 16,
  duckPenalty: -2,
  sr130Bonus: 2,
  sr150Bonus: 4,
  sr170Bonus: 6,
  // Bowling
  wicketPoints: 25,
  lbwBowledBonus: 8,
  maidenPoints: 6,
  dotBallPoints: 1,
  wickets3Bonus: 4,
  wickets4Bonus: 8,
  wickets5Bonus: 12,
  econ5Bonus: 6,
  econ6Bonus: 4,
  econ7Bonus: 2,
  // Fielding
  catchPoints: 8,
  catches3Bonus: 4,
  stumpingPoints: 12,
  directRunout: 12,
  indirectRunout: 6,
  playingXiBonus: 4,
};

interface PointInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

function PointInput({ label, value, onChange, disabled, min = -50, max = 100 }: PointInputProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]/30 last:border-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        disabled={disabled}
        min={min}
        max={max}
        className="w-20 px-2 py-1 text-center text-sm bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

interface PointsSectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

function PointsSection({ title, icon, color, children }: PointsSectionProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--glass-border)]">
        <span className={color}>{icon}</span>
        <h3 className="font-medium text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function PointsPageContent() {
  const { currentGame, refreshGame, isCreator } = useGame();
  const toast = useToast();
  const [config, setConfig] = useState<Omit<PointSystemConfig, 'id' | 'gameId'>>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = isCreator && currentGame?.status === 'pre_auction';

  useEffect(() => {
    const loadConfig = async () => {
      if (!currentGame) return;
      try {
        setIsLoading(true);
        const response = await gamesApi.getPointsConfig(currentGame.id);
        if (response.data) {
          const { id, gameId, ...rest } = response.data;
          setConfig(rest);
        }
      } catch (err) {
        // If no config exists, use defaults
        console.log('Using default config');
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, [currentGame]);

  const handleSave = async () => {
    if (!currentGame || !canEdit) return;
    try {
      setIsSaving(true);
      await gamesApi.updatePointsConfig(currentGame.id, config);
      await refreshGame();
      toast.success('Points configuration saved');
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof typeof config) => (value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  // Icons for sections
  const BatIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
    </svg>
  );

  const BallIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );

  const FieldIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );

  const SpeedIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-display text-[var(--text-primary)]">Points Configuration</h2>
        <p className="text-[var(--text-tertiary)] mt-1">
          {canEdit ? 'Configure the point values for your fantasy league' : 'View the point system for this league'}
        </p>
      </div>

      {/* Grid layout - 3 columns for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Batting */}
        <PointsSection title="Batting" icon={BatIcon} color="text-[var(--accent-gold)]">
          <PointInput label="Per Run" value={config.runPoints} onChange={updateField('runPoints')} disabled={!canEdit} />
          <PointInput label="Four Bonus" value={config.fourBonus} onChange={updateField('fourBonus')} disabled={!canEdit} />
          <PointInput label="Six Bonus" value={config.sixBonus} onChange={updateField('sixBonus')} disabled={!canEdit} />
          <PointInput label="25 Runs Bonus" value={config.runs25Bonus} onChange={updateField('runs25Bonus')} disabled={!canEdit} />
          <PointInput label="50 Runs Bonus" value={config.runs50Bonus} onChange={updateField('runs50Bonus')} disabled={!canEdit} />
          <PointInput label="75 Runs Bonus" value={config.runs75Bonus} onChange={updateField('runs75Bonus')} disabled={!canEdit} />
          <PointInput label="100 Runs Bonus" value={config.runs100Bonus} onChange={updateField('runs100Bonus')} disabled={!canEdit} />
          <PointInput label="Duck Penalty" value={config.duckPenalty} onChange={updateField('duckPenalty')} disabled={!canEdit} />
        </PointsSection>

        {/* Bowling */}
        <PointsSection title="Bowling" icon={BallIcon} color="text-[var(--accent-cyan)]">
          <PointInput label="Per Wicket" value={config.wicketPoints} onChange={updateField('wicketPoints')} disabled={!canEdit} />
          <PointInput label="LBW/Bowled Bonus" value={config.lbwBowledBonus} onChange={updateField('lbwBowledBonus')} disabled={!canEdit} />
          <PointInput label="Maiden Over" value={config.maidenPoints} onChange={updateField('maidenPoints')} disabled={!canEdit} />
          <PointInput label="Per Dot Ball" value={config.dotBallPoints} onChange={updateField('dotBallPoints')} disabled={!canEdit} />
          <PointInput label="3 Wickets Bonus" value={config.wickets3Bonus} onChange={updateField('wickets3Bonus')} disabled={!canEdit} />
          <PointInput label="4 Wickets Bonus" value={config.wickets4Bonus} onChange={updateField('wickets4Bonus')} disabled={!canEdit} />
          <PointInput label="5 Wickets Bonus" value={config.wickets5Bonus} onChange={updateField('wickets5Bonus')} disabled={!canEdit} />
        </PointsSection>

        {/* Fielding */}
        <PointsSection title="Fielding" icon={FieldIcon} color="text-[var(--accent-emerald)]">
          <PointInput label="Catch" value={config.catchPoints} onChange={updateField('catchPoints')} disabled={!canEdit} />
          <PointInput label="3+ Catches Bonus" value={config.catches3Bonus} onChange={updateField('catches3Bonus')} disabled={!canEdit} />
          <PointInput label="Stumping" value={config.stumpingPoints} onChange={updateField('stumpingPoints')} disabled={!canEdit} />
          <PointInput label="Direct Runout" value={config.directRunout} onChange={updateField('directRunout')} disabled={!canEdit} />
          <PointInput label="Indirect Runout" value={config.indirectRunout} onChange={updateField('indirectRunout')} disabled={!canEdit} />
          <PointInput label="Playing XI Bonus" value={config.playingXiBonus} onChange={updateField('playingXiBonus')} disabled={!canEdit} />
        </PointsSection>

        {/* Strike Rate */}
        <PointsSection title="Strike Rate (min 10 balls)" icon={SpeedIcon} color="text-[var(--accent-purple)]">
          <PointInput label="SR 130-149" value={config.sr130Bonus} onChange={updateField('sr130Bonus')} disabled={!canEdit} />
          <PointInput label="SR 150-169" value={config.sr150Bonus} onChange={updateField('sr150Bonus')} disabled={!canEdit} />
          <PointInput label="SR 170+" value={config.sr170Bonus} onChange={updateField('sr170Bonus')} disabled={!canEdit} />
        </PointsSection>

        {/* Economy */}
        <PointsSection title="Economy (min 2 overs)" icon={BallIcon} color="text-[var(--accent-rose)]">
          <PointInput label="Econ under 5" value={config.econ5Bonus} onChange={updateField('econ5Bonus')} disabled={!canEdit} />
          <PointInput label="Econ 5-5.99" value={config.econ6Bonus} onChange={updateField('econ6Bonus')} disabled={!canEdit} />
          <PointInput label="Econ 6-6.99" value={config.econ7Bonus} onChange={updateField('econ7Bonus')} disabled={!canEdit} />
        </PointsSection>
      </div>

      {/* Save Button */}
      {canEdit && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-8"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PointsPage() {
  return (
    <GamePageWrapper>
      <PointsPageContent />
    </GamePageWrapper>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { gamesApi } from '../../services/api';
import GamePageWrapper from '../../components/layout/GamePageWrapper';

// Preset league logos
const PRESET_LOGOS = [
  { id: 'cricket1', emoji: '🏏', label: 'Cricket Bat' },
  { id: 'trophy', emoji: '🏆', label: 'Trophy' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'thunder', emoji: '⚡', label: 'Thunder' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'diamond', emoji: '💎', label: 'Diamond' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
];

function SetupPageContent() {
  const { currentGame, refreshGame, isCreator } = useGame();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [leagueName, setLeagueName] = useState(currentGame?.name || '');
  const [selectedLogo, setSelectedLogo] = useState(currentGame?.logoUrl || PRESET_LOGOS[0].emoji);
  const [joiningAllowed, setJoiningAllowed] = useState(currentGame?.joiningAllowed ?? true);
  const [iplSeasonYear, setIplSeasonYear] = useState(currentGame?.iplSeasonYear || new Date().getFullYear());
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingAuction, setIsStartingAuction] = useState(false);

  // Update local state when currentGame changes
  useEffect(() => {
    if (currentGame) {
      setLeagueName(currentGame.name);
      setSelectedLogo(currentGame.logoUrl || PRESET_LOGOS[0].emoji);
      setJoiningAllowed(currentGame.joiningAllowed ?? true);
      setIplSeasonYear(currentGame.iplSeasonYear || new Date().getFullYear());
    }
  }, [currentGame]);

  const handleSave = async () => {
    if (!currentGame || !isCreator) return;

    try {
      setIsSaving(true);
      await gamesApi.update(currentGame.id, {
        name: leagueName,
        logoUrl: selectedLogo,
        joiningAllowed,
        iplSeasonYear,
      });
      await refreshGame();
      toast.success('Settings saved');
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentGame) return;

    try {
      setIsUploading(true);
      await gamesApi.uploadCricketers(currentGame.id, file);
      await refreshGame();
      toast.success('Cricketers uploaded successfully');
    } catch (err) {
      console.error('Failed to upload:', err);
      toast.error('Failed to upload cricketers');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentGame) return;

    try {
      setIsUploading(true);
      await gamesApi.uploadRulebook(currentGame.id, file);
      await refreshGame();
      toast.success('Rulebook uploaded successfully');
    } catch (err) {
      console.error('Failed to upload:', err);
      toast.error('Failed to upload rulebook');
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const handleDownloadRulebook = async () => {
    if (!currentGame?.rulebookUrl) return;
    window.open(currentGame.rulebookUrl, '_blank');
  };

  const handleStartAuction = async () => {
    if (!currentGame || !isCreator) return;

    try {
      setIsStartingAuction(true);
      await gamesApi.update(currentGame.id, {
        joiningAllowed: false,
      });
      await gamesApi.startAuction(currentGame.id);
      navigate(`/game/${currentGame.id}/live`);
    } catch (err) {
      console.error('Failed to start auction:', err);
      toast.error('Failed to start auction');
    } finally {
      setIsStartingAuction(false);
    }
  };

  const handleJoinGame = async () => {
    // Already joined if we can see this page, but this button is for consistency
    toast.info('You have already joined this game');
  };

  const copyGameCode = () => {
    if (currentGame?.code) {
      navigator.clipboard.writeText(currentGame.code);
      toast.success('Game code copied');
    }
  };

  const isAuctionStartable = currentGame?.cricketersUploaded && (currentGame?.participants?.length || 0) >= 2;
  const auctionStarted = currentGame?.status !== 'pre_auction';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-display text-[var(--text-primary)]">Game Setup</h2>
        <p className="text-[var(--text-tertiary)] mt-1">
          {isCreator ? 'Configure your league settings' : 'View league settings'}
        </p>
      </div>

      <div className="space-y-6">
        {/* League Name */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            League Name
          </label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            disabled={!isCreator || auctionStarted}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter league name"
          />
        </div>

        {/* League Logo */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            League Logo
          </label>
          <div className="grid grid-cols-5 gap-3">
            {PRESET_LOGOS.map((logo) => (
              <button
                key={logo.id}
                onClick={() => isCreator && !auctionStarted && setSelectedLogo(logo.emoji)}
                disabled={!isCreator || auctionStarted}
                className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl transition-all ${
                  selectedLogo === logo.emoji
                    ? 'bg-[var(--accent-gold)]/20 border-2 border-[var(--accent-gold)]'
                    : 'bg-[var(--bg-tertiary)] border border-[var(--glass-border)] hover:border-[var(--accent-gold)]/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={logo.label}
              >
                {logo.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* IPL Season Year */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            IPL Season Year
          </label>
          <select
            value={iplSeasonYear}
            onChange={(e) => setIplSeasonYear(parseInt(e.target.value))}
            disabled={!isCreator || auctionStarted}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                IPL {year}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Match scores will be fetched from this IPL season
          </p>
        </div>

        {/* League Code */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            League Code
          </label>
          <div className="flex gap-3">
            <div className="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] font-mono text-lg tracking-wider">
              {currentGame?.code || '------'}
            </div>
            <button
              onClick={copyGameCode}
              className="px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Share this code with players to let them join
          </p>
        </div>

        {/* Allow Players to Join */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Allow Players to Join
              </label>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {joiningAllowed ? 'Players can join using the game code' : 'Game is closed to new players'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => isCreator && !auctionStarted && setJoiningAllowed(true)}
                disabled={!isCreator || auctionStarted}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  joiningAllowed
                    ? 'bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--glass-border)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Yes
              </button>
              <button
                onClick={() => isCreator && !auctionStarted && setJoiningAllowed(false)}
                disabled={!isCreator || auctionStarted}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !joiningAllowed
                    ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--glass-border)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* Upload Cricketer List */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Upload Cricketer List
              </label>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {currentGame?.cricketersUploaded
                  ? `${currentGame._count?.cricketers || 0} cricketers loaded`
                  : 'Upload a CSV file with cricketer data'}
              </p>
            </div>
            {isCreator && !auctionStarted && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload CSV'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upload Rulebook */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Rulebook
              </label>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {currentGame?.rulebookUrl ? 'Rulebook uploaded' : 'No rulebook uploaded'}
              </p>
            </div>
            <div className="flex gap-2">
              {currentGame?.rulebookUrl && (
                <button
                  onClick={handleDownloadRulebook}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Download
                </button>
              )}
              {isCreator && !auctionStarted && (
                <>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                  >
                    Upload PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Participants ({currentGame?.participants?.length || 0})
          </label>
          <div className="space-y-2">
            {currentGame?.participants?.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-lg">
                  {p.user?.avatarUrl || '👤'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {p.user?.teamName || p.user?.name}
                    {p.userId === user?.id && (
                      <span className="ml-2 text-xs text-[var(--accent-cyan)]">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {p.userId === currentGame?.createdById ? 'Auctioneer' : 'Player'}
                  </p>
                </div>
              </div>
            ))}
            {(!currentGame?.participants || currentGame.participants.length === 0) && (
              <p className="text-[var(--text-tertiary)] text-sm text-center py-4">
                No participants yet
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {isCreator && !auctionStarted && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-secondary flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={handleStartAuction}
                disabled={!isAuctionStartable || isStartingAuction}
                className="btn-primary flex-1"
                title={!isAuctionStartable ? 'Upload cricketers and have at least 2 players to start' : ''}
              >
                {isStartingAuction ? 'Starting...' : 'Start Auction'}
              </button>
            </>
          )}
          {!isCreator && !auctionStarted && (
            <button
              onClick={handleJoinGame}
              className="btn-primary flex-1"
            >
              Joined
            </button>
          )}
          {auctionStarted && (
            <button
              onClick={() => navigate(`/game/${currentGame?.id}/live`)}
              className="btn-primary flex-1"
            >
              Go to Auction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <GamePageWrapper>
      <SetupPageContent />
    </GamePageWrapper>
  );
}

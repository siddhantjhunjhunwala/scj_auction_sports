import { useState } from 'react';
import { LoadingButton } from '../ui/LoadingSpinner';

interface JoinGameModalProps {
  isOpen: boolean;
  gameName: string;
  onJoin: (teamName: string, avatarUrl: string) => Promise<void>;
  onCancel: () => void;
}

// Funny cartoon avatar options
const AVATAR_OPTIONS = [
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'pirate', emoji: '🏴‍☠️', label: 'Pirate' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'vampire', emoji: '🧛', label: 'Vampire' },
  { id: 'superhero', emoji: '🦸', label: 'Hero' },
  { id: 'detective', emoji: '🕵️', label: 'Detective' },
  { id: 'astronaut', emoji: '👨‍🚀', label: 'Astronaut' },
  { id: 'chef', emoji: '👨‍🍳', label: 'Chef' },
  { id: 'rockstar', emoji: '🎸', label: 'Rockstar' },
  { id: 'king', emoji: '👑', label: 'Royalty' },
];

export default function JoinGameModal({ isOpen, gameName, onJoin, onCancel }: JoinGameModalProps) {
  const [teamName, setTeamName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].emoji);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = teamName.trim();
    if (trimmedName.length < 3) {
      setError('Team name must be at least 3 characters');
      return;
    }
    if (trimmedName.length > 20) {
      setError('Team name must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      setError('Team name can only contain letters, numbers, and spaces');
      return;
    }

    try {
      setIsJoining(true);
      await onJoin(trimmedName, selectedAvatar);
    } catch (err) {
      setError('Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card-glow p-6 animate-slide-up">
        <h2 className="text-2xl font-display text-[var(--text-primary)] mb-2">
          Join Game
        </h2>
        <p className="text-[var(--text-tertiary)] mb-6">
          Set up your team for <span className="text-[var(--accent-gold)]">{gameName}</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Team Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError(null);
              }}
              placeholder="Enter your team name"
              maxLength={20}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--glass-border)]
                rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20
                focus:outline-none transition-all"
              autoFocus
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              3-20 characters, letters, numbers, and spaces only
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Choose Your Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.emoji)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                    transition-all hover:scale-110 ${
                      selectedAvatar === avatar.emoji
                        ? 'bg-[var(--accent-gold)]/20 border-2 border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30'
                        : 'bg-[var(--bg-tertiary)] border border-[var(--glass-border)] hover:border-[var(--accent-gold)]/50'
                    }`}
                  title={avatar.label}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-2xl">
                {selectedAvatar}
              </div>
              <div>
                <p className="font-display text-[var(--text-primary)]">
                  {teamName || 'Your Team Name'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">Ready to bid!</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm mb-4 animate-slide-up">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary py-3"
              disabled={isJoining}
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              isLoading={isJoining}
              loadingText="Joining..."
              disabled={!teamName.trim()}
              className="flex-1 py-3"
            >
              Join Game
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

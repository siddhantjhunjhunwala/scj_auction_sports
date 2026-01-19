import { useCallback, useRef, useState, useEffect } from 'react';

// Sound URLs (using free sound effects)
const SOUNDS = {
  bid: '/sounds/bid.mp3',
  win: '/sounds/win.mp3',
  countdown: '/sounds/countdown.mp3',
  timer: '/sounds/timer.mp3',
  notification: '/sounds/notification.mp3',
} as const;

type SoundName = keyof typeof SOUNDS;

// Create audio context lazily
let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Generate sounds programmatically using Web Audio API
function createSound(type: SoundName): () => void {
  return () => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'bid':
          oscillator.frequency.setValueAtTime(880, now);
          oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;

        case 'win':
          // Triumphant chord
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now + i * 0.05);
            osc.stop(now + 0.8);
          });
          return;

        case 'countdown':
          oscillator.frequency.setValueAtTime(440, now);
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;

        case 'timer':
          oscillator.frequency.setValueAtTime(660, now);
          oscillator.frequency.setValueAtTime(550, now + 0.1);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;

        case 'notification':
          oscillator.frequency.setValueAtTime(587.33, now);
          oscillator.frequency.setValueAtTime(880, now + 0.1);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
      }
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  };
}

// Global mute state
let globalMuted = false;
const muteListeners = new Set<(muted: boolean) => void>();

export function useSound() {
  const [isMuted, setIsMuted] = useState(globalMuted);
  const soundsRef = useRef<Record<SoundName, () => void>>({
    bid: createSound('bid'),
    win: createSound('win'),
    countdown: createSound('countdown'),
    timer: createSound('timer'),
    notification: createSound('notification'),
  });

  useEffect(() => {
    const listener = (muted: boolean) => setIsMuted(muted);
    muteListeners.add(listener);
    return () => {
      muteListeners.delete(listener);
    };
  }, []);

  const play = useCallback((sound: SoundName) => {
    if (!globalMuted) {
      soundsRef.current[sound]();
    }
  }, []);

  const toggleMute = useCallback(() => {
    globalMuted = !globalMuted;
    muteListeners.forEach(listener => listener(globalMuted));
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    globalMuted = muted;
    muteListeners.forEach(listener => listener(muted));
  }, []);

  return {
    play,
    isMuted,
    toggleMute,
    setMuted,
  };
}

// Sound indicator component
export function SoundIndicator() {
  const { isMuted, toggleMute } = useSound();

  return (
    <button
      className={`sound-indicator ${isMuted ? 'muted' : ''}`}
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      ) : (
        <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      )}
    </button>
  );
}

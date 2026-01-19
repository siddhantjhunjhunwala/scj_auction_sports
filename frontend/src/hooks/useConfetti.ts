import confetti from 'canvas-confetti';
import { useCallback } from 'react';

export function useConfetti() {
  const fireConfetti = useCallback((options?: confetti.Options) => {
    const defaults: confetti.Options = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#FBBF24', '#06B6D4', '#10B981', '#8B5CF6'],
    };

    confetti({
      ...defaults,
      ...options,
    });
  }, []);

  const fireWinnerConfetti = useCallback(() => {
    // First burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#F59E0B', '#FBBF24', '#FFD700'],
      ticks: 300,
    });

    // Side bursts
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F59E0B', '#FBBF24', '#06B6D4'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F59E0B', '#FBBF24', '#06B6D4'],
      });
    }, 200);

    // Final burst
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.35 },
        colors: ['#F59E0B', '#FBBF24', '#10B981', '#8B5CF6'],
        ticks: 400,
      });
    }, 400);
  }, []);

  const fireBidConfetti = useCallback(() => {
    // Smaller confetti for bid placement
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#FBBF24'],
      ticks: 150,
      gravity: 1.2,
      scalar: 0.8,
    });
  }, []);

  const fireSchoolPride = useCallback((duration = 3000) => {
    const end = Date.now() + duration;
    const colors = ['#F59E0B', '#FBBF24'];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const fireStars = useCallback(() => {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['star' as const],
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    };

    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
    });

    confetti({
      ...defaults,
      particleCount: 20,
      scalar: 0.75,
    });
  }, []);

  return {
    fireConfetti,
    fireWinnerConfetti,
    fireBidConfetti,
    fireSchoolPride,
    fireStars,
  };
}

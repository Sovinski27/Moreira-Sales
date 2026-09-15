import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  // Disparo central inicial
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#059669', '#10B981', '#F59E0B', '#D97706', '#EF4444']
  });

  // Disparo em canhões laterais após 200ms
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#059669', '#F59E0B', '#3B82F6']
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#059669', '#F59E0B', '#EC4899']
    });
  }, 250);
}

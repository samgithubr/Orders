// Simple subtle chime using Web Audio API to notify on newly detected files
let audioCtx: AudioContext | null = null;

export function playNewFileChime() {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }

    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Two-tone pleasant notification chime (880Hz -> 1320Hz)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now + 0.08); // A6
    osc2.frequency.exponentialRampToValueAtTime(2093, now + 0.22); // C7

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  } catch {
    // Gracefully ignore audio errors (e.g. autoplay policies)
  }
}

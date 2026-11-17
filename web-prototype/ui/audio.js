import { getSoundCue } from './sound-bank.js';

export function createAudioFeedback(isEnabled, getVolume = () => 1) {
  let context = null;
  let master = null;
  let generation = 0;
  const voices = new Set();
  const volume = () => {
    const value = getVolume();
    return isEnabled() && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  };
  function silence() {
    generation += 1;
    for (const voice of voices) {
      try { voice.stop(); } catch {}
    }
    voices.clear();
  }
  function sync() {
    const value = volume();
    if (master) master.gain.setValueAtTime(value, context.currentTime);
    if (value === 0) silence();
  }

  function schedule(kind, rarity) {
    const notes = getSoundCue(kind, rarity);
    if (voices.size + notes.length > 16) silence();
    for (const [index, frequency] of notes.entries()) {
      const startAt = context.currentTime + index * 0.08;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.06, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2);
      oscillator.connect(gain);
      gain.connect(master);
      voices.add(oscillator);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.22);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    }
  }

  return {
    play(kind, { rarity, fromGesture = false } = {}) {
      if (volume() === 0) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!context && fromGesture && AudioContextClass) {
          context = new AudioContextClass();
          master = context.createGain();
          master.connect(context.destination);
        }
        if (!context) return;
        sync();
        if (context.state === 'running') schedule(kind, rarity);
        else if (fromGesture) {
          const requestedGeneration = generation;
          context.resume().then(() => {
            if (generation === requestedGeneration && volume() > 0) { sync(); schedule(kind, rarity); }
          }).catch(() => {});
        }
      } catch {}
    },
    sync,
    suspend() {
      silence();
      if (context?.state === 'running') context.suspend().catch(() => {});
    }
  };
}

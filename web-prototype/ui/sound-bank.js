// Original synthesized interface cues; no external audio samples or music licenses.
export const SOUND_CUES = {
  gacha: [523.25, 659.25, 783.99],
  merge: [329.63, 440, 659.25],
  boss: [261.63, 392, 523.25],
  prestige: [261.63, 392, 523.25, 783.99, 1046.5],
  research: [440, 554.37, 880],
  reward: [659.25, 880],
  equip: [392, 523.25]
};
export function getSoundCue(kind, rarity) {
  if (kind === 'gacha' && rarity === 'UR') return [523.25, 659.25, 783.99, 1046.5, 1318.51];
  if (kind === 'gacha' && rarity === 'SR') return [523.25, 659.25, 783.99, 1046.5];
  return SOUND_CUES[kind] || SOUND_CUES.gacha;
}

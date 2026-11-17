import assert from 'node:assert/strict';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { hydrateSettings, shouldReduceMotion } from '../web-prototype/game/settings.js';
import { parseSave, serializeState } from '../web-prototype/game/storage.js';
import { advanceCombat, advanceMining, getDerivedStats } from '../web-prototype/game/systems.js';
import { createAudioFeedback } from '../web-prototype/ui/audio.js';
import { SOUND_CUES, getSoundCue } from '../web-prototype/ui/sound-bank.js';

const cues = [...Object.keys(SOUND_CUES).map((kind) => getSoundCue(kind)), getSoundCue('gacha','SR'), getSoundCue('gacha','UR')];
assert.equal(cues.length, 9);
assert.equal(new Set(cues.map((notes) => notes.join(','))).size, 9);
assert.ok(cues.every((notes) => notes.length <= 5 && notes.every((frequency) => Number.isFinite(frequency) && frequency > 0)));

const legacy = hydrateState({ settings: { soundEnabled: true } });
assert.deepEqual(legacy.settings, {soundEnabled: true, soundVolume: 0.5, reduceMotion: false, locale:null,supporterColor:'violet'});
for (const value of [null, undefined, '100', NaN, Infinity]) assert.equal(hydrateSettings({soundVolume:value}).soundVolume, 0.5);
assert.equal(hydrateSettings({soundVolume:-1}).soundVolume, 0);
assert.equal(hydrateSettings({soundVolume:2}).soundVolume, 1);
assert.equal(hydrateSettings({soundEnabled:'true',reduceMotion:'true'}).reduceMotion, false);
assert.equal(shouldReduceMotion({reduceMotion:false}, true), true);
assert.equal(shouldReduceMotion({reduceMotion:true}, false), true);
assert.equal(shouldReduceMotion({reduceMotion:false}, false), false);
legacy.settings = {soundEnabled:true,soundVolume:0.35,reduceMotion:true,locale:'ja',supporterColor:'violet'};
assert.deepEqual(parseSave(serializeState(legacy)).settings, legacy.settings);
const quiet = createInitialState();
const animated = hydrateState(quiet);
quiet.settings = {soundEnabled:false,soundVolume:0,reduceMotion:true};
animated.settings = {soundEnabled:true,soundVolume:1,reduceMotion:false};
for (const s of [quiet, animated]) { advanceMining(s, 100000); advanceCombat(s, 100000, () => 0); }
assert.deepEqual(getDerivedStats(quiet), getDerivedStats(animated));
assert.equal(quiet.profile.ore, animated.profile.ore);
assert.deepEqual(quiet.combat, animated.combat);

// Deferred audio unlock must not play a stale reward after mute or app suspension.
const originalWindow = globalThis.window;
const instances = [];
class FakeAudioContext {
  state = 'suspended';
  currentTime = 0;
  destination = {};
  gains = [];
  voices = [];
  constructor() { instances.push(this); }
  createGain() {
    const values = [];
    const node = {values, gain:{ setValueAtTime(v) { values.push(v); }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = { frequency:{value:0}, stops:[], connect() {}, disconnect() {}, start() {}, stop(at) { this.stops.push(at); } };
    this.voices.push(node);
    return node;
  }
  resume() { return new Promise((resolve) => { this.unlock = () => { this.state = 'running'; resolve(); }; }); }
  async suspend() { this.state = 'suspended'; }
}
try {
  globalThis.window = {AudioContext: FakeAudioContext};
  let enabled = true;
  let volume = 0.5;
  const audio = createAudioFeedback(() => enabled, () => volume);
  audio.play('boss');
  assert.equal(instances.length, 0); // No context creation without a gesture.
  audio.play('gacha', {fromGesture:true});
  const context = instances[0];
  enabled = false;
  audio.sync();
  context.unlock();
  await Promise.resolve();
  assert.equal(context.voices.length, 0);
  enabled = true;
  audio.play('gacha', {fromGesture:true});
  assert.equal(context.voices.length, 3);
  volume = 0.2;
  audio.sync();
  assert.equal(context.gains[0].values.at(-1), 0.2);
  volume = 0;
  audio.sync();
  assert.ok(context.voices.every((voice) => voice.stops.at(-1) === undefined));
  audio.play('boss', {fromGesture:true});
  assert.equal(context.voices.length, 3);
  audio.suspend();
  volume = 0.5;
  audio.play('merge', {fromGesture:true});
  audio.suspend();
  context.unlock();
  await Promise.resolve();
  assert.equal(context.voices.length, 3);
  for (let i=0;i<20;i++) audio.play('prestige',{fromGesture:true});
  assert.ok(context.voices.filter((voice)=>voice.stops.length===1).length<=16);
  globalThis.window = {};
  assert.doesNotThrow(() => createAudioFeedback(() => true).play('boss', {fromGesture:true}));
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
console.log('Settings checks passed: legacy/default/clamped values, backup, economy independence, motion policy, live volume and stale audio cancellation.');

import { createInitialState, hydrateState, SAVE_KEY } from './state.js';
import { applyOfflineProgress } from './systems.js';

export const BACKUP_KEY = `${SAVE_KEY}-backup`;
export const RECOVERY_KEY = `${SAVE_KEY}-recovery`;
export const BEFORE_RESTORE_KEY = `${SAVE_KEY}-before-restore`;
const FORMAT = 'auto-drill-galaxy';
const VERSION = 1;
const MAX_BYTES = 2_000_000;

const saveError = (messageKey, message) => Object.assign(new Error(message), {messageKey});

// Detect accidental truncation/edits, not a security or anti-cheat signature.
function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

export function serializeState(state, now = Date.now()) {
  const clean = hydrateState(state);
  clean.profile.lastSeenAt = now;
  const { session, ...data } = clean;
  const payload = JSON.stringify(data);
  return JSON.stringify({ format: FORMAT, version: VERSION, checksum: checksum(payload), payload });
}

export function parseSave(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES) throw saveError('save.invalidSize', '백업 크기를 확인해 주세요.');
  let value;
  try { value = JSON.parse(text); } catch { throw saveError('save.invalidFormat', '백업 형식을 읽을 수 없습니다.'); }
  if (value?.format !== undefined || value?.version !== undefined) {
    if (value.format !== FORMAT || value.version !== VERSION) throw saveError('save.unsupportedVersion', '지원하지 않는 백업 버전입니다. 최신 앱에서 확인해 주세요.');
    if (typeof value.payload !== 'string' || checksum(value.payload) !== value.checksum) throw saveError('save.damaged', '백업이 손상되었습니다.');
    try { value = JSON.parse(value.payload); } catch { throw saveError('save.damagedPayload', '백업 내용이 손상되었습니다.'); }
  }
  if (!value || Array.isArray(value) || !value.profile || !value.ship || !value.combat ||
      typeof value.profile !== 'object' || typeof value.ship !== 'object' || typeof value.combat !== 'object' ||
      !Number.isFinite(value.profile.ore) || !Number.isFinite(value.combat.wave) || value.combat.wave < 1) {
    throw saveError('save.notGame', '게임 진행 데이터가 아닙니다.');
  }
  return hydrateState(value);
}

export function createSaveStore(getStorage = () => globalThis.localStorage, now = Date.now) {
  let blocked = false;
  let message = '';
  let messageKey = '';
  function load() {
    blocked = false;
    message = '';
    messageKey = '';
    try {
      const storage = getStorage();
      const primary = storage.getItem(SAVE_KEY);
      const backup = storage.getItem(BACKUP_KEY);
      if (!primary && !backup) return createInitialState();
      let state;
      try { state = parseSave(primary); }
      catch (error) {
        // A newer app's save must not be replaced by an older backup automatically.
        if (primary && error.messageKey === 'save.unsupportedVersion') throw error;
        state = parseSave(backup);
        message = '자동 백업에서 진행을 복구했습니다. 저장 메뉴에서 백업을 보관해 주세요.';
        messageKey = 'save.recovered';
      }
      applyOfflineProgress(state, now());
      if (!save(state)) {
        message = '불러온 진행을 저장하지 못했습니다. 저장 메뉴에서 백업을 보관해 주세요.';
        messageKey = 'save.loadedUnsaved';
      }
      return state;
    } catch (error) {
      blocked = true;
      messageKey = error.messageKey === 'save.unsupportedVersion' ? 'save.blockedVersion' : 'save.blocked';
      message = `저장을 읽지 못해 원본을 보존 중입니다. 자동 저장을 중단했습니다. 저장 메뉴에서 백업을 복원해 주세요.${error.messageKey === 'save.unsupportedVersion' ? ` ${error.message}` : ''}`;
      return createInitialState();
    }
  }
  function save(state) {
    if (blocked) return false;
    try {
      const storage = getStorage();
      const previous = storage.getItem(SAVE_KEY);
      if (previous) {
        let valid = false;
        try { parseSave(previous); valid = true; } catch { /* Preserve unreadable data. */ }
        if (valid) storage.setItem(BACKUP_KEY, previous);
        else if (!storage.getItem(RECOVERY_KEY)) storage.setItem(RECOVERY_KEY, previous);
      }
      const timestamp = now();
      storage.setItem(SAVE_KEY, serializeState(state, timestamp));
      state.profile.lastSeenAt = timestamp;
      if (['save.writeFailed','save.loadedUnsaved'].includes(messageKey)) { message = ''; messageKey = ''; }
      return true;
    } catch {
      message = '진행을 저장하지 못했습니다. 저장 공간을 확인하고 백업 코드를 보관해 주세요.';
      messageKey = 'save.writeFailed';
      return false;
    }
  }
  function restore(text, current) {
    const candidate = parseSave(text);
    const timestamp = now();
    // Imported offline time is consumed; ads use the stricter of both histories.
    candidate.profile.lastSeenAt = timestamp;
    candidate.monetization.lastRewardedAt = Math.max(current.monetization.lastRewardedAt, candidate.monetization.lastRewardedAt);
    candidate.monetization.rewardIds = [...new Set([...candidate.monetization.rewardIds, ...current.monetization.rewardIds])].slice(-100);
    const storage = getStorage();
    const originals = { primary: storage.getItem(SAVE_KEY), backup: storage.getItem(BACKUP_KEY) };
    // Both writes must succeed before replacing progress. Retain the first damaged original.
    storage.setItem(BEFORE_RESTORE_KEY, serializeState(current, timestamp));
    if (!storage.getItem(RECOVERY_KEY)) storage.setItem(RECOVERY_KEY, JSON.stringify(originals));
    storage.setItem(SAVE_KEY, serializeState(candidate, timestamp));
    Object.assign(current, candidate);
    blocked = false;
    message = '백업을 복원했습니다. 이전 진행은 복원 전 백업으로 보관했습니다.';
    messageKey = 'save.restored';
    return current;
  }
  return { load, save, restore, get message() { return message; }, get messageKey() { return messageKey; }, get blocked() { return blocked; },
    readPrevious: () => getStorage().getItem(BEFORE_RESTORE_KEY) };
}

export const saveStore = createSaveStore();
export const loadState = () => saveStore.load();
export const saveState = (state) => saveStore.save(state);

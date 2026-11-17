import { parseSave, serializeState, saveStore } from '../game/storage.js';

export function createSaveUI(state, { isBusy, onRestore, i18n }) {
  const t = (key, params) => i18n.t(key, params);
  const n = (value) => i18n.number(value);
  const errorText = (error) => t(error.messageKey || 'save.storageError');
  const dialog = document.getElementById('saveDialog');
  const code = document.getElementById('backupCode');
  const preview = document.getElementById('backupPreview');
  const message = document.getElementById('saveMessage');
  const apply = document.getElementById('applyBackupBtn');
  let reviewed = null;
  const invalidate = () => { reviewed = null; apply.disabled = true; preview.textContent = ''; };
  function review() {
    invalidate();
    try {
      const candidate = parseSave(code.value);
      reviewed = code.value;
      preview.textContent = t('save.preview', { wave:n(candidate.combat.wave), runs:n(candidate.prestige.runs), skills:n(candidate.skills.length), dm:n(candidate.profile.darkMatter) });
      apply.disabled = isBusy();
      message.textContent = t('save.reviewMessage');
    } catch (error) { message.textContent = errorText(error); }
  }
  document.getElementById('saveBtn').onclick = () => {
    invalidate();
    code.value = '';
    message.textContent = t(saveStore.messageKey || 'save.auto');
    dialog.showModal();
  };
  document.getElementById('closeSaveBtn').onclick = () => dialog.close();
  code.oninput = invalidate;
  document.getElementById('exportBackupBtn').onclick = () => {
    invalidate();
    code.value = serializeState(state);
    code.focus();
    code.select();
    message.textContent = t('save.exported');
  };
  document.getElementById('reviewBackupBtn').onclick = review;
  document.getElementById('previousBackupBtn').onclick = () => {
    invalidate();
    try {
      const previous = saveStore.readPrevious();
      if (!previous) { message.textContent = t('save.noPrevious'); return; }
      code.value = previous;
      review();
    } catch { message.textContent = t('save.storageError'); }
  };
  apply.onclick = () => {
    if (isBusy() || reviewed === null || reviewed !== code.value) return;
    try {
      saveStore.restore(reviewed, state);
      invalidate();
      onRestore();
      message.textContent = t(saveStore.messageKey);
    } catch (error) {
      message.textContent = t('save.failed', {error:errorText(error)});
    }
  };
  return { get open() { return dialog.open; } };
}

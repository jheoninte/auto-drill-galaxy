import { shouldReduceMotion } from '../game/settings.js';

export function createSettingsUI(state, { audio, persist, i18n }) {
  const dialog = document.getElementById('settingsDialog');
  const enabled = document.getElementById('soundEnabled');
  const volume = document.getElementById('soundVolume');
  const reduce = document.getElementById('reduceMotion');
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  const message = document.getElementById('settingsMessage');
  const language = document.getElementById('languageSelect');
  let messageKey = null;
  function render() {
    language.value = state.settings.locale || 'auto';
    if (messageKey) message.textContent = i18n.t(messageKey);
    document.documentElement.dataset.reducedMotion = String(shouldReduceMotion(state.settings, system.matches));
    enabled.checked = state.settings.soundEnabled;
    volume.value = String(Math.round(state.settings.soundVolume * 100));
    document.getElementById('volumeValue').textContent = `${volume.value}%`;
    volume.setAttribute('aria-valuetext', `${volume.value}%`);
    reduce.checked = state.settings.reduceMotion;
    document.getElementById('motionStatus').textContent = system.matches
      ? i18n.t('settings.systemMotion')
      : i18n.t('settings.motionHint');
    document.getElementById('testSoundBtn').disabled = !enabled.checked || state.settings.soundVolume === 0;
  }
  function change() {
    audio.sync();
    const saved = persist();
    messageKey = saved ? 'settings.saved' : 'errors.save';
    render();
  }
  language.onchange = () => {
    state.settings.locale = language.value === 'auto' ? null : language.value;
    i18n.setLocale(state.settings.locale);
    change();
  };
  enabled.onchange = () => {
    state.settings.soundEnabled = enabled.checked;
    change();
    if (enabled.checked) audio.play('gacha', { fromGesture: true });
  };
  volume.oninput = () => {
    state.settings.soundVolume = Math.max(0, Math.min(100, Number(volume.value))) / 100;
    audio.sync();
    document.getElementById('volumeValue').textContent = `${volume.value}%`;
    volume.setAttribute('aria-valuetext', `${volume.value}%`);
    document.getElementById('testSoundBtn').disabled = !state.settings.soundEnabled || state.settings.soundVolume === 0;
  };
  volume.onchange = change;
  reduce.onchange = () => { state.settings.reduceMotion = reduce.checked; change(); };
  document.getElementById('testSoundBtn').onclick = () => {
    const [kind, rarity] = document.getElementById('soundPreview').value.split(':');
    audio.play(kind, { rarity, fromGesture: true });
  };
  document.getElementById('settingsBtn').onclick = () => {
    messageKey = null;
    message.textContent = '';
    render();
    dialog.showModal();
    dialog.scrollTop = 0;
  };
  document.getElementById('closeSettingsBtn').onclick = () => dialog.close();
  system.addEventListener('change', render);
  render();
  return { render, get open() { return dialog.open; } };
}

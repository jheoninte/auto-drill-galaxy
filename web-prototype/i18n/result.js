// Game/platform results carry stable keys and values, never a UI language dependency.
export function formatResult(i18n, result) {
  if (!result) return '';
  if (!result.messageKey) return result.message || '';
  const params = { ...result.messageParams };
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number') params[key] = i18n.number(value);
  }
  for (const [key, value] of Object.entries(result.messageParamKeys || {})) params[key] = i18n.t(value);
  if (result.skill) params.name = i18n.t(`skills.${result.skill.id}`);
  if (result.messageKey === 'event.offline') {
    const seconds = Math.floor(result.durationMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const n = (value) => i18n.number(value);
    params.duration = hours && minutes ? i18n.t('time.hoursMinutes', {hours:n(hours), minutes:n(minutes)})
      : hours ? i18n.t('time.hours', {value:n(hours)})
        : minutes ? i18n.t('time.minutes', {value:n(minutes)}) : i18n.t('time.seconds', {value:n(seconds)});
  }
  return i18n.t(result.messageKey, params);
}

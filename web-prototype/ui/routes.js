import { formatResult } from '../i18n/result.js';
import { ROUTES, isRouteUnlocked, getRouteProgress, claimRoute, trackRoute, equipRoute, getRouteTheme } from '../game/routes.js';

export function createRouteUI(state, { onChange, isBusy, dialog, i18n }) {
  const t = (key, params) => i18n.t(key, params);
  const n = (value) => i18n.number(Math.floor(value));
  const titleOf = (entry) => t(`routes.${entry.id}.${entry.metric === 'campaignClaims' ? 'name' : 'title'}`);
  const themeOf = (entry) => entry ? t(`routes.${entry.id}.name`) : t('routes.defaultName');
  function act(action, soundCue = 'equip') {
    if (isBusy() || document.hidden) return;
    const result = action();
    document.getElementById('expeditionMessage').textContent = formatResult(i18n,result);
    if (result.ok) onChange({ ...result, soundCue });
    render();
  }
  const cards = ROUTES.map((entry) => {
    const card = document.createElement('section');
    card.className = 'product route-product';
    const title = document.createElement('h3');
    const description = document.createElement('p');
    description.className = 'stat';
    const motto = document.createElement('p');
    motto.className = 'goal';
    const reward = document.createElement('p');
    reward.className = 'route-reward';
    reward.style.setProperty('--route-color', entry.color);
    const swatch = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    swatch.setAttribute('class', 'route-swatch');
    swatch.setAttribute('viewBox', '0 0 50 10');
    swatch.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for (const [key, value] of Object.entries({x1:0,x2:50,y1:5,y2:5,stroke:entry.color,'stroke-width':3,'stroke-dasharray':entry.dash.join(' ')})) line.setAttribute(key, String(value));
    swatch.append(line);
    reward.append(swatch, document.createTextNode(''));
    const progress = document.createElement('p');
    progress.className = 'stat';
    const actions = document.createElement('div');
    actions.className = 'actions';
    const track = document.createElement('button');
    track.className = 'alt';
    const claim = document.createElement('button');
    track.onclick = () => act(() => trackRoute(state, state.prestige.routes.tracked === entry.id ? null : entry.id));
    claim.onclick = () => act(() => state.prestige.routes.claimed.includes(entry.id) ? equipRoute(state, entry.id) : claimRoute(state, entry.id), state.prestige.routes.claimed.includes(entry.id) ? 'equip' : 'reward');
    actions.append(track, claim);
    card.append(title, motto, description, reward, progress, actions);
    document.getElementById('routeList').append(card);
    return {entry, progress, track, claim,title,description,motto,reward};
  });
  document.getElementById('defaultRouteBtn').onclick = () => act(() => equipRoute(state, null));
  function render() {
    const routes = state.prestige.routes;
    const unlocked = isRouteUnlocked(state);
    const tracked = ROUTES.find((entry) => entry.id === routes.tracked);
    const theme = getRouteTheme(state);
    const notice = document.getElementById('routeNotice');
    notice.hidden = !unlocked;
    notice.textContent = tracked
      ? t('routes.notice',{name:titleOf(tracked),value:n(getRouteProgress(state,tracked)),target:n(tracked.target),status:routes.claimed.includes(tracked.id) ? t('routes.unlockedSuffix') : ''})
      : t('routes.openNotice');
    let ready = 0;
    for (const {entry, progress, track, claim,title,description,motto,reward} of cards) {
      const value = getRouteProgress(state, entry);
      const claimed = routes.claimed.includes(entry.id);
      if (unlocked && !claimed && value >= entry.target) ready++;
      if (!dialog.open) continue;
      title.textContent=titleOf(entry);
      description.textContent=entry.metric === 'campaignClaims'
        ? t('campaign.routeRequirement',{count:n(entry.target)})
        : t(`routes.${entry.id}.description`,{target:n(entry.target)});
      motto.textContent=t(`routes.${entry.id}.${entry.metric === 'campaignClaims' ? 'description' : 'motto'}`);
      reward.lastChild.textContent=`${themeOf(entry)} · ${t('campaign.cosmetic')}`;
      progress.textContent = `${n(value)} / ${n(entry.target)}${claimed ? t('routes.unlockedSuffix') : ''}`;
      track.textContent = t(routes.tracked === entry.id ? 'routes.untrack' : 'routes.track',{name:titleOf(entry)});
      track.setAttribute('aria-pressed', String(routes.tracked === entry.id));
      track.disabled = !unlocked || isBusy();
      claim.textContent = t(!unlocked ? 'routes.lockedButton' : routes.equipped === entry.id ? 'routes.using' : claimed ? 'routes.use' : 'routes.unlockStyle',{name:themeOf(entry)});
      claim.disabled = !unlocked || isBusy() || routes.equipped === entry.id || (!claimed && value < entry.target);
    }
    if (dialog.open) {
      document.getElementById('routeStatus').textContent = unlocked
        ? t('routes.status',{count:n(routes.claimed.length),total:n(ROUTES.length),name:themeOf(theme)})
        : t('routes.locked');
      document.getElementById('defaultRouteBtn').disabled = routes.equipped === null || isBusy();
    }
    return ready;
  }
  return {render};
}

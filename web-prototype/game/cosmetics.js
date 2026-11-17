import { LAUNCH_CONTENT } from './launch-content.js';
export const SUPPORTER_COLORS = [{id:'violet',color:'#c084fc'},...LAUNCH_CONTENT.supporterShipColors];
export const normalizeSupporterColor = (id) => SUPPORTER_COLORS.some((entry) => entry.id === id) ? id : 'violet';
export function shipColor(state,supporter) {
  return supporter ? SUPPORTER_COLORS.find((entry) => entry.id === normalizeSupporterColor(state.settings.supporterColor)).color : '#67e8f9';
}
export function selectShipColor(state,id,supporter) {
  if (!supporter || !SUPPORTER_COLORS.some((entry) => entry.id === id)) return false;
  state.settings.supporterColor=id;
  return true;
}

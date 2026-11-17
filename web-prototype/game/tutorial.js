import { currentMission, missionProgress } from './campaign.js';
import { ECONOMY, getPrestigeGate } from './balance.js';

export const TUTORIAL_IDS = ['intro', 'first-skill', 'first-wave', 'rising-threat', 'merge', 'prestige', 'campaign', 'lab'];

export function createTutorial(state, onShow = () => {}) {
  let current = null;
  let remainingMs = 0;
  const canMerge = () => state.loot.iron >= ECONOMY.mergeIronCost && state.loot.crystal >= ECONOMY.mergeCrystalCost;
  const steps = [
    { id: 'intro', when: () => state.skills.length === 0, text: () => '자동으로 광석이 모입니다. 첫 스킬을 뽑아 보세요.', targetId: () => 'gachaBtn' },
    { id: 'first-skill', when: () => state.skills.length > 0, text: () => '스킬 획득! 종류에 따라 채굴·공격·치명타가 강화됩니다.' },
    { id: 'first-wave', when: () => state.prestige.bestWave >= 2, text: () => '첫 웨이브 돌파! 광석과 파츠 합성 재료를 획득했습니다.' },
    { id: 'rising-threat', when: () => state.prestige.bestWave >= 4, text: () => '소행성이 점점 단단해집니다. 다음 스킬 비용을 확인하세요.', targetId: () => 'gachaBtn' },
    { id:'campaign', when:() => Boolean(currentMission(state) && missionProgress(state,currentMission(state)).complete), targetId:() => 'claimReadyBtn', text:() => '완료한 캠페인 보상을 받고 다음 목표를 확인하세요.' },
    {
      id: 'merge',
      when: () => canMerge() || state.ship.engine > 1,
      text: () => canMerge() ? '재료가 모였습니다. 파츠를 합성해 엔진과 리액터를 강화하세요.' : '파츠 강화 완료! 채굴량과 공격력이 함께 올랐습니다.',
      targetId: () => canMerge() ? 'mergeBtn' : null
    },
    { id:'lab', when:() => state.ship.engine > 1 || state.prestige.runs > 0, targetId:() => 'workshopBtn', text:() => '연구소가 열렸습니다. 플라스마로 모듈을 강화하고 적용하세요.' },
    {
      id: 'prestige',
      when: () => state.combat.wave >= getPrestigeGate(state),
      text: () => '프레스티지가 열렸습니다. 파츠·스킬을 유지하고 암흑물질을 얻으세요.',
      targetId: () => 'prestigeBtn'
    }
  ];

  return {
    tick(dtMs) {
      if (current) {
        remainingMs -= Math.max(0, dtMs);
        if (remainingMs > 0) return current;
        current = null;
        return null;
      }
      const next = steps.find((step) => !state.tutorial.seen.includes(step.id) && step.when());
      if (!next) return null;
      current = { id: next.id, text: next.text(), targetId: next.targetId?.() || null };
      remainingMs = 4000;
      state.tutorial.seen.push(next.id);
      onShow();
      return current;
    }
  };
}

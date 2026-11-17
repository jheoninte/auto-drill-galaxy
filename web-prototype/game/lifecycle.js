import { hydrateState } from './state.js';
import { applyOfflineProgress } from './systems.js';

// Capture once: pagehide/visibilitychange may both fire; SDK saves can occur while hidden.
export function createLifecycle(state, persist, now = Date.now) {
  let snapshot = null;
  return {
    suspend({ busy = false } = {}) {
      if (snapshot) return;
      snapshot = { state: hydrateState(state), busy };
      snapshot.state.profile.lastSeenAt = now();
      persist();
    },
    resume({ busy = false } = {}) {
      if (!snapshot) return false;
      const previous = snapshot;
      snapshot = null;
      if (!previous.busy && !busy) {
        const ore = previous.state.profile.ore;
        applyOfflineProgress(previous.state, now());
        const gain = previous.state.profile.ore - ore;
        state.profile.ore += gain;
        state.profile.totalOreMined += gain;
        if (gain > 0) {
          state.session.lastRewardSummary = previous.state.session.lastRewardSummary;
          state.session.lastRewardEvent = previous.state.session.lastRewardEvent;
        }
      }
      state.profile.lastSeenAt = now();
      persist();
      return true;
    }
  };
}

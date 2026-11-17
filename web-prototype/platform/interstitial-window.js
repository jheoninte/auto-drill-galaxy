// A short, foreground-only window after prestige. Never queue an ad across app suspension.
export function createInterstitialWindow(lifetimeMs = 15000) {
  let remainingMs = 0;
  return {
    enqueue() { remainingMs = lifetimeMs; },
    cancel() { remainingMs = 0; },
    tick(dtMs, {blocked = true, eligible = false} = {}) {
      if (remainingMs <= 0) return false;
      remainingMs -= Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
      if (remainingMs <= 0 || blocked) return false;
      remainingMs = 0;
      return eligible;
    }
  };
}

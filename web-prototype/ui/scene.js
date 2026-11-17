import { getWaveConfig } from '../game/balance.js';
import { getRouteTheme } from '../game/routes.js';
import { getEncounter } from '../game/encounters.js';
import { shouldReduceMotion } from '../game/settings.js';
import { shipColor } from '../game/cosmetics.js';
import { currentSector } from '../game/campaign.js';
import { createPlanetRenderer } from './planet.js';

export function createScene(canvas) {
  const context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const planet = createPlanetRenderer();
  let width = 1;
  let height = 1;
  let burstAgeMs = Infinity;
  let burstColor = '#67e8f9';

  function resize() {
    const bounds = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    planet.resetParticles();
  }

  return {
    resize,
    burst(isBoss = false) {
      burstAgeMs = 0;
      burstColor = isBoss ? '#fbbf24' : '#67e8f9';
    },
    draw(state, dtMs, supporter) {
      burstAgeMs += dtMs;
      const wave = getWaveConfig(state.combat.wave);
      const route = getRouteTheme(state);
      const encounter = getEncounter(state);
      const motionReduced = shouldReduceMotion(state.settings, reducedMotion.matches);
      const centerX = width * 0.39;
      const hudHeight = encounter ? 125 : 75;
      const freeHeight = Math.max(90, height - hudHeight);
      const centerY = freeHeight * 0.52;
      const orbitRadius = width * 0.43;
      const asteroidRadius = Math.min(136, width * 0.29, freeHeight * 0.43);
      const angle = motionReduced ? 0.2 : Math.sin(state.combat.orbitAngle) * 0.6;
      const shipX = centerX + Math.cos(angle) * orbitRadius;
      const shipY = centerY + Math.sin(angle) * freeHeight * 0.38;

      context.clearRect(0, 0, width, height);
      const sector = currentSector(state).order;
      context.fillStyle = ['#020617','#091326','#050816','#0a0f24','#0d1117'][sector-1];
      context.fillRect(0,0,width,height);
      context.strokeStyle = '#94a3b80c';
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x < width; x += 24) { context.moveTo(x, 0); context.lineTo(x, height); }
      for (let y = 0; y < height; y += 24) { context.moveTo(0, y); context.lineTo(width, y); }
      context.stroke();
      for (let index = 0; index < 65; index += 1) {
        context.fillStyle = index % 8 === 0 ? ['#38bdf8','#67e8f9','#c4b5fd','#fb7185','#fbbf24'][sector-1] : '#94a3b8';
        context.fillRect((index * 137) % width, (index * 71) % height, 1.5, 1.5);
      }
      context.strokeStyle = route ? `${route.color}88` : wave.isBoss ? '#f59e0b44' : '#60a5fa44';
      context.setLineDash(route?.dash || []);
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(centerX, centerY, orbitRadius, freeHeight * 0.38, 0, 0, Math.PI * 2);
      context.stroke();

      context.setLineDash([]);
      const surfaceColor = encounter?.color || (wave.isBoss ? '#fbbf24' : ['#67e8f9', '#a5b4fc', '#c4b5fd', '#fb7185', '#fbbf24'][sector - 1]);
      const target = planet.draw(context, {state, x:centerX, y:centerY, radius:asteroidRadius,
        color:surfaceColor, isBoss:wave.isBoss, dtMs, reduced:motionReduced});
      if (target.active) {
        context.strokeStyle = route?.color || surfaceColor;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(shipX, shipY);
        context.lineTo(target.x, target.y);
        context.stroke();
      }

      if (encounter) {
        context.strokeStyle = encounter.color;
        context.lineWidth = 2;
        context.setLineDash(encounter.phaseIndex === 0 ? [6, 4] : []);
        context.beginPath();
        context.arc(centerX, centerY, asteroidRadius + 7, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }

      context.save();
      context.translate(shipX, shipY);
      context.rotate(Math.atan2(target.y - shipY, target.x - shipX));
      context.fillStyle = shipColor(state,supporter);
      context.beginPath();
      context.moveTo(17, 0);
      context.lineTo(-11, -11);
      context.lineTo(-5, 0);
      context.lineTo(-11, 11);
      context.closePath();
      context.fill();
      context.restore();

      if (!motionReduced && burstAgeMs < 550) {
        const progress = burstAgeMs / 550;
        context.globalAlpha = 1 - progress;
        context.strokeStyle = burstColor;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(centerX, centerY, asteroidRadius + progress * orbitRadius, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
    }
  };
}

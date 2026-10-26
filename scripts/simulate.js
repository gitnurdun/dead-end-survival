import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';

// A deterministic, input-driven smoke run. No invulnerability, teleports, or forced kills.
// The bot presses forward, times jumps, fights, reloads, and visits shelter when hurt.
function play(seed) {
  const game = new Game(); game.newGame('nurse', seed);
  let t = 0, houseTime = 0, lastHouse = -1, jumps = 0;
  const dt = .02;
  while (t < 720 && !['dead', 'shop'].includes(game.mode)) {
    const p = game.player;
    if (game.mode === 'sheltered') {
      houseTime += dt;
      if (houseTime > 1) game.jumpOrShelter();
    } else {
      const obstacle = game.stage.platforms.find(b => b.solid && b.x > p.x + p.w && b.x - p.x - p.w < 95);
      if (p.grounded && obstacle) { game.jumpOrShelter(); jumps++; }
      if (p.pistol && p.weapon !== 'pistol' && p.magazine + p.reserve > 0) game.toggleWeapon();
      if (p.weapon === 'pistol' && !p.magazine) { if (p.reserve) game.reload(); else game.toggleWeapon(); }
      if (p.health <= 75) game.ability();
      const house = game.stage.houses.find(h => h.id !== lastHouse && !h.collapsed && h.remaining > 0 && Math.abs(h.x + h.w / 2 - (p.x + p.w / 2)) < 40);
      if (house && p.grounded && p.health < 85) { game.jumpOrShelter(); lastHouse = house.id; houseTime = 0; }
    }
    const target = game.enemies.some(e => e.x > p.x && e.x - p.x < (p.weapon === 'pistol' ? 650 : 115) && Math.abs(e.y + e.h - p.y - p.h) < 80);
    game.update(dt, { right: true, attack: target }); t += dt;
  }
  return { seed, state: game.mode, seconds: Math.round(t), progress: Math.round(game.maxDistance / game.stage.finishX * 100), health: game.player.health, kills: game.kills, money: game.money, jumps, enemies: game.enemies.length };
}
const start = performance.now();
const runs = Array.from({ length: 5 }, (_, i) => play(2900 + i));
console.log(JSON.stringify({ runs, simulationMilliseconds: Math.round(performance.now() - start) }, null, 2));
if (runs.some(run => run.seconds >= 720)) process.exitCode = 1;

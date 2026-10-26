import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';

// Geometry check, deliberately independent of combat balance: an invulnerable
// input-driven survivor must traverse every mission without teleporting.
const results = [];
for (const level of LEVELS) {
  const game = new Game(); game.selectLevel(level.id); game.spawnTimer = 1e8; game.player.invincible = 1e8;game.stage.mission.complete=true; // Check geometry independently of objective actions.
  let seconds = 0;
  while (seconds < 400 && game.mode !== 'shop') {
    const p = game.player, obstacle = game.stage.platforms.find(b => b.solid && b.x > p.x + p.w && b.x - p.x - p.w < 95);
    if (p.grounded && obstacle) game.jumpOrShelter();
    game.update(.035, { right: true }); seconds += .035;
  }
  results.push({ id: level.id, complete: game.mode === 'shop', seconds: Math.round(seconds) });
}
console.log(JSON.stringify({ missions: results.length, traversable: results.filter(r => r.complete).length, failed: results.filter(r => !r.complete) }, null, 2));
if (results.some(r => !r.complete)) process.exitCode = 1;

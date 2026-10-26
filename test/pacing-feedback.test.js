import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { makeStage } from '../src/world.js';
import { STAGE_LENGTH, FINISH_X, SHOP_X } from '../src/data.js';

function fresh() { const game = new Game(); game.newGame('civilian', 122); game.spawnTimer = 9999; return game; }

test('all missions use a half-length route with four shelters and bounded content', () => {
  assert.equal(STAGE_LENGTH, 24000);
  assert.equal(FINISH_X, 24300);
  assert.equal(SHOP_X, 24675);
  for (const level of LEVELS) {
    const stage = makeStage(level.seed, level.index + 1, level.id);
    assert.equal(stage.sections.at(-1).x + stage.sections.at(-1).length, 24000);
    assert.equal(stage.houses.length, 4);
    assert(stage.platforms.every(p => p.x + p.w < stage.finishX));
    assert(stage.pickups.every(p => p.x < stage.finishX));
    assert(stage.dogRescueX > stage.length / 3 && stage.dogRescueX < stage.length * 2 / 3);
  }
});
test('all kills pay and save immediately, while bonus drops are optional and independent', () => {
  const game = fresh(); let save;
  game.onSave = data => { save = structuredClone(data); };
  game.rng = () => .99;
  const walker = game.spawnEnemy('walker', 1400);
  game.damageEnemy(walker, 1000);
  assert.equal(game.money, 5); assert.equal(save.money, 5);
  assert.equal(game.stage.pickups.filter(p => p.bonus).length, 0);
  game.damageEnemy(walker, 1000); assert.equal(game.money, 5);
  game.rng = () => .1;
  const runner = game.spawnEnemy('runner', 1700);
  game.damageEnemy(runner, 1000); assert.equal(game.money, 12);
  const drop = game.stage.pickups.find(p => p.bonus);
  assert(drop); assert(drop.amount > 0); assert(!drop.collected);
  game.player.x = drop.x; game.update(.02);
  assert(drop.collected); assert.equal(game.money, 12 + drop.amount);
  game.update(.02); assert.equal(game.money, 12 + drop.amount);
});
test('shelter, gate victory, and death create distinct effects and audio events', () => {
  const game = fresh(), events = [];
  game.onEvent = e => events.push(e.type);
  game.enterHouse(game.stage.houses[0]);
  assert(game.effects.some(e => e.type === 'enter')); assert(events.includes('enter'));
  game.exitHouse(); assert(game.effects.some(e => e.type === 'exit')); assert(events.includes('exit'));
  game.player.x = game.stage.finishX; game.update(.02);
  assert(game.effects.some(e => e.type === 'victory')); assert(events.includes('safe'));
  game.safe = false; game.die();
  assert(game.effects.some(e => e.type === 'death')); assert(events.includes('dead'));
  game.animateVisuals(.4);
  assert(game.deathTime >= .4); assert(game.effects.find(e => e.type === 'death').life < 1.6);
});
test('shipped UI and mission/catalog text use English throughout', () => {
  const files = ['index.html', ...readdirSync(new URL('../src/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => `src/${f}`)];
  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert(!/[\u3400-\u9fff]/u.test(source), `${file} contains untranslated interface text`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { CATALOG, ReviewStore } from '../src/catalog.js';
import { moveBody, jumpVelocity } from '../src/physics.js';
import { makeStage, overlap } from '../src/world.js';
import { GROUND, WEAPONS, ENEMIES } from '../src/data.js';

function fresh() { const game = new Game(); game.newGame('civilian', 87); game.spawnTimer = 9999; return game; }
function ticks(game, seconds) { for (let t = 0; t < seconds; t += .02) game.update(.02); }

test('37 unique unlocked missions have playable terrain, four houses and corresponding museum records', () => {
  assert.equal(LEVELS.length, 37); assert.equal(new Set(LEVELS.map(l => l.id)).size, 37);
  for (const l of LEVELS) {
    assert(l.unlocked); const stage = makeStage(l.seed, l.index + 1, l.id);
    assert.equal(stage.level.id, l.id); assert.equal(stage.houses.length, 4); assert.equal(stage.profile, l.profile);
    assert(stage.platforms.some(p => p.variant === l.obstacle)); assert(CATALOG.some(e => e.level?.id === l.id));
    assert(!stage.pickups.some(p => p.kind === 'pistol'));
    for (const h of stage.hazards) assert(!stage.platforms.some(p => p.solid && p.x + p.w > h.x && p.x < h.x + h.w));
  }
});
test('one collision solver blocks all body types from either side of a car, including strong knockback', () => {
  const car = { x: 850, y: GROUND - 69, w: 150, h: 69, solid: true };
  for (const [w, h] of [[37, 65], [38, 61], [64, 90], [42, 28]]) {
    const body = { x: 850 - w - 2, y: GROUND - h, w, h, vy: 0, grounded: true };
    moveBody(body, 700, .035, [car]); assert(body.x + w <= 850); assert(!overlap(body, car));
    body.x = 1002; moveBody(body, -700, .035, [car]); assert(body.x >= 1000); assert(!overlap(body, car));
  }
});
test('infected climb a car with an actual airborne arc and never pass through its body', () => {
  for (const type of ['walker', 'runner', 'brute', 'spitter']) {
    const game = fresh(); game.player.x = 1900; game.player.invincible = 100;
    const e = game.spawnEnemy(type, 780), car = game.stage.platforms[0]; let airborne = false, crossed = false;
    for (let i = 0; i < 1000; i++) {
      game.update(.02); assert(!overlap(e, car), `${type} clipped through vehicle`);
      if (!e.grounded) airborne = true;
      if (e.x > car.x + car.w) { crossed = true; break; }
    }
    assert(airborne, `${type} did not jump`); assert(crossed, `${type} could not pass the car`);
  }
});
test('zombies cannot melee through a vehicle during an attack windup', () => {
  const game = fresh(); game.player.x = 1004; game.player.invincible = 0;
  const e = game.spawnEnemy('brute', 784); e.range = 400; e.phase = 'windup'; e.attackTarget = 'player'; e.timer = 0;
  game.update(.02); assert.equal(game.player.health, 100);
});
test('knockback also respects vehicle geometry for enemies', () => {
  const game = fresh(); game.player.x = 600; const e = game.spawnEnemy('brute', 1005);
  game.damageEnemy(e, 1, 700, -1); game.update(.035);
  const car = game.stage.platforms[0]; assert(!overlap(e, car)); assert(e.x >= 1000 || e.y + e.h <= car.y);
});
test('gravity variants preserve the maximum reachable jump height', () => {
  for (const gravity of [.62, .78, 1, 1.05]) {
    const b = { x: 0, y: GROUND - 65, w: 37, h: 65, vy: jumpVelocity(gravity), grounded: false }; let highest = b.y;
    for (let i = 0; i < 150; i++) { moveBody(b, 0, .01, [], { gravity }); highest = Math.min(highest, b.y); }
    assert(GROUND - 65 - highest > 125); assert(GROUND - 65 - highest < 138);
    assert.equal(b.y + b.h, GROUND);
  }
});
test('ice preserves momentum when movement input is released for players or enemies', () => {
  const b = { x: 110, y: GROUND - 65, w: 37, h: 65, vy: 0, grounded: true, momentum: 200 }, terrain = [{ x: 0, w: 500, type: 'ice' }];
  moveBody(b, 0, .02, [], { terrain }); assert(b.x > 113); assert(b.momentum > 180);
});
test('hazards damage both player and zombies; shelter and the safe zone protect the player', () => {
  const game = fresh(); game.stage.hazards = [{ x: 280, y: GROUND - 10, w: 100, h: 12, type: 'lava' }]; game.player.invincible = 0;
  const e = game.spawnEnemy('walker', 310); game.updateHazards(.02); assert.equal(game.player.health, 82); assert.equal(e.health, 25);
  game.enterHouse(game.stage.houses[0]); game.player.x = 280; game.player.hazardCooldown = 0; const hp = game.player.health; game.updateHazards(1); assert.equal(game.player.health, hp);
  game.exitHouse(); game.safe = true; game.player.x = 280; game.updateHazards(1); assert.equal(game.player.health, hp);
});
test('mission replay carries banked weapons and upgrades while keeping coins', () => {
  const game = fresh(); game.loadout.pistol = true; game.loadout.magazine = 8; game.loadout.reserve = 19; game.loadout.upgrades.bat = 3; game.loadout.upgrades.damage = 2; game.money = 865;
  assert(game.selectLevel('neptune')); assert.equal(game.levelId, 'neptune'); assert.equal(game.player.upgrades.damage, 2);
  assert(game.selectLevel('outbreak')); assert(game.player.pistol); assert.equal(game.player.upgrades.bat, 3); assert.equal(game.player.magazine, 8); assert.equal(game.money, 865);
  assert.equal(game.stage.level.difficulty, 1); assert(!game.selectLevel('nonexistent'));
});
test('completion records, campaign loadout and selected mission survive save/reload', () => {
  const game = fresh(); game.selectLevel('mars'); game.stage.mission.complete=true; game.player.pistol = true; game.player.upgrades.damage = 2; game.player.x = game.stage.finishX;
  game.update(.02); assert(game.completed.includes('mars')); assert(game.loadout.pistol);
  const save = structuredClone(game.save()), restored = fresh(); assert(restored.load(save)); assert.equal(restored.levelId, 'mars'); assert(restored.completed.includes('mars')); assert.equal(restored.loadout.upgrades.damage, 2);
});
test('museum covers every implemented weapon, enemy, house and mission', () => {
  assert.equal(CATALOG.filter(e => e.category === 'weapons').length, Object.keys(WEAPONS).length);
  assert.equal(CATALOG.filter(e => e.category === 'infected').length, Object.keys(ENEMIES).length);
  assert.equal(CATALOG.filter(e => e.house).length, 4);
  assert.equal(CATALOG.filter(e => e.category === 'missions').length, LEVELS.length);
  assert.equal(new Set(CATALOG.map(e => e.id)).size, CATALOG.length);
  for (const e of CATALOG) { assert(e.description); assert(e.tactics); assert(e.sound); }
});
test('museum review notes survive reload and export with the correct specimen metadata', () => {
  const values = new Map(), storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
  const reviews = new ReviewStore(storage); assert(reviews.set('infected-walker', '脚步可以更沉重', 'priority'));
  const restored = new ReviewStore(storage); assert.equal(restored.get('infected-walker').text, '脚步可以更沉重'); assert.equal(restored.get('infected-walker').status, 'priority');
  const exported = restored.export(); assert.equal(exported.entries[0].name, 'Walker'); assert(!reviews.set('missing', 'bad', 'priority'));
});
test('review notes remain exportable when browser storage is unavailable', () => {
  const store = new ReviewStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  assert.equal(store.set('weapon-pistol', '提高枪声层次', 'improve'), false); assert.equal(store.export().entries[0].text, '提高枪声层次');
});

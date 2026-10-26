import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { makeStage, defaultEquipment, segmentHitsRect } from '../src/world.js';
import { GROUND, GRAVITY, CHARACTERS, MAX_ENEMIES, SHOP_ITEMS } from '../src/data.js';

function fresh(character = 'civilian', seed = 1234) {
  const events = [], saves = [];
  const game = new Game({ onEvent: event => events.push(event), onSave: save => saves.push(structuredClone(save)) });
  game.newGame(character, seed); game.spawnTimer = 9999;
  game.events = events; game.saves = saves; return game;
}
function tick(game, seconds, input = {}) { for (let t = 0; t < seconds - .00001; t += .02) game.update(Math.min(.02, seconds - t), input); }
function equipPistol(game, rounds = 12) { Object.assign(game.player, { pistol: true, weapon: 'pistol', magazine: rounds, reserve: 36 }); }
function shop(game) { game.safe = true; game.mode = 'shop'; game.money = 5000; }

test('100 seeded stages have six middle sections, a fixed opening/ending, four clear houses, and no repeating weapon pickups', () => {
  for (let seed = 0; seed < 100; seed++) {
    const stage = makeStage(seed);
    assert.equal(stage.sections.length, 8); assert.equal(stage.sections[0].type, 'opening'); assert.equal(stage.sections.at(-1).type, 'ending');
    assert.equal(stage.houses.length, 4);
    assert(!stage.pickups.some(p => p.kind === 'pistol'));
    for (const h of stage.houses) assert(!stage.platforms.some(p => p.solid && p.x < h.x + h.w && p.x + p.w > h.x));
    assert(stage.platforms.every(p => !p.solid || p.h < 690 ** 2 / (2 * GRAVITY)));
    assert(stage.platforms.every(p => p.x >= 0 && p.x + p.w < stage.finishX));
    assert.equal(stage.sections.at(-1).x + stage.sections.at(-1).length, stage.length);
  }
});
test('route generation is reproducible and different seeds change actual terrain', () => {
  assert.deepEqual(makeStage(41), makeStage(41));
  assert.notDeepEqual(makeStage(41).platforms, makeStage(42).platforms);
  assert.deepEqual(makeStage(41).platforms[0], makeStage(42).platforms[0]);
});
test('all designed elevated routes can be reached through successive jumps', () => {
  const maxRise = 690 ** 2 / (2 * GRAVITY);
  for (let seed = 0; seed < 30; seed++) for (const p of makeStage(seed).platforms) if (!p.solid) {
    const source = makeStage(seed).platforms.find(b => b.x < p.x && p.x - (b.x + b.w) <= 80 && b.y > p.y && b.y - p.y < maxRise);
    assert(source, `Platform at ${p.x} lacks a reachable step in seed ${seed}`);
  }
});
test('jump lands on car, supports rooftop traversal, and walls stop horizontal movement', () => {
  const game = fresh(), p = game.player;
  p.x = 790; tick(game, .5, { right: true }); assert(p.x + p.w <= 850.01);
  game.jumpOrShelter(); tick(game, .4, { right: true }); tick(game, .5);
  assert.equal(p.y + p.h, GROUND - 69); assert(p.grounded);
});
test('doorway takes priority over jumping and entering hides the player state', () => {
  const game = fresh(), house = game.stage.houses[0];
  game.player.x = house.x + house.w / 2 - game.player.w / 2;
  game.jumpOrShelter(); assert.equal(game.mode, 'sheltered'); assert.equal(game.player.house, 0); assert.equal(game.player.vy, 0);
  game.jumpOrShelter(); assert.equal(game.mode, 'playing'); assert.equal(game.player.house, null);
});
test('each safe-house supply variant has finite persistent supplies', () => {
  const game = fresh(); equipPistol(game); game.player.health = 5;
  const [pantry, greenhouse, duplex, clinic] = game.stage.houses;
  game.enterHouse(pantry); assert.equal(pantry.remaining, 0); game.exitHouse(); game.enterHouse(pantry); assert.equal(pantry.remaining, 0); game.exitHouse();
  game.enterHouse(greenhouse); assert.equal(greenhouse.remaining, 1); tick(game, 4); game.exitHouse(); game.enterHouse(greenhouse); tick(game, 6.1); assert.equal(greenhouse.remaining, 0); game.exitHouse();
  game.enterHouse(duplex); assert.equal(duplex.remaining, 1); tick(game, 30); assert.equal(duplex.remaining, 1); game.exitHouse(); game.enterHouse(duplex); assert.equal(duplex.remaining, 0); game.exitHouse();
  game.enterHouse(clinic); tick(game, 2); assert.equal(clinic.remaining, 1); game.exitHouse(); game.enterHouse(clinic); tick(game, 3.1); assert.equal(clinic.remaining, 0);
});
test('shelter prevents damage and collapse ejects the player for exactly 12 health', () => {
  const game = fresh(), house = game.stage.houses[0];
  game.player.health = 70; game.enterHouse(house); const before = game.player.health;
  game.damagePlayer(99); assert.equal(game.player.health, before);
  game.hitHouse(house, 24); assert(house.collapsed); assert.equal(game.mode, 'playing'); assert.equal(game.player.house, null); assert.equal(game.player.health, before - 12); assert.equal(game.player.y + game.player.h, GROUND);
});
test('collapse damage can kill an occupant', () => {
  const game = fresh(); game.enterHouse(game.stage.houses[0]); game.player.health = 10;
  game.hitHouse(game.stage.houses[0], 24); assert.equal(game.mode, 'dead');
});
test('house attackers give up after 2–4 hits for 4–9 seconds and then return', () => {
  const game = fresh(), house = game.stage.houses[0]; game.enterHouse(house);
  const e = game.spawnEnemy('walker', house.x + 100);
  for (let i = 0; i < 1000 && e.wander <= 0; i++) game.update(.02);
  assert(e.houseHits >= 2 && e.houseHits <= 4); assert(e.wander >= 4 && e.wander <= 9);
  const health = house.health; tick(game, 3.5); assert.equal(house.health, health);
  tick(game, 15); assert(house.health < health);
});
test('player damage has a grace period, and pause freezes combat and cooldowns', () => {
  const game = fresh(); game.player.invincible = 0;
  assert(game.damagePlayer(9)); assert(!game.damagePlayer(9)); assert.equal(game.player.health, 91);
  game.ability(); game.pause(); const cooldown = game.player.ability, time = game.time;
  tick(game, 3); assert.equal(game.player.ability, cooldown); assert.equal(game.time, time); game.resume(); tick(game, 1); assert(game.player.ability < cooldown);
});
test('bat hits and knocks back in its facing direction; switching includes only acquired weapons', () => {
  const game = fresh(); const enemy = game.spawnEnemy('walker', game.player.x + 60);
  game.attack(); assert.equal(enemy.health, 42); assert(enemy.kb > 0);
  game.toggleWeapon(); assert.equal(game.player.weapon, 'fists'); game.toggleWeapon(); assert.equal(game.player.weapon, 'bat');
  equipPistol(game); game.toggleWeapon(); assert.equal(game.player.weapon, 'fists');
});
test('pistol fires, hits targets, reloads reserve ammunition, and refuses full-magazine reload', () => {
  const game = fresh(); equipPistol(game); const enemy = game.spawnEnemy('walker', game.player.x + 140);
  game.attack(); tick(game, .15); assert.equal(game.player.magazine, 11); assert.equal(enemy.health, 26);
  assert(game.reload()); tick(game, 1.6); assert.equal(game.player.magazine, 12); assert.equal(game.player.reserve, 35); assert(!game.reload());
});
test('solid cars block pistol fire and modest aim assistance handles small height differences', () => {
  const game = fresh(); equipPistol(game); game.player.x = 700;
  const enemy = game.spawnEnemy('walker', 1080); game.attack(); tick(game, .5); assert.equal(enemy.health, 60);
  game.stage.platforms = []; game.player.attack = 0; game.player.x = 980; enemy.y -= 35; game.attack(); tick(game, .15); assert.equal(enemy.health, 26);
});
test('swept projectile collisions catch fast shots and reject segments outside a platform', () => {
  assert(segmentHitsRect(0, 15, 300, 15, { x: 100, y: 0, w: 20, h: 30 }));
  assert(!segmentHitsRect(0, 40, 300, 40, { x: 100, y: 0, w: 20, h: 30 }));
});
test('all five abilities work, respect cooldowns, and cannot activate in shelter', () => {
  for (const c of CHARACTERS) {
    const game = fresh(c.id); equipPistol(game); game.player.health = 50;
    const enemy = game.spawnEnemy('walker', game.player.x + 70);
    assert(game.ability()); assert.equal(game.player.ability, c.cooldown); assert(!game.ability());
    if (c.id === 'civilian') { assert.equal(enemy.health, 52); assert(enemy.kb > 0); }
    if (c.id === 'soldier') { tick(game, .35); assert.equal(game.player.magazine, 9); }
    if (c.id === 'mechanic') { assert(game.barricade); assert.equal(game.barricade.health, 8); }
    if (c.id === 'nurse') assert.equal(game.player.health, 75);
    if (c.id === 'scout') { assert(game.player.dash > 0); assert(!game.damagePlayer(30)); }
    game.player.ability = 0; game.enterHouse(game.stage.houses[0]); assert(!game.ability());
  }
});
test('soldier burst is unavailable without pistol or ammo and consumes only available rounds', () => {
  const game = fresh('soldier'); assert(!game.ability()); equipPistol(game, 2); assert(game.ability()); assert(!game.reload()); tick(game, .3); assert.equal(game.player.magazine, 0); assert.equal(game.player.burst, 0);
  game.player.ability = 0; assert(!game.ability());
});
test('nurse cannot waste the ability at full health, and barricades expire', () => {
  assert(!fresh('nurse').ability());
  const game = fresh('mechanic'); game.ability(); tick(game, 12.1); assert.equal(game.barricade, null);
});
test('dog is rescued by proximity, distracts enemies, and cannot be rescued again after loss', () => {
  const game = fresh(); game.player.x = game.stage.dogRescueX; tick(game, .02); assert(game.dog.rescued);
  const e = game.spawnEnemy('walker', game.dog.x + 70); game.dog.cooldown = 0; tick(game, .02); assert.equal(e.phase, 'recover'); assert(game.dog.cooldown > 0);
  game.dog.health = 1; game.dog.cooldown = 7; e.x = game.dog.x; e.phase = 'windup'; e.attackTarget = 'dog'; e.timer = 0; tick(game, .02); assert(game.dog.lost);
  tick(game, 2); assert(game.dog.lost);
});
test('dog rescue resets on initial-stage retry, but stage-entry companions return', () => {
  const game = fresh(); game.player.x = game.stage.dogRescueX; tick(game, .02); game.dog.lost = true; game.die(); game.retry(); assert(!game.dog.rescued);
  game.startEquipment.dog = true; game.startStage(); game.dog.lost = true; game.die(); game.retry(); assert(game.dog.rescued); assert(!game.dog.lost);
});
test('enemy cap is enforced and no spawns are allowed after crossing the gate', () => {
  const game = fresh(); for (let i = 0; i < 50; i++) game.spawnEnemy('walker', 1000 + i); assert.equal(game.enemies.length, MAX_ENEMIES);
  game.player.x = game.stage.finishX; tick(game, .02); assert(game.safe); assert.equal(game.spawnEnemy('runner', game.stage.finishX - 100), null);
  game.player.invincible = 0; assert(!game.damagePlayer(99)); assert.equal(game.projectiles.length, 0);
});
test('gate blocks return, protects against existing enemies, and awards its bonus once', () => {
  const game = fresh(); game.player.x = game.stage.finishX; tick(game, .02); const money = game.money;
  tick(game, 1, { left: true }); assert(game.player.x >= game.stage.finishX + 20); assert.equal(game.money, money);
  const p = game.player; assert.equal(p.health, 100);
  p.x = game.stage.shopX; tick(game, .02); assert.equal(game.mode, 'shop');
});
test('collected coins survive death, while pickups and stage-entry gear reset', () => {
  const game = fresh(); const stash = game.stage.pickups.find(p => p.kind === 'coins');
  game.player.x = stash.x; game.player.y = stash.y - game.player.h * .55; tick(game, .02); assert(stash.collected);
  const earned = game.money; equipPistol(game); game.cash(31); game.die(); game.retry();
  assert.equal(game.money, earned + 31); assert.equal(game.player.health, 100); assert(!game.player.pistol); assert(!game.stage.pickups.find(p => p.id === stash.id).collected);
  game.cash(31); game.die(); game.retry(); assert.equal(game.money, earned + 62);
});
test('enemy defeats pay immediately at any distance, without duplicate rewards', () => {
  const game = fresh(), enemy = game.spawnEnemy('walker', game.player.x + 900);
  game.rng = () => .99;
  game.damageEnemy(enemy, 100); assert.equal(game.money, 5); tick(game, .02); assert.equal(game.money, 5);
  game.damageEnemy(enemy, 100); tick(game, .02); assert.equal(game.money, 5);
});
test('shop rejects invalid purchases and preserves upgrades with capped levels', () => {
  const game = fresh(); shop(game); assert(!game.buy('ammo')); assert(!game.buy('heal')); assert(!game.buy('unknown'));
  game.player.health = 50; assert(game.buy('heal')); assert.equal(game.player.health, 90);
  equipPistol(game); assert(game.buy('ammo')); assert.equal(game.player.reserve, 72);
  for (let i = 0; i < 5; i++) assert(game.buy('bat')); assert(!game.buy('bat')); assert.equal(game.player.upgrades.bat, 5);
  game.money = 0; assert(!game.buy('damage'));
});
test('shop reload restores purchased state and balance; unfinished reload restores entry gear with retained money', () => {
  const game = fresh(); equipPistol(game); shop(game); game.buy('damage'); game.buy('reload');
  const save = structuredClone(game.save()), restored = fresh(); assert(restored.load(save));
  assert.equal(restored.mode, 'shop'); assert.equal(restored.player.upgrades.damage, 1); assert.equal(restored.player.upgrades.reload, 1); assert.equal(restored.money, game.money);
  game.nextStage(); game.cash(17); game.player.health = 2; game.player.magazine = 0;
  const stageSave = game.save(), loaded = fresh(); assert(loaded.load(stageSave));
  assert.equal(loaded.mode, 'playing'); assert.equal(loaded.player.health, 100); assert.equal(loaded.player.magazine, 12); assert.equal(loaded.money, game.money); assert.equal(loaded.player.upgrades.damage, 1);
});
test('next stages preserve resources and follow the campaign mission definitions', () => {
  const game = fresh(); equipPistol(game); shop(game); game.player.health = 61; game.player.magazine = 4; game.player.reserve = 57; game.dog.rescued = true;
  const terrain = structuredClone(game.stage.platforms); game.nextStage();
  assert.equal(game.stage.profile, 'survival'); assert.equal(game.player.health, 61); assert.equal(game.player.magazine, 4); assert.equal(game.player.reserve, 57); assert(game.dog.rescued); assert.notDeepEqual(game.stage.platforms, terrain);
  shop(game); game.nextStage(); assert.equal(game.levelId, 'graveyard'); assert.equal(game.stage.profile, 'survival'); shop(game); game.nextStage(); assert.equal(game.levelId, 'forest');
});
test('corrupt or incompatible saves are rejected and equipment values are bounded', () => {
  const game = fresh(); for (const data of [null, {}, { ...game.save(), character: 'missing' }, { ...game.save(), seed: null }, { ...game.save(), number: -1 }]) assert(!game.load(data));
  const save = game.save(); save.startEquipment = { ...defaultEquipment(), health: 10000, magazine: -1, upgrades: { bat: 700 } }; assert(game.load(save)); assert.equal(game.player.magazine, 0); assert.equal(game.player.upgrades.bat, 5);
});
test('all enemies telegraph attacks before dealing damage', () => {
  for (const type of ['walker', 'runner', 'brute', 'spitter']) {
    const game = fresh(); game.player.invincible = 0; const enemy = game.spawnEnemy(type, game.player.x + 30);enemy.specialCooldown=0;
    tick(game, .02); assert.equal(enemy.phase, 'windup'); assert.equal(game.player.health, 100);
    tick(game, enemy.windup + .5); assert(game.player.health < 100, `${type} did not land its telegraphed attack`);
  }
});

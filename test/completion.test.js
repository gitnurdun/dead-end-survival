import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { WEAPONS, GROUND, NPC_TYPES } from '../src/data.js';
import { makeStage, overlap, placePickup, normalizeEquipment } from '../src/world.js';
import { normalizeSettings } from '../src/settings.js';
import { CATALOG } from '../src/catalog.js';
import { Audio } from '../src/soundscape.js';

function fresh() { const g = new Game(); g.newGame('civilian', 72); g.spawnTimer = 1e8; return g; }
function ticks(g, seconds) { for (let t = 0; t < seconds; t += .02) g.update(.02); }
function shop(g) { g.mode = 'shop'; g.safe = true; g.money = 5000; }

test('all generated supplies clear solid vehicles, including their visual bobbing margin', () => {
  for (const level of LEVELS) for (let seed = 0; seed < 25; seed++) {
    const stage = makeStage(seed, level.index + 1, level.id);
    for (const item of stage.pickups) for (const block of stage.platforms.filter(b => b.solid)) assert(!overlap({ ...item, y: item.y - 4, h: item.h + 8 }, block), `${level.id}: supply inside obstacle`);
  }
});
test('a buried pickup is placed on the reachable vehicle roof and can actually be collected', () => {
  const g = fresh(), car = g.stage.platforms[0];
  const item = placePickup({ x: car.x + 50, y: GROUND - 25, w: 24, h: 24, kind: 'health', amount: 15 }, g.stage.platforms);
  assert.equal(item.y, car.y - 33); g.stage.pickups = [item];
  g.player.x = item.x; g.player.y = car.y - g.player.h; g.player.health = 60;
  g.updatePickups(.02); assert(item.collected); assert.equal(g.player.health, 75);
});
test('random bonus coins never become trapped inside a vehicle', () => {
  const g = fresh(), car = g.stage.platforms[0]; const e = g.spawnEnemy('walker', car.x + 20);
  e.x = car.x + 20; g.rng = () => 0; g.damageEnemy(e, 1000);
  const drop = g.stage.pickups.find(i => i.bonus); assert(drop); assert(!overlap(drop, car));
});
test('all four firearms can be bought, equipped, fired and independently reloaded', () => {
  for (const id of ['pistol', 'shotgun', 'smg', 'rifle']) {
    const g = fresh(); shop(g); const before = g.money;
    assert(g.buy(id)); assert(g.ownsWeapon(id)); assert.equal(g.player.weapon, id); assert(g.money < before); assert(!g.buy(id));
    const gun = g.ammo(id), reserve = gun.reserve, def = WEAPONS[id]; g.safe = false; g.mode = 'playing'; g.attack();
    assert.equal(gun.magazine, def.magazine - 1); assert.equal(g.projectiles.length, def.pellets || 1);
    assert.equal(g.projectiles[0].damage, def.damage); assert(g.reload()); ticks(g, def.reload + .1);
    assert.equal(gun.magazine, def.magazine); assert.equal(gun.reserve, reserve - 1);
  }
});
test('SMG repeats at its own rate and shotgun pellets spread with a shorter lifetime', () => {
  const g = fresh(); shop(g); g.buy('smg'); g.safe = false; g.mode = 'playing'; const before = g.ammo().magazine;
  for (let i = 0; i < 25; i++) g.update(.02, { attack: true });
  assert(before - g.ammo().magazine >= 4); assert(before - g.ammo().magazine <= 6);
  shop(g); g.buy('shotgun'); g.safe = false; g.mode = 'playing'; g.player.attack = 0; g.projectiles = []; g.attack();
  assert.equal(g.projectiles.length, 6); assert(new Set(g.projectiles.map(p => p.vy)).size > 3); assert(g.projectiles.every(p => p.life < .4));
});
test('new firearms deal real damage while solid cover blocks them', () => {
  for (const id of ['shotgun', 'smg', 'rifle']) {
    const g = fresh(); shop(g); g.buy(id); g.safe = false; g.mode = 'playing';
    const e = g.spawnEnemy('brute', 435), hp = e.health; g.attack(); ticks(g, .15); assert(e.health < hp, `${id} failed to hit`);
    g.enemies = []; g.player.x = 790; g.player.attack = 0; const behind = g.spawnEnemy('walker', 1060); g.attack(); ticks(g, .4); assert.equal(behind.health, behind.maxHealth, `${id} fired through cover`);
  }
});
test('weapon inventory, ammunition and selection survive purchases, reload and stage-entry retry', () => {
  const g = fresh(); shop(g); for (const id of ['pistol', 'shotgun', 'smg', 'rifle']) g.buy(id);
  g.ammo('shotgun').magazine = 2; g.ammo('smg').reserve = 61; g.loadout = g.equipment();
  const saved = g.save(), restored = fresh(); assert(restored.load(saved)); assert.equal(restored.player.weapon, 'rifle'); assert.equal(restored.ammo('shotgun').magazine, 2);
  restored.selectLevel('boreal'); assert.equal(restored.ammo('smg').reserve, 61); restored.ammo('smg').reserve = 0; restored.die(); restored.retry();
  assert.equal(restored.ammo('smg').reserve, 61); assert.equal(restored.player.weapon, 'rifle');
});
test('legacy equipment remains compatible and corrupt new magazines are bounded', () => {
  const e = normalizeEquipment({ pistol: true, arsenal: { smg: { owned: true, magazine: 5000, reserve: -4 }, rifle: { owned: true, magazine: NaN } }, equipped: 'smg' });
  assert.equal(e.arsenal.smg.magazine, 30); assert.equal(e.arsenal.smg.reserve, 0); assert.equal(e.arsenal.rifle.magazine, 0); assert.equal(e.equipped, 'smg');
  assert.equal(normalizeEquipment({ equipped: 'rifle' }).equipped, 'bat'); assert.equal(normalizeEquipment({ pistol: true }).pistol, true);
});
test('armory is available from title, resumes safely, and deploys without skipping the selected mission', () => {
  const g = fresh(); g.mode = 'menu'; g.money = 500; assert(g.openArmory()); assert(g.safe); assert(g.armory); assert(g.buy('shotgun'));
  const restored = fresh(); restored.load(g.save()); assert(restored.armory); assert.equal(restored.mode, 'shop');
  restored.nextStage(); assert.equal(restored.levelId, 'outbreak'); assert.equal(restored.mode, 'playing'); assert(restored.ownsWeapon('shotgun')); assert.equal(restored.player.weapon, 'shotgun');
});
test('ammo crates refill every owned firearm without changing another magazine', () => {
  const g = fresh(); shop(g); for (const id of ['pistol', 'shotgun', 'smg', 'rifle']) g.buy(id);
  for (const id of ['pistol', 'shotgun', 'smg', 'rifle']) g.ammo(id).reserve = 0;
  assert(g.buy('ammo')); assert.equal(g.player.reserve, 36); assert.equal(g.ammo('shotgun').reserve, 12); assert.equal(g.ammo('smg').reserve, 72); assert.equal(g.ammo('rifle').reserve, 18);
  assert.equal(g.ammo('shotgun').magazine, 6);
});
test('four clear survivor lookouts appear in every mission and all five NPCs have museum dossiers', () => {
  for (const level of LEVELS) { const s = makeStage(level.seed, level.index, level.id); assert.equal(s.npcs.length, 4); for (const n of s.npcs) assert(!s.platforms.some(p => p.solid && overlap(n, p))); }
  assert.equal(CATALOG.filter(e => e.category === 'survivors').length, Object.keys(NPC_TYPES).length);
});
test('NPC rewards require interaction, honor their conditions, and cannot be farmed by repeated keypresses', () => {
  const g = fresh(), [scout, medic, supplier, ranger] = g.stage.npcs;
  g.player.x = scout.x; assert(!g.interactNpc()); assert(!scout.used); g.kills = 8; assert(g.interactNpc()); assert.equal(g.money, 50); assert(!g.interactNpc()); assert.equal(g.money, 50);
  g.player.x = medic.x; assert(!g.interactNpc()); g.player.health = 40; assert(g.interactNpc()); assert.equal(g.player.health, 75); assert(!g.interactNpc());
  g.player.x = supplier.x; assert(!g.interactNpc()); g.player.pistol = true; g.player.reserve = 0; assert(g.interactNpc()); assert.equal(g.player.reserve, 30);
  g.player.x = ranger.x; assert(g.interactNpc()); assert.equal(g.money, 75); g.die(); g.retry(); assert(g.stage.npcs.every(n => !n.used)); assert.equal(g.money, 75);
});
test('five new nature missions are unlocked and cover distinct scenery, obstacles and hazards', () => {
  const levels = LEVELS.filter(l => l.region === 4); assert.equal(levels.length, 5); assert.equal(new Set(levels.map(l => l.biome)).size, 5);
  for (const l of levels) { assert(l.unlocked); const g = fresh(); assert(g.selectLevel(l.id)); assert.equal(g.stage.level.biome, l.biome); assert.equal(g.stage.houses.length, 4); }
});
test('full reserves do not waste field ammunition or the supplier reward', () => {
  const g = fresh(); g.player.pistol = true; g.player.reserve = 999;
  const item = { kind: 'ammo', x: g.player.x, y: GROUND - 25, w: 24, h: 24, amount: 18, collected: false }; g.stage.pickups = [item];
  g.updatePickups(.02); assert(!item.collected);
  const npc = g.stage.npcs.find(n => n.type === 'supplier'); g.player.x = npc.x; assert(!g.interactNpc()); assert(!npc.used);
  g.player.reserve = 900; assert(g.interactNpc()); assert(npc.used); assert.equal(g.player.reserve, 930);
});
test('audio and visual settings migrate, clamp values, preserve mute and handle reduced motion', () => {
  const settings = normalizeSettings({ effects: 0, effectsBoost: 1000, master: -1, fxIntensity: 3, weatherDensity: NaN }, true);
  assert.equal(settings.effects, 0); assert.equal(settings.master, 0); assert.equal(settings.effectsBoost, 3); assert.equal(settings.fxIntensity, 2); assert.equal(settings.weatherDensity, 1); assert(settings.reducedShake);
  assert.equal(normalizeSettings({ effects: .65 }).effects, .65); assert.equal(normalizeSettings(null).effectsBoost, 1.8);
});
test('all nature missions use recorded music without synthesized background audio and preserve mute', () => {
  const audio = new Audio(normalizeSettings({ effects: 0, master: 0 })); const gains = {};
  audio.context = { state: 'running', currentTime: 1 }; audio.output = { gain: { setTargetAtTime(v) { gains.master = v; } } };
  audio.buses = Object.fromEntries(['music','effects','ambience'].map(key => [key, { gain: { setTargetAtTime(v) { gains[key] = v; } } }]));
  let musicUpdates = 0;
  audio.samples = { syncWeapon() {}, updateMusic(mode, enabled) { assert(enabled); musicUpdates++; } };
  audio.tone = audio.noise = () => assert.fail('Background updates must never synthesize music or noise');
  for (const l of LEVELS.filter(l => l.region === 4)) { const g = fresh(); g.selectLevel(l.id); audio.update(g); }
  assert.equal(musicUpdates, 5);
  assert.equal(gains.effects, 0); assert.equal(gains.master, 0);
});

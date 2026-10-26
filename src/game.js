import { CHARACTERS, WEAPONS, ENEMIES, PROFILES, GROUND, GRAVITY, PLAYER_SPEED, MAX_ENEMIES, SHOP_ITEMS, BONUS_COIN_CHANCE, NPC_TYPES, WORLD_ZOOM } from './data.js';
import { makeStage, random, clamp, overlap, segmentHitsRect, segmentRectTime, defaultEquipment, normalizeEquipment, placePickup } from './world.js';
import { LEVELS, getLevel } from './levels.js';
import { moveBody, obstacleAhead, jumpVelocity } from './physics.js';
import { advanceProjectile } from './projectiles.js';
import { updateSpecialThreat } from './threats.js';
import { beginSpecial } from './attack-director.js';
import { infectedAppearance } from './infected-appearance.js';
import { interactMission, updateMission, missionReady, damageEscort } from './mission.js';
import { interactMechanism, hitMechanism, mechanismTarget, updateMechanisms } from './mechanisms.js';
import { activeVehicle, interactVehicle, driveVehicle, fireVehicle, reloadVehicle, damageVehicle, exitVehicle, settleVehicles, syncVehicleBody } from './vehicles.js';

const copy = value => JSON.parse(JSON.stringify(value));
export class Game {
  constructor({ onEvent = () => {}, onSave = () => {} } = {}) {
    this.onEvent = onEvent; this.onSave = onSave;
    this.mode = 'menu'; this.character = CHARACTERS[0]; this.money = 0; this.number = 1;
    this.seed = 0; this.time = 0; this.lastDistrict = -1; this.startEquipment = defaultEquipment(); this.loadout = defaultEquipment(); this.completed = []; this.levelId = 'outbreak';
    this.stage = makeStage(7291); this.resetEntities(defaultEquipment()); this.mode = 'menu';
  }
  event(type, data = {}) { this.onEvent({ type, ...data }); }
  newGame(characterId, seed = Math.floor(Math.random() * 0x7fffffff)) {
    this.character = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
    this.money = 0; this.number = 1; this.seed = seed; this.startEquipment = defaultEquipment(); this.loadout = defaultEquipment(); this.completed = []; this.levelId = 'outbreak';
    this.startStage();
  }
  resetEntities(equipment) {
    const e = normalizeEquipment(equipment);
    this.player = { x: 280, y: GROUND - 65, w: 37, h: 65, vx: 0, vy: 0, facing: 1, grounded: true, health: e.health, pistol: e.pistol, magazine: e.magazine, reserve: e.reserve, arsenal: copy(e.arsenal), upgrades: copy(e.upgrades), weapon: e.equipped, invincible: 1.2, attack: 0, attackPose: 0, sawRunning: false, reload: 0, ability: 0, dash: 0, burst: 0, burstTimer: 0, house: null };
    this.dog = { x: 180, y: GROUND - 28, w: 42, h: 28, vy: 0, grounded: true, travel: 0, health: e.dogHealth, rescued: e.dog, lost: false, cooldown: 0, hurt: 0, facing: 1 };
    this.enemies = []; this.projectiles = []; this.particles = []; this.floats = []; this.effects = []; this.pools = []; this.corpses = []; this.deathTime = 0; this.barricade = null;
    this.fxRng = random(this.seed ^ 0x748931); this.hitConfirm = 0; this.hurtFlash = 0; this.lastHit = null;
    this.encounterRng = random(this.seed ^ 0x93271);
    this.visualIndex=0;this.threatSequence=0;this.nextSpecialAt=0;this.viewWidth=960;this.deathReason='';this.gateHint=0;
    this.stats = { attacks: 0, shots: 0, hits: 0, damage: 0 };
    this.time = 0; this.spawnTimer = 3; this.safe = false; this.safetyFlash = 0; this.kills = 0; this.maxDistance = 280; this.lastDistrict = -1; this.shake = 0; this.district = 0;
  }
  startStage(retry = false) {
    this.armory = false;
    this.stage = makeStage(this.seed, this.number, this.levelId); this.rng = random(this.seed ^ 0x1438);
    this.resetEntities({ ...this.startEquipment, health: retry ? 100 : this.startEquipment.health });
    this.mode = 'playing'; this.save(); this.event('stage', { number: this.number });
  }
  equipment() {
    const p = this.player;
    return { health: p.health, pistol: p.pistol, magazine: p.magazine, reserve: p.reserve, arsenal: copy(p.arsenal), equipped: p.weapon, upgrades: copy(p.upgrades), dog: this.dog.rescued && !this.dog.lost, dogHealth: this.dog.health };
  }
  save() {
    const shop = this.mode === 'shop';
    const data = { version: 1, character: this.character.id, money: this.money, number: this.number, seed: this.seed, levelId: this.levelId, loadout: copy(this.loadout), completed: [...this.completed], startEquipment: copy(this.startEquipment), checkpoint: shop ? 'shop' : 'stage', ...(shop ? { shopEquipment: this.equipment(), armory: !!this.armory } : {}) };
    this.onSave(data); return data;
  }
  load(data) {
    if (!data || data.version !== 1 || !CHARACTERS.some(c => c.id === data.character) || !Number.isSafeInteger(data.seed) || !Number.isInteger(data.number) || data.number < 1 || data.number > 99999 || !Number.isFinite(data.money)) return false;
    this.character = CHARACTERS.find(c => c.id === data.character); this.money = clamp(Math.floor(data.money), 0, 9999999); this.seed = data.seed; this.number = data.number; this.startEquipment = normalizeEquipment(data.startEquipment);
    this.levelId = getLevel(data.levelId).id; this.loadout = normalizeEquipment(data.loadout || data.shopEquipment || data.startEquipment); this.completed = Array.isArray(data.completed) ? data.completed.filter(id => LEVELS.some(l => l.id === id)) : [];
    this.startStage(true);
    if (data.checkpoint === 'shop') { this.resetEntities(normalizeEquipment(data.shopEquipment)); this.armory = data.armory === true; this.player.x = this.stage.shopX; this.safe = true; this.mode = 'shop'; this.save(); this.event('shop'); }
    return true;
  }
  nextStage() {
    if (this.mode !== 'shop') return;
    if (this.armory) { this.loadout = this.equipment(); this.selectLevel(this.levelId); return; }
    this.startEquipment = this.equipment(); this.number++;
    this.loadout = this.equipment(); this.levelId = LEVELS[(getLevel(this.levelId).index + 1) % LEVELS.length].id;
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    this.startStage();
  }
  selectLevel(id, characterId = this.character.id) {
    const level = LEVELS.find(l => l.id === id); if (!level) return false;
    const equipment = normalizeEquipment(this.loadout);
    equipment.health = 100;
    this.character = CHARACTERS.find(c => c.id === characterId) || this.character;
    this.levelId = level.id; this.number = level.index + 1; this.seed = level.seed;
    this.startEquipment = equipment; this.startStage(); return true;
  }
  retry() { if (this.mode === 'dead') this.startStage(true); }
  openArmory() {
    if (this.mode !== 'menu') return false;
    this.stage = makeStage(this.seed, this.number, this.levelId); this.rng = random(this.seed ^ 0x1438);
    this.resetEntities(this.loadout); this.player.x = this.stage.shopX;
    this.safe = true; this.armory = true; this.mode = 'shop'; this.save(); this.event('shop'); return true;
  }
  ownsWeapon(id) { return id === 'fists' || id === 'bat' || (id === 'pistol' ? this.player.pistol : !!this.player.arsenal[id]?.owned); }
  vehicle() { return activeVehicle(this); }
  interact() { return interactVehicle(this) || (!this.player.riding && (interactMission(this)||interactMechanism(this)||this.interactNpc())); }
  hitMechanism(m,damage){hitMechanism(this,m,damage);}
  ammo(id = this.player.weapon) { return id === 'pistol' ? this.player : this.player.arsenal[id]; }
  needsAmmo() { return Object.keys(WEAPONS).some(id => WEAPONS[id].magazine && this.ownsWeapon(id) && this.ammo(id).reserve < 999); }
  giveAmmo(amount = 36) {
    for (const [id, def] of Object.entries(WEAPONS)) {
      const multiplier = def.resupply;
      if (!def.magazine) continue;
      if (this.ownsWeapon(id)) { const gun = this.ammo(id); gun.reserve = Math.min(999, gun.reserve + Math.max(1, Math.round(amount * multiplier))); }
    }
  }
  interactNpc() {
    const p = this.player;
    if (this.mode !== 'playing' || this.safe || !p.grounded) return false;
    const npc = this.stage.npcs.find(n => Math.abs(n.x - p.x) < 100);
    if (!npc) return false;
    const speak = text => { this.event('dialogue', { name: NPC_TYPES[npc.type].name, text }); this.event('npc'); };
    npc.greeted = true;
    if (npc.used) { speak('Stay alive. My supplies are spent for this attempt.'); return false; }
    if (npc.type === 'scout' && this.kills < 8) { speak(`Field contract: defeat 8 infected and return. Progress: ${this.kills} / 8. Reward: 50 coins.`); return false; }
    if (npc.type === 'medic' && p.health >= 100) { speak('You are unhurt. Return for free treatment when you need it.'); return false; }
    if (npc.type === 'supplier' && !Object.keys(WEAPONS).some(id => WEAPONS[id].magazine && this.ownsWeapon(id))) { speak('Buy a firearm at the supply shelf, then return for ammunition.'); return false; }
    if (npc.type === 'supplier' && !this.needsAmmo()) { speak('Your reserves are full. Return when you have room.'); return false; }
    npc.used = true;
    if (npc.type === 'scout') { this.cash(50); speak('Contract complete. Fifty coins, earned the hard way.'); }
    if (npc.type === 'medic') { p.health = Math.min(100, p.health + 35); speak('Patched up. Thirty-five health restored.'); }
    if (npc.type === 'supplier') { this.giveAmmo(30); speak('Ammunition for every firearm you own. Reload before moving out.'); }
    if (npc.type === 'ranger') { this.cash(25); speak('Take this emergency cache. The gate is ahead.'); }
    this.effect('enter', npc.x + 18, npc.y + 30, .8); this.particlesAt(npc.x + 18, npc.y, '#a9d3b5', 12); return true;
  }
  pause() { if (this.mode === 'playing' || this.mode === 'sheltered') { this.resumeMode = this.mode; this.mode = 'paused'; } }
  resume() { if (this.mode === 'paused') this.mode = this.resumeMode || 'playing'; }
  cash(amount, x = this.player.x, y = this.player.y) {
    this.money = clamp(this.money + amount, 0, 9999999); this.float(`+${amount}`, x, y, '#f2cd77'); this.event('coin'); this.save();
  }
  float(text, x, y, color = '#f6f3dd') { this.floats.push({ text, x, y, color, life: 1.2 }); }
  particlesAt(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: (this.fxRng() - .5) * 280, vy: -this.fxRng() * 240, size: 2 + this.fxRng() * 5, color, life: .3 + this.fxRng() * .4 });
  }
  damagePlayer(amount) {
    const p = this.player;
    if (this.training || this.mode !== 'playing' || this.safe || p.house !== null || p.invincible > 0 || p.dash > 0) return false;
    if(p.riding)return damageVehicle(this,amount);
    p.health = Math.max(0, p.health - amount); p.invincible = .85; this.shake = 8; this.hurtFlash = .6; this.event('hurt'); this.float(`−${amount}`, p.x, p.y - 10, '#ffb197');
    if (!p.health) this.die();
    return true;
  }
  effect(type, x, y, duration = 1) { this.effects.push({ type, x, y, life: duration, duration }); }
  die() {
    if (this.mode === 'dead') return;
    this.player.health = 0; this.mode = 'dead'; this.deathTime = 0;
    this.effect('death', this.player.x + 18, this.player.y + 32, 1.6);
    this.particlesAt(this.player.x + 18, this.player.y + 28, '#baa69a', 24);
    this.shake = 12; this.save(); this.event('dead');
  }
  damageEnemy(enemy, amount, knockback = 0, direction = this.player.facing, hit = {}) {
    if (enemy.health <= 0) return;
    const armored = enemy.type === 'armored' && hit.ballistic && !hit.armorPiercing && direction === -enemy.facing;
    if (armored) amount *= .45;
    const dealt = Math.max(0, Math.min(enemy.health, amount)); this.stats.damage += dealt;
    if (!hit.dot) { this.stats.hits++; this.hitConfirm = .16; this.lastHit = { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h * .4, armored, lethal: enemy.health <= amount }; }
    enemy.health -= amount; enemy.hurt = .16; enemy.kb = knockback * direction;
    enemy.revealed = 3;
    for (const status of ['chill','burn','bleed','stun']) if (hit[status]) enemy[status] = Math.max(enemy[status] || 0, hit[status]);
    if (hit.stun) { enemy.phase = 'recover'; enemy.timer = hit.stun + .25; }
    this.event('impact', { heavy: enemy.type === 'brute', damage: dealt, armored, dot: !!hit.dot, weapon: hit.weapon });
    if (enemy.damageFloat && enemy.damageFloat.life > .25) { enemy.damageFloat.amount += dealt; enemy.damageFloat.text = `${armored ? 'ARMOR ' : ''}${Math.round(enemy.damageFloat.amount)}`; enemy.damageFloat.life = .85; }
    else { this.float(`${armored ? 'ARMOR ' : ''}${Math.round(dealt)}`, enemy.x + enemy.w / 2, enemy.y - 18, armored ? '#afcddb' : hit.dot ? '#a8d0a1' : '#ead5ad'); enemy.damageFloat = this.floats.at(-1); enemy.damageFloat.damage = true; enemy.damageFloat.amount = dealt; }
    this.particlesAt(enemy.x + enemy.w / 2, enemy.y + 26, '#c5dc83', 6);
    if (enemy.health <= 0) {
      this.kills++;
      this.corpses.push({ ...enemy, damageFloat: null, health: enemy.maxHealth, phase: 'recover', vx: 0, facing: enemy.facing || -1, life: 1.35, duration: 1.35, fallDirection: direction || 1 });
      this.corpses = this.corpses.slice(-32);
      if (enemy.type === 'bloater' && !this.safe) {
        this.pools.push({ x: enemy.x - 45, y: GROUND - 12, w: 150, h: 14, type: 'acid', life: 5, phase: 0 });
        this.effect('toxic', enemy.x + enemy.w / 2, GROUND - 20, .8); this.event('spit');
      }
      if (!this.training) this.cash(Math.round(enemy.reward*(1+(this.stage.level.difficulty-1)*.12)), enemy.x, enemy.y - 12);
      if (!this.training && this.rng() < BONUS_COIN_CHANCE) {
        this.stage.pickups.push(placePickup({ id: `bonus-${this.time}-${this.kills}`, kind: 'coins', x: enemy.x + enemy.w / 2, y: GROUND - 25, w: 24, h: 24, amount: Math.max(3, Math.round(enemy.reward * (1 + this.rng()))), collected: false, bonus: true }, this.stage.platforms));
        this.particlesAt(enemy.x + enemy.w / 2, enemy.y + 20, '#e1bf70', 10);
      }
      this.particlesAt(enemy.x + enemy.w / 2, enemy.y + 25, '#9caf71', 14); this.event('kill');
    }
  }
  equipWeapon(id) {
    if (this.mode !== 'playing' || this.safe || this.player.riding || this.player.burst > 0 || !this.ownsWeapon(id)) return false;
    this.player.weapon = id; this.player.reload = 0; this.player.attackPose = 0; this.player.sawRunning = false;
    this.event('switch', { weapon: id }); return true;
  }
  toggleWeapon(direction = 1) {
    const weapons = Object.keys(WEAPONS).filter(id => this.ownsWeapon(id));
    return this.equipWeapon(weapons[(weapons.indexOf(this.player.weapon) + direction + weapons.length) % weapons.length]);
  }
  reload() {
    const p = this.player;
    if(p.riding)return this.mode==='playing'&&!this.safe&&reloadVehicle(this);
    const weapon = WEAPONS[p.weapon], ammo = this.ammo();
    if (this.mode !== 'playing' || this.safe || !weapon.magazine || !ammo || ammo.magazine >= weapon.magazine || !ammo.reserve || p.reload > 0 || p.burst > 0) return false;
    p.sawRunning = false; p.reload = weapon.reload * (1 - p.upgrades.reload * .15); this.event('reload', { weapon: p.weapon }); return true;
  }
  shoot(burst = false) {
    const p = this.player;
    const id = burst ? 'pistol' : p.weapon, weapon = WEAPONS[id], ammo = this.ammo(id);
    if (!this.ownsWeapon(id) || !weapon.magazine || !ammo || ammo.magazine <= 0 || p.reload > 0) { if (!burst) this.event('empty'); return false; }
    ammo.magazine--; p.attackPose = .14; p.attack = weapon.cooldown;
    this.stats.attacks++; this.stats.shots++;
    const y=p.y+28,hand=p.x+p.w/2;let x=p.x+(p.facing>0?p.w+15:-15),muzzleTime=1;
    for(const block of this.stage.platforms){const t=segmentRectTime(hand,y,x,y,block);if(t!==null)muzzleTime=Math.min(muzzleTime,t);}
    if(muzzleTime<1)x=hand+(x-hand)*muzzleTime-p.facing*.3;
    const target = this.enemies.filter(e => e.health > 0 && (e.x - x) * p.facing > 0 && Math.abs(e.x - x) < Math.min(weapon.range || 700, 900) && Math.abs(e.y + e.h * .45 - y) < 72 && this.clearPath(x, y, e.x + e.w / 2, e.y + e.h * .45)).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    if (weapon.chain) {
      let previous = { x, y }, current = target; const used = new Set();
      for (let i = 0; current && i < weapon.chain; i++) {
        const end = { x: current.x + current.w / 2, y: current.y + current.h * .5 };
        this.effects.push({ type: 'arc', x: previous.x, y: previous.y, tx: end.x, ty: end.y, life: .24, duration: .24, color: weapon.color });
        this.damageEnemy(current, weapon.damage * (1 + p.upgrades.damage * .2) * .8 ** i, weapon.knockback, p.facing, { stun: .25, weapon: id }); used.add(current); previous = end;
        current = this.enemies.filter(e => e.health > 0 && !used.has(e) && Math.hypot(e.x + e.w / 2 - end.x, e.y + e.h / 2 - end.y) < 185 && this.clearPath(end.x, end.y, e.x + e.w / 2, e.y + e.h / 2)).sort((a,b) => Math.abs(a.x - end.x) - Math.abs(b.x - end.x))[0];
      }
      if (!target) {
        let tx = x + p.facing * weapon.range;
        for (const b of this.stage.platforms) if (y >= b.y && y <= b.y + b.h && (b.x + b.w - x) * p.facing > 0) tx = p.facing > 0 ? Math.min(tx, Math.max(x, b.x)) : Math.max(tx, Math.min(x, b.x + b.w));
        this.effects.push({ type: 'arc', x, y, tx, ty: y, life: .14, duration: .14, color: weapon.color });
      }
      this.event('shot', { weapon: id }); return true;
    }
    let dx = p.facing, dy = 0;
    if (target) { const tx = target.x + target.w / 2 - x, ty = target.y + target.h * .45 - y, d = Math.hypot(tx, ty); dx = tx / d; dy = ty / d; }
    for (let i = 0; i < (weapon.pellets || 1); i++) {
      const angle = Math.atan2(dy, dx) + (i - ((weapon.pellets || 1) - 1) / 2) * (weapon.spread || 0);
      const speed = weapon.speed || 1100;
      this.projectiles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: (weapon.range || 935) / speed, friendly: true, damage: weapon.damage * (1 + p.upgrades.damage * .2), knockback: weapon.knockback, r: id === 'flamer' ? 14 : 3, weapon: id, color: weapon.color, hit: { ballistic: weapon.family === 'firearm' && id !== 'flamer', armorPiercing: !!weapon.armorPiercing, chill: weapon.chill, burn: weapon.burn, weapon: id }, blast: weapon.blast, pierce: weapon.pierce || 1, struck: [] });
    }
    this.effect('muzzle', x, y, .14); this.particlesAt(x, y, '#f0d29a', id === 'shotgun' ? 9 : 3);
    this.event('shot', { weapon: id, sustain: id === 'flamer' }); this.shake = id === 'shotgun' ? 6 : id === 'rifle' ? 4 : 2;
    return true;
  }
  attack() {
    const p = this.player;
    if(p.riding){if(this.mode==='playing'&&!this.safe)fireVehicle(this);return;}
    if (this.mode !== 'playing' || this.safe || p.attack > 0 || p.reload > 0) return;
    const weapon = WEAPONS[p.weapon];
    if (weapon.family !== 'melee') { if (!this.shoot()) { p.attack = .3; if (!this.ammo().magazine && this.ammo().reserve) this.event('hint', { text: 'Empty magazine. Press R to reload.' }); } return; }
    if (weapon.magazine) { if (!this.ammo().magazine) { p.attack = .3; this.event('empty'); this.event('hint', { text: 'Fuel empty. Press R to refuel.' }); return; } this.ammo().magazine--; }
    this.stats.attacks++;
    p.attack = weapon.cooldown; p.attackPose = p.weapon === 'chainsaw' ? .14 : .24;
    if (p.weapon === 'chainsaw') { p.sawRunning = true; this.event('swing', { weapon: p.weapon, sustain: true }); }
    else this.event('swing', { weapon: p.weapon });
    const hit = { x: p.facing > 0 ? p.x + p.w - 5 : p.x - weapon.reach + 5, y: p.y + (weapon.thrust ? 18 : -9), w: weapon.reach, h: weapon.thrust ? 37 : p.h + 18 };
    const targets = this.enemies.filter(e => e.health > 0 && overlap(hit, e) && this.clearPath(p.x + p.w / 2, p.y + 32, e.x + e.w / 2, e.y + e.h / 2)).sort((a,b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).slice(0, weapon.maxHits || 99);
    for (const e of targets) this.damageEnemy(e, weapon.damage * (p.weapon !== 'fists' ? 1 + p.upgrades.bat * .2 : 1), weapon.knockback, p.facing, { ...weapon, weapon: p.weapon });
    for(const m of this.stage.mechanisms||[]){const box=mechanismTarget(m);if(box&&overlap(hit,box)&&!this.stage.platforms.some(b=>b.mechanism!==m.id&&segmentHitsRect(p.x+p.w/2,p.y+32,box.x+box.w/2,box.y+box.h/2,b)))hitMechanism(this,m,weapon.damage);}
    if (p.weapon !== 'chainsaw') { this.effect(weapon.thrust ? 'thrust' : 'slash', p.x + p.w / 2, p.y + 32, .18); const effect = this.effects.at(-1); effect.facing = p.facing; effect.reach = weapon.reach; effect.color = weapon.color; }
  }
  clearPath(x, y, tx, ty) { return !this.stage.platforms.some(b => segmentHitsRect(x, y, tx, ty, b)); }
  explode(shot) {
    if (this.safe || !shot.blast || shot.detonated) return;
    shot.detonated = true;
    this.effects.push({ type: 'explosion', x: shot.x, y: shot.y, life: .55, duration: .55, radius: shot.blast }); this.event('explosion'); this.shake = 8; this.particlesAt(shot.x,shot.y,'#e3bd83',22);
    for (const e of this.enemies) if (e.health > 0 && Math.hypot(e.x + e.w / 2 - shot.x, e.y + e.h / 2 - shot.y) < shot.blast && this.clearPath(shot.x, shot.y, e.x + e.w / 2, e.y + e.h / 2)) this.damageEnemy(e, shot.damage, shot.knockback, Math.sign(e.x - shot.x) || this.player.facing, { armorPiercing: true, weapon: shot.weapon });
    for(const m of this.stage.mechanisms||[]){const box=mechanismTarget(m);if(box&&Math.hypot(box.x+box.w/2-shot.x,box.y+box.h/2-shot.y)<shot.blast&&!this.stage.platforms.some(b=>b.mechanism!==m.id&&segmentHitsRect(shot.x,shot.y,box.x+box.w/2,box.y+box.h/2,b)))hitMechanism(this,m,shot.damage);}
  }
  ability() {
    const p = this.player;
    if(p.riding){this.event('hint',{text:'Exit the vehicle to use your survivor ability.'});return false;}
    if (this.mode !== 'playing' || this.safe || p.ability > 0) return false;
    const id = this.character.id;
    let placement=null;
    if(id==='mechanic'){
      placement={x:clamp(p.x+p.facing*90,0,this.stage.finishX-70),y:GROUND-85,w:65,h:85,health:8,life:12};
      for(const block of this.stage.platforms)if(block.solid&&overlap(placement,block))placement.x=p.facing>0?block.x-placement.w-4:block.x+block.w+4;
      if(overlap(placement,p)||this.stage.platforms.some(b=>b.solid&&overlap(placement,b))){this.event('hint',{text:'Not enough clear ground for a barricade.'});return false;}
    }
    if (id === 'soldier' && (!p.pistol || p.weapon !== 'pistol' || !p.magazine || p.reload > 0)) { this.event('hint', { text: 'Burst needs the equipped, loaded pistol. Press X to switch.' }); return false; }
    if (id === 'nurse' && p.health === 100) { this.event('hint', { text: 'Already feeling fine. Save that second wind.' }); return false; }
    p.ability = this.character.cooldown; this.event('ability');
    if (id === 'civilian') {
      this.particlesAt(p.x + p.w / 2, p.y + 36, '#f4ecd0', 16);
      for (const e of this.enemies) if (Math.abs(e.x - p.x) < 190 && Math.abs(e.y - p.y) < 110 && this.clearPath(p.x+p.w/2,p.y+32,e.x+e.w/2,e.y+e.h/2)) this.damageEnemy(e, 8, 700, Math.sign(e.x - p.x) || p.facing);
    } else if (id === 'soldier') { p.burst = Math.min(3, p.magazine); p.burstTimer = 0; }
    else if (id === 'mechanic') this.barricade=placement;
    else if (id === 'nurse') { p.health = Math.min(100, p.health + 25); this.float('+25', p.x, p.y - 10, '#dfef91'); this.particlesAt(p.x, p.y, '#dce993', 15); }
    else if (id === 'scout') { p.dash = .28; p.invincible = Math.max(p.invincible, .4); }
    return true;
  }
  jumpOrShelter() {
    const p = this.player;
    if(p.riding){const v=this.vehicle();if(this.mode==='playing'&&v?.grounded){v.vy=-610*Math.sqrt(this.stage.level.gravity);v.grounded=false;this.event('vehicleHop');}return;}
    if (this.mode === 'sheltered') { this.exitHouse(); return; }
    if (this.mode !== 'playing' || this.safe) { if (this.mode === 'playing' && p.grounded) { p.vy = jumpVelocity(this.stage.level.gravity); p.grounded = false; } return; }
    const house = this.stage.houses.find(h => !h.collapsed && Math.abs((h.x + h.w * .5) - (p.x + p.w / 2)) < 54 && p.grounded);
    if (house) { this.enterHouse(house); return; }
    if (p.grounded||(p.coyote||0)>0) { p.vy = jumpVelocity(this.stage.level.gravity); p.grounded = false;p.coyote=0;p.jumpBuffered=0; this.event('jump'); }
    else p.jumpBuffered=.12;
  }
  enterHouse(house) {
    if (house.collapsed || this.mode !== 'playing') return;
    this.player.house = house.id; this.player.x = house.x + house.w / 2 - this.player.w / 2; this.player.y = GROUND - this.player.h; this.player.vy = 0; this.player.reload = 0; this.player.burst = 0; this.player.vx = 0; this.mode = 'sheltered'; house.entered++;
    this.player.coyote=0;this.player.jumpBuffered=0;
    this.effect('enter', house.x + house.w / 2, GROUND - 48, 1.2);
    this.particlesAt(house.x + house.w / 2, GROUND - 48, '#a9d3b5', 16);
    this.event('enter'); this.supplyHouse(house);
  }
  exitHouse() {
    const p = this.player, h = this.stage.houses.find(h => h.id === p.house);
    if (!h) return;
    p.house = null; p.x = h.x + h.w / 2 - p.w / 2; p.y = GROUND - p.h; p.vy = 0; p.grounded = true; p.invincible = 1; this.mode = 'playing';
    this.effect('exit', p.x + p.w / 2, GROUND - 40, .7);
    this.event('exit');
  }
  supplyHouse(house) {
    if (house.remaining <= 0 || house.collapsed) return false;
    const type = house.type;
    let eligible = false;
    if (type === 'pantry') eligible = true;
    if (type === 'greenhouse') eligible = house.remaining === 2 || house.insideTime >= 10;
    if (type === 'duplex') eligible = house.lastSupplyVisit < house.entered;
    if (type === 'clinic') eligible = house.insideTime >= 5;
    if (!eligible) return false;
    house.remaining--; house.lastSupplyVisit = house.entered;
    this.player.health = Math.min(100, this.player.health + (type === 'clinic' ? 35 : 18));
    this.giveAmmo(type === 'pantry' ? 24 : 18);
    this.particlesAt(house.x + 100, house.y + 75, '#dced95', 12); this.event('supply'); return true;
  }
  hitHouse(house, amount = 1) {
    if (house.collapsed) return;
    const before=house.health;
    house.health = Math.max(0, house.health - amount);
    if(before/house.maxHealth>.3&&house.health/house.maxHealth<=.3&&this.player.house===house.id)this.event('houseWarning');
    this.event('houseHit');
    this.particlesAt(house.x + 30 + this.fxRng() * 150, house.y + 110, '#cabaa1', 3);
    if (house.health <= 0) {
      house.collapsed = true; this.particlesAt(house.x + 100, GROUND - 60, '#cabaa1', 45); this.event('collapse');
      if (this.player.house === house.id) {
        this.exitHouse(); this.player.x = house.x + house.w + 12;
        this.player.health = Math.max(0, this.player.health - 12); this.player.invincible = 1.5;
        this.float('−12', this.player.x, this.player.y, '#ffb197'); this.shake = 14; this.hurtFlash=.6;
        if (this.player.health === 0) this.die();
      }
    }
  }
  spawnEnemy(type, x) {
    if (this.safe || this.enemies.length >= MAX_ENEMIES) return null;
    const def = ENEMIES[type]; if (!def) return null;
    const e = { ...def, type, x: clamp(x, 0, this.stage.finishX - 60), y: GROUND - def.height, w: def.width, h: def.height, vy: 0, grounded: true, travel: 0, vx: 0, growl: 2 + this.fxRng() * 8, maxHealth: def.health, facing: -1, phase: 'walk', timer: .5 + this.rng(), kb: 0, hurt: 0, houseHits: 0, interest: 2 + Math.floor(this.rng() * 3), wander: 0, attackTarget: null, chill: 0, burn: 0, bleed: 0, stun: 0, rage: 0, revealed: 0, specialCooldown: 2 };
    e.appearance=infectedAppearance(this.seed,this.visualIndex++);
    // An off-screen spawn may overlap terrain; resolve it before the first frame.
    moveBody(e, 0, 0, this.stage.platforms);
    this.enemies.push(e); return e;
  }
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.health <= 0) continue;
      const slow = e.chill > 0 ? .35 : 1;
      e.hurt = Math.max(0, e.hurt - dt); e.timer -= dt * slow; e.specialCooldown = Math.max(0, e.specialCooldown - dt * slow);
      for (const key of ['chill','burn','bleed','stun','rage','revealed']) e[key] = Math.max(0, (e[key] || 0) - dt);
      if (e.burn > 0 || e.bleed > 0) { e.dotTimer = (e.dotTimer || 0) - dt; if (e.dotTimer <= 0) { e.dotTimer = .5; this.damageEnemy(e, (e.burn > 0 ? 6 : 0) + (e.bleed > 0 ? 4 : 0), 0, this.player.facing, { dot: true }); } }
      if (e.health <= 0) continue;
      e.kb *= Math.exp(-8 * dt);
      const advance = (velocity, hop=true) => {
        const oldTravel = e.travel;
        if (hop && velocity && e.grounded && obstacleAhead(e, Math.sign(velocity), this.stage.platforms, 18)) { e.vy = jumpVelocity(this.stage.level.gravity); e.grounded = false; }
        e.vx = moveBody(e, velocity * slow * (e.rage > 0 ? 1.4 : 1) + e.kb, dt, this.stage.platforms, { gravity: this.stage.level.gravity, right: this.stage.finishX - (this.safe ? 20 : 0), terrain: this.stage.hazards }) / Math.max(.001, dt);
        if (Math.floor(oldTravel / 48) !== Math.floor(e.travel / 48) && Math.abs(e.x - p.x) < 550) this.event('zombieStep', { distance: Math.abs(e.x - p.x), pan: clamp((e.x - p.x) / 500, -1, 1), heavy: e.type === 'brute' });
      };
      e.growl -= dt;
      if (e.growl <= 0) { e.growl = 5 + this.fxRng() * 9; if (Math.abs(e.x - p.x) < 680 && !this.safe) this.event('growl', { distance: Math.abs(e.x - p.x), pan: clamp((e.x - p.x) / 500, -1, 1), heavy: e.type === 'brute' }); }
      const house = p.house !== null ? this.stage.houses.find(h => h.id === p.house && !h.collapsed) : null;
      const barricade = this.barricade && Math.abs(this.barricade.x - e.x) < 85 && Math.abs(p.x - e.x) > 70 ? this.barricade : null;
      const dogTarget = this.dog.rescued && !this.dog.lost && !house && !p.riding && Math.abs(e.x - this.dog.x) < 170 && this.dog.cooldown > 4;
      const escort=this.stage.mission?.escort,escortTarget=escort?.active&&!escort.hidden&&!escort.extracted&&!house&&!p.riding&&!['spitter','lobber','tremor','rammer','leaper','screamer'].includes(e.type)&&Math.abs(e.x-escort.x)<190&&Math.abs(e.x-escort.x)<Math.abs(e.x-p.x)+35;
      let tx = barricade ? barricade.x : house ? house.x + house.w / 2 : dogTarget ? this.dog.x : escortTarget ? escort.x : p.x;
      let range = barricade ? 80 : house ? 110 : dogTarget ? 40 : escortTarget ? e.range : e.range + (p.riding ? this.vehicle().w*.5+24 : 0);
      const distance = Math.abs(tx - e.x); e.facing = e.phase === 'leap' ? e.leapFacing || e.facing : Math.sign(tx - e.x) || e.facing;
      e.concealed = e.type === 'stalker' && distance > 240 && e.revealed <= 0 && e.chill <= 0;
      const targetY = house ? GROUND - 60 : barricade ? barricade.y + barricade.h / 2 : dogTarget ? this.dog.y + this.dog.h / 2 : escortTarget ? escort.y+escort.h/2 : p.y + p.h * .45;
      const clear = p.riding ? !this.stage.platforms.some(b=>b.vehicle!==p.riding&&segmentHitsRect(e.x+e.w/2,e.y+e.h*.45,tx+15,targetY,b)) : this.clearPath(e.x + e.w / 2, e.y + e.h * .45, tx + 15, targetY);
      if (e.stun > 0) { advance(0); continue; }
      if (e.wander > 0) { e.wander -= dt; advance(e.wanderDirection * e.speed * .6); e.phase = 'walk'; if (e.wander <= 0) e.houseHits = 0; continue; }
      if (this.safe) { e.phase = 'walk'; advance(e.x < this.stage.finishX - 160 ? e.speed : -e.speed * .1); continue; }
      if(updateSpecialThreat(this,e,dt,advance,{house,barricade,dogTarget,distance,clear}))continue;
      if (e.phase === 'leap') {
        advance(e.facing * 340);
        if (Math.abs(p.x - e.x) < e.range + 25 && Math.abs(e.y + e.h - p.y - p.h) < 70 && this.clearPath(e.x + e.w / 2,e.y + e.h / 2,p.x + p.w / 2,p.y + p.h / 2) && !house) { this.damagePlayer(e.damage); e.phase = 'recover'; e.timer = 1; }
        else if (e.timer <= 0 || e.grounded) { e.phase = 'recover'; e.timer = .8; }
        continue;
      }
      if (e.phase === 'windup') {
        if (e.timer <= 0) {
          e.phase = 'recover'; e.timer = e.type === 'runner' ? .65 : 1;
          const target = e.attackTarget;
          if (target === 'house' && house && distance < 150 && clear) {
            this.hitHouse(house); e.houseHits++;
            if (e.houseHits >= e.interest) { e.wander = 4 + this.rng() * 5; e.wanderDirection = this.rng() < .5 ? -1 : 1; }
          } else if (target === 'barricade' && barricade && distance < 110 && clear) { barricade.health--; this.event('houseHit'); this.particlesAt(barricade.x + 25, barricade.y + 30, '#d8ad72', 5); }
          else if (target === 'dog' && !this.dog.lost && distance < 75 && clear) { this.dog.health -= e.damage; this.dog.hurt = .3; if (this.dog.health <= 0) { this.dog.lost = true; this.event('dogLost'); } }
          else if(target==='escort'&&escortTarget&&distance<e.range+35&&clear)damageEscort(this,e.damage);
          else if (target === 'spit') {
            const sx = e.x + e.w / 2, sy = e.y + 21, dx = (e.aimPoint?.x??p.x+p.w/2) - sx, dy = (e.aimPoint?.y??p.y+32) - sy, d = Math.hypot(dx, dy) || 1;
            this.projectiles.push({ x: sx, y: sy, vx: dx / d * 295, vy: dy / d * 295, damage: e.damage, life: 2.4, friendly: false, r: 8, threatToken:e.threatToken }); e.specialCooldown=3.5;this.event('spit');
          } else if (target === 'scream' && !house && clear && distance < 600) {
            for (const other of this.enemies) if (other.health > 0 && Math.abs(other.x - e.x) < 450) other.rage = 5;
            e.specialCooldown = 9; this.effect('scream', e.x + e.w / 2, e.y + 20, 1.1); this.event('scream');
          } else if (target === 'leap' && !house && clear) { e.phase = 'leap'; e.leapFacing = e.facing; e.vy = jumpVelocity(this.stage.level.gravity) * .75; e.grounded = false; e.timer = .9; e.specialCooldown = 4; this.event('leap'); }
          else if (target === 'player' && distance < range + 35 && (p.riding || Math.abs(e.y + e.h - (p.y + p.h)) < 65) && clear) this.damagePlayer(e.damage);
        }
        advance(0);
        continue;
      }
      if (e.phase === 'recover') { if (e.timer <= 0) e.phase = 'walk'; advance(0); continue; }
      if (!house && !barricade && e.specialCooldown <= 0 && clear && (e.type === 'screamer' && distance < 550 && distance > 100 || e.type === 'leaper' && distance < 340 && distance > 125 && e.grounded) && beginSpecial(this,e)) {
        e.phase = 'windup'; e.timer = e.type === 'screamer' ? 1.15 : .7; e.attackTarget = e.type === 'screamer' ? 'scream' : 'leap'; this.event('windup', { enemy: e.type }); advance(0); continue;
      }
      const verticalReach = house || barricade || dogTarget || escortTarget || p.riding || Math.abs(e.y + e.h - (p.y + p.h)) < 65 || e.type === 'spitter';
      if(e.type==='spitter'&&!house&&!barricade&&!dogTarget&&distance<range&&clear&&(e.specialCooldown>0||!beginSpecial(this,e))){advance(distance<180?-e.facing*e.speed*.5:0);continue;}
      if (distance < range && verticalReach && clear) {
        e.phase = 'windup'; e.timer = e.windup;
        e.attackTarget = barricade ? 'barricade' : house ? 'house' : dogTarget ? 'dog' : escortTarget ? 'escort' : e.type === 'spitter' ? 'spit' : 'player';
        if(e.attackTarget==='spit'){e.aimPoint={x:p.x+p.w/2,y:p.y+32};this.event('threatWarning',{enemy:'spitter'});}
        advance(0);
      } else if (distance > 24) {
        advance(e.facing * e.speed * PROFILES[this.stage.profile].speed);
      } else advance(0);
    }
    this.enemies = this.enemies.filter(e => e.health > 0 && Math.abs(e.x - p.x) < 2400);
  }
  updatePlayer(dt, input) {
    const p = this.player;
    p.sawRunning = false;
    p.coyote=Math.max(0,(p.coyote||0)-dt);p.jumpBuffered=Math.max(0,(p.jumpBuffered||0)-dt);
    p.attack = Math.max(0, p.attack - dt); p.attackPose = Math.max(0, p.attackPose - dt); p.invincible = Math.max(0, p.invincible - dt); p.ability = Math.max(0, p.ability - dt);
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { const ammo = this.ammo(), amount = Math.min(WEAPONS[p.weapon].magazine - ammo.magazine, ammo.reserve); ammo.magazine += amount; ammo.reserve -= amount; this.event('loaded'); } }
    if (this.mode === 'sheltered') { const house = this.stage.houses[p.house]; house.insideTime += dt; this.supplyHouse(house); return; }
    if(p.riding)driveVehicle(this,dt,input);
    else {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction && p.dash <= 0) p.facing = direction;
    p.vx = p.dash > 0 ? p.facing * 890 : direction * PLAYER_SPEED;
    p.dash = Math.max(0, p.dash - dt);
    const wasGrounded = p.grounded, oldTravel = p.travel || 0;
    p.vx = moveBody(p, p.vx, dt, this.stage.platforms, { gravity: this.stage.level.gravity, left: this.safe ? this.stage.finishX + 20 : 0, right: this.stage.endX, terrain: this.stage.hazards }) / Math.max(.001, dt);
    if(wasGrounded&&!p.grounded&&p.vy>=0)p.coyote=.09;
    if(p.grounded&&p.jumpBuffered>0){p.vy=jumpVelocity(this.stage.level.gravity);p.grounded=false;p.jumpBuffered=0;p.coyote=0;this.event('jump');}
    if (!wasGrounded && p.grounded) this.event('land');
    if (p.grounded && Math.floor(oldTravel / 58) !== Math.floor(p.travel / 58)) this.event('footstep');
    }
    this.maxDistance = Math.max(this.maxDistance, p.x);
    if (input.attack) this.attack();
    if (p.weapon === 'chainsaw') {
      p.sawRunning = !!input.attack && !p.riding && !this.safe && p.house === null && p.reload <= 0 && this.ammo().magazine > 0;
      p.attackPose = p.sawRunning ? .14 : 0;
    }
    if (p.burst > 0) { p.burstTimer -= dt; if (p.burstTimer <= 0) { this.shoot(true); p.burst--; p.burstTimer = .11; } }
    if (!this.safe && !missionReady(this) && p.x >= this.stage.finishX-p.w-24) {
      p.x=this.stage.finishX-p.w-25;if(p.riding){const v=this.vehicle();v.x=p.x-v.w*.3;v.driveSpeed=0;v.vx=0;syncVehicleBody(this,v);}
      if(this.time>this.gateHint){this.gateHint=this.time+4;this.event('hint',{text:'Gate locked. Complete the mission objective first.'});}
    }
    if (!this.safe && missionReady(this) && p.x >= this.stage.finishX) {
      if(p.riding)exitVehicle(this,{forced:true,gate:true});
      this.safe = true; this.projectiles = []; this.safetyFlash = 1; this.cash(this.stage.level.reward); p.x = this.stage.finishX + 24;
      this.effect('victory', p.x + p.w / 2, p.y + 25, 2.4);
      this.particlesAt(p.x + 70, p.y - 20, '#d8c58c', 45);
      if (!this.completed.includes(this.levelId)) this.completed.push(this.levelId);
      this.loadout = this.equipment();
      this.event('safe'); this.save();
    }
    if (this.safe && p.x >= this.stage.shopX - 75) { this.mode = 'shop'; this.loadout = this.equipment(); this.save(); this.event('shop'); }
  }
  updatePickups(dt) {
    const p = this.player;
    for (const item of this.stage.pickups) {
      if (item.collected) continue;
      placePickup(item, this.stage.platforms);
      if (Math.abs(item.x - p.x) > (item.kind === 'coins' ? 70 : 42) || Math.abs(item.y - (p.y + p.h * .55)) > 63) continue;
      if (item.kind === 'health' && p.health >= 100) continue;
      if (item.kind === 'ammo' && !this.needsAmmo()) continue;
      item.collected = true;
      if (item.kind === 'coins') this.cash(item.amount, item.x, item.y);
      if (item.kind === 'health') { p.health = Math.min(100, p.health + item.amount); this.float(`+${item.amount} HP`, item.x, item.y, '#dced95'); this.event('pickup'); }
      if (item.kind === 'ammo') { this.giveAmmo(item.amount); this.float('AMMUNITION', item.x, item.y); this.event('pickup'); }
      if (item.kind === 'pistol') {
        if (!p.pistol) { p.pistol = true; p.magazine = 12; p.reserve += 36; p.weapon = 'pistol'; this.event('pistol'); }
        else { p.reserve = Math.min(999, p.reserve + 24); this.event('pickup'); }
      }
    }
  }
  updateDog(dt) {
    const dog = this.dog, p = this.player;
    if(p.riding){const v=this.vehicle();if(v){dog.x=v.x+12;dog.y=GROUND-dog.h;}return;}
    if (!dog.rescued && Math.abs(p.x - this.stage.dogRescueX) < 70 && p.y > GROUND - 110) { dog.rescued = true; dog.health = 45; dog.x = p.x - 65; this.event('dogRescue'); }
    if (!dog.rescued || dog.lost || p.house !== null) return;
    dog.cooldown = Math.max(0, dog.cooldown - dt); dog.hurt = Math.max(0, dog.hurt - dt);
    const target = p.x - p.facing * 65;
    dog.facing = Math.sign(target - dog.x) || p.facing;
    if (dog.grounded && obstacleAhead(dog, dog.facing, this.stage.platforms, 40)) { dog.vy = jumpVelocity(this.stage.level.gravity); dog.grounded = false; }
    moveBody(dog, clamp((target - dog.x) * 4, -330, 330), dt, this.stage.platforms, { gravity: this.stage.level.gravity, right: this.stage.endX, terrain: this.stage.hazards });
    const enemy = this.enemies.find(e => e.health > 0 && Math.abs(e.x - dog.x) < 180);
    if (enemy && dog.cooldown <= 0 && !this.safe) { dog.cooldown = 7; enemy.phase = 'recover'; enemy.timer = 1.6; enemy.kb = Math.sign(enemy.x - dog.x) * 90; this.float('WOOF!', dog.x, dog.y - 14, '#ebdfb1'); this.event('bark'); }
  }
  updateProjectiles(dt) {
    for (const shot of this.projectiles) advanceProjectile(this,shot,dt);
    this.projectiles=this.projectiles.filter(s=>s.life>0);
  }
  update(dt, input = {}, viewportWidth = 1440) {
    if (this.mode !== 'playing' && this.mode !== 'sheltered') return;
    dt = Math.min(.035, Math.max(0, dt)); this.time += dt; this.shake *= Math.exp(-10 * dt); this.safetyFlash = Math.max(0, this.safetyFlash - dt * .55);
    this.viewWidth=viewportWidth;
    settleVehicles(this,dt);this.updatePlayer(dt, input);
    updateMission(this,dt,input);updateMechanisms(this,dt);
    if (!['playing', 'sheltered'].includes(this.mode)) return;
    if (this.mode === 'playing' && !this.safe) this.updatePickups(dt);
    this.updateDog(dt); this.updateEnemies(dt); this.updateProjectiles(dt); this.updateHazards(dt);
    if (this.barricade) { this.barricade.life -= dt; if (this.barricade.life <= 0 || this.barricade.health <= 0) this.barricade = null; }
    if (!this.safe) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const progress = clamp(this.maxDistance / this.stage.length, 0, 1), profile = PROFILES[this.stage.profile];
        const pressure = this.stage.profile === 'mixed' ? [.7, 1, 1.5][Math.min(2, Math.floor(progress * 3))] : profile.spawn;
        this.spawnTimer = Math.max(.65, (3.7 - progress * 1.9) / (pressure * (1 + (this.stage.level.difficulty - 1) * .12)));
        const type = this.encounterType(progress);
        const fromBack = this.encounterRng() < .18;
        const x = this.player.x + (fromBack ? -viewportWidth * .55 - 100 : viewportWidth * .8 + 100) + this.encounterRng() * 100;
        if (x > 50 && x < this.stage.finishX - 250) this.spawnEnemy(type, x);
      }
    }
    this.district = Math.min(2, Math.floor(this.maxDistance / (this.stage.length / 3)));
    if (this.district !== this.lastDistrict) { this.lastDistrict = this.district; this.event('district', { district: this.district }); }
    this.animateVisuals(dt);
  }
  animateVisuals(dt) {
    this.hitConfirm = Math.max(0, this.hitConfirm - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    for (const corpse of this.corpses) corpse.life -= dt;
    this.corpses = this.corpses.filter(c => c.life > 0);
    if (this.mode === 'dead') { this.deathTime += dt; this.shake *= Math.exp(-10 * dt); }
    if (this.mode === 'shop') this.safetyFlash = Math.max(0, this.safetyFlash - dt * .55);
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter(e => e.life > 0);
    for (const part of this.particles) { part.x += part.vx * dt; part.y += part.vy * dt; part.vy += 600 * dt; part.life -= dt; }
    for (const f of this.floats) { f.y -= dt * 32; f.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0).slice(-400); this.floats = this.floats.filter(f => f.life > 0).slice(-40);
  }
  updateHazards(dt) {
    if (this.safe) return;
    for (const pool of this.pools) pool.life -= dt;
    this.pools = this.pools.filter(h => h.life > 0);
    for (const body of [this.player, ...this.enemies]) {
      body.hazardCooldown = Math.max(0, (body.hazardCooldown || 0) - dt);
      if (body === this.player && this.player.house !== null || body.hazardCooldown > 0) continue;
      const hazard = [...this.stage.hazards, ...this.pools].find(h => !h.disabled && h.type !== 'ice' && overlap(body, h) && (h.type !== 'electric' || Math.sin(this.time * 2 + h.phase) > -.1));
      if (!hazard) continue;
      body.hazardCooldown = 1;
      if (body === this.player) { if (this.damagePlayer(hazard.type === 'lava' ? 18 : 8)) this.event('hazard'); }
      else this.damageEnemy(body, hazard.type === 'lava' ? 35 : 15, 0);
    }
  }
  encounterType(progress) {
    const natural = ['forest','boreal','swamp','wetlands','redforest','alpine'].includes(this.stage.level.biome);
    const pool = ['walker','walker','walker','runner','crawler'];
    if (progress > .16) pool.push('leaper', natural ? 'stalker' : 'armored');
    if (progress > .22) pool.push('lobber', 'rammer');
    if (progress > .4) pool.push('tremor', 'lobber');
    if (progress > .28) pool.push('brute','spitter','bloater');
    if (progress > .42) pool.push('screamer', natural ? 'stalker' : 'armored');
    if (progress > .6) pool.push('leaper','screamer','stalker','armored');
    return pool[Math.floor(this.encounterRng() * pool.length)];
  }
  itemPrice(item) { const guns=Object.keys(WEAPONS).filter(id=>WEAPONS[id].magazine&&this.ownsWeapon(id)).length;return Math.round(item.basePrice * (1 + (item.upgrade ? this.player.upgrades[item.upgrade] * .55 : item.id==='ammo'?Math.max(0,guns-1)*.28:0))); }
  canBuy(item) {
    if (this.mode !== 'shop' || this.money < this.itemPrice(item) || item.pistol && !this.player.pistol) return false;
    if (item.weapon && this.ownsWeapon(item.weapon)) return false;
    if (item.firearm && !Object.keys(WEAPONS).some(id => WEAPONS[id].magazine && this.ownsWeapon(id))) return false;
    if (item.id === 'heal' && this.player.health >= 100) return false;
    if (item.id === 'ammo' && Object.keys(WEAPONS).filter(id => WEAPONS[id].magazine && this.ownsWeapon(id)).every(id => this.ammo(id).reserve >= 999)) return false;
    if (item.upgrade && this.player.upgrades[item.upgrade] >= (item.upgrade === 'reload' ? 4 : 5)) return false;
    return true;
  }
  buy(id) {
    const item = SHOP_ITEMS.find(i => i.id === id); if (!item || !this.canBuy(item)) return false;
    this.money -= this.itemPrice(item);
    if (id === 'heal') this.player.health = Math.min(100, this.player.health + 40);
    if (id === 'ammo') this.giveAmmo(36);
    if (item.weapon) {
      const id = item.weapon;
      if (id === 'pistol') { this.player.pistol = true; this.player.magazine = 12; this.player.reserve = Math.min(999, this.player.reserve + 36); }
      else this.player.arsenal[id] = { owned: true, magazine: WEAPONS[id].magazine || 0, reserve: (WEAPONS[id].magazine || 0) * 3 };
      this.player.weapon = id;
    }
    if (item.upgrade) this.player.upgrades[item.upgrade]++;
    this.loadout = this.equipment();
    this.event('purchase'); this.save(); return true;
  }
}

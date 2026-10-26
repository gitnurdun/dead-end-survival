import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { WEAPONS, ENEMIES, SHOP_ITEMS, GROUND, MAX_ENEMIES } from '../src/data.js';
import { normalizeEquipment, overlap } from '../src/world.js';
import { AUDIO_ASSETS, assetForEvent, SampleBank } from '../src/audio-assets.js';
import { CATALOG } from '../src/catalog.js';
import { createTraining } from '../src/training.js';

function fresh(id) {
  const g = new Game(); g.newGame('civilian', 558); g.stage.platforms = []; g.stage.hazards = []; g.stage.pickups = []; g.spawnTimer = 1e8; g.player.invincible = 1e8;
  if (id) { g.mode = 'shop'; g.safe = true; g.money = 100000; assert(g.buy(id)); g.mode = 'playing'; g.safe = false; }
  return g;
}
function ticks(g,s) { for(let t=0;t<s;t+=.02)g.update(.02); }
function stationary(g,type,x) { const e=g.spawnEnemy(type,x);e.speed=0;return e; }

test('16 weapons span three families and every purchasable weapon has a museum dossier', () => {
  assert.equal(Object.keys(WEAPONS).length,16);
  for(const [family,count] of [['melee',6],['firearm',7],['prototype',3]])assert.equal(Object.values(WEAPONS).filter(w=>w.family===family).length,count);
  for(const [id,w]of Object.entries(WEAPONS)){assert(CATALOG.some(e=>e.id==='weapon-'+id&&e.family===w.family));if(!['fists','bat'].includes(id))assert(SHOP_ITEMS.some(i=>i.weapon===id));}
});
test('every new weapon can be acquired and carries valid, separate resources through save and retry', () => {
  for(const id of Object.keys(WEAPONS).filter(id=>!['fists','bat'].includes(id))) {
    const g=fresh(id), saved=g.equipment();g.loadout=saved;g.selectLevel('boreal');g.die();g.retry();
    assert(g.ownsWeapon(id));assert.equal(g.player.weapon,id);assert.deepEqual(normalizeEquipment(g.equipment()).arsenal,saved.arsenal);
    if(WEAPONS[id].magazine){const ammo=g.ammo();ammo.magazine=0;assert(g.reload());ticks(g,WEAPONS[id].reload+.1);assert.equal(ammo.magazine,WEAPONS[id].magazine);}
  }
});
test('machete bleeding persists after a hit, while spear thrusts reach two aligned targets', () => {
  const g=fresh('machete'),e=stationary(g,'brute',345);g.attack();assert(e.bleed>0);const hp=e.health;ticks(g,.6);assert(e.health<hp);
  const spear=fresh('spear');const a=stationary(spear,'walker',350),b=stationary(spear,'walker',410),c=stationary(spear,'walker',445);spear.attack();assert(a.health<60);assert(b.health<60);assert.equal(c.health,60);
});
test('hammer interrupts attack windups; fuel-powered chainsaw stops and refuels when empty', () => {
  const g=fresh('hammer'),e=stationary(g,'armored',345);e.phase='windup';e.timer=.01;e.attackTarget='player';g.attack();assert.equal(e.phase,'recover');assert(e.stun>.7);assert.equal(e.health,66);
  const saw=fresh('chainsaw');stationary(saw,'brute',340);saw.ammo().magazine=1;saw.attack();assert.equal(saw.ammo().magazine,0);saw.player.attack=0;saw.attack();assert.equal(saw.ammo().magazine,0);assert(saw.reload());ticks(saw,2.3);assert.equal(saw.ammo().magazine,60);
});
test('melee strikes cannot pass through a solid barrier', () => {
  const g=fresh('spear');g.stage.platforms=[{x:340,y:GROUND-100,w:15,h:100,solid:true}];const e=stationary(g,'walker',380);g.attack();assert.equal(e.health,60);
});
test('Tesla arcs damage at most three targets, respect cover, and consume one cell per discharge', () => {
  const g=fresh('tesla'),targets=[460,535,610,685].map(x=>stationary(g,'brute',x)),before=g.ammo().magazine;g.attack();
  assert.equal(g.ammo().magazine,before-1);assert.equal(targets.filter(e=>e.health<175).length,3);assert.equal(g.effects.filter(e=>e.type==='arc').length,3);
  const covered=fresh('tesla');const a=stationary(covered,'brute',450),b=stationary(covered,'brute',560);covered.stage.platforms=[{x:530,y:GROUND-130,w:15,h:130,solid:true}];covered.attack();assert(a.health<175);assert.equal(b.health,175);
});
test('frost slows movement and attack windups; plasma pierces bodies once each but stops at terrain', () => {
  const g=fresh('cryo'),e=stationary(g,'brute',490);g.attack();ticks(g,.3);assert(e.chill>2);e.speed=100;e.phase='walk';const start=e.x;g.updateEnemies(.1);assert(Math.abs(e.x-start)<=3.6);
  e.phase='windup';e.timer=1;g.updateEnemies(.1);assert(e.timer>.96);
  const plasma=fresh('plasma'),targets=[450,520,590,660].map(x=>stationary(plasma,'brute',x));plasma.attack();ticks(plasma,.5);assert.equal(targets.filter(e=>e.health<175).length,3);assert.equal(targets[0].health,118);
  const blocked=fresh('plasma'),behind=stationary(blocked,'brute',560);blocked.stage.platforms=[{x:450,y:GROUND-110,w:25,h:110,solid:true}];blocked.attack();ticks(blocked,.5);assert.equal(behind.health,175);
});
test('explosions hit groups once and cannot damage infected through solid cover', () => {
  const g=fresh('launcher'),targets=[470,510,550].map(x=>stationary(g,'brute',x));g.attack();ticks(g,.4);for(const e of targets)assert.equal(e.health,70);assert.equal(g.effects.filter(e=>e.type==='explosion').length,1);
  const blocked=fresh('launcher');const e=stationary(blocked,'brute',520);blocked.stage.platforms=[{x:450,y:GROUND-150,w:25,h:150,solid:true}];blocked.attack();ticks(blocked,.6);assert.equal(e.health,175);
});
test('flamethrower ignites at close range and fire damage persists without repeated attacks', () => {
  const g=fresh('flamer'),e=stationary(g,'brute',400);g.attack();ticks(g,.3);assert(e.burn>2);const hp=e.health;ticks(g,.6);assert(e.health<hp);assert.equal(g.ammo().magazine,79);
});
test('riot armor blocks frontal bullets but allows rear hits and armor-piercing attacks', () => {
  const g=fresh();const e=stationary(g,'armored',500);e.facing=-1;g.damageEnemy(e,100,0,1,{ballistic:true});assert.equal(e.health,85);
  e.health=130;g.damageEnemy(e,100,0,-1,{ballistic:true});assert.equal(e.health,30);
  e.health=130;g.damageEnemy(e,100,0,1,{ballistic:true,armorPiercing:true});assert.equal(e.health,30);
});
test('siren telegraphs and enrages nearby infected without creating enemies on screen', () => {
  const g=fresh(),s=stationary(g,'screamer',600),w=stationary(g,'walker',650);s.specialCooldown=0;g.updateEnemies(.01);assert.equal(s.phase,'windup');assert.equal(s.attackTarget,'scream');assert.equal(w.rage,0);
  ticks(g,1.3);assert(w.rage>4);assert(s.specialCooldown>8);assert.equal(g.enemies.length,2);
});
test('leaper telegraphs before a physical jump and cannot phase through a car', () => {
  const g=fresh(),e=g.spawnEnemy('leaper',570);e.specialCooldown=0;g.updateEnemies(.01);assert.equal(e.phase,'windup');assert.equal(e.attackTarget,'leap');
  ticks(g,.72);assert(!e.grounded);assert(e.y<GROUND-e.h);g.stage.platforms=[{x:445,y:GROUND-69,w:80,h:69,solid:true}];
  for(let i=0;i<30;i++){g.update(.02);assert(!overlap(e,g.stage.platforms[0]));}
});
test('rot-carrier pools expire and cannot hurt a sheltered player or cross the sealed gate', () => {
  const g=fresh(),e=stationary(g,'bloater',320);g.damageEnemy(e,200);assert.equal(g.pools.length,1);g.player.invincible=0;g.player.x=320;g.updateHazards(.02);assert(g.player.health<100);
  g.enterHouse(g.stage.houses[0]);const hp=g.player.health;g.player.x=320;g.player.hazardCooldown=0;g.updateHazards(1);assert.equal(g.player.health,hp);
  g.exitHouse();g.safe=true;g.player.x=320;g.updateHazards(1);assert.equal(g.player.health,hp);
  g.safe=false;g.updateHazards(5);assert.equal(g.pools.length,0);
});
test('stalker concealment responds to distance and damage; crawler has a distinct low body', () => {
  const g=fresh(),e=stationary(g,'stalker',700),crawler=stationary(g,'crawler',800);g.updateEnemies(.02);assert(e.concealed);g.damageEnemy(e,1);g.updateEnemies(.02);assert(!e.concealed);assert(crawler.h<35);
});
test('later encounters include all thirteen species while active enemy cap remains enforced', () => {
  const g=fresh(),types=new Set();for(let i=0;i<500;i++)types.add(g.encounterType(.9));assert.equal(types.size,13);
  for(let i=0;i<50;i++)g.spawnEnemy('crawler',1000+i);assert.equal(g.enemies.length,MAX_ENEMIES);
});
test('weapon selection rejects locked gear and is disabled in shelter, during burst and after gate sealing', () => {
  const g=fresh('cryo');assert(g.equipWeapon('bat'));assert(!g.equipWeapon('plasma'));assert(g.equipWeapon('cryo'));g.toggleWeapon(-1);assert(g.player.weapon!=='cryo');
  g.enterHouse(g.stage.houses[0]);assert(!g.equipWeapon('cryo'));g.exitHouse();g.player.burst=1;assert(!g.equipWeapon('cryo'));g.player.burst=0;g.safe=true;assert(!g.equipWeapon('cryo'));
});
test('all supplied audio mappings resolve to actual files and weapon events use matching recordings', () => {
  for(const name of Object.values(AUDIO_ASSETS)){const path=new URL('../audio/'+name,import.meta.url);assert(existsSync(path));assert(readFileSync(path).length>1000);}
  assert.equal(AUDIO_ASSETS[assetForEvent('shot',{weapon:'revolver'})],'magnum.wav');assert.equal(assetForEvent('swing',{weapon:'chainsaw'}),'chainsaw');assert.equal(assetForEvent('swing',{weapon:'fists'}),'punch');assert.equal(assetForEvent('purchase'),'purchase');assert.equal(assetForEvent('kill',{},true),'kill2');
});
test('unavailable audio falls back immediately instead of blocking gameplay', () => {
  const bank=new SampleBank({},{});bank.failed.add(AUDIO_ASSETS.pistol);assert.equal(bank.play('shot',{weapon:'pistol'}),false);assert.equal(bank.play('unknown'),false);assert.equal(bank.updateMusic('playing',false),false);
});
test('training provides every weapon without changing campaign funds, equipment or save callbacks', () => {
  const campaign=fresh('shotgun'),snapshot=JSON.stringify(campaign.save());
  for(const id of Object.keys(WEAPONS)) {const trial=createTraining(id);assert.equal(trial.player.weapon,id);assert(trial.ownsWeapon(id));trial.attack();ticks(trial,.15);assert.equal(trial.stage.platforms.length,0);assert.equal(JSON.stringify(campaign.save()),snapshot);}
  assert.equal(createTraining('missing'),null);
});

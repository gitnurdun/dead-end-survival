import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { TrainingSession } from '../src/training.js';
import { segmentRectTime,overlap } from '../src/world.js';
import { routeStatus } from '../src/hud-state.js';
import { SampleBank,AUDIO_ASSETS } from '../src/audio-assets.js';
import { Audio } from '../src/soundscape.js';
import { normalizeSettings } from '../src/settings.js';
import { GROUND } from '../src/data.js';

function fresh(character='civilian'){const g=new Game();g.newGame(character,432);g.spawnTimer=1e8;g.stage.platforms=[];g.stage.hazards=[];g.stage.pickups=[];return g;}
function tick(g,seconds,input={}){for(let t=0;t<seconds;t+=.02)g.update(.02,input);}
function shot(g,{x=300,y=GROUND-35,vx=3000,life=1,pierce=1,blast=0}={}){const s={x,y,vx,vy:0,life,pierce,blast,damage:10,knockback:0,friendly:true,r:3,struck:[]};g.projectiles.push(s);return s;}
function enemy(g,x){const e=g.spawnEnemy('walker',x);e.speed=0;return e;}

test('swept contacts expose their exact entry time and distinguish misses from a zero-time hit',()=>{
  const box={x:100,y:10,w:30,h:30};assert.equal(segmentRectTime(0,20,200,20,box),.5);assert.equal(segmentRectTime(110,20,200,20,box),0);assert.equal(segmentRectTime(0,0,200,0,box),null);
});
test('a bullet hits an enemy before a wall even when both are crossed in the same frame',()=>{
  const g=fresh(),e=enemy(g,330);g.stage.platforms=[{x:375,y:GROUND-100,w:20,h:100,solid:true}];shot(g);g.updateProjectiles(.035);assert.equal(e.health,50);
});
test('a wall shields an enemy within the same frame and piercing stops at the first barrier',()=>{
  const g=fresh(),a=enemy(g,330),b=enemy(g,395);g.stage.platforms=[{x:375,y:GROUND-100,w:12,h:100,solid:true}];shot(g,{pierce:3,vx:5000});g.updateProjectiles(.035);assert.equal(a.health,50);assert.equal(b.health,60);assert.equal(g.projectiles.length,0);
});
test('projectiles never deal damage beyond their remaining range and grenades detonate at contact',()=>{
  const g=fresh(),e=enemy(g,340);shot(g,{life:.005});g.updateProjectiles(.035);assert.equal(e.health,60);
  const blast=shot(g,{x:300,blast:50});g.updateProjectiles(.035);assert(blast.detonated);assert.equal(blast.x,340);assert.equal(e.health,50);
});
test('a grenade hits the front face of a wall and cannot tunnel to a target center',()=>{
  const g=fresh(),e=enemy(g,395);g.stage.platforms=[{x:350,y:GROUND-120,w:20,h:120,solid:true}];const s=shot(g,{blast:125});g.updateProjectiles(.035);assert(s.x<350);assert(s.x>349);assert.equal(e.health,60);
});
test('weapon muzzle is clipped to nearby cover and ranged shots cannot bypass it',()=>{
  const g=fresh();g.player.x=310;g.player.pistol=true;g.player.magazine=12;g.player.weapon='pistol';g.stage.platforms=[{x:350,y:GROUND-100,w:50,h:100,solid:true}];const e=enemy(g,420);g.attack();assert(g.projectiles[0].x<350);g.updateProjectiles(.035);assert.equal(e.health,60);
});
test('electric and shove attacks respect raised platforms and solid cover',()=>{
  const g=fresh();g.stage.platforms=[{x:340,y:GROUND-100,w:15,h:100,solid:true}];const e=enemy(g,400);g.ability();assert.equal(e.health,60);
  g.stage.platforms=[{x:350,y:GROUND-90,w:100,h:12,solid:false}];assert.equal(g.clearPath(300,GROUND-110,440,GROUND-50),false);
});
test('cosmetic particles and growls cannot alter future encounter composition or drops',()=>{
  const a=fresh(),b=fresh();for(let i=0;i<100;i++)a.particlesAt(20,20,'#fff',10);
  assert.deepEqual(Array.from({length:100},()=>a.encounterType(.8)),Array.from({length:100},()=>b.encounterType(.8)));
  assert.equal(a.rng(),b.rng());
});
test('leaper commits to its launch direction instead of turning toward a player midair',()=>{
  const g=fresh(),e=g.spawnEnemy('leaper',550);e.phase='leap';e.leapFacing=-1;e.facing=-1;e.grounded=false;e.vy=-200;e.timer=.8;g.player.x=750;const x=e.x;g.updateEnemies(.02);assert(e.x<x);assert.equal(e.facing,-1);
});
test('kills create bounded falling remnants, damage feedback and meaningful damage totals',()=>{
  const g=fresh(),e=enemy(g,400);g.damageEnemy(e,1000);assert.equal(g.corpses.length,1);assert.equal(g.stats.damage,60);assert(g.lastHit.lethal);assert(g.hitConfirm>0);assert(g.floats.some(f=>f.damage));
  g.damageEnemy(e,1000);assert.equal(g.corpses.length,1);g.animateVisuals(1.5);assert.equal(g.corpses.length,0);assert.equal(g.hitConfirm,0);
});
test('jump buffering works just before landing and a coyote jump is allowed just after a ledge',()=>{
  const g=fresh(),p=g.player;p.y=GROUND-p.h-3;p.grounded=false;p.vy=130;g.jumpOrShelter();g.update(.02);assert(p.vy<0);assert(!p.grounded);
  const c=fresh(),q=c.player;c.stage.platforms=[{x:100,y:GROUND-100,w:200,h:12,solid:false}];q.x=298;q.y=GROUND-100-q.h;q.grounded=true;c.update(.02,{right:true});assert(q.coyote>0);c.jumpOrShelter();assert(q.vy<0);const vy=q.vy;c.jumpOrShelter();assert.equal(q.vy,vy);
});
test('buffered Up never enters a shelter without a fresh grounded doorway interaction',()=>{
  const g=fresh(),h=g.stage.houses[0],p=g.player;p.x=h.x+h.w/2-p.w/2;p.y=GROUND-p.h-3;p.vy=130;p.grounded=false;g.jumpOrShelter();g.update(.02);assert.equal(p.house,null);assert.equal(g.mode,'playing');
  p.grounded=true;g.jumpOrShelter();assert.equal(g.mode,'sheltered');assert.equal(p.jumpBuffered,0);
});
test('mechanic refuses an obstructed placement without spending the ability cooldown',()=>{
  const g=fresh('mechanic');g.player.x=310;g.stage.platforms=[{x:350,y:GROUND-69,w:150,h:69,solid:true}];assert.equal(g.ability(),false);assert.equal(g.player.ability,0);assert.equal(g.barricade,null);
  g.player.x=240;assert(g.ability());assert(!overlap(g.barricade,g.stage.platforms[0]));
});
test('route HUD tracks doorway proximity, structure integrity, exhausted houses and field contracts',()=>{
  const g=fresh(),h=g.stage.houses[0];g.player.x=h.x+h.w/2-g.player.w/2;assert(routeStatus(g).nearby);g.enterHouse(h);h.health=6;assert.equal(routeStatus(g).integrity,.25);assert.equal(routeStatus(g).nextLabel,'SUPPLIES EXHAUSTED');
  const scout=g.stage.npcs[0];scout.greeted=true;g.kills=8;assert(routeStatus(g).contractLabel.includes('RETURN'));scout.used=true;assert.equal(routeStatus(g).contractLabel,'');
});
test('an occupied shelter warns once as it becomes critical and collapse still costs exactly 12 health',()=>{
  const g=fresh(),events=[];g.onEvent=e=>events.push(e.type);const h=g.stage.houses[0];g.enterHouse(h);g.player.health=90;g.hitHouse(h,18);g.hitHouse(h,1);assert.equal(events.filter(t=>t==='houseWarning').length,1);g.hitHouse(h,99);assert.equal(g.player.health,78);assert(g.hurtFlash>0);
});
test('training scenarios cover all species, keep moving targets harmless, and reset without altering ammo',()=>{
  const t=new TrainingSession('pistol',()=>{},{preset:'cover',enemy:'crawler'});assert.equal(t.game.stage.platforms.length,1);assert(t.game.enemies.every(e=>e.type==='crawler'));t.attack();const rounds=t.game.player.magazine;t.resetTargets();assert.equal(t.game.player.magazine,rounds);
  t.preset='moving';t.enemy='leaper';t.resetTargets();for(let i=0;i<500;i++)t.update(.02);assert.equal(t.game.player.health,100);
});
test('training held fire uses weapon cadence, auto reloads, replenishes targets and releases cleanly',()=>{
  const t=new TrainingSession('smg',()=>{},{preset:'crowd',enemy:'walker'});t.held=true;for(let i=0;i<350;i++)t.update(.02);assert(t.game.stats.shots>30);assert(t.game.kills>5);assert(t.game.player.arsenal.smg.reserve<999);assert(t.summary().damage>0);assert.equal(t.game.money,0);assert.equal(t.game.stage.pickups.length,0);t.release();const shots=t.game.stats.shots;for(let i=0;i<20;i++)t.update(.02);assert.equal(t.game.stats.shots,shots);
});

function fakeAudio(){const nodes=[],gains=[];const param=()=>({value:1,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}});return{nodes,gains,context:{currentTime:1,createBufferSource(){const n={playbackRate:{value:1},connect(){},disconnect(){},start(){n.started=true;},stop(){n.stopped=true;}};nodes.push(n);return n;},createGain(){const n={gain:param(),connect(){},disconnect(){}};gains.push(n);return n;},createStereoPanner(){return{pan:{value:0},connect(){},disconnect(){}};}}};}
test('continuous recorded weapons keep one loop and stop on reload, pause or loss of focus',()=>{
  const f=fakeAudio(),bank=new SampleBank(f.context,{effects:{},world:{}}),g=fresh();g.player.weapon='chainsaw';g.player.sawRunning=true;bank.buffers.set(AUDIO_ASSETS.chainsaw,{buffer:{duration:1},gain:1});bank.syncWeapon(g,true);const n=bank.loop.node;bank.syncWeapon(g,true);assert.equal(f.nodes.length,1);g.mode='paused';bank.syncWeapon(g,true);assert(n.stopped);assert.equal(bank.loop,null);
  g.mode='playing';bank.syncWeapon(g,true);bank.syncWeapon(g,false);assert.equal(bank.loop,null);
});
test('menu soundtrack stops immediately on entering any gameplay state',()=>{
  const f=fakeAudio(),bank=new SampleBank(f.context,{music:{}});bank.buffers.set(AUDIO_ASSETS.intro,{buffer:{duration:10},gain:1});
  for(const mode of ['playing','sheltered','shop','paused','transition','dead']){
    assert(bank.updateMusic('menu',true));const track=bank.music;assert(track.node.loop);
    bank.updateMusic('menu',true);assert.equal(bank.music,track);
    assert.equal(bank.updateMusic(mode,true),false);assert(track.node.stopped);assert.equal(bank.music,null);
  }
});
test('missing supplied menu music stays silent and retries loading without a generated fallback',()=>{
  const f=fakeAudio(),bank=new SampleBank(f.context,{music:{}});let requested=null;bank.load=key=>{requested=key;};
  assert.equal(bank.updateMusic('menu',true),false);assert.equal(requested,'intro');assert.equal(f.nodes.length,0);
  bank.buffers.set(AUDIO_ASSETS.intro,{buffer:{duration:10},gain:1});assert(bank.updateMusic('menu',true));
});
test('chainsaw held input runs continuously, deals contact damage, then stops on release or empty fuel',()=>{
  const g=fresh();g.player.arsenal.chainsaw={owned:true,magazine:60,reserve:120};g.player.weapon='chainsaw';const e=enemy(g,330);
  for(let i=0;i<25;i++){g.update(.02,{attack:true});assert(g.player.sawRunning);assert.equal(g.player.attackPose,.14);}
  assert(g.stats.damage>0);assert(g.ammo().magazine<60);assert(!g.effects.some(e=>e.type==='slash'));
  g.update(.02,{});assert.equal(g.player.sawRunning,false);assert.equal(g.player.attackPose,0);
  g.ammo().magazine=0;g.update(.02,{attack:true});assert.equal(g.player.sawRunning,false);
});
test('purchased pistol is immediately equipped and survives deployment, refresh, retry and replay without field guns',()=>{
  const g=fresh();g.mode='menu';g.money=200;g.openArmory();assert(g.buy('pistol'));assert.equal(g.player.weapon,'pistol');assert.equal(g.ammo().magazine,12);
  const reloaded=new Game();assert(reloaded.load(g.save()));reloaded.nextStage();assert.equal(reloaded.player.weapon,'pistol');assert(reloaded.player.pistol);reloaded.spawnTimer=1e8;reloaded.attack();assert.equal(reloaded.player.magazine,11);
  reloaded.die();reloaded.retry();assert(reloaded.player.pistol);assert.equal(reloaded.player.magazine,12);
  reloaded.selectLevel('boreal');assert(reloaded.player.pistol);assert(!reloaded.stage.pickups.some(p=>p.kind==='pistol'));
});
test('starting melee needs multiple strikes and fists cannot damage an entire crowd',()=>{
  const g=fresh();g.player.weapon='fists';const a=enemy(g,320),b=enemy(g,325);g.attack();assert.equal(g.stats.damage,6);assert.equal([a,b].filter(e=>e.health<60).length,1);
  g.player.weapon='bat';g.player.attack=0;g.attack();assert.equal(g.stats.damage,42);assert(g.enemies.every(e=>e.health>0));
});
test('background audio mutes immediately and feedback settings migrate without changing old preferences',()=>{
  const a=new Audio(normalizeSettings({music:.2,effects:0}));let level=null,stopped=false;a.context={currentTime:0};a.output={gain:{setTargetAtTime(v){level=v;}}};a.samples={stopLoop(){stopped=true;}};a.setHidden(true);assert.equal(level,0);assert(stopped);a.setHidden(false);assert.equal(level,1);const s=normalizeSettings({music:.2,hitMarkers:false});assert.equal(s.music,.2);assert.equal(s.hitMarkers,false);assert(s.damageNumbers);assert(s.flashlight);
});

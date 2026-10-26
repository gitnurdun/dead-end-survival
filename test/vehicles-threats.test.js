import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { GROUND, ENEMIES } from '../src/data.js';
import { VEHICLES,makeVehicle } from '../src/vehicle-data.js';
import { syncVehicleBody, damageVehicle } from '../src/vehicles.js';
import { overlap } from '../src/world.js';
import { SampleBank, AUDIO_ASSETS } from '../src/audio-assets.js';
import { Audio } from '../src/soundscape.js';
import { CATALOG } from '../src/catalog.js';

function fresh(){const g=new Game();g.newGame('civilian',755);g.spawnTimer=1e8;g.stage.hazards=[];g.stage.pickups=[];return g;}
function tick(g,t,input={}){for(let n=0;n<t;n+=.02)g.update(.02,input);}
function board(g,type='buggy',x=300){const v=makeVehicle(type,x,'test-vehicle');g.stage.vehicles=[v];g.stage.platforms=[{x:v.x,y:v.y,w:v.w,h:v.h,solid:true,type:'vehicle',vehicle:v.id}];g.player.x=x-55;assert(g.interact());return v;}

test('chainsaw loops exactly the first 60 percent and reuses its held motor source',()=>{
  const nodes=[],param={setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}};
  const c={currentTime:1,createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(){}};nodes.push(n);return n;},createGain(){return{gain:param,connect(){},disconnect(){}};}};
  const bank=new SampleBank(c,{effects:{}}),g=fresh();g.player.weapon='chainsaw';g.player.sawRunning=true;
  bank.buffers.set(AUDIO_ASSETS.chainsaw,{buffer:{duration:10},gain:1});bank.syncWeapon(g);bank.syncWeapon(g);assert.equal(nodes.length,1);assert.equal(nodes[0].loopStart,0);assert.equal(nodes[0].loopEnd,6);
});
test('first menu click waits for audio activation and sends an audible cue to the effects bus',async()=>{
  const a=new Audio({}),tones=[];a.context={state:'suspended',currentTime:1,async resume(){this.state='running';}};
  a.tone=(...args)=>tones.push(args);a.noise=()=>{};a.play('ui');await Promise.resolve();await Promise.resolve();assert.equal(tones.length,1);assert.equal(tones[0][5].bus,'effects');
});
test('boarding and driving honor solid cover; hopping traverses it and exit preserves carried weapons',()=>{
  const g=fresh(),v=board(g),wall={x:540,y:GROUND-69,w:150,h:69,solid:true};g.stage.platforms.push(wall);tick(g,1,{right:true});assert(v.x+v.w<=wall.x+.1);assert(v.fuel<VEHICLES.buggy.fuel);
  g.jumpOrShelter();for(let i=0;i<50;i++){g.update(.02,{right:true});assert(!overlap(v,wall));}assert(v.x+v.w>wall.x+10);assert(g.interact());assert(!g.player.riding);assert.equal(g.player.weapon,'bat');
});
test('mounted cannon consumes its own shells, kills targets and reloads separately from the pistol',()=>{
  const g=fresh(),v=board(g,'tank');const e=g.spawnEnemy('walker',700);e.speed=0;g.attack();assert.equal(v.rounds,7);assert.equal(g.player.magazine,0);tick(g,.4);assert.equal(e.health<=0,true);assert(g.money>0);
  v.rounds=0;assert(g.reload());tick(g,3.3);assert.equal(v.rounds,8);assert.equal(v.reserve,8);
});
test('infected attacks damage the hull and wrecking safely ejects the driver',()=>{
  const g=fresh(),v=board(g);g.player.invincible=0;const e=g.spawnEnemy('walker',v.x+v.w+2);e.speed=0;e.phase='windup';e.timer=0;e.attackTarget='player';g.updateEnemies(.02);assert(v.hull<120);assert.equal(g.player.health,100);
  damageVehicle(g,1000,true);assert(v.destroyed);assert(!g.player.riding);assert.equal(g.player.health,92);assert(!overlap(g.player,g.stage.platforms.find(b=>b.vehicle===v.id)));
});
test('gate parks the vehicle outside combat and retry restores its original state',()=>{
  const g=fresh(),v=board(g);v.x=g.stage.finishX;syncVehicleBody(g,v);g.update(.02);assert(g.safe);assert(!g.player.riding);assert(v.x+v.w<g.stage.finishX);assert(g.player.x>g.stage.finishX);
  const layout=new Game();layout.newGame('civilian',g.seed);g.die();g.retry();assert.deepEqual(g.stage.vehicles,layout.stage.vehicles);assert(!g.player.riding);
});
test('acid lob locks its warned landing spot and creates a short pool after missing a moving player',()=>{
  const g=fresh();g.stage.platforms=[];const e=g.spawnEnemy('lobber',600);e.specialCooldown=0;g.updateEnemies(.02);assert.equal(e.phase,'windup');const target=e.telegraph.x;g.player.x=430;
  for(let i=0;i<47;i++)g.updateEnemies(.02);assert(g.projectiles.some(s=>s.mortar&&s.targetX===target));
  for(let i=0;i<60;i++)g.updateProjectiles(.02);assert(g.pools.some(p=>Math.abs(p.x+52-target)<3&&p.life===3));
});
test('ground shockwave can be jumped and solid cover stops it',()=>{
  for(const mode of ['ground','jump','cover']){
    const g=fresh();g.stage.platforms=mode==='cover'?[{x:360,y:GROUND-80,w:30,h:80,solid:true}]:[];g.player.invincible=0;if(mode==='jump')g.player.y=GROUND-180;
    const e=g.spawnEnemy('tremor',550);e.phase='windup';e.timer=0;e.telegraph={kind:'tremor',direction:-1};g.updateEnemies(.02);assert(g.projectiles[0].shockwave);
    for(let i=0;i<55;i++)g.updateProjectiles(.02);assert.equal(g.player.health,mode==='ground'?86:100);
  }
});
test('rammer commits to its charge and a solid collision leaves it stunned',()=>{
  const g=fresh();g.stage.platforms=[{x:470,y:GROUND-100,w:60,h:100,solid:true}];const e=g.spawnEnemy('rammer',650);e.phase='windup';e.timer=0;e.telegraph={kind:'rammer',direction:-1};g.updateEnemies(.02);g.player.x=900;
  for(let i=0;i<20;i++)g.updateEnemies(.02);assert(e.x>=530);assert(e.x<650);assert(e.stun>0);assert.equal(e.phase,'recover');
});
test('museum and training data expose thirteen infected and both playable vehicles',()=>{
  assert.equal(Object.keys(ENEMIES).length,13);assert.equal(CATALOG.filter(e=>e.category==='vehicles').length,2);for(const key of ['lobber','tremor','rammer'])assert(CATALOG.some(e=>e.key===key&&e.category==='infected'));
});

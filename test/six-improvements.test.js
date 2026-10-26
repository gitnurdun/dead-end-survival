import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { makeStage } from '../src/world.js';
import { makeVehicle,VEHICLES } from '../src/vehicle-data.js';
import { beginSpecial } from '../src/attack-director.js';
import { infectedAppearance } from '../src/infected-appearance.js';
import { makeMission } from '../src/mission-data.js';
import { updateMission,interactMission,damageEscort } from '../src/mission.js';
import { triggerMechanism,hitMechanism,updateMechanisms } from '../src/mechanisms.js';
import { GROUND,SHOP_ITEMS } from '../src/data.js';

function fresh(){const g=new Game();g.newGame('civilian',755);g.spawnTimer=1e8;return g;}
function ticks(g,t,input={}){for(let i=0;i<t;i+=.02)g.update(.02,input);}
function mount(g,skin='road'){const v=makeVehicle('buggy',300,'test-drive',GROUND,skin);g.stage.vehicles=[v];g.stage.platforms=[{x:v.x,y:v.y,w:v.w,h:v.h,solid:true,type:'vehicle',vehicle:v.id}];g.player.x=245;assert(g.interact());return v;}

test('seeded vehicle salvage occurs about 30 percent of routes, never more than one, and retries match',()=>{
  let seen=0;for(let seed=1;seed<=400;seed++){const s=makeStage(seed);assert(s.vehicles.length<=1);seen+=s.vehicles.length;if(s.vehicles.length){const v=s.vehicles[0];assert(s.houses.every(h=>Math.abs(h.x-v.x)>300));assert.deepEqual(s.vehicles,makeStage(seed).vehicles);}}
  assert(seen>95&&seen<145,'frequency '+seen+'/400');const g=fresh();const expected=structuredClone(g.stage.vehicles);g.die();g.retry();assert.deepEqual(g.stage.vehicles,expected);
});
test('special warnings are spaced, limited to two live commitments and denied off screen',()=>{
  const g=fresh(),a=g.spawnEnemy('lobber',450),b=g.spawnEnemy('tremor',520),c=g.spawnEnemy('rammer',570);
  assert(beginSpecial(g,a));a.phase='windup';assert(!beginSpecial(g,b));g.time=1.2;assert(beginSpecial(g,b));b.phase='windup';g.time=2.4;assert(!beginSpecial(g,c));
  a.phase='recover';g.projectiles.push({friendly:false,life:1,threatToken:a.threatToken});assert(!beginSpecial(g,c));g.projectiles=[];assert(beginSpecial(g,c));
  g.time=4;c.x=3000;assert(!beginSpecial(g,c));
});
test('firing at a drum starts a readable fuse and its blast kills a nearby infected',()=>{
  const g=fresh(),m=g.stage.mechanisms.find(m=>m.kind==='barrel');g.player.x=m.x-320;const e=g.spawnEnemy('walker',m.x+65);e.speed=0;
  g.projectiles=[{x:m.x-90,y:m.y+20,vx:1000,vy:0,life:1,friendly:true,damage:34}];g.updateProjectiles(.12);assert.equal(m.state,'fuse');assert.equal(e.health,60);updateMechanisms(g,.6);assert.equal(m.state,'spent');assert(e.health<=0);assert(!g.stage.platforms.some(b=>b.mechanism===m.id));
});
test('the circuit switch really disables damage and a shot permanently cuts the panel',()=>{
  const g=fresh(),m=g.stage.mechanisms.find(m=>m.kind==='switch'),h=g.stage.hazards.find(h=>h.id===m.hazardId);g.player.x=m.x-30;triggerMechanism(g,m);assert(h.disabled);
  triggerMechanism(g,m);assert(!h.disabled);hitMechanism(g,m,30);assert(h.disabled);assert.equal(m.health,0);
});
test('suspended cargo has a warning, crushes infected and becomes one traversable cover body',()=>{
  const g=fresh(),m=g.stage.mechanisms.find(m=>m.kind==='cargo');g.player.x=m.x-180;const e=g.spawnEnemy('brute',m.cargoX+30);e.health=100;e.speed=0;assert(triggerMechanism(g,m));updateMechanisms(g,.3);assert.equal(m.state,'warning');assert.equal(e.health,100);
  for(let i=0;i<60;i++)updateMechanisms(g,.02);assert.equal(m.state,'landed');assert(e.health<=0);const bodies=g.stage.platforms.filter(b=>b.mechanism===m.id);assert.equal(bodies.length,1);assert.equal(bodies[0].h,42);
});
test('toppling a barricade creates a low route and damages nearby infected once',()=>{
  const g=fresh(),m=g.stage.mechanisms.find(m=>m.kind==='pushable');g.player.x=m.x-70;const e=g.spawnEnemy('walker',m.x+100);assert(triggerMechanism(g,m));assert.equal(e.health,25);assert.equal(g.stage.platforms.find(b=>b.mechanism===m.id).h,18);assert(!triggerMechanism(g,m));assert.equal(e.health,25);
});
test('the gate stays locked until both generators are operated and completion pays once',()=>{
  const g=fresh();g.stage.mission=makeMission('power');g.player.x=g.stage.finishX;g.update(.02);assert(!g.safe);
  for(const gen of g.stage.mission.generators){g.player.x=gen.x;g.player.grounded=true;assert(interactMission(g));for(let i=0;i<151;i++)updateMission(g,.02,{interact:true});}
  assert(g.stage.mission.complete);assert.equal(g.money,60);updateMission(g,1,{});assert.equal(g.money,60);g.player.x=g.stage.finishX;g.update(.02);assert(g.safe);
});
test('escort follows with physical motion, shelters safely, extracts and resets after a failed attempt',()=>{
  const g=fresh();g.stage.mission=makeMission('escort');g.stage.platforms=[];const e=g.stage.mission.escort;g.player.x=e.x-20;assert(interactMission(g));g.player.x=e.x+220;const before=e.x;
  for(let i=0;i<50;i++)updateMission(g,.02,{});assert(e.x>before);g.player.house=0;updateMission(g,.02,{});assert(e.hidden);damageEscort(g,30);assert.equal(e.health,90);
  g.player.house=null;e.x=g.stage.mission.extractionX+1;g.player.x=e.x+40;updateMission(g,.02,{});assert(g.stage.mission.complete);
  const lost=fresh();lost.selectLevel('graveyard');const buddy=lost.stage.mission.escort;buddy.active=true;damageEscort(lost,100);assert.equal(lost.mode,'dead');lost.retry();assert.equal(lost.stage.mission.escort.health,90);assert(!lost.stage.mission.escort.active);
});
test('beacon defense counts only inside its zone and pauses in shelter or a vehicle',()=>{
  const g=fresh();g.stage.mission=makeMission('holdout');const b=g.stage.mission.beacon;g.player.x=b.x;assert(interactMission(g));updateMission(g,5,{});assert.equal(b.progress,5);
  g.player.x=b.x+400;updateMission(g,2,{});assert.equal(b.progress,5);g.player.x=b.x;g.player.house=0;g.mode='sheltered';updateMission(g,3,{});assert.equal(b.progress,5);
  g.player.house=null;g.mode='playing';updateMission(g,13,{});assert(g.stage.mission.complete);assert.equal(g.money,60);
});
test('vehicles accelerate, brake, retain a terrain variant and take high speed crash damage',()=>{
  const g=fresh(),v=mount(g,'snow');ticks(g,.1,{right:true});assert(v.vx>0&&v.vx<VEHICLES.buggy.speed);ticks(g,.7,{right:true});const speed=v.vx;ticks(g,.15,{brake:true});assert(v.vx<speed);assert.equal(v.skin,'snow');
  g.stage.platforms.push({x:900,y:GROUND-90,w:100,h:90,solid:true});ticks(g,2,{right:true});assert(v.hull<120);assert(v.x+v.w<=900+.1);
});
test('economy gives an affordable persistent pistol, prices larger ammo crates and rewards harder sectors',()=>{
  const g=fresh();g.mode='menu';g.money=200;g.openArmory();const pistol=SHOP_ITEMS.find(i=>i.id==='pistol'),crate=SHOP_ITEMS.find(i=>i.id==='ammo');assert.equal(g.itemPrice(pistol),75);assert(g.buy('pistol'));const small=g.itemPrice(crate);g.money=1000;g.buy('smg');assert(g.itemPrice(crate)>small);
  const hard=fresh();hard.selectLevel('neptune');const e=hard.spawnEnemy('walker',600);hard.damageEnemy(e,100);assert(hard.money>5);
});
test('infected outfit and gait variants are reproducible and do not alter encounter randomness',()=>{
  assert.deepEqual(infectedAppearance(75,3),infectedAppearance(75,3));assert.notDeepEqual(infectedAppearance(75,3),infectedAppearance(75,4));
  const a=fresh(),b=fresh();for(let i=0;i<200;i++)infectedAppearance(91,i);assert.equal(a.encounterType(.8),b.encounterType(.8));const first=a.spawnEnemy('walker',500),second=a.spawnEnemy('walker',550);assert.notDeepEqual(first.appearance,second.appearance);
});

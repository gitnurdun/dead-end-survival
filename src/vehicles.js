import { GROUND } from './data.js';
import { VEHICLES, vehicleName } from './vehicle-data.js';
import { moveBody } from './physics.js';
import { overlap, clamp, segmentRectTime } from './world.js';

export function activeVehicle(game) { return game.stage.vehicles?.find(v => v.id === game.player.riding) || null; }
export function syncVehicleBody(game, v) {
  const body = game.stage.platforms.find(b => b.vehicle === v.id);
  if (body) Object.assign(body, { x: v.x, y: v.y, w: v.w, h: v.h });
}
export function settleVehicles(game,dt){
  for(const v of game.stage.vehicles||[]){if(v.id===game.player.riding)continue;moveBody(v,0,dt,game.stage.platforms.filter(b=>b.vehicle!==v.id),{gravity:game.stage.level.gravity});v.vx=0;syncVehicleBody(game,v);}
}
export function interactVehicle(game) {
  const p = game.player;
  if (game.mode !== 'playing' || game.safe || p.house !== null) return false;
  if (p.riding) return exitVehicle(game);
  const v = game.stage.vehicles?.find(v => !v.destroyed && v.fuel > 0 && Math.abs(v.x+v.w/2-p.x-p.w/2) < 125 && Math.abs(p.y+p.h-GROUND) < 105);
  if (!v) return false;
  p.riding=v.id; p.sawRunning=false; p.reload=0; p.burst=0; p.attackPose=0; p.invincible=.5;
  p.x=v.x+v.w*.3; p.y=v.y+v.h-p.h; p.vy=0;
  game.event('vehicleEnter'); game.event('hint',{text:`${vehicleName(v)}: arrows drive · DOWN brakes · UP hops · SPACE fires · E exits.`});
  return true;
}
export function exitVehicle(game, { forced=false, gate=false }={}) {
  const p=game.player,v=activeVehicle(game); if(!v)return false;
  const exitY=v.y+v.h-p.h,exitSpeed=v.grounded?0:v.vy;
  if(gate){v.x=Math.min(v.x,game.stage.finishX-v.w-24);v.vx=0;syncVehicleBody(game,v);p.x=game.stage.finishX+24;p.y=GROUND-p.h;}
  else {
    const blocks=game.stage.platforms, candidates=[v.x-p.w-12,v.x+v.w+12,v.x-p.w-70,v.x+v.w+70];
    let x=candidates.find(x=>x>=0&&x+p.w<game.stage.finishX&&!blocks.some(b=>b.solid&&overlap({x,y:exitY,w:p.w,h:p.h},b))&&!game.stage.hazards.some(h=>!h.disabled&&h.type!=='ice'&&overlap({x,y:exitY,w:p.w,h:p.h},h)));
    if(x===undefined&&!forced){game.event('hint',{text:'No clear ground to exit. Move to an open spot.'});return false;}
    if(x===undefined){for(let offset=120;offset<700&&x===undefined;offset+=60)for(const side of [-1,1]){const n=clamp(v.x+side*offset,0,game.stage.finishX-p.w-5);if(!blocks.some(b=>b.solid&&overlap({x:n,y:GROUND-p.h,w:p.w,h:p.h},b))){x=n;break;}}}
    p.x=x??v.x;p.y=x===undefined?v.y-p.h:exitY;
  }
  p.riding=null;p.vy=gate?0:exitSpeed;p.vx=0;p.grounded=p.y+p.h===GROUND;p.invincible=1.2;v.vx=0;v.driveSpeed=0;game.event('vehicleExit');return true;
}
export function driveVehicle(game, dt, input) {
  const v=activeVehicle(game),p=game.player;if(!v)return;
  const d=VEHICLES[v.type],direction=(input.right?1:0)-(input.left?1:0);
  v.cooldown=Math.max(0,v.cooldown-dt);v.hitCooldown=Math.max(0,v.hitCooldown-dt);
  v.hurt=Math.max(0,v.hurt-dt);v.recoil=Math.max(0,v.recoil-dt);v.impactCooldown=Math.max(0,v.impactCooldown-dt);
  if(v.reload>0){v.reload=Math.max(0,v.reload-dt);if(!v.reload){const n=Math.min(d.magazine-v.rounds,v.reserve);v.rounds+=n;v.reserve-=n;game.event('loaded');}}
  const ice=v.grounded&&game.stage.hazards.some(h=>h.type==='ice'&&v.x+v.w>h.x&&v.x<h.x+h.w);
  const speed=d.speed*(v.skin==='mud'?.88:v.skin==='snow'?.9:v.skin==='sand'?.94:1),braking=!!input.brake||direction&&Math.sign(v.driveSpeed)!==direction&&Math.abs(v.driveSpeed)>5;
  const target=braking?0:direction*speed,rate=(braking?d.braking:direction?d.acceleration:d.braking*.23)*(ice?.38:1)*(v.grounded?1:.4);
  v.driveSpeed=(v.driveSpeed||0)+clamp(target-(v.driveSpeed||0),-rate*dt,rate*dt);
  if(Math.abs(v.driveSpeed)>8)v.facing=Math.sign(v.driveSpeed);else if(direction)v.facing=direction;p.facing=v.facing;
  const before=v.driveSpeed,wasGrounded=v.grounded;
  v.vx=moveBody(v,v.driveSpeed,dt,game.stage.platforms.filter(b=>b.vehicle!==v.id),{gravity:game.stage.level.gravity,right:game.stage.finishX+v.w+65})/Math.max(.001,dt);
  v.skid=v.grounded&&braking&&Math.abs(before)>70?1:0;
  if(v.blocked){v.driveSpeed=0;if(Math.abs(before)>160&&v.impactCooldown<=0){v.impactCooldown=.65;damageVehicle(game,Math.min(22,Math.round(Math.abs(before)/20)),true);game.shake=6;game.event('vehicleCrash');}}
  if(v.destroyed)return;
  if(!wasGrounded&&v.grounded){game.shake=Math.max(game.shake,2);game.event('vehicleHop');}
  v.dust=(v.dust||0)-dt;
  if(v.grounded&&Math.abs(v.vx)>95&&v.dust<=0){v.dust=.16;game.particlesAt(v.facing>0?v.x+15:v.x+v.w-15,GROUND-8,v.skin==='snow'?'#c8dbe0':v.skin==='sand'?'#c3a67b':'#8e8e79',v.skid?4:2);}
  v.fuel=Math.max(0,v.fuel-dt*(Math.abs(v.vx)>5?1:.12));syncVehicleBody(game,v);
  p.x=v.x+v.w*.3;p.y=v.y+v.h-p.h;p.vx=v.vx;p.vy=0;p.grounded=v.grounded;p.travel=v.travel;p.attackPose=0;
  if(Math.abs(v.vx)>110)for(const e of game.enemies){
    const front=v.facing>0?v.x+v.w:v.x,near=v.facing>0?e.x-front:front-e.x-e.w;
    if(e.health>0&&near>-15&&near<30&&Math.abs(e.y+e.h-v.y-v.h)<65&&(e.vehicleHit??-1)<game.time){
      e.vehicleHit=game.time+.65;game.damageEnemy(e,d.ram,330,v.facing,{armorPiercing:true,weapon:'ram'});v.hull-=v.type==='tank'?1:3;game.event('vehicleImpact');
    }
  }
  if(v.hull<=0)damageVehicle(game,1,true);
  else if(v.fuel<=0){exitVehicle(game,{forced:true});game.event('hint',{text:'Vehicle fuel exhausted. Continue on foot.'});}
}
export function fireVehicle(game) {
  const v=activeVehicle(game);if(!v||v.cooldown>0||v.reload>0||game.safe)return false;
  const d=VEHICLES[v.type];if(!v.rounds){v.cooldown=.35;game.event('empty');game.event('hint',{text:'Mounted weapon empty · R to reload.'});return false;}
  v.rounds--;v.cooldown=d.cooldown;v.recoil=.18;game.stats.attacks++;game.stats.shots++;
  const hand=v.x+v.w/2,y=v.y+(v.type==='tank'?22:10);let x=v.facing>0?v.x+v.w+3:v.x-3,entry=1;
  for(const b of game.stage.platforms){if(b.vehicle===v.id)continue;const t=segmentRectTime(hand,y,x,y,b);if(t!==null)entry=Math.min(entry,t);}
  if(entry<1)x=hand+(x-hand)*entry-v.facing*.3;
  game.projectiles.push({x,y,vx:v.facing*950,vy:0,life:1.1,damage:d.damage,knockback:v.type==='tank'?350:65,blast:d.blast||0,friendly:true,r:4,weapon:v.type==='tank'?'launcher':'smg',ignoreVehicle:v.id,hit:{ballistic:true,armorPiercing:v.type==='tank'}});
  game.effect('muzzle',x,y,.14);game.event('shot',{weapon:v.type==='tank'?'rifle':'smg'});game.shake=v.type==='tank'?5:1;return true;
}
export function reloadVehicle(game) {
  const v=activeVehicle(game);if(!v)return false;const d=VEHICLES[v.type];
  if(v.reload>0||v.rounds>=d.magazine||!v.reserve)return false;
  v.reload=d.reload;game.event('reload');return true;
}
export function damageVehicle(game, amount, force=false) {
  const v=activeVehicle(game);if(!v||v.destroyed||(!force&&v.hitCooldown>0))return false;
  v.hull=Math.max(0,v.hull-amount);v.hurt=.25;v.hitCooldown=.2;game.shake=3;game.event('vehicleImpact');game.particlesAt(v.x+v.w*.6,v.y+25,'#e6bf83',5);
  if(v.hull<=0){
    v.destroyed=true;exitVehicle(game,{forced:true});v.y+=v.h-34;v.h=34;syncVehicleBody(game,v);
    game.effect('explosion',v.x+v.w/2,v.y, .7);game.event('explosion');game.event('hint',{text:'Vehicle destroyed. Keep moving!'});
    game.player.health=Math.max(0,game.player.health-8);game.float('−8',game.player.x,game.player.y,'#ecac94');if(!game.player.health)game.die();
  }
  return true;
}

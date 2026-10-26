import { GROUND } from './data.js';
import { moveBody, obstacleAhead, jumpVelocity } from './physics.js';
import { MISSION_TYPES } from './mission-data.js';

export function missionReady(game) { return game.training||!game.stage.mission||game.stage.mission.complete; }
export function interactMission(game) {
  const m=game.stage.mission,p=game.player;if(!m||p.riding||p.house!==null||game.mode!=='playing')return false;
  const generator=m.generators.find(g=>!g.complete&&Math.abs(g.x+g.w/2-p.x-p.w/2)<95&&p.grounded);
  if(generator){game.event('hint',{text:'Hold E to crank the generator. Stay beside it.'});return true;}
  const e=m.escort;
  if(e&&!e.active&&Math.abs(e.x-p.x)<100&&p.grounded){e.active=true;game.event('npc');game.event('hint',{text:'Survivor following. Keep them close and reach extraction.'});return true;}
  const b=m.beacon;
  if(b&&!b.active&&Math.abs(b.x-p.x)<100&&p.grounded){b.active=true;game.event('beacon');game.spawnTimer=Math.min(game.spawnTimer,1);game.event('hint',{text:'Beacon active. Defend the marked zone for 18 seconds.'});return true;}
  return false;
}
export function damageEscort(game,amount){
  const e=game.stage.mission?.escort;if(!e||!e.active||e.extracted||e.hidden||e.hurt>0)return;
  e.health=Math.max(0,e.health-amount);e.hurt=.8;game.particlesAt(e.x+16,e.y+20,'#d5b995',5);game.event('hurt');
  if(!e.health){game.deathReason='The survivor was lost. Retry restores the escort.';game.event('hint',{text:game.deathReason});game.die();}
}
export function updateMission(game,dt,input){
  const m=game.stage.mission,p=game.player;if(!m||m.complete||game.training||game.safe)return;
  if(m.kind==='power'){
    for(const g of m.generators)if(!g.complete&&input.interact&&game.mode==='playing'&&p.grounded&&!p.riding&&Math.abs(g.x+g.w/2-p.x-p.w/2)<95){
      g.progress=Math.min(3,g.progress+dt);if(g.progress>=3){g.complete=true;game.event('generator');game.particlesAt(g.x+30,g.y,'#b4d9b5',15);}
    }
    m.complete=m.generators.every(g=>g.complete);
  }
  if(m.kind==='escort'){
    const e=m.escort;e.hurt=Math.max(0,e.hurt-dt);if(!e.active)return;
    const together=Math.abs(p.x-e.x)<180;
    e.hidden=(p.house!==null||!!p.riding)&&(together||e.hidden);
    if(e.hidden){e.x=p.x-12;e.y=GROUND-e.h;e.vy=0;return;}
    const distance=p.x-e.x,velocity=Math.abs(distance)>65?Math.sign(distance)*Math.min(240,Math.abs(distance)*2):0;
    if(velocity){e.facing=Math.sign(velocity);if(e.grounded&&obstacleAhead(e,e.facing,game.stage.platforms,28)){e.vy=jumpVelocity(game.stage.level.gravity);e.grounded=false;}}
    e.vx=moveBody(e,velocity,dt,game.stage.platforms,{gravity:game.stage.level.gravity,right:game.stage.finishX-100})/Math.max(.001,dt);
    if(e.x>=m.extractionX&&p.x>=m.extractionX){e.extracted=true;e.hidden=true;m.complete=true;}
    e.hazardCooldown=Math.max(0,(e.hazardCooldown||0)-dt);
    if(!e.hazardCooldown&&[...game.stage.hazards,...game.pools].some(h=>!h.disabled&&h.type!=='ice'&&e.x+e.w>h.x&&e.x<h.x+h.w&&e.y+e.h>h.y&&e.y<h.y+h.h)){e.hazardCooldown=1;damageEscort(game,6);}
  }
  if(m.kind==='holdout'){
    const b=m.beacon;if(b.active&&game.mode==='playing'&&!p.riding&&Math.abs(p.x-b.x)<b.radius){b.progress=Math.min(b.duration,b.progress+dt);if(b.progress>=b.duration)m.complete=true;}
  }
  if(m.complete&&!m.rewarded){m.rewarded=true;game.cash(60);game.event('objectiveComplete');game.event('hint',{text:'Objective complete. Gate powered. Reach the exit!'});}
}
export function missionStatus(game){
  const m=game.stage.mission,p=game.player;if(!m)return null;
  let detail='',progress=0,target=null;
  if(m.complete){detail=m.kind==='escape'?'Reach and seal the quarantine gate.':'COMPLETE · Reach the gate';progress=1;}
  else if(m.kind==='power'){const g=m.generators.find(g=>!g.complete);detail=`GENERATORS ${m.generators.filter(g=>g.complete).length}/2 · Hold E nearby`;progress=m.generators.reduce((s,g)=>s+g.progress,0)/6;target=g?.x;}
  else if(m.kind==='escort'){const e=m.escort;detail=e.active?`SURVIVOR ${Math.ceil(e.health)}/90 · ${Math.abs(e.x-p.x)>300?'WAIT FOR SURVIVOR':'Reach extraction together'}`:'Find the survivor · E to escort';target=e.active?Math.abs(e.x-p.x)>300?e.x:m.extractionX:e.x;progress=e.active?Math.max(0,Math.min(1,(e.x-6500)/(m.extractionX-6500))):0;}
  else {const b=m.beacon;detail=b.active?`DEFEND ${b.progress.toFixed(1)} / ${b.duration}s · ${p.house!==null||p.riding||Math.abs(p.x-b.x)>=b.radius?'RETURN TO ZONE':'Stay in the marked zone'}`:'Reach the beacon · E to activate';progress=b.progress/b.duration;target=b.x;}
  return {title:MISSION_TYPES[m.kind].name,detail,progress,target,complete:m.complete,kind:m.kind};
}

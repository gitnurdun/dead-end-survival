import { GROUND } from './data.js';
import { overlap, segmentHitsRect } from './world.js';
import { damageVehicle } from './vehicles.js';

export function makeMechanisms(rng){
  return [
    ...[5100,10600,16900,22400].map((x,i)=>({id:'barrel-'+i,kind:'barrel',x:x+Math.floor(rng()*140),y:GROUND-46,w:32,h:46,health:24,state:'ready',timer:0})),
    {id:'power-switch',kind:'switch',x:7580,y:GROUND-68,w:30,h:68,health:20,state:'live',hazardId:'switched-arc'},
    {id:'cargo-drop',kind:'cargo',x:13660,y:GROUND-70,w:32,h:70,health:15,state:'hanging',cargoX:13800,cargoY:GROUND-245,cargoW:140,cargoH:58,vy:0,hit:[],timer:0},
    {id:'push-barrier',kind:'pushable',x:20170,y:GROUND-64,w:76,h:64,health:25,state:'ready'},
  ];
}
export function mechanismTarget(m){
  if(m.kind==='cargo')return m.state==='hanging'?{x:m.x+4,y:GROUND-145,w:24,h:35}:null;
  if(m.kind==='barrel')return m.state==='ready'?m:null;
  if(m.kind==='switch')return m.health>0?m:null;
  return m.state==='ready'?m:null;
}
function removeBody(game,id){game.stage.platforms=game.stage.platforms.filter(p=>p.mechanism!==id);}
function switchPower(game,m,off){m.state=off?'off':'live';for(const h of game.stage.hazards)if(h.id===m.hazardId)h.disabled=off;game.event('switchPower');game.event('hint',{text:off?'Electrical circuit disabled.':'Electrical circuit armed.'});}
export function triggerMechanism(game,m){
  if(game.safe)return false;
  if(m.kind==='barrel'&&m.state==='ready'){m.state='fuse';m.timer=.55;game.event('barrelFuse');return true;}
  if(m.kind==='switch'){switchPower(game,m,m.state==='live');return true;}
  if(m.kind==='cargo'&&m.state==='hanging'){m.state='warning';m.timer=.7;game.event('cargoRelease');return true;}
  if(m.kind==='pushable'&&m.state==='ready'){
    m.state='toppled';m.health=0;const direction=game.player.x<m.x?1:-1,x=direction>0?m.x:m.x-60;
    removeBody(game,m.id);game.stage.platforms.push({x,y:GROUND-18,w:136,h:18,solid:true,type:'mechanism',mechanism:m.id});m.x=x;m.y=GROUND-18;m.w=136;m.h=18;
    for(const e of game.enemies)if(e.health>0&&Math.abs(e.x-x-60)<105&&Math.abs(e.y+e.h-GROUND)<70)game.damageEnemy(e,35,300,direction,{armorPiercing:true});
    game.event('houseHit');game.particlesAt(x+65,GROUND-15,'#bca778',12);return true;
  }
  return false;
}
export function hitMechanism(game,m,damage){
  if(!mechanismTarget(m)||damage<=0)return;
  m.health=Math.max(0,m.health-damage);game.particlesAt(m.x+m.w/2,m.y+15,'#d1b88b',4);game.event('ricochet');
  if(!m.health){if(m.kind==='switch')switchPower(game,m,true);else triggerMechanism(game,m);}
}
export function interactMechanism(game){
  const p=game.player;if(game.mode!=='playing'||p.riding||!p.grounded||p.house!==null)return false;
  const m=game.stage.mechanisms?.find(m=>m.kind!=='barrel'&&Math.abs(m.x+m.w/2-p.x-p.w/2)<100&&(m.kind==='switch'?m.health>0:['ready','hanging'].includes(m.state)));
  return m?triggerMechanism(game,m):false;
}
function explodeBarrel(game,m){
  m.state='spent';removeBody(game,m.id);const x=m.x+16,y=GROUND-25,radius=175;
  game.effects.push({type:'explosion',x,y,radius,life:.65,duration:.65});game.particlesAt(x,y,'#e2af71',28);game.event('explosion');game.shake=9;
  const inRange=b=>Math.hypot(b.x+b.w/2-x,b.y+b.h/2-y)<radius&&game.clearPath(x,y,b.x+b.w/2,b.y+b.h/2);
  for(const e of game.enemies)if(e.health>0&&inRange(e))game.damageEnemy(e,140,480,Math.sign(e.x-x)||1,{armorPiercing:true});
  if(game.player.house===null&&inRange(game.player))game.damagePlayer(22);
  for(const other of game.stage.mechanisms||[])if(other!==m&&other.kind==='barrel'&&other.state==='ready'&&Math.abs(other.x-x)<radius&&!game.stage.platforms.some(b=>b.mechanism!==other.id&&segmentHitsRect(x,y,other.x+16,other.y+23,b)))triggerMechanism(game,other);
}
export function updateMechanisms(game,dt){
  if(game.safe)return;
  for(const m of game.stage.mechanisms||[]){
    if(m.state==='fuse'){m.timer-=dt;if(m.timer<=0)explodeBarrel(game,m);}
    if(m.kind!=='cargo')continue;
    if(m.state==='warning'){m.timer-=dt;if(m.timer<=0)m.state='falling';}
    if(m.state==='falling'){
      const oldY=m.cargoY;m.vy+=1500*dt;m.cargoY=Math.min(GROUND-m.cargoH,m.cargoY+m.vy*dt);
      const body=game.stage.platforms.find(b=>b.mechanism===m.id);if(body)body.y=m.cargoY;
      const sweep={x:m.cargoX,y:oldY,w:m.cargoW,h:m.cargoY-oldY+m.cargoH};
      for(const e of game.enemies)if(e.health>0&&!m.hit.includes(e)&&overlap(sweep,e)){m.hit.push(e);game.damageEnemy(e,150,200,Math.sign(e.x-m.cargoX-70)||1,{armorPiercing:true});}
      if(!m.playerHit&&game.player.house===null&&overlap(sweep,game.vehicle()||game.player)){m.playerHit=true;if(game.player.riding)damageVehicle(game,40,true);else game.damagePlayer(24);}
      if(m.cargoY+m.cargoH>=GROUND){m.state='landed';removeBody(game,m.id);game.stage.platforms.push({x:m.cargoX,y:GROUND-42,w:m.cargoW,h:42,solid:true,type:'mechanism',mechanism:m.id});game.particlesAt(m.cargoX+70,GROUND-15,'#ab9d82',24);game.event('cargoImpact');game.shake=7;}
    }
  }
}

import { GROUND } from './data.js';
import { clamp } from './world.js';
import { beginSpecial } from './attack-director.js';

const SPECIAL = ['lobber','tremor','rammer'];
export function updateSpecialThreat(game,e,dt,advance,{house,barricade,dogTarget,distance,clear}) {
  if(!SPECIAL.includes(e.type)||house||barricade||dogTarget)return false;
  const p=game.player;
  if(e.phase==='charge'){
    e.facing=e.rushFacing;advance(e.facing*440,false);
    if(e.blocked){e.phase='recover';e.timer=1.6;e.stun=1.2;game.event('vehicleImpact');game.particlesAt(e.x+e.w/2,e.y+30,'#cfb38b',10);}
    else if(Math.abs(e.x-p.x)<e.range+20&&Math.abs(e.y+e.h-p.y-p.h)<60&&clear){game.damagePlayer(e.damage);e.phase='recover';e.timer=1.1;}
    else if(e.timer<=0){e.phase='recover';e.timer=1.2;}
    return true;
  }
  if(e.phase==='windup'&&e.telegraph){
    advance(0);if(e.timer>0)return true;
    const m=e.telegraph;e.phase='recover';e.timer=1.4;e.specialCooldown=e.type==='lobber'?4.5:5;
    if(e.type==='lobber'){
      const x=e.x+e.w/2,y=e.y+15,t=.95,g=900;
      game.projectiles.push({x,y,vx:(m.x-x)/t,vy:(GROUND-9-y-.5*g*t*t)/t,gravity:g,life:1.5,friendly:false,damage:e.damage,r:11,mortar:true,targetX:m.x,color:'#e6b875',threatToken:e.threatToken});game.event('spit');
    }else if(e.type==='tremor'){
      const x=e.x+(m.direction>0?e.w+4:-4);game.projectiles.push({x,y:GROUND-15,vx:m.direction*335,vy:0,life:1.8,friendly:false,damage:e.damage,r:14,shockwave:true,color:'#b7d9d8',threatToken:e.threatToken});game.event('shockwave');game.effect('shock',x,GROUND-5,.45);
    }else{e.phase='charge';e.rushFacing=m.direction;e.facing=m.direction;e.timer=.85;game.event('charge');}
    e.telegraph=null;return true;
  }
  if(e.phase==='recover')return false;
  const min=e.type==='rammer'?120:150,max=e.type==='lobber'?640:e.type==='tremor'?540:410;
  if(e.specialCooldown<=0&&e.grounded&&distance>min&&distance<max&&(e.type==='lobber'||clear)&&beginSpecial(game,e)){
    e.phase='windup';e.attackTarget='special';e.timer=e.type==='lobber'?.9:e.type==='tremor'?1.05:.85;
    e.telegraph={kind:e.type,x:clamp(p.x+p.w/2,60,game.stage.finishX-65),y:GROUND,direction:Math.sign(p.x-e.x)||e.facing};game.event('threatWarning',{enemy:e.type});advance(0);return true;
  }
  return false;
}
export function hostileImpact(game,shot){
  if(!shot.mortar||game.safe)return;
  game.particlesAt(shot.x,shot.y,'#d8bc76',12);game.event('spit');
  if(shot.y>GROUND-30)game.pools.push({x:shot.x-52,y:GROUND-10,w:104,h:12,type:'acid',life:3,phase:0});
}

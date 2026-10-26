import { GROUND } from './data.js';

function landingMark(c,x,time){
  c.save();c.strokeStyle='#e7bc77';c.fillStyle='#dbaa5030';c.lineWidth=2;c.setLineDash([8,5]);c.lineDashOffset=-time*24;
  c.beginPath();c.ellipse(x,GROUND-5,56,11,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
  c.globalAlpha=.6+Math.sin(time*13)*.3;c.beginPath();c.moveTo(x-10,GROUND-48);c.lineTo(x,GROUND-34);c.lineTo(x+10,GROUND-48);c.stroke();c.restore();
}
export function paintThreatWarnings(c,game,time){
  for(const e of game.enemies){
    if(e.phase==='windup'&&e.attackTarget==='spit'&&e.aimPoint&&e.stun<=0){c.save();c.strokeStyle='#c6d57b66';c.lineWidth=1;c.setLineDash([5,7]);c.beginPath();c.moveTo(e.x+e.w/2,e.y+21);c.lineTo(e.aimPoint.x,e.aimPoint.y);c.stroke();c.setLineDash([]);c.beginPath();c.arc(e.aimPoint.x,e.aimPoint.y,9,0,Math.PI*2);c.stroke();c.restore();}
    const m=e.telegraph;if(e.phase!=='windup'||!m||e.stun>0)continue;
    if(m.kind==='lobber'){landingMark(c,m.x,time);continue;}
    c.save();const x=e.x+e.w/2,end=x+m.direction*(m.kind==='tremor'?565:390);
    c.strokeStyle=m.kind==='tremor'?'#a4ded8':'#e3a48b';c.fillStyle=m.kind==='tremor'?'#8edbdb12':'#d8987822';c.lineWidth=2;
    c.fillRect(Math.min(x,end),GROUND-(m.kind==='tremor'?22:52),Math.abs(end-x),m.kind==='tremor'?22:52);
    c.setLineDash([10,7]);c.lineDashOffset=-time*35*m.direction;c.beginPath();c.moveTo(x,GROUND-6);c.lineTo(end,GROUND-6);c.stroke();c.setLineDash([]);
    for(let k=1;k<5;k++){const p=x+(end-x)*k/5;c.beginPath();c.moveTo(p-m.direction*9,GROUND-20);c.lineTo(p,GROUND-12);c.lineTo(p-m.direction*9,GROUND-4);c.stroke();}c.restore();
  }
  for(const s of game.projectiles)if(s.mortar&&s.life>0)landingMark(c,s.targetX,time);
}
export function paintHostileProjectile(c,s,time){
  c.save();c.translate(s.x,s.y);
  if(s.shockwave){
    c.strokeStyle='#b4e6df';c.fillStyle='#7cbdbb44';c.lineWidth=3;c.rotate(time*12*Math.sign(s.vx));c.beginPath();
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=i%2?11:17;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(r,0);}c.closePath();c.fill();c.stroke();
  }else{c.fillStyle=s.mortar?'#c6a46c':'#c8d77c';c.beginPath();c.ellipse(0,0,s.mortar?12:8,s.mortar?10:7,0,0,Math.PI*2);c.fill();c.fillStyle='#e8e5b3';c.beginPath();c.arc(-3,-3,3,0,Math.PI*2);c.fill();
    if(s.mortar){c.strokeStyle='#d8b37988';c.lineWidth=3;c.beginPath();c.moveTo(-s.vx*.025,-s.vy*.025);c.lineTo(-s.vx*.07,-s.vy*.07);c.stroke();}}
  c.restore();
}

import { drawInfected } from './actors.js';

export function drawCorpse(c,body,time) {
  const t=1-body.life/body.duration;
  c.save();c.globalAlpha=Math.min(.85,body.life*1.5);
  c.translate(body.x+body.w/2,body.y+body.h);c.rotate(Math.min(1,t/.38)*1.48*body.fallDirection);c.translate(-body.x-body.w/2,-body.y-body.h);
  drawInfected(c,{...body,concealed:false,hurt:0,stun:0,rage:0},time);c.restore();
}
export function drawHitConfirmation(c,game) {
  if(game.hitConfirm<=0||!game.lastHit)return;
  const h=game.lastHit,r=h.lethal?13:9;
  c.save();c.globalAlpha=Math.min(1,game.hitConfirm*10);c.strokeStyle=h.armored?'#9cd9e8':h.lethal?'#e8bf78':'#e1e2cb';c.lineWidth=h.lethal?3:2;
  for(const [x,y]of[[-1,-1],[1,1],[-1,1],[1,-1]]){c.beginPath();c.moveTo(h.x+x*r*.5,h.y+y*r*.5);c.lineTo(h.x+x*r,h.y+y*r);c.stroke();}
  c.restore();
}
export function drawFlashlight(c,player,time) {
  c.save();c.translate(player.x+player.w/2,player.y+26);c.scale(player.facing,1);c.globalCompositeOperation='screen';
  const beam=c.createRadialGradient(0,0,8,60,8,305);beam.addColorStop(0,'#fff3c223');beam.addColorStop(.55,'#c2d5c50e');beam.addColorStop(1,'transparent');
  c.fillStyle=beam;c.beginPath();c.moveTo(5,-2);c.lineTo(295,-80);c.quadraticCurveTo(330,10,295,100);c.lineTo(5,6);c.fill();
  c.restore();
}

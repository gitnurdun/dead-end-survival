export function paintCombatEffect(c, e, clock, intensity = 1) {
  if (!['arc','slash','thrust','explosion','toxic','scream'].includes(e.type)) return false;
  const t = 1 - e.life / e.duration;
  c.save();c.globalAlpha=Math.min(1,(1-t)*intensity);c.strokeStyle=e.color||'#e8c390';c.fillStyle=e.color||'#f1ad69';c.lineCap='round';
  if(e.type==='arc') {
    c.shadowColor=e.color;c.shadowBlur=12*intensity;c.lineWidth=2.5;
    c.beginPath();c.moveTo(e.x,e.y);
    for(let i=1;i<=14;i++){const k=i/14;c.lineTo(e.x+(e.tx-e.x)*k,e.y+(e.ty-e.y)*k+(i<14?Math.sin(i*7+clock*60)*9:0));}c.stroke();
  } else if(e.type==='slash'||e.type==='thrust') {
    c.translate(e.x,e.y);c.scale(e.facing||1,1);c.lineWidth=4*intensity;
    if(e.type==='thrust'){c.beginPath();c.moveTo(18,0);c.lineTo(e.reach,0);c.stroke();}
    else{c.beginPath();c.arc(5,0,e.reach*.75,-1+t*.7,.9+t*.7);c.stroke();}
  } else {
    const color=e.type==='scream'?'#cea3c6':e.type==='toxic'?'#b3ca74':'#f2bc75',radius=(e.radius||125)*(.2+t)*intensity;
    c.strokeStyle=color;c.lineWidth=5*(1-t)+1;c.beginPath();c.ellipse(e.x,e.y,radius,e.type==='toxic'?radius*.25:radius,0,0,Math.PI*2);c.stroke();
    if(e.type==='explosion'){const glow=c.createRadialGradient(e.x,e.y,0,e.x,e.y,radius);glow.addColorStop(0,'#ffe8abbb');glow.addColorStop(.4,'#ef9b5a77');glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(e.x-radius,e.y-radius,radius*2,radius*2);}
  }
  c.restore();return true;
}

export function paintProjectile(c, s) {
  c.save();c.strokeStyle=s.color||'#f8e9a3';c.fillStyle=s.color||'#f8e9a3';
  if(['plasma','cryo','flamer'].includes(s.weapon)) {
    c.shadowColor=s.color;c.shadowBlur=s.weapon==='flamer'?14:9;c.beginPath();
    c.ellipse(s.x,s.y,s.weapon==='flamer'?19:9,s.weapon==='flamer'?12:4,Math.atan2(s.vy,s.vx),0,Math.PI*2);c.fill();
  } else {c.lineWidth=s.weapon==='launcher'?7:3;c.beginPath();c.moveTo(s.x-Math.sign(s.vx)*17,s.y-s.vy*.012);c.lineTo(s.x,s.y);c.stroke();}
  c.restore();
}

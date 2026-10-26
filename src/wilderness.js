// Nature-specific layers. Shared by mission thumbnails and the playable route.
export const NATURE_BIOMES = ['boreal', 'alpine', 'wetlands', 'dunes', 'wildcoast'];
export function paintWilderness(c, biome, w, ground, camera, time, seed) {
  const poly = (points, color) => { c.fillStyle = color; c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); };
  const oval = (x,y,rx,ry,color) => { c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill(); };
  const line = (points,color,size=2) => { c.strokeStyle=color;c.lineWidth=size;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke(); };
  if (biome === 'wildcoast') {
    c.fillStyle='#264e61';c.fillRect(0,ground-150,w,150);
    for(let i=0;i<17;i++) {const y=ground-130+i*8;line([[0,y],[w,y+Math.sin(time*1.3+i)*4]], i%3?'#729ca72e':'#b0c9c855',2);}
  }
  for(let layer=0;layer<3;layer++) {
    const step=biome==='boreal'?140:biome==='wetlands'?190:310, drift=camera*(.12+layer*.16);
    for(let i=Math.floor(drift/step)-2;i<(drift+w)/step+2;i++) {
      const x=i*step-drift, k=(Math.sin(i*73.13+seed)*.5+.5), tall=150+k*120, base=ground-(2-layer)*32;
      c.globalAlpha=.45+layer*.22;
      if (biome==='boreal'||biome==='alpine'&&layer===2) {
        c.fillStyle=biome==='alpine'?'#283f49':'#162e29';c.fillRect(x+14,base-tall,10,tall);
        for(let j=0;j<5;j++) {
          const yy=base-tall+j*tall*.16, half=24+j*12;
          const crown=[[x+19,yy-45],[x+19-half*.4,yy-8],[x+19-half*.23,yy-12],[x+19-half*.75,yy+17],[x+19-half*.53,yy+12],[x+19-half,yy+40],[x+19+half,yy+40],[x+19+half*.55,yy+11],[x+19+half*.77,yy+17],[x+19+half*.25,yy-12],[x+19+half*.41,yy-8]];
          poly(crown,biome==='alpine'?'#6c8a94':layer===2?'#214332':'#284a43');
          if(biome==='alpine')poly([[x+19,yy-45],[x+19-half*.4,yy-8],[x+19-half*.23,yy-12],[x+19-half*.75,yy+17],[x+19-half*.53,yy+12],[x+19-half,yy+35],[x+20,yy+22],[x+19+half*.52,yy+25],[x+21,yy-17]],'#bfced0');
          else if(layer===2)line([[x+19,yy-28],[x+14,yy+22],[x+19-half*.72,yy+31]],'#42624c66',1.2);
        }
      } else if(biome==='alpine') {
        poly([[x-80,base],[x+60,base-tall-100],[x+225,base]],layer?'#607e90':'#8aa3b0');
        poly([[x+60,base-tall-100],[x+7,base-tall+10],[x+51,base-tall-12],[x+77,base-tall+19],[x+114,base-tall-5]],'#d4e6e8');
        line([[x+60,base-tall-90],[x+76,base-tall*.7],[x+59,base-tall*.56],[x+101,base-45]],'#344c6665',3);
        line([[x+25,base-tall+15],[x-13,base-95],[x-2,base-71]],'#a8c1ca55',2);
      } else if(biome==='wetlands') {
        poly([[x-10,base],[x+13,base-tall],[x+36,base],[x+63,base+9],[x+22,base-10],[x-36,base+10]],'#1c3d34');
        for(let j=0;j<4;j++) {
          const yy=base-tall+30+j*35;line([[x+20,yy+30],[x-47,yy-10],[x-73,yy-55]],'#274b3d',8-j);
          oval(x+30,yy,75-j*10,24,'#365e4677');
          for(let m=0;m<4;m++)line([[x-35+m*16,yy],[x-33+m*16,yy+42+Math.sin(time+m)*5]],'#7a92615e',3);
        }
        oval(x+85,base+8,85,9,'#86aa7255');
      } else if(biome==='dunes') {
        c.fillStyle=layer===2?'#805c47':'#b0865b';c.beginPath();c.moveTo(x-100,base);c.quadraticCurveTo(x+80,base-tall*.8,x+320,base);c.fill();
        if(layer===2){line([[x+30,base],[x+30,base-100]],'#303e32',14);line([[x+30,base-37],[x,base-37],[x,base-68]],'#303e32',10);line([[x+30,base-62],[x+55,base-62],[x+55,base-89]],'#303e32',9);}
      } else if(biome==='wildcoast') {
        poly([[x,base],[x+32,base-tall*.7],[x+70,base-tall*.85],[x+95,base-60],[x+128,base]],'#2d4859');
        line([[x-12,base],[x+112,base]],'#d6e1da88',4);
        if(layer===2){line([[x+150,base],[x+145,base-120],[x+119,base-150]],'#253c3a',9);line([[x+145,base-120],[x+176,base-144]],'#253c3a',5);}
      }
    }
  }
  c.globalAlpha=1;
}

export function paintNatureGround(c, biome, w, ground, camera, time) {
  const colors={boreal:'#263b2e',alpine:'#7395a4',wetlands:'#40523a',dunes:'#85644b',wildcoast:'#40575c'};
  c.fillStyle=colors[biome];c.fillRect(0,ground,w,140);c.fillStyle=biome==='alpine'?'#d3e2e3':'#9d9f7959';c.fillRect(0,ground-4,w,6);
  for(let i=-1;i<w/90+2;i++){
    const x=i*90-camera%90;c.fillStyle=biome==='alpine'?'#d1e0e14d':biome==='dunes'?'#dfb77a4d':'#08171688';
    c.beginPath();c.ellipse(x+30,ground+24,35,biome==='dunes'?2:4,0,0,Math.PI*2);c.fill();
    if(biome==='boreal'||biome==='wetlands'){c.strokeStyle='#7c956777';c.lineWidth=2;c.beginPath();c.moveTo(x+10,ground);c.lineTo(x+4,ground-15);c.moveTo(x+13,ground);c.lineTo(x+20,ground-12);c.stroke();}
    if(biome==='wildcoast'){c.strokeStyle='#b6d3d355';c.lineWidth=3;c.beginPath();c.moveTo(x,ground+64+Math.sin(time+i)*4);c.lineTo(x+70,ground+66);c.stroke();}
  }
}

import { GROUND, CHARACTERS } from './data.js';
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function label(c,text,x,y,color='#d5c391'){c.fillStyle=color;c.font='bold 10px monospace';c.textAlign='center';c.fillText(text,x,y);}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function paintMechanisms(c,game,time){
  const p=game.player;
  for(const m of game.stage.mechanisms||[]){
    const near=game.mode==='playing'&&!p.riding&&p.house===null&&Math.abs(m.x+m.w/2-p.x-p.w/2)<100;
    if(m.kind==='barrel'){
      if(m.state==='spent'){c.fillStyle='#161b1c';c.beginPath();c.ellipse(m.x+16,GROUND,35,5,0,0,Math.PI*2);c.fill();continue;}
      rect(c,m.x,m.y,32,46,m.state==='fuse'&&Math.sin(time*25)>.1?'#d2a067':'#7f5144');rect(c,m.x-2,m.y+5,36,4,'#ac967b');rect(c,m.x-2,m.y+35,36,4,'#a68f72');label(c,'!',m.x+16,m.y+29,'#e8d1a2');
      if(m.state==='fuse'){c.fillStyle='#d7a7651f';c.strokeStyle='#debd83';c.lineWidth=2;c.setLineDash([8,6]);c.beginPath();c.ellipse(m.x+16,GROUND-2,175,20,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}
    }else if(m.kind==='switch'){
      rect(c,m.x+10,m.y,9,68,'#68746e');rect(c,m.x-3,m.y,36,40,'#334b52');rect(c,m.x+3,m.y+5,24,7,m.state==='off'?'#9fcea7':'#e1b373');line(c,[[m.x+9,m.y+21],[m.x+23,m.y+(m.state==='off'?16:32)]],'#d7d1b4',4);
      line(c,[[m.x+15,GROUND-1],[7920,GROUND-1]],'#87967b55',2);if(near&&m.health>0)label(c,m.state==='off'?'E · ARM CIRCUIT':'E · CUT POWER',m.x+16,m.y-14);
    }else if(m.kind==='pushable'){
      rect(c,m.x,m.y,m.w,m.h,'#6f6550');for(let i=0;i<3;i++)rect(c,m.x+3,m.y+7+i*(m.h/3),m.w-6,5,'#c1ac7b');
      if(near&&m.state==='ready')label(c,'E · TOPPLE',m.x+m.w/2,m.y-16);
    }else{
      const y=m.state==='landed'?GROUND-42:m.cargoY,h=m.state==='landed'?42:m.cargoH;
      if(['hanging','warning'].includes(m.state)){line(c,[[m.cargoX-8,GROUND-300],[m.cargoX+m.cargoW+8,GROUND-300]],'#607771',7);for(const x of [m.cargoX+14,m.cargoX+m.cargoW-14])line(c,[[x,GROUND-300],[x,y]],'#9c9b7b',2);}
      rect(c,m.cargoX,y,m.cargoW,h,'#606a5d');for(let i=0;i<3;i++)rect(c,m.cargoX+8+i*46,y+3,5,h-6,'#b6ad88');line(c,[[m.cargoX+4,y+4],[m.cargoX+m.cargoW-4,y+h-4]],'#89947c',3);
      if(m.state==='hanging'){line(c,[[m.x+16,GROUND-165],[m.x+16,GROUND-80]],'#a9b497',3);rect(c,m.x+3,GROUND-145,25,35,'#ac8961');if(near)label(c,'E · RELEASE CARGO',m.x+16,GROUND-176);}
      if(['warning','falling'].includes(m.state)){rect(c,m.cargoX,GROUND-12,m.cargoW,12,'#d3ab7244');label(c,'!',m.cargoX+70,GROUND-30,'#e5ba86');}
    }
  }
}
export function paintMission(c,game,time,drawHero){
  const m=game.stage.mission;if(!m)return;const p=game.player;
  for(const g of m.generators){
    rect(c,g.x,g.y+15,66,57,'#40575a');rect(c,g.x+8,g.y+25,31,22,'#182e34');for(let i=0;i<4;i++)rect(c,g.x+11+i*7,g.y+29,3,14,'#7c9285');
    c.strokeStyle=g.complete?'#b4dfb5':'#c3ac78';c.lineWidth=4;c.beginPath();c.arc(g.x+51,g.y+34,10,g.progress*5,g.progress*5+Math.PI*1.6);c.stroke();
    rect(c,g.x+6,g.y+5,53,5,'#17252c');rect(c,g.x+6,g.y+5,53*g.progress/3,5,g.complete?'#badfb7':'#d9bc80');
    label(c,g.complete?'POWER ONLINE':'HOLD E · GENERATOR',g.x+33,g.y-12,g.complete?'#b5deb2':'#d7bd87');
  }
  if(m.escort){
    const e=m.escort;if(!e.hidden&&e.health>0){drawHero(c,CHARACTERS[3],e.x,e.y,{facing:e.facing,time,moving:Math.abs(e.vx)>1,weapon:'fists',hurt:e.hurt>0});label(c,e.active?'SURVIVOR '+Math.ceil(e.health)+'/90':'E · ESCORT SURVIVOR',e.x+17,e.y-23,'#bfd8bb');}
    for(const x of [m.extractionX-55,m.extractionX+55])rect(c,x,GROUND-110,7,110,'#5c8f7c');line(c,[[m.extractionX-55,GROUND-107],[m.extractionX+62,GROUND-107]],'#b1c7a0',4);label(c,'EXTRACTION',m.extractionX,GROUND-124,'#b7d5b5');
  }
  if(m.beacon){
    const b=m.beacon;rect(c,b.x,b.y,10,110,'#728b87');rect(c,b.x-12,b.y+20,35,39,'#3b5960');line(c,[[b.x+5,b.y],[b.x+28,b.y-23]],'#adbba3',3);
    if(b.active&&!m.complete){rect(c,b.x-b.radius,GROUND-7,b.radius*2,7,'#b8d3a848');c.strokeStyle='#b6cba36f';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(b.x+5,b.y+10,15+(time*20+i*19)%55,-1.2,1.2);c.stroke();}}
    label(c,m.complete?'EXTRACTION SECURED':b.active?'DEFEND THE ZONE':'E · ACTIVATE BEACON',b.x+6,b.y-36,m.complete?'#b8ddb6':'#dac68f');
  }
}

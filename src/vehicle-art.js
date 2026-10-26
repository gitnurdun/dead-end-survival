import { VEHICLES, vehicleName } from './vehicle-data.js';

const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
export function drawVehicle(c,v,time=0,{occupied=false,nearby=false,driverColor='#889e77'}={}){
  const d=VEHICLES[v.type],tank=v.type==='tank',color=v.hurt>0?'#bcc6ad':v.skin==='snow'?'#a4b6b5':v.skin==='space'?'#8798a7':v.skin==='sand'?'#baa175':v.skin==='mud'?'#647862':d.color;
  c.save();c.translate(v.x+v.w/2,v.y+v.h);c.scale(v.facing||1,1);c.translate(-v.w/2,-v.h);
  if(v.destroyed){box(c,0,10,v.w,v.h-10,'#313d3f');box(c,12,2,v.w-25,17,'#45443f');c.strokeStyle='#97745c';c.lineWidth=3;c.beginPath();c.moveTo(40,12);c.lineTo(63,28);c.lineTo(83,14);c.stroke();c.restore();return;}
  const shake=occupied&&Math.abs(v.vx)>5?Math.sin(time*35)*.7:0;c.translate(-(v.recoil||0)*16,shake);
  if(tank){
    box(c,4,v.h-29,v.w-8,27,'#17242b');box(c,8,v.h-27,v.w-16,3,'#8e9482');
    for(let i=0;i<6;i++){const x=16+i*24;c.fillStyle='#586b66';c.beginPath();c.arc(x,v.h-14,10,0,Math.PI*2);c.fill();c.strokeStyle='#1b3036';c.lineWidth=3;c.beginPath();c.moveTo(x-7*Math.cos(v.travel/16),v.h-14-7*Math.sin(v.travel/16));c.lineTo(x+7*Math.cos(v.travel/16),v.h-14+7*Math.sin(v.travel/16));c.stroke();}
    box(c,0,30,v.w,29,color);box(c,8,23,v.w-20,13,'#829180');box(c,39,4,66,28,'#526c62');box(c,48,0,43,6,'#a0a98c');box(c,100,13,66,9,'#65796d');box(c,157,11,13,13,'#2b4144');
    box(c,14,36,29,13,'#a8a37c');box(c,20,34,5,17,'#313e39');box(c,96,35,38,5,'#314e48');
  }else{
    c.strokeStyle='#283a3d';c.lineWidth=7;c.beginPath();c.moveTo(28,45);c.lineTo(34,4);c.lineTo(76,4);c.lineTo(91,42);c.stroke();
    box(c,24,30,68,23,'#394d4b');box(c,0,42,v.w,17,color);box(c,91,32,36,16,'#b9a16e');box(c,3,32,23,14,'#626e59');box(c,10,24,18,7,'#93a78b');
    box(c,64,12,46,6,'#435c60');box(c,100,10,22,8,'#263d43');box(c,70,15,8,21,'#364745');
    for(const x of [23,v.w-22]){c.fillStyle='#12212a';c.beginPath();c.arc(x,v.h-13,17,0,Math.PI*2);c.fill();c.strokeStyle='#839389';c.lineWidth=3;c.beginPath();c.arc(x,v.h-13,8,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-8*Math.cos(v.travel/17),v.h-13-8*Math.sin(v.travel/17));c.lineTo(x+8*Math.cos(v.travel/17),v.h-13+8*Math.sin(v.travel/17));c.stroke();}
    box(c,v.w-10,37,8,6,'#ecdb9d');box(c,0,41,5,5,'#b47b67');
  }
  if(v.skin==='snow'){
    if(!tank){box(c,8,v.h-25,v.w-16,24,'#263e49');for(let i=0;i<8;i++)box(c,11+i*14,v.h-22,7,17,'#8aabb8');}
    box(c,34,2,tank?63:43,4,'#e0e8df');box(c,4,tank?30:42,28,4,'#cfdddb');
  }
  if(v.skin==='space'){
    c.strokeStyle='#aec8d4';c.lineWidth=2;c.beginPath();c.moveTo(17,23);c.lineTo(13,-22);c.lineTo(22,-28);c.stroke();box(c,5,20,24,15,'#b4c2bb');
    if(!tank)for(const x of [15,38,61,84,107]){c.fillStyle='#1c323c';c.beginPath();c.arc(x,v.h-10,12,0,Math.PI*2);c.fill();box(c,x-3,v.h-14,6,8,'#a0b7ba');}
  }
  if(v.skin==='mud'||v.skin==='sand')for(let i=0;i<5;i++)box(c,10+i*24,48+(i%2)*5,17,5,v.skin==='mud'?'#403f32':'#d1b78c');
  if(v.skid){c.strokeStyle='#c7bea355';c.lineWidth=2;c.beginPath();c.moveTo(-33,v.h);c.lineTo(20,v.h);c.moveTo(-12,v.h+5);c.lineTo(33,v.h+5);c.stroke();}
  if(occupied){const x=tank?65:51,y=tank?1:15;box(c,x-6,y+10,15,17,driverColor);c.fillStyle='#c7a27f';c.beginPath();c.arc(x,y+2,7,0,Math.PI*2);c.fill();box(c,x-8,y-6,17,5,'#6d8064');}
  if(v.hull<d.hull*.35){for(let i=0;i<3;i++){c.fillStyle=`rgba(123,116,100,${.22-i*.05})`;c.beginPath();c.arc(20+Math.sin(time+i)*5,-5-i*14-(time*12%14),10+i*3,0,Math.PI*2);c.fill();}}
  c.restore();
  if(nearby&&!occupied){c.fillStyle='#e4c995';c.font='bold 11px monospace';c.textAlign='center';c.fillText('E · '+vehicleName(v).toUpperCase(),v.x+v.w/2,v.y-18);}
}

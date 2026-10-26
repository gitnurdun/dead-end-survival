function poly(c, p, fill, stroke = '#0b1219', width = 2) { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); } }
function line(c, p, color, width) { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.stroke(); }
function ellipse(c, x, y, rx, ry, color) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }

export function drawInfected(c, e, time = 0) {
  const look=e.appearance||{};
  if (e.type === 'crawler') {
    const stride = e.phase === 'walk' ? Math.sin((e.travel || 0) / 22) * 8 : 0;
    c.save(); c.translate(e.x + e.w / 2, e.y + e.h / 2); c.scale(e.facing || 1, 1);
    ellipse(c,0,15,31,5,'#02070ba0');poly(c,[[-24,5],[-20,-12],[9,-10],[15,4],[-5,11]],e.hurt?'#c4ccaa':look.coat||'#46534a');
    line(c,[[-16,3],[-29,9],[-25-stride,15]],'#7b886c',7);line(c,[[8,-1],[24,5],[31+stride,14]],'#8c9980',6);
    ellipse(c,17,-9,13,11,'#929a7a');poly(c,[[11,-5],[28,-5],[25,4],[17,3]],'#17251e');
    ellipse(c,23,-12,2,1.5,'#dec08d');if(e.phase==='windup'){c.fillStyle='#ebbb8a';c.font='bold 16px monospace';c.fillText('!',12,-29);}c.restore();
    if(e.chill>0) { c.strokeStyle='#a4e3ee';c.lineWidth=2;c.strokeRect(e.x-2,e.y-2,e.w+4,e.h+4); }return;
  }
  const brute = e.type === 'brute', runner = e.type === 'runner', spitter = e.type === 'spitter';
  const walk = e.phase === 'walk' && Math.abs(e.vx ?? 30) > 2;
  // Foot placement comes from distance traveled, so idle enemies never run in place.
  const phase = (e.travel ?? time * 24) / (runner ? 19 : 24)*(look.gait||1), step = walk ? Math.sin(phase) * (runner ? 8 : 5) : 0;
  const bob = walk ? Math.cos(phase * 2) * 1.1 : Math.sin(time * 1.1 + e.x) * .5;
  const sx = e.w / 42, sy = e.h / 76;
  c.save(); if (e.concealed) c.globalAlpha = .24; c.translate(e.x + e.w / 2, e.y + e.h); c.scale(e.facing * sx*(look.build||1), sy); c.translate(-21, -76);
  ellipse(c, 21, 76, 26, 5, '#02070bac');
  const skin = e.hurt > 0 ? '#b6c6b3' : brute ? '#717b72' : spitter ? '#81896b' : look.skin||'#829082';
  poly(c, [[10, 48], [9 + step, 63], [6 + step, 72], [20 + step, 74], [22, 48]], look.trousers||'#26353b');
  poly(c, [[25, 48], [27 - step, 63], [29 - step, 73], [42 - step, 74], [37 - step, 66], [35, 46]], look.trousers||'#344047');
  line(c, [[6 + step, 74], [21 + step, 75]], '#0e171d', 4); line(c, [[29 - step, 74], [42 - step, 75]], '#0e171d', 4);
  c.translate(runner ? 4 : 1, bob);
  const torso = brute ? '#483c40' : runner ? '#58413e' : spitter ? '#46514a' : look.coat||'#3d4c52';
  poly(c, [[8, 27], [21, 21], [35, 28], [39, 51], [31, 49], [27, 55], [22, 49], [15, 54], [6, 48]], torso);
  poly(c, [[19, 25], [24, 36], [29, 29], [32, 43], [25, 45], [21, 39]], '#7a81716b', null);
  line(c, [[11, 32], [12, 43], [17, 45]], '#a6a39366', 1.5);
  if (brute) { poly(c, [[1, 31], [-3, 20], [12, 19], [23, 28], [31, 20], [45, 26], [42, 37]], '#424944'); line(c, [[6, 24], [10, 17]], '#8b8c78', 3); line(c, [[36, 25], [39, 18]], '#8b8c78', 3); }
  const striking = e.phase === 'windup', armY = striking ? 15 : 41;
  line(c, [[31, 31], [41, striking ? 22 : 42], [54, armY]], skin, brute ? 11 : 7);
  line(c, [[8, 31], [3, 44], [13, 56]], skin, brute ? 10 : 6);
  for (let j = 0; j < 3; j++) line(c, [[51 + j * 2, armY], [57 + j * 2, armY + (striking ? -6 : 7)]], '#a4ae94', 1.5);
  poly(c, [[14, 4], [24, -1], [35, 3], [40, 13], [36, 23], [30, 29], [20, 24], [13, 16]], skin);
  poly(c, [[12, 9], [13, 0], [21, 3], [23, -4], [29, 2], [35, -1], [38, 7], [30, 4], [25, 8]], '#28342f');
  poly(c, [[17, 11], [24, 10], [25, 15], [18, 16]], '#17221e', null);
  poly(c, [[29, 11], [36, 10], [37, 15], [29, 17]], '#17221e', null);
  c.shadowColor = spitter ? '#bfdc78' : '#dba887'; c.shadowBlur = 5;
  ellipse(c, 23, 13, 1.5, 1.1, spitter ? '#d2e899' : '#d5b49b'); ellipse(c, 34, 13, 1.4, 1, '#d5b49b'); c.shadowBlur = 0;
  poly(c, [[26, 19], [38, 18], [36, 25], [29, 27], [24, 23]], '#22241f', null);
  for (let j = 0; j < 4; j++) poly(c, [[27 + j * 2.4, 20], [29 + j * 2.4, 20], [28 + j * 2.4, 23]], '#b9b6a0', null);
  line(c, [[17, 18], [20, 23]], '#63504a', 2); line(c, [[34, 4], [31, 8], [34, 10]], '#4f584b', 1);
  if (spitter) { ellipse(c, 36, 26, 9, 8, '#788550'); ellipse(c, 40, 25, 5, 4, '#273626'); line(c, [[40, 29], [42, 37]], '#a2ba69', 2); }
  if (e.type === 'armored') {
    poly(c,[[6,28],[35,27],[38,48],[10,50]],'#697b80');line(c,[[21,29],[22,49]],'#b5bdb0',3);
    poly(c,[[9,9],[14,-3],[35,-4],[43,9]],'#667e83');line(c,[[17,10],[40,10],[38,20]],'#a8c2c5',5);
  }
  if (e.type === 'bloater') {ellipse(c,24,40,23,24,'#7e8954');for(let i=0;i<5;i++)ellipse(c,12+i*6,36+Math.sin(i)*10,4,5,'#b9b474');line(c,[[14,23],[22,40],[18,54]],'#425533',2);}
  if (e.type === 'screamer') {ellipse(c,29,28,12,16,e.attackTarget==='scream'&&striking?'#c6a3b8':'#927187');ellipse(c,30,23,7,11,'#18202a');line(c,[[7,30],[-2,41],[0,57]],'#b3aaa2',5);}
  if (e.type === 'leaper') {line(c,[[10,44],[1,58],[17,70]],'#adb693',6);line(c,[[32,43],[43,58],[29,72]],'#8b9b7e',6);poly(c,[[7,22],[12,15],[19,22],[24,11],[30,23],[40,17],[36,31]],'#5e6854');}
  if (e.type === 'stalker') {poly(c,[[8,24],[-2,58],[17,51],[27,57],[42,49],[35,23]],'#3b334c');ellipse(c,23,13,3,2,'#c5a0f0');ellipse(c,34,13,3,2,'#c5a0f0');}
  if (e.type === 'lobber') {
    ellipse(c,5,30,14,22,'#82754d');for(let i=0;i<4;i++)ellipse(c,1+i*4,21+i*8,7,8,striking?'#d5b77b':'#ad9a61');
    line(c,[[5,44],[17,45],[34,32]],'#a8a17b',6);ellipse(c,striking?45:29,striking?4:36,9,9,'#dac081');line(c,[[25,24],[27,30],[31,34]],'#b8a16c',3);
  }
  if (e.type === 'tremor') {
    for(const x of [2,38]){poly(c,[[x-8,31],[x+6,29],[x+13,54],[x+4,62],[x-9,53]],'#526d70');line(c,[[x-3,35],[x+4,43],[x-2,52]],striking?'#c1eee5':'#8dbbb8',3);}
    poly(c,[[8,29],[17,23],[37,29],[36,45],[25,50],[10,43]],'#435c61');line(c,[[18,27],[25,36],[20,44]],'#95c4bd',2);
  }
  if (e.type === 'rammer') {
    poly(c,[[6,9],[13,-5],[31,-8],[42,5],[40,17],[28,20]],'#77594e');line(c,[[14,1],[24,5],[21,12]],'#c2a58c',2);
    poly(c,[[3,27],[-7,21],[-10,36],[8,42]],'#8c7361');poly(c,[[33,27],[46,23],[52,35],[36,43]],'#9c8068');
    if(e.phase==='charge'){line(c,[[-5,52],[-22,54]],'#d7b29688',3);line(c,[[-3,33],[-29,35]],'#d7b29655',2);}
  }
  if(!['armored','rammer','brute'].includes(e.type)&&look.hat===1){poly(c,[[12,5],[15,-4],[33,-3],[37,4]],look.coat||'#5a6559');line(c,[[13,5],[43,6]],'#718275',3);}
  if(look.hat===2&&!['armored','rammer'].includes(e.type))line(c,[[15,5],[21,0],[33,3]],'#b7ac8c',4);
  for(let i=0;i<(look.rips||0);i++){const x=11+i*8;poly(c,[[x,43],[x+5,39-i*2],[x+8,47]],skin,null);line(c,[[x,59],[x+4,62]],'#a6a391',1);}
  if(look.scar)line(c,[[18,7],[22,18],[19,22]],'#576355',2);
  if(look.limp&&walk)line(c,[[13,30],[7,47],[10,58]],skin,5);
  if (e.chill > 0) {line(c,[[4,51],[5,25],[20,1],[41,6],[43,48]],'#a9deee',2);for(let i=0;i<4;i++)poly(c,[[i*11,49],[i*11+4,38],[i*11+8,51]],'#a4dbe4');}
  if (e.burn > 0) for(let i=0;i<4;i++)poly(c,[[i*11,53],[i*11+6,28+Math.sin(time*9+i)*8],[i*11+13,51]],'#efab66bb');
  if (e.bleed > 0) line(c,[[15,30],[12,46],[19,43]],'#abd28a',3);
  if (e.rage > 0) {c.strokeStyle='#d9988e';c.lineWidth=1.5;c.beginPath();c.arc(25,-8,12,0,Math.PI*2);c.stroke();}
  if (striking) { c.fillStyle = '#daaa78'; c.font = 'bold 17px monospace'; c.fillText('!', 31, -12); }
  c.restore();
  if (e.health < e.maxHealth) { c.fillStyle = '#070d14'; c.fillRect(e.x, e.y - 12, e.w, 2); c.fillStyle = '#a6a57c'; c.fillRect(e.x, e.y - 12, e.w * Math.max(0, e.health / e.maxHealth), 2); }
}

export function drawTerrainObstacle(c, p) {
  const { x, y, w, h, variant } = p;
  ellipse(c, x + w / 2, y + h + 3, w * .56, 6, '#02080ca0');
  if (['rock', 'basalt', 'stone', 'ice'].includes(variant)) {
    const color = variant === 'ice' ? '#6a8b9d' : variant === 'basalt' ? '#433b43' : '#55585a';
    poly(c, [[x, y + h], [x + 7, y + h * .48], [x + 34, y + 3], [x + w * .72, y], [x + w - 12, y + h * .38], [x + w, y + h]], color);
    poly(c, [[x + 34, y + 3], [x + w * .72, y], [x + w * .6, y + h * .55], [x + 43, y + h * .7]], variant === 'ice' ? '#a3c5d05b' : '#777c6e33', null);
    line(c, [[x + w * .6, y + h * .55], [x + w * .68, y + h * .8], [x + w * .5, y + h]], '#151e2a88', 2);
  } else if (variant === 'log') {
    c.fillStyle = '#493f38'; c.fillRect(x + 10, y + 9, w - 20, h - 9); ellipse(c, x + 14, y + h / 2 + 5, 15, h / 2 - 5, '#79654b'); ellipse(c, x + 14, y + h / 2 + 5, 9, h / 2 - 12, '#4c4538');
    for (let i = 0; i < 4; i++) line(c, [[x + 30, y + 18 + i * 11], [x + w - 5, y + 14 + i * 12]], '#252c2a', 3);
  } else {
    const col = variant === 'container' ? '#425357' : variant === 'rover' ? '#6a7376' : variant === 'train' ? '#3d4d52' : '#4b5353';
    poly(c, [[x, y + h], [x + 2, y + 6], [x + w - 8, y], [x + w, y + h]], col);
    for (let i = 0; i < 6; i++) line(c, [[x + 14 + i * 23, y + 11], [x + 14 + i * 23, y + h - 8]], '#17232b77', 3);
    line(c, [[x + 4, y + 4], [x + w - 6, y + 4]], '#929483', 3);
    if (variant === 'machine' || variant === 'tank') { c.fillStyle = '#b0925b'; c.fillRect(x + w * .64, y + 22, 27, 20); c.fillStyle = '#2a3232'; c.font = 'bold 15px monospace'; c.fillText('!', x + w * .64 + 9, y + 38); }
    if (variant === 'rover') for (let i = 0; i < 3; i++) { ellipse(c, x + 24 + i * 49, y + h - 2, 12, 10, '#14222d'); ellipse(c, x + 24 + i * 49, y + h - 2, 5, 5, '#7b8c91'); }
  }
}

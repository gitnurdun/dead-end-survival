// Shared, replaceable illustrations used by the world, museum and shop shelf.
export function drawWeapon(c, id, x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const r = (x, y, w, h, color) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, 2); c.fill(); };
  const steel = c.createLinearGradient(0, -18, 0, 15); steel.addColorStop(0, '#b5c2c3'); steel.addColorStop(.35, '#586b77'); steel.addColorStop(1, '#26343e');
  if (id === 'bat') {
    c.rotate(-.12); r(-76, -10, 108, 20, '#ab8155'); r(25, -6, 54, 12, '#b9ad87');
    for (let i = 0; i < 9; i++) r(30 + i * 5, -6, 2, 12, '#454944'); r(77, -10, 5, 20, '#807151');
    r(-61, -6, 70, 2, '#e0b17d');
  } else if (id === 'fists') {
    for (const x of [-33, 12]) { r(x, -15, 30, 31, '#bba082'); r(x + 4, 14, 24, 15, '#514f46'); for (let i = 0; i < 3; i++) r(x + 7 + i * 7, -15, 1, 13, '#6d655c'); }
  } else if (id === 'pistol') {
    r(-48, -22, 97, 17, steel); r(-47, -5, 34, 43, '#414a41'); r(41, -20, 11, 11, '#18242e');
    c.strokeStyle = '#889392'; c.lineWidth = 3; c.strokeRect(-13, -5, 23, 18); r(-7, -3, 3, 10, '#a4a998');
    for (let i = 0; i < 6; i++) r(-40 + i * 4, -20, 2, 12, '#253642'); r(-37, -26, 6, 4, '#c6c9b6'); r(31, -26, 6, 4, '#c6c9b6');
  } else if (id === 'shotgun') {
    r(-40, -9, 113, 11, steel); r(-40, 4, 100, 6, '#374951'); r(-80, -8, 42, 25, '#8e6949');
    r(-45, -6, 42, 18, '#52616a'); r(15, 4, 37, 16, '#936d4b');
    for (let i = 0; i < 6; i++) r(19 + i * 5, 5, 2, 14, '#483f36'); r(66, -13, 4, 4, '#a6b4b1');
  } else if (id === 'smg') {
    r(-42, -12, 83, 24, steel); r(33, -7, 34, 8, '#899897'); r(-23, 11, 17, 28, '#47554b');
    r(4, 11, 14, 36, '#64716b'); r(-75, -7, 35, 6, '#86918b'); r(-78, -7, 7, 26, '#434e50');
    r(-16, -21, 42, 5, '#8c9894'); r(-11, -17, 5, 7, '#55666a');
    for (let i = 0; i < 5; i++) r(8 + i * 5, -9, 2, 13, '#1c303a');
  } else if (id === 'rifle') {
    r(-42, -8, 125, 9, steel); r(-86, -7, 50, 26, '#7f7359'); r(-41, -6, 73, 22, '#52604f');
    r(-15, -23, 52, 10, '#536774'); r(-21, -25, 13, 15, '#8ea1a1'); r(32, -25, 13, 15, '#8ea1a1');
    r(-7, -13, 5, 7, '#9c9e87'); r(23, -13, 5, 7, '#9c9e87'); r(-23, 15, 13, 21, '#4a4e3f'); r(1, 16, 18, 19, '#697261');
  } else if (id === 'machete' || id === 'spear' || id === 'hammer') {
    r(-80, -5, 134, 10, '#8e7855'); r(-78, -5, 36, 10, '#343e3b');
    if (id === 'machete') { c.fillStyle = steel; c.beginPath(); c.moveTo(-28,-7); c.lineTo(78,-14); c.lineTo(62,16); c.lineTo(-28,5); c.fill(); r(-32,-13,6,27,'#a5ac93'); }
    if (id === 'spear') { c.fillStyle = steel; c.beginPath(); c.moveTo(48,-13); c.lineTo(90,0); c.lineTo(48,13); c.lineTo(57,0); c.fill(); for(let i=0;i<5;i++)r(35+i*4,-6,2,12,'#c3bb95'); }
    if (id === 'hammer') { r(23,-29,45,58,steel); r(22,-25,8,49,'#a3aaa1'); r(62,-23,13,44,'#28383e'); }
  } else if (id === 'chainsaw') {
    r(-12,-12,90,25,'#c8c5b0'); r(-8,-9,83,19,'#63716b');
    for(let i=0;i<12;i++){r(-10+i*8,-15,4,5,'#aeb7a8');r(-10+i*8,12,4,5,'#aeb7a8');}
    r(-65,-24,59,48,'#c47e44');r(-62,4,46,17,'#5b6656');r(-64,-31,46,7,'#263b3d');r(-74,-30,9,45,'#263b3d');r(-38,-14,20,13,'#3a4140');
  } else if (id === 'revolver') {
    r(-26,-18,87,12,steel); c.fillStyle='#7c8989';c.beginPath();c.arc(-14,-6,19,0,Math.PI*2);c.fill();
    for(let i=0;i<4;i++)r(-26+i*8,-17,3,23,'#34464e');r(-44,2,29,38,'#77634b');r(-39,-23,10,6,'#a2ae9a');r(54,-23,5,5,'#a2ae9a');
  } else if (id === 'launcher' || id === 'flamer') {
    r(-76,-6,38,23,'#68704e');r(-43,-19,106,39,id==='launcher'?'#556444':'#8e6642');r(54,-17,21,35,'#263b40');
    r(-24,19,17,21,'#3a4540');r(21,16,18,18,'#3a4540');
    if(id==='launcher'){r(-30,-24,53,7,'#9da58d');for(let i=0;i<5;i++)r(-32+i*17,-15,3,27,'#293c35');}
    else{r(-31,-14,34,32,'#a3aa82');r(-25,-19,20,6,'#c0c5a4');c.strokeStyle='#53635a';c.lineWidth=5;c.beginPath();c.arc(1,19,33,0,Math.PI);c.stroke();r(69,3,9,6,'#f3ae70');}
  } else if (['tesla','cryo','plasma'].includes(id)) {
    const glow = {tesla:'#9be5f0',cryo:'#a9dcff',plasma:'#d1a5ff'}[id];
    r(-72,-8,32,22,'#46555b');r(-43,-19,83,36,'#4e6671');r(-27,16,17,25,'#2d444e');r(36,-12,39,21,'#263d4a');
    c.shadowColor=glow;c.shadowBlur=9;r(-31,-11,54,7,glow);r(-7,2,30,5,glow);
    if(id==='tesla'){for(let i=0;i<4;i++)r(32+i*11,-23,5,43,glow);}
    else if(id==='cryo'){r(44,-21,7,39,glow);r(63,-20,7,37,glow);r(-38,-28,34,7,'#b0d3dc');}
    else{r(35,-21,49,7,glow);r(35,15,49,7,glow);r(77,-20,8,42,'#647487');}
    c.shadowBlur=0;
  } else {
    r(-48, -22, 96, 54, id === 'heal' ? '#c6cab4' : '#6b7452'); r(-48, -5, 96, 9, '#aaa580');
    if (id === 'heal') { r(-6, -14, 12, 38, '#a64746'); r(-19, -1, 38, 12, '#a64746'); }
    else for (let i = 0; i < 5; i++) { r(-30 + i * 13, -17, 7, 38, '#c8b47f'); r(-30 + i * 13, -17, 7, 8, '#e0d2a9'); }
  }
  c.restore();
}

export function drawShopArt(canvas, item) {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h); const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#15252c'); bg.addColorStop(1, '#0a1116'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#8fa5a51b'; c.lineWidth = 1;
  for (let i = 0; i < w; i += 18) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); }
  drawWeapon(c, item.art || (item.id === 'bat' ? 'bat' : item.id), w / 2, h * .44, Math.min(w / 210, h / 100));
  c.fillStyle = '#75634b'; c.fillRect(7, h - 13, w - 14, 6); c.fillStyle = '#b99c6b'; c.fillRect(7, h - 14, w - 14, 2);
}

export function drawArmoryShelf(canvas, family = 'firearm') {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.fillStyle = '#101a1f'; c.fillRect(0, 0, w, h);
  const rack = family === 'melee' ? ['bat','machete','spear','hammer','chainsaw','ammo'] : family === 'prototype' ? ['tesla','cryo','plasma','ammo','cryo','tesla'] : ['pistol','shotgun','smg','rifle','revolver','launcher'];
  for (let i = 0; i < 2; i++) {
    c.fillStyle = '#77674f'; c.fillRect(20, h * (.48 + i * .46), w - 40, 9);
    for (let j = 0; j < 3; j++) drawWeapon(c, rack[i * 3 + j], w * (j + .5) / 3, h * (.28 + i * .46), Math.min(w / 660, h / 210));
  }
}

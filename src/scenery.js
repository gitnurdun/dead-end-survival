import { getLevel } from './levels.js';
import { random } from './world.js';
import { NATURE_BIOMES, paintWilderness, paintNatureGround } from './wilderness.js';

function box(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }
function shape(c, p, color, stroke = null, line = 1) { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); } }
function oval(c, x, y, rx, ry, color) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
function line(c, points, color, width = 1) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
const woods = ['forest', 'redforest', 'swamp', 'graveyard'];
const deserts = ['desert', 'canyon', 'mercury', 'mars', 'volcano', 'ashland'];
const icy = ['snow', 'glacier', 'uranus'];
const industrial = ['factory', 'refinery', 'power', 'reactor', 'lab'];
const space = ['moon', 'mars', 'venus', 'mercury', 'jupiter', 'saturn', 'uranus', 'neptune'];

export function paintEnvironment(c, level, width, height, camera = 0, time = 0, { preview = false } = {}) {
  level ||= getLevel('outbreak');
  const ground = height * .76, b = level.biome;
  const sky = c.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, level.sky); sky.addColorStop(.72, level.horizon); sky.addColorStop(1, '#11191d'); c.fillStyle = sky; c.fillRect(0, 0, width, height);
  const rng = random(level.seed);
  for (let i = 0; i < 65; i++) { const x = rng() * width, y = rng() * ground * .6, a = rng(); if (space.includes(b) || level.weather === 'fog') oval(c, x, y, a < .8 ? .8 : 1.6, .8, `rgba(190,206,221,${.15 + a * .4})`); }
  const moonX = width * .74 - Math.sin(camera / 40000) * 40, moonY = ground * .26;
  if (b === 'tunnel') {
    box(c, 0, 0, width, ground * .62, '#080c11');
    for (let i = -1; i < width / 210 + 2; i++) { const x = i * 210 - camera * .15 % 210; c.beginPath(); c.ellipse(x, ground * .62, 120, ground * .58, 0, Math.PI, 0); c.strokeStyle = '#263138'; c.lineWidth = 13; c.stroke(); }
  } else {
    const r = space.includes(b) ? 88 : b === 'redforest' ? 53 : 34;
    oval(c, moonX, moonY, r, r, space.includes(b) ? level.accent + '88' : b === 'redforest' ? '#bc5e6488' : '#acbab48c');
    if (space.includes(b)) {
      c.save(); c.beginPath(); c.arc(moonX, moonY, r, 0, Math.PI * 2); c.clip();
      for (let i = 0; i < 9; i++) box(c, moonX - r, moonY - r + i * 23, r * 2, 11 + i % 3 * 4, level.horizon + '77');
      if (b === 'moon') { oval(c, moonX - 15, moonY + 12, 42, 22, '#497c83'); oval(c, moonX + 20, moonY - 22, 18, 34, '#607966'); }
      c.restore();
      if (b === 'saturn') { c.beginPath(); c.ellipse(moonX, moonY, 160, 24, -.3, 0, Math.PI * 2); c.strokeStyle = '#d3bc9566'; c.lineWidth = 16; c.stroke(); }
    } else { oval(c, moonX - 13, moonY - 4, 30, 30, level.sky + 'bb'); oval(c, moonX + 9, moonY + 9, 7, 5, '#56646444'); }
  }
  // Three parallax ridgelines, with different geology for each environment.
  for (let layer = 0; layer < 3; layer++) {
    const points = [[0, ground]];
    for (let i = -1; i < 23; i++) {
      const x = i * width / 20, jagged = Math.sin(i * 3.17 + level.index + camera * .000006 * (layer + 1));
      points.push([x, ground - 50 - (2 - layer) * 60 - Math.abs(jagged) * (deserts.includes(b) || icy.includes(b) ? 130 : 55)]);
    }
    points.push([width, ground]); shape(c, points, [level.horizon + '69', '#1a2b32a6', '#122027be'][layer]);
  }
  if (['harbor', 'shipyard', 'coast'].includes(b)) {
    box(c, 0, ground - 115, width, 115, '#172e3b');
    for (let i = 0; i < 27; i++) line(c, [[i * 71 - camera * .1 % 71, ground - 83 + i % 6 * 14], [i * 71 + 50, ground - 82 + i % 6 * 14]], '#7b98a326', 2);
  }
  if (NATURE_BIOMES.includes(b)) paintWilderness(c, b, width, ground, camera, time, level.seed);
  const step = woods.includes(b) ? 180 : 340, shift = camera * .48;
  for (let i = Math.floor(shift / step) - 2; !NATURE_BIOMES.includes(b) && i < (shift + width) / step + 2; i++) {
    const rand = random(level.seed + i * 771), x = i * step - shift, h = 170 + rand() * 150;
    if (woods.includes(b)) {
      const trunk = b === 'redforest' ? '#241c25' : '#122422';
      shape(c, [[x - 9, ground], [x + 2, ground - h], [x + 15, ground - h - 38], [x + 23, ground], [x - 9, ground]], trunk);
      for (let j = 0; j < 5; j++) { const y = ground - 70 - j * 35; line(c, [[x + 10, y + 14], [x - 44 - j * 4, y - 35], [x - 59, y - 61]], trunk, 7 - j); line(c, [[x + 10, y], [x + 52, y - 30], [x + 69, y - 59]], trunk, 6 - j * .6); }
      if (b === 'forest') for (let j = 0; j < 4; j++) shape(c, [[x - 57 + j * 8, ground - h + j * 37], [x + 12, ground - h - 80 + j * 37], [x + 76 - j * 7, ground - h + j * 37]], '#17312a');
      if (b === 'graveyard') { box(c, x + 42, ground - 66, 34, 66, '#37443f'); oval(c, x + 59, ground - 66, 17, 16, '#37443f'); line(c, [[x + 59, ground - 66], [x + 59, ground - 27]], '#192723', 3); line(c, [[x + 48, ground - 54], [x + 70, ground - 54]], '#192723', 3); }
      if (b === 'swamp') { oval(c, x + 80, ground - 15, 78, 13, '#69855236'); for (let j = 0; j < 6; j++) line(c, [[x + 50 + j * 8, ground], [x + 45 + j * 8, ground - 28 - rand() * 30]], '#385440', 2); }
    } else if (deserts.includes(b) || icy.includes(b)) {
      const col = icy.includes(b) ? '#456373' : b === 'volcano' ? '#43282e' : '#493b3e';
      shape(c, [[x - 35, ground], [x - 5, ground - h * .55], [x + 31, ground - h], [x + 64, ground - h * .8], [x + 109, ground - 16]], col);
      shape(c, [[x + 31, ground - h], [x + 42, ground - 40], [x + 109, ground - 16], [x + 64, ground - h * .8]], '#0c172344');
      if (icy.includes(b)) shape(c, [[x - 5, ground - h * .55], [x + 31, ground - h], [x + 64, ground - h * .8], [x + 23, ground - h * .72]], '#8aabb85f');
      if (['volcano', 'mercury'].includes(b)) line(c, [[x + 31, ground - h], [x + 27, ground - 95], [x + 53, ground - 60], [x + 40, ground]], '#d8734270', 4);
    } else if (industrial.includes(b)) {
      box(c, x, ground - h * .7, 235, h * .7, '#243238');
      for (let j = 0; j < 3; j++) { box(c, x + 15 + j * 67, ground - h, 42, h, '#314047'); oval(c, x + 36 + j * 67, ground - h, 21, 8, '#455057'); box(c, x + 30 + j * 67, ground - h + 24, 7, h - 24, '#18282d'); }
      line(c, [[x - 15, ground - 45], [x - 15, ground - 98], [x + 245, ground - 98], [x + 245, ground - 15]], '#4f5a58', 9);
      box(c, x + 93, ground - 48, 42, 6, level.accent + '77');
      if (b === 'power' || b === 'reactor') { line(c, [[x + 132, ground - h - 75], [x + 82, ground], [x + 182, ground], [x + 132, ground - h - 75]], '#47575a', 5); line(c, [[x + 93, ground - h * .65], [x + 171, ground - h * .65]], '#718278', 6); }
      if (b === 'lab') { box(c, x - 20, ground - 125, 265, 100, '#1e3b3d'); for (let j = 0; j < 5; j++) { box(c, x + j * 45, ground - 113, 27, 75, '#50736b44'); oval(c, x + j * 45 + 13, ground - 75, 8, 22, '#668c7555'); } }
    } else if (['harbor', 'shipyard', 'coast'].includes(b)) {
      if (b === 'coast') { shape(c, [[x + 70, ground], [x + 90, ground - 220], [x + 126, ground - 220], [x + 148, ground]], '#2e444d'); box(c, x + 80, ground - 246, 58, 30, '#5c7379'); line(c, [[x + 110, ground - 230], [x + 280, ground - 195]], level.accent + '25', 45); }
      else {
        line(c, [[x + 35, ground], [x + 35, ground - h], [x + 230, ground - h - 22]], '#3d5157', 11); line(c, [[x + 35, ground - h], [x + 135, ground - h - 100], [x + 230, ground - h - 22], [x + 35, ground - h]], '#2f434a', 4); line(c, [[x + 205, ground - h - 20], [x + 205, ground - 65]], '#526269', 2);
        for (let j = 0; j < 3; j++) { box(c, x + j * 83, ground - 70, 79, 65, '#3e4c4d'); for (let k = 0; k < 6; k++) box(c, x + j * 83 + 8 + k * 11, ground - 62, 3, 49, '#172e3655'); }
      }
    } else if (space.includes(b)) {
      c.beginPath(); c.ellipse(x + 130, ground - 14, 130, 95, 0, Math.PI, 0); c.fillStyle = '#30414b'; c.fill(); c.strokeStyle = '#64767b'; c.lineWidth = 3; c.stroke();
      box(c, x + 55, ground - 65, 150, 65, '#22333e'); for (let j = 0; j < 4; j++) box(c, x + 69 + j * 34, ground - 55, 21, 33, level.accent + '51');
      line(c, [[x + 15, ground], [x + 15, ground - 210], [x + 72, ground - 240]], '#556873', 4); oval(c, x + 72, ground - 240, 33, 10, '#64777f');
    } else {
      const bh = b === 'city' ? h + 90 : b === 'airport' ? h * .7 : h;
      box(c, x, ground - bh, 240, bh, '#29363b'); box(c, x - 5, ground - bh - 9, 250, 10, '#3e4b4d');
      for (let row = 0; row < bh / 45 - 1; row++) for (let col = 0; col < 5; col++) {
        const wx = x + 17 + col * 44, wy = ground - bh + 20 + row * 45;
        box(c, wx, wy, 23, 29, rand() > .78 ? level.accent + '71' : '#101d25');
        if (rand() > .65) line(c, [[wx - 2, wy + 6], [wx + 27, wy + 22]], '#4a4944', 4);
      }
      if (b === 'hospital') { box(c, x + 105, ground - bh - 45, 12, 30, '#ad5558'); box(c, x + 96, ground - bh - 36, 30, 12, '#ad5558'); }
      if (b === 'airport') { box(c, x + 80, ground - bh - 95, 25, 95, '#32404c'); shape(c, [[x + 45, ground - bh - 100], [x + 42, ground - bh - 135], [x + 140, ground - bh - 135], [x + 131, ground - bh - 100]], '#53616c'); }
      if (b === 'ruins') shape(c, [[x + 190, ground - bh], [x + 211, ground - bh + 65], [x + 187, ground - bh + 95], [x + 240, ground - bh + 140], [x + 240, ground - bh]], level.horizon);
      if (b === 'city') { box(c, x + 10, ground - 84, 170, 24, '#55343d'); box(c, x + 19, ground - 79, 150, 3, '#a8546555'); }
    }
  }
  // Near-ground detail, wet reflections, broken markings and rubble.
  box(c, 0, ground, width, height - ground, '#111c22'); box(c, 0, ground - 5, width, 7, '#5a6260'); box(c, 0, ground + 3, width, 4, '#060e14');
  for (let i = -1; i < width / 130 + 2; i++) {
    const x = i * 130 - camera % 130;
    box(c, x, ground + 57, 55, 2, '#89928a25'); line(c, [[x + 30, ground + 15], [x + 54, ground + 28], [x + 45, ground + 41]], '#040e1577', 2);
    if (['rain', 'storm', 'acidrain'].includes(level.weather)) { oval(c, x + 78, ground + 23, 47, 3, level.accent + '1d'); box(c, x + 70, ground + 10, 4, 31, level.accent + '0e'); }
  }
  if (icy.includes(b)) { box(c, 0, ground - 5, width, 4, '#94b7c06b'); for (let i = 0; i < 12; i++) oval(c, i * 173 - camera % 173, ground + 12, 70, 6, '#9ebbc12c'); }
  if (NATURE_BIOMES.includes(b)) paintNatureGround(c, b, width, ground, camera, time);
  return ground;
}

export function paintWeather(c, level, width, height, time, reduced = false, density = 1) {
  const weather = level.weather, rng = random(level.seed + 3);
  const rain = ['rain', 'storm', 'acidrain'].includes(weather), snow = ['snow', 'blizzard'].includes(weather);
  if (weather !== 'stars') for (let i = 0; i < (rain ? 125 : snow ? 85 : 40) * density; i++) {
    const k = rng(), speed = rain ? 700 + k * 500 : snow ? 25 + k * 70 : 9 + k * 18;
    const drift = rain ? -90 : weather === 'sand' || weather === 'blizzard' ? -190 : 18;
    const x = ((rng() * width + time * drift * (.5 + k)) % (width + 80) + width + 80) % (width + 80) - 40;
    const y = (rng() * height + time * speed) % (height + 50) - 25;
    const color = rain ? weather === 'acidrain' ? '#b3c98245' : '#b3c7d438' : ['embers', 'ash'].includes(weather) ? weather === 'embers' ? '#df8d6175' : '#b8b2b165' : snow ? '#b8d4e38a' : weather === 'spores' ? '#a4bd7175' : '#c7af8560';
    if (rain) line(c, [[x, y], [x - 3 - k * 3, y + 14 + k * 17]], color, .6 + k * .5);
    else oval(c, x, y, .6 + k * 1.4, .6 + k, color);
  }
  for (let i = 0; i < 3; i++) {
    const y = height * .7 + Math.sin(time * .15 + i) * 15 + i * 33;
    const fog = c.createLinearGradient(0, y - 45, 0, y + 60); fog.addColorStop(0, 'transparent'); fog.addColorStop(.5, level.horizon + (weather === 'fog' ? '55' : '20')); fog.addColorStop(1, 'transparent'); c.fillStyle = fog; c.fillRect(0, y - 45, width, 105);
  }
  if (weather === 'storm' && !reduced) { const flash = Math.sin(time * .71) > .998 && Math.sin(time * 18) > .5; if (flash) box(c, 0, 0, width, height, '#b9c7dc28'); }
  const vignette = c.createRadialGradient(width * .53, height * .54, width * .12, width * .5, height * .5, Math.max(width * .65, height * .75)); vignette.addColorStop(0, 'transparent'); vignette.addColorStop(.65, '#03081028'); vignette.addColorStop(1, '#01050bd9'); c.fillStyle = vignette; c.fillRect(0, 0, width, height);
}

export function paintHazard(c, h, time) {
  const colors = { acid: '#a2bd6b', lava: '#e47c46', fire: '#dd8c58', electric: '#87cee1', ice: '#94c4d3', thorns: '#8c8d71', radiation: '#c1c76a' };
  const color = colors[h.type], active = !h.disabled && (h.type !== 'electric' || Math.sin(time * 2 + h.phase) > -.1);
  if (h.type === 'ice') { shape(c, [[h.x, h.y + 10], [h.x + 15, h.y], [h.x + h.w - 15, h.y + 3], [h.x + h.w, h.y + 10]], '#91bfd55e'); return; }
  oval(c, h.x + h.w / 2, h.y + 10, h.w * .6, 10, color + '33'); box(c, h.x, h.y + 6, h.w, 6, '#10181c');
  if (!active) { box(c, h.x + 5, h.y + 6, h.w - 10, 2, '#45616b'); return; }
  if (h.type === 'electric') { const points = Array.from({ length: 12 }, (_, i) => [h.x + i * h.w / 11, h.y + Math.sin(i * 8 + time * 25) * 15]); line(c, points, color, 2); }
  else if (h.type === 'thorns') for (let i = 0; i < 7; i++) shape(c, [[h.x + i * 13, h.y + 10], [h.x + i * 13 + 9, h.y - 13], [h.x + i * 13 + 11, h.y + 10]], '#78836e');
  else if (['fire', 'lava'].includes(h.type)) for (let i = 0; i < 9; i++) { const fire = 8 + Math.sin(time * 7 + i * 4) * 7; shape(c, [[h.x + i * 10, h.y + 8], [h.x + i * 10 + 7, h.y - fire], [h.x + i * 10 + 15, h.y + 8]], color + 'bb'); }
  else { oval(c, h.x + h.w / 2, h.y + 6, h.w / 2, 5, color + 'aa'); for (let i = 0; i < 4; i++) oval(c, h.x + 13 + i * 21, h.y - 8 - Math.sin(time * 2 + i) * 8, 2, 2, color + '88'); }
}

export function drawLevelPreview(canvas, level, time = 0) {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.setTransform(1, 0, 0, 1, 0, 0); paintEnvironment(c, level, w, h, level.index * 151 + 120, time, { preview: true }); paintWeather(c, level, w, h, time, true, .4);
  if (level.hazard !== 'none') paintHazard(c, { x: w * .6, y: h * .76 - 3, w: w * .16, h: 10, type: level.hazard, phase: 0 }, time);
}

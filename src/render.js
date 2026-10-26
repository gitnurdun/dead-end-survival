import { GROUND, CHARACTERS, DISTRICTS, HOUSE_TYPES, WEAPONS, WORLD_ZOOM, NPC_TYPES } from './data.js';
import { clamp, random } from './world.js';
import { drawInfected, drawTerrainObstacle } from './actors.js';
import { paintEnvironment, paintWeather, paintHazard } from './scenery.js';
import { drawWeapon } from './armory-art.js';
import { NATURE_BIOMES } from './wilderness.js';
import { paintCombatEffect, paintProjectile } from './combat-art.js';
import { drawCorpse, drawHitConfirmation, drawFlashlight } from './feedback-art.js';
import { drawVehicle } from './vehicle-art.js';
import { paintMechanisms, paintMission } from './stage-art.js';
import { paintThreatWarnings, paintHostileProjectile } from './encounter-art.js';

const INK = '#263e3c';
function rect(ctx, x, y, w, h, color, radius = 0, stroke = null, line = 2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function path(ctx, points, fill, stroke = null, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function text(ctx, value, x, y, size = 12, color = '#f0edda', align = 'center', font = 'Arial') { ctx.fillStyle = color; ctx.font = `800 ${size}px ${font}`; ctx.textAlign = align; ctx.fillText(value, x, y); }

export function drawHero(ctx, character, x, y, { scale = 1, facing = 1, time = 0, moving = false, attack = 0, weapon = 'bat', hurt = false, dash = false, death = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (death > 0) { ctx.translate(18, 63); ctx.rotate(Math.min(death / .6, 1) * 1.4 * facing); ctx.translate(-18, -63); }
  if (hurt) ctx.globalAlpha = .48;
  const step = moving ? Math.sin(time * 15) * 9 : Math.sin(time * 2) * .6;
  if (dash) for (let i = 3; i > 0; i--) { ctx.globalAlpha = .12; rect(ctx, -facing * i * 20, 5, 30, 50, character.color, 9); }
  ctx.globalAlpha = hurt ? .48 : 1;
  ellipse(ctx, 18, 66, 24, 5, '#172f342a');
  ctx.translate(18, 0); ctx.scale(facing, 1); ctx.translate(-18, 0);
  path(ctx, [[9, 43], [8 + step, 59], [4 + step, 64], [19 + step, 64], [20, 43]], '#3b4b51', INK, 2.3);
  path(ctx, [[23, 43], [24 - step, 59], [23 - step, 64], [36 - step, 64], [33 - step, 58], [32, 43]], '#47505a', INK, 2.3);
  path(ctx, [[4 + step, 63], [18 + step, 63]], null, '#253638', 4);
  path(ctx, [[24 - step, 63], [36 - step, 63]], null, '#253638', 4);
  rect(ctx, 3, 22, 32, 25, character.color, [9, 8, 3, 4], INK, 2.3);
  rect(ctx, 5, 39, 30, 5, '#455353', 1);
  rect(ctx, 17, 39, 6, 5, character.accent, 1);
  // Backpack and loose sleeve give every survivor a readable silhouette.
  rect(ctx, -3, 23, 9, 20, '#586d57', 4, INK, 2);
  ellipse(ctx, 21, 14, 16, 17, character.skin);
  path(ctx, [[5, 12], [5, 4], [11, -2], [29, -1], [36, 6], [34, 13], [25, 7], [15, 9], [9, 14]], character.hair, INK, 2);
  if (character.id === 'soldier') { rect(ctx, 3, -2, 34, 12, '#617450', [14, 14, 2, 2], INK, 2); rect(ctx, 26, 6, 15, 5, '#495e45', 2); }
  if (character.id === 'mechanic') { rect(ctx, 3, -4, 35, 13, '#e2ad52', [15, 15, 2, 2], INK, 2); rect(ctx, 0, 6, 42, 4, '#d2a04b', 2); }
  if (character.id === 'nurse') { rect(ctx, 8, -4, 26, 10, '#f2eddd', 3, INK, 1.6); rect(ctx, 20, -2, 3, 7, '#bd6b5a'); rect(ctx, 18, 0, 7, 3, '#bd6b5a'); }
  if (character.id === 'scout') { path(ctx, [[3, 7], [8, -4], [25, -6], [35, 3], [35, 10], [27, 2], [14, 3]], character.color, INK, 2); path(ctx, [[5, 24], [-8, 30], [-14, 25]], character.accent, INK, 1.5); }
  ellipse(ctx, 28, 15, 3, 4, '#f5f0db'); ellipse(ctx, 29, 15, 1.4, 2, INK);
  path(ctx, [[26, 23], [32, 22]], null, '#794b40', 1.6);
  if (character.id === 'civilian') { rect(ctx, 16, 10, 10, 9, '#d3dbbc66', 3, INK, 1.8); rect(ctx, 28, 10, 10, 9, '#d3dbbc66', 3, INK, 1.8); path(ctx, [[25, 13], [28, 13]], null, INK, 2); }
  const swing = attack > 0 ? Math.sin(attack / .24 * Math.PI) : 0;
  ctx.save(); ctx.translate(31, 29); ctx.rotate(WEAPONS[weapon]?.family !== 'melee' ? -.08 - (attack ? .15 : 0) : weapon === 'spear' || weapon === 'chainsaw' ? .02 : .2 + swing * 1.2);
  rect(ctx, -5, -1, 12, 18, character.color, 5, INK, 2);
  ellipse(ctx, 1, 15, 7, 6, character.skin);
  if (weapon === 'bat') {
    path(ctx, [[0, 12], [1, -25], [5, -38], [11, -39], [13, -30], [8, 13]], '#c99d68', INK, 2.2);
    path(ctx, [[2, 5], [7, 5], [2, 9], [7, 9]], null, '#ede0ba', 1.5);
    path(ctx, [[6, -29], [8, -15]], null, '#e8bb80', 2);
  } else if (weapon !== 'pistol' && weapon !== 'fists') {
    ctx.save(); ctx.translate(18, 10);
    if (weapon === 'chainsaw' && attack) ctx.translate(Math.sin(time * 85) * .6, Math.cos(time * 97) * .45);
    drawWeapon(ctx, weapon, 0, 0, .43);
    if (weapon === 'chainsaw' && attack) {
      ctx.strokeStyle = '#f0d4a1'; ctx.lineWidth = 1.4; ctx.setLineDash([2.3, 2.8]); ctx.lineDashOffset = -time * 95;
      ctx.beginPath(); ctx.roundRect(-4, -6, 37, 12, 5); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (attack && WEAPONS[weapon]?.family !== 'melee') path(ctx, [[53, 5], [74, 0], [65, 10], [73, 17], [53, 12]], WEAPONS[weapon].color);
  } else if (weapon === 'pistol') {
    rect(ctx, 0, 5, 23, 8, '#52626b', 2, INK, 2); rect(ctx, 0, 11, 8, 11, '#394949', 2, INK, 1.5);
    rect(ctx, 18, 5, 8, 7, '#74817c', 1, INK, 1.3);
    if (attack) path(ctx, [[27, 6], [42, 0], [36, 9], [43, 13], [27, 12]], '#f5dc8b');
  }
  ctx.restore();
  if (attack && ['fists','bat'].includes(weapon)) { ctx.globalAlpha = .6; ctx.strokeStyle = '#f4ebbc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(23, 28, weapon === 'bat' ? 66 : 40, -1.1, .6); ctx.stroke(); }
  ctx.restore();
}

export function drawZombie(ctx, enemy, time) { drawInfected(ctx, enemy, time); }

export function drawNpc(ctx, npc, time, nearby = false) {
  const info = NPC_TYPES[npc.type], x = npc.x;
  // Occupied protected lookout behind the walking lane; the open trail remains clear.
  rect(ctx, x - 28, GROUND - 112, 100, 112, '#213438', 4, '#62766b', 2);
  path(ctx, [[x - 40, GROUND - 112], [x + 18, GROUND - 143], [x + 84, GROUND - 112]], '#394b48', '#789386', 2);
  drawHero(ctx, CHARACTERS.find(c => c.id === info.character), x, GROUND - 65, { time, weapon: npc.type === 'ranger' ? 'rifle' : 'fists' });
  for (let i = 0; i < 4; i++) rect(ctx, x - 25 + i * 25, GROUND - 28, 29, 17, '#76775c', 5, '#263b36', 1.5);
  ellipse(ctx, x + 57, GROUND - 94, 4, 4, npc.used ? '#7897a9' : '#dacd95');
  text(ctx, info.name.toUpperCase(), x + 20, GROUND - 152, 10, '#c4d3be');
  if (nearby) { rect(ctx, x - 53, GROUND - 195, 149, 28, '#0c171fe8', 4, '#a9bb94', 1); text(ctx, `E · ${npc.used ? 'TALK' : info.role.toUpperCase()}`, x + 20, GROUND - 177, 10, '#e0dfbd'); }
}

export function drawDog(ctx, x, y, time, facing = 1, caged = false, health = 45) {
  ctx.save(); ctx.translate(x + 21, y); ctx.scale(facing, 1); ctx.translate(-21, 0);
  ellipse(ctx, 23, 29, 28, 5, '#1c32352b');
  const s = Math.sin(time * 14) * 3;
  path(ctx, [[7, 16], [6 + s, 29], [11 + s, 29], [14, 18]], '#9d744d', INK, 1.6);
  path(ctx, [[29, 16], [30 - s, 28], [36 - s, 28], [35, 17]], '#9d744d', INK, 1.6);
  rect(ctx, 4, 5, 33, 17, '#d3ab74', 8, INK, 1.8);
  path(ctx, [[8, 9], [-2, 2], [-5, -7]], null, '#c49b68', 6);
  ellipse(ctx, 35, 5, 11, 11, '#c99b65');
  path(ctx, [[27, 0], [25, -10], [34, -6]], '#6f533f', INK, 1.5);
  rect(ctx, 37, 6, 13, 8, '#d8bb89', 4, INK, 1.5); ellipse(ctx, 47, 7, 3, 3, INK); ellipse(ctx, 38, 1, 2, 2.6, INK);
  rect(ctx, 27, 13, 11, 3, '#df7e57', 1); ellipse(ctx, 33, 19, 2.6, 3, '#edcf79');
  ctx.restore();
  if (health < 45 && !caged) { rect(ctx, x + 3, y - 20, 38, 3, '#28413b80', 2); rect(ctx, x + 3, y - 20, 38 * Math.max(0, health) / 45, 3, '#e8ce82', 2); }
  if (caged) {
    rect(ctx, x - 12, y - 34, 78, 68, '#183b3922', 3, '#a0a58c', 3);
    for (let i = 0; i < 6; i++) path(ctx, [[x - 5 + i * 12, y - 32], [x - 5 + i * 12, y + 32]], null, '#afb59b', 3);
    path(ctx, [[x - 12, y - 34], [x + 27, y - 54], [x + 66, y - 34]], null, '#afb59b', 3);
    text(ctx, '♡', x + 28, y - 72 + Math.sin(time * 3) * 4, 24, '#f0d2a2');
  }
}

export function drawHouse(ctx, house, occupied, time, biome = '') {
  const def = HOUSE_TYPES[house.type], damage = 1 - house.health / house.maxHealth;
  if (house.collapsed) { for (let i = 0; i < 8; i++) rect(ctx, house.x + i * 25, GROUND - 7 - Math.sin(i * 3) * 3, 28, 8, i % 2 ? '#84786b' : '#b8a58a', 2); return; }
  ctx.save(); ctx.translate(house.x + house.w / 2, GROUND); if (damage > .7) ctx.rotate(.035 * Math.sin(time * 4)); ctx.translate(-house.w / 2, -house.h);
  ellipse(ctx, 100, 192, 124, 10, '#203c342d');
  rect(ctx, 0, 34, 205, 157, def.color, 3, INK, 3);
  for (let i = 0; i < 7; i++) path(ctx, [[3, 54 + i * 20], [202, 54 + i * 20]], null, '#ffffff19', 2);
  path(ctx, [[-17, 38], [99, -20], [222, 38]], def.roof, INK, 3.5);
  if (biome === 'alpine') { path(ctx, [[-17, 38], [99, -20], [222, 38], [190, 39], [100, -6], [10, 42]], '#c9d9d8'); for (const x of [23, 55, 163, 195]) path(ctx, [[x, 39], [x + 4, 60], [x + 8, 39]], '#9bb8c2'); }
  if (['boreal', 'wetlands'].includes(biome)) { for (let i = 0; i < 5; i++) path(ctx, [[24 + i * 36, 41], [29 + i * 36, 67 + i % 2 * 11]], null, '#60784b', 4); }
  path(ctx, [[-17, 38], [222, 38]], null, '#e3c6a0', 7);
  rect(ctx, 153, -9, 22, 28, '#83736b', 1, INK, 2);
  const light = house.remaining > 0 ? '#8abd8b' : '#6a99bc';
  const glow = ctx.createRadialGradient(104, 96, 5, 104, 96, occupied ? 180 : 110);
  glow.addColorStop(0, house.remaining > 0 ? `rgba(210,244,145,${occupied ? .5 : .17})` : `rgba(134,196,233,${occupied ? .5 : .16})`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(-100, -100, 400, 400);
  const flicker = damage > .65 && Math.sin(time * 15) > .5;
  for (const x of [22, 141]) {
    rect(ctx, x, 66, 43, 48, '#52665c', 3, INK, 3); rect(ctx, x + 5, 71, 33, 38, flicker ? '#5b7468' : light, 1);
    path(ctx, [[x + 22, 70], [x + 22, 110]], null, '#627567', 3); path(ctx, [[x + 4, 90], [x + 39, 90]], null, '#627567', 3);
    rect(ctx, x - 5, 112, 53, 7, '#ded1ae', 2, INK, 1.5);
    if (occupied && !flicker) { ctx.globalAlpha = .4; rect(ctx, x + 5, 71, 33, 38, '#fff9b7', 1); ctx.globalAlpha = 1; }
  }
  rect(ctx, 79, 103, 48, 88, '#405c53', [23, 23, 0, 0], INK, 3); rect(ctx, 86, 112, 34, 31, '#496e5f', [16, 16, 0, 0]);
  ellipse(ctx, 116, 155, 3, 3, '#d7c68e'); rect(ctx, 71, 185, 63, 7, '#bcb69a', 2, INK, 1.5);
  path(ctx, [[1, 51], [18, 65], [10, 83]], null, '#20282b', 2);
  path(ctx, [[141, 69], [183, 110]], null, '#655e48', 5);
  path(ctx, [[26, 79], [61, 98]], null, '#6b644c', 4);
  if (house.type === 'greenhouse') { for (const x of [16, 166]) { rect(ctx, x, 161, 23, 25, '#b98566', 3); ellipse(ctx, x + 12, 155, 18, 16, '#718666'); ellipse(ctx, x + 5, 147, 10, 10, '#8c9c6e'); } }
  if (house.type === 'duplex') { rect(ctx, 71, 47, 27, 20, '#a0a58e', 2); rect(ctx, 108, 47, 27, 20, '#a0a58e', 2); ellipse(ctx, 82, 56, 3, 3, light); ellipse(ctx, 120, 56, 3, 3, light); }
  if (house.type === 'clinic') { rect(ctx, 92, 54, 21, 6, '#ebe7cd', 1); rect(ctx, 100, 47, 6, 21, '#ebe7cd', 1); }
  if (house.type === 'pantry') { rect(ctx, 11, 164, 32, 24, '#ae9369', 2, INK, 1.5); path(ctx, [[13, 166], [41, 185], [14, 185], [40, 166]], null, '#796b51', 2); }
  if (damage > .2) path(ctx, [[9, 78], [22, 96], [15, 110], [31, 127], [24, 145]], null, '#625d53', 2.5);
  if (damage > .45) { path(ctx, [[181, 136], [168, 149], [176, 163], [160, 183]], null, '#625d53', 3); path(ctx, [[0, 160], [18, 169], [13, 191], [0, 191]], '#69675b'); }
  if (damage > .55) for (let i = 0; i < 4; i++) { const drift = (time * 16 + i * 18) % 95; ellipse(ctx, 172 + Math.sin(time + i) * 9, -15 - drift, 10 + drift * .1, 12 + drift * .1, `rgba(72,79,72,${.22 * (1 - drift / 100)})`); }
  ctx.restore();
}

function drawCar(ctx, p) {
  if (p.variant && !['car', 'snowcar', 'ambulance'].includes(p.variant)) { drawTerrainObstacle(ctx, p); return; }
  ctx.save(); ctx.translate(p.x, p.y);
  ellipse(ctx, 76, 71, 87, 8, '#162d3529');
  path(ctx, [[7, 33], [33, 24], [47, 3], [100, 2], [125, 25], [145, 33], [151, 56], [4, 56]], p.color, INK, 3);
  path(ctx, [[45, 25], [53, 8], [73, 8], [73, 25]], '#14242f', INK, 2); path(ctx, [[80, 8], [98, 8], [117, 25], [80, 25]], '#263541', INK, 2);
  rect(ctx, 4, 37, 145, 16, p.color, 5); rect(ctx, 0, 51, 154, 7, '#a5a99b', 2, INK, 2);
  for (const x of [30, 122]) { ellipse(ctx, x, 58, 14, 14, '#2d4246'); ellipse(ctx, x, 58, 7, 7, '#8b9b94'); ellipse(ctx, x, 58, 3, 3, '#4a5b57'); }
  rect(ctx, 135, 36, 13, 8, '#edda8e', 2); rect(ctx, 6, 36, 8, 8, '#b96555', 2); path(ctx, [[83, 35], [96, 35]], null, '#68817a', 3);
  path(ctx, [[25, 43], [35, 39], [47, 44]], null, '#ffffff38', 2);
  path(ctx, [[84, 10], [91, 17], [87, 22], [104, 24]], null, '#9ba5a04d', 1.2);
  path(ctx, [[48, 49], [68, 45], [73, 51]], null, '#865e484d', 3);
  if (p.variant === 'snowcar') path(ctx, [[33, 24], [47, 3], [100, 2], [125, 25]], null, '#a5bdc2', 5);
  if (p.variant === 'ambulance') { rect(ctx, 57, 32, 5, 16, '#a45d5a'); rect(ctx, 52, 37, 15, 5, '#a45d5a'); }
  ctx.restore();
}

export function drawPickup(ctx, p, time) {
  const y = p.y + Math.sin(time * 3 + p.x) * 4;
  const colors = { coins: '#e7c576', ammo: '#d6d59d', health: '#d6e5b5', pistol: '#f0cf7f' };
  const glow = ctx.createRadialGradient(p.x + 12, y + 12, 0, p.x + 12, y + 12, p.kind === 'pistol' ? 55 : 30);
  glow.addColorStop(0, '#ede5a128'); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(p.x - 45, y - 45, 110, 110);
  if (p.kind === 'coins') { ellipse(ctx, p.x + 12, y + 12, 10, 12, colors.coins); ellipse(ctx, p.x + 12, y + 12, 6, 8, '#c69b51'); text(ctx, '✦', p.x + 12, y + 16, 11, '#f4d996'); }
  else if (p.kind === 'health') { rect(ctx, p.x, y, 25, 23, '#dfe5cb', 4, INK, 2); rect(ctx, p.x + 10, y + 4, 5, 15, '#b76b59', 1); rect(ctx, p.x + 5, y + 9, 15, 5, '#b76b59', 1); rect(ctx, p.x + 8, y - 4, 10, 5, '#829379', 2); }
  else if (p.kind === 'ammo') { rect(ctx, p.x, y, 27, 21, '#9b9b69', 3, INK, 2); rect(ctx, p.x, y + 7, 27, 5, '#c9bd85'); for (let i = 0; i < 3; i++) rect(ctx, p.x + 7 + i * 5, y + 3, 3, 13, '#e0cf8d', 1); }
  else { rect(ctx, p.x - 11, y - 4, 50, 34, '#ede0b4', 5, INK, 2); rect(ctx, p.x, y + 3, 28, 9, '#53696b', 2, INK, 2); rect(ctx, p.x + 2, y + 10, 9, 13, '#4b5e5c', 2); text(ctx, '↓', p.x + 13, y - 14, 26, '#efdb93'); }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.camera = 0; this.clock = 0; this.width = 1440; this.height = 820; this.scale = 1;
    this.keyArt = new Image(); this.keyArt.src = '/assets/dead-end-keyart.png';
    this.resize();
  }
  resize() {
    const width = window.innerWidth, height = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    this.cssWidth = width; this.cssHeight = height;
    this.baseScale = Math.max(.5, Math.min(width / 1440, height / 820)); this.scale = this.baseScale; this.dpr = dpr;
    this.width = width / this.scale; this.height = height / this.scale;
  }
  backdrop(game, menu) {
    return paintEnvironment(this.ctx, game.stage.level, this.width, this.height, this.camera, this.clock);
  }
  buildings() {}
  road() {}
  drawMenu(game) {
    const ctx = this.ctx, w = this.width, h = this.height, level = game.previewLevel || game.stage.level;
    this.camera = 0;
    const gy = paintEnvironment(ctx, level, w, h, 420, this.clock);
    if (this.keyArt?.complete && this.keyArt.naturalWidth && !game.previewLevel) {
      const size = Math.max(w / this.keyArt.naturalWidth, h / this.keyArt.naturalHeight);
      ctx.drawImage(this.keyArt, (w - this.keyArt.naturalWidth * size) / 2, (h - this.keyArt.naturalHeight * size) / 2, this.keyArt.naturalWidth * size, this.keyArt.naturalHeight * size);
    }
    ctx.save(); ctx.translate(0, gy - GROUND);
    if (game.previewLevel) {
      for (let i = 0; i < 3; i++) drawZombie(ctx, { x: w * .56 + i * 190, y: GROUND - (i === 1 ? 90 : 67), w: i === 1 ? 57 : 38, h: i === 1 ? 90 : 67, type: i === 1 ? 'brute' : 'walker', facing: -1, phase: 'walk', vx: 28, travel: this.clock * 24 + i * 17, health: 60, maxHealth: 60 }, this.clock);
    }
    ctx.restore(); paintWeather(ctx, level, w, h, this.clock, true);
    const wash = ctx.createRadialGradient(w / 2, h * .43, w * .09, w / 2, h * .5, w * .63); wash.addColorStop(0, '#04091165'); wash.addColorStop(.6, '#050c1385'); wash.addColorStop(1, '#050b15d9'); ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
  }
  draw(game, dt = .016, settings = {}) {
    this.clock += dt;
    const ctx = this.ctx;
    const menu = game.mode === 'menu';
    this.scale = this.baseScale * (menu ? 1 : WORLD_ZOOM);
    this.width = this.cssWidth / this.scale; this.height = this.cssHeight / this.scale;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
    if (menu) { this.drawMenu(game); return; }
    const desired = clamp(game.player.x - this.width * .34, 0, game.stage.endX - this.width + 200);
    this.camera += (desired - this.camera) * (1 - Math.exp(-7 * dt));
    if (Math.abs(desired - this.camera) > this.width * 2) this.camera = desired;
    const gy = this.backdrop(game, false); this.buildings(game, false, gy); this.road(gy, this.camera);
    ctx.save();
    const intensity = settings.fxIntensity ?? 1.4;
    if (!settings.reducedShake && game.shake > .1) ctx.translate(Math.sin(this.clock * 90) * game.shake * .55 * (settings.shakeIntensity ?? 1), Math.cos(this.clock * 101) * game.shake * .4 * (settings.shakeIntensity ?? 1));
    ctx.translate(-this.camera, gy - GROUND);
    if (settings.flashlight!==false && game.player.house===null && !game.isPreview) drawFlashlight(ctx,game.player,this.clock);
    const visible = (x, w = 200) => x + w >= this.camera - 100 && x < this.camera + this.width + 100;
    const natural = NATURE_BIOMES.includes(game.stage.level.biome);
    for (const h of game.stage.houses) if (visible(h.x, h.w)) drawHouse(ctx, h, game.player.house === h.id, this.clock, game.stage.level.biome);
    for (const npc of game.stage.npcs || []) if (visible(npc.x, 100)) drawNpc(ctx, npc, this.clock, game.mode === 'playing' && !game.player.riding && Math.abs(npc.x - game.player.x) < 100 && game.player.grounded);
    for (const h of game.stage.hazards) if (visible(h.x, h.w)) paintHazard(ctx, h, game.time);
    for (const h of game.pools || []) if (visible(h.x, h.w)) paintHazard(ctx, h, game.time);
    paintThreatWarnings(ctx,game,this.clock);
    paintMechanisms(ctx,game,this.clock);paintMission(ctx,game,this.clock,drawHero);
    for (const prop of game.stage.props) if (visible(prop.x, 80)) {
      if (natural) { ellipse(ctx, prop.x + 15, GROUND - 3, 22, 6, '#25362c'); path(ctx, [[prop.x, GROUND], [prop.x + 8, GROUND - 20], [prop.x + 16, GROUND - 4], [prop.x + 32, GROUND - 28]], null, '#657851', 3); continue; }
      if (prop.type === 'bin') { rect(ctx, prop.x, GROUND - 42, 30, 42, '#758777', 4, INK, 2); rect(ctx, prop.x - 3, GROUND - 45, 36, 6, '#8d9a84', 2, INK, 1.5); path(ctx, [[prop.x + 9, GROUND - 32], [prop.x + 9, GROUND - 8], [prop.x + 20, GROUND - 8], [prop.x + 20, GROUND - 32]], null, '#a8b29866', 2); }
      else { path(ctx, [[prop.x, GROUND], [prop.x + 17, GROUND - 48], [prop.x + 34, GROUND]], '#c29b67', INK, 2); rect(ctx, prop.x + 5, GROUND - 30, 27, 10, '#d8b276', 2); }
    }
    for (const p of game.stage.platforms) if (visible(p.x, p.w)) {
      if(p.type==='vehicle'||p.type==='mechanism')continue;
      if (p.type === 'car') drawCar(ctx, p);
      else { rect(ctx, p.x, p.y, p.w, p.h, p.type === 'roof' ? '#69857a' : '#aa9978', 3, INK, 2); if (p.type === 'roof') { path(ctx, [[p.x + 12, p.y + 15], [p.x + 12, GROUND], [p.x + p.w - 12, GROUND], [p.x + p.w - 12, p.y + 15]], null, '#728677', 6); rect(ctx, p.x - 5, p.y - 5, p.w + 10, 6, '#9fa88a', 2); } else { path(ctx, [[p.x + 6, p.y + 15], [p.x + 6, p.y + 48]], null, '#7d8772', 5); } }
    }
    for(const v of game.stage.vehicles||[])if(visible(v.x,v.w))drawVehicle(ctx,v,this.clock,{occupied:game.player.riding===v.id,driverColor:game.character.color,nearby:!v.destroyed&&v.fuel>0&&game.mode==='playing'&&!game.player.riding&&!game.safe&&Math.abs(v.x+v.w/2-game.player.x-game.player.w/2)<125});
    if (!game.dog.rescued && visible(game.stage.dogRescueX, 100)) drawDog(ctx, game.stage.dogRescueX, GROUND - 28, this.clock * .3, -1, true);
    for (const p of game.stage.pickups) if (!p.collected && visible(p.x, 30)) drawPickup(ctx, p, this.clock);
    if (game.barricade && visible(game.barricade.x)) {
      const b = game.barricade; rect(ctx, b.x, b.y, b.w, b.h, '#9a7c58', 3, INK, 3);
      for (let i = 0; i < 4; i++) rect(ctx, b.x - 5, b.y + 10 + i * 19, b.w + 10, 12, i % 2 ? '#c2a373' : '#b39364', 2, INK, 1.4);
    }
    for (const corpse of game.corpses||[]) if(visible(corpse.x,corpse.w))drawCorpse(ctx,corpse,this.clock);
    for (const e of game.enemies) if (visible(e.x, e.w)) drawZombie(ctx, e, this.clock);
    if (game.dog.rescued && !game.dog.lost && game.player.house === null && !game.player.riding) drawDog(ctx, game.dog.x, game.dog.y, this.clock, game.dog.facing, false, game.dog.health);
    const p = game.player;
    if (p.house === null && !p.riding && !game.isPreview) drawHero(ctx, game.character, p.x, p.y, { facing: p.facing, time: this.clock, moving: game.mode !== 'dead' && Math.abs(p.vx) > 0, attack: p.weapon === 'chainsaw' ? (p.sawRunning && game.mode === 'playing' ? .14 : 0) : p.attackPose, weapon: p.weapon, hurt: p.invincible > 0 && game.mode === 'playing' && Math.sin(this.clock * 24) > .5, dash: p.dash > 0, death: game.mode === 'dead' ? game.deathTime : 0 });
    if (p.reload > 0 && p.house === null) { rect(ctx, p.x - 2, p.y - 17, 43, 5, '#263e3c99', 3); rect(ctx, p.x - 2, p.y - 17, 43 * (1 - p.reload / (WEAPONS[p.weapon].reload * (1 - p.upgrades.reload * .15))), 5, '#ead69a', 3); }
    for (const s of game.projectiles) if (visible(s.x, 10)) {
      if (s.friendly) paintProjectile(ctx, s); else paintHostileProjectile(ctx,s,this.clock);
    }
    for (const part of game.particles) if (visible(part.x, 10)) { ctx.globalAlpha = Math.min(1, part.life * 2 * intensity); ctx.shadowColor = part.color; ctx.shadowBlur = intensity * 3; rect(ctx, part.x, part.y, part.size * intensity, part.size * .75 * intensity, part.color, 2); } ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    for (const f of game.floats) if (visible(f.x, 100) && (!f.damage || settings.damageNumbers!==false)) { ctx.globalAlpha = Math.min(1, f.life * 2); text(ctx, f.text, f.x, f.y, f.damage?14:12, f.color); } ctx.globalAlpha = 1;
    if(settings.hitMarkers!==false)drawHitConfirmation(ctx,game);
    for (const effect of game.effects) {
      if (paintCombatEffect(ctx, effect, this.clock, intensity)) continue;
      if (effect.type === 'muzzle') { const glow = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, 50 * intensity); glow.addColorStop(0, '#ffe9b38c'); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(effect.x - 100, effect.y - 100, 200, 200); continue; }
      const t = 1 - effect.life / effect.duration, color = effect.type === 'death' ? '#bc8d82' : effect.type === 'victory' ? '#ecd6a1' : '#b3d6c4';
      ctx.save(); ctx.translate(effect.x, effect.y); ctx.scale(intensity, intensity); ctx.translate(-effect.x, -effect.y); ctx.globalAlpha = Math.min(1, (1 - t) * .8 * intensity); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, 4 * (1 - t));
      ctx.beginPath(); ctx.ellipse(effect.x, effect.y, 18 + t * (effect.type === 'victory' ? 160 : 70), 20 + t * 75, 0, 0, Math.PI * 2); ctx.stroke();
      if (effect.type === 'enter' || effect.type === 'exit') {
        const glow = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, 90);
        glow.addColorStop(0, '#c8e4d177'); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(effect.x - 90, effect.y - 90, 180, 180);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ellipse(ctx, effect.x + Math.cos(a) * (45 - t * 35), effect.y + Math.sin(a) * (45 - t * 35), 2, 3, color); }
      }
      if (effect.type === 'victory') for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; path(ctx, [[effect.x + Math.cos(a) * 35, effect.y + Math.sin(a) * 35], [effect.x + Math.cos(a) * (65 + t * 130), effect.y + Math.sin(a) * (65 + t * 130)]], null, color, 2); }
      ctx.restore();
    }
    this.gateAndShop(game, visible);
    if (game.player.house === null && !game.player.riding && !game.safe) {
      const nearby = game.stage.houses.find(h => !h.collapsed && Math.abs(h.x + h.w / 2 - (p.x + p.w / 2)) < 90);
      // A key icon, rather than a house label or supply subtitle.
      if (nearby && Math.abs(nearby.x + nearby.w / 2 - (p.x + p.w / 2)) < 54) { rect(ctx, nearby.x + nearby.w / 2 - 11, GROUND - 226, 22, 24, '#f3efd3', 4, INK, 1.5); text(ctx, '↑', nearby.x + nearby.w / 2, GROUND - 209, 17, INK); }
    }
    if (game.player.x < 650 && !game.training) { text(ctx, 'THE ONLY WAY IS THROUGH.', 510, GROUND - 130, 11, '#405c4d'); text(ctx, '→', 510, GROUND - 90, 40, '#4e6b56'); }
    ctx.restore();
    paintWeather(ctx, game.stage.level, this.width, this.height, this.clock, settings.reducedShake, settings.weatherDensity ?? 1);
    if(game.hurtFlash>0 && !settings.reducedShake){const hurt=ctx.createRadialGradient(this.width/2,this.height/2,this.width*.25,this.width/2,this.height/2,this.width*.7);hurt.addColorStop(0,'transparent');hurt.addColorStop(1,`rgba(151,56,53,${game.hurtFlash*.55})`);ctx.fillStyle=hurt;ctx.fillRect(0,0,this.width,this.height);}
    if (game.mode === 'dead') {
      const fade = Math.min(1, game.deathTime / .8);
      const deathShade = ctx.createRadialGradient(this.width * .45, this.height * .63, 30, this.width / 2, this.height / 2, this.width * .7);
      deathShade.addColorStop(0, `rgba(20,8,12,${fade * .15})`); deathShade.addColorStop(1, `rgba(64,13,21,${fade * .8})`);
      ctx.fillStyle = deathShade; ctx.fillRect(0, 0, this.width, this.height);
    }
    if (game.safetyFlash > 0 && !settings.reducedShake) { const g = ctx.createRadialGradient(this.width / 2, this.height / 2, this.width * .2, this.width / 2, this.height / 2, this.width * .7); g.addColorStop(0, 'transparent'); g.addColorStop(1, `rgba(255,250,222,${Math.min(1, game.safetyFlash * .8 * intensity)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, this.width, this.height); }
    // Subtle upper shade keeps the navigation and HUD legible in every district.
    const top = ctx.createLinearGradient(0, 0, 0, 180); top.addColorStop(0, '#1833347d'); top.addColorStop(1, 'transparent'); ctx.fillStyle = top; ctx.fillRect(0, 0, this.width, 180);
  }
  gateAndShop(game, visible) {
    const ctx = this.ctx, x = game.stage.finishX;
    if (visible(x - 120, 330)) {
      for (const px of [x - 30, x + 120]) { rect(ctx, px, GROUND - 250, 12, 250, '#4d6b63', 2, INK, 2); rect(ctx, px - 4, GROUND - 256, 20, 10, '#a0ad8a', 3); }
      if (game.safe) { rect(ctx, x - 23, GROUND - 230, 147, 230, '#516f6855', 1, '#728f7a', 3); for (let i = 0; i < 8; i++) path(ctx, [[x - 23 + i * 20, GROUND - 230], [x - 23 + i * 20, GROUND]], null, '#a3b09a', 2); for (let i = 0; i < 6; i++) path(ctx, [[x - 23, GROUND - 230 + i * 40], [x + 124, GROUND - 230 + i * 40]], null, '#a3b09a', 1.5); }
      rect(ctx, x - 47, GROUND - 285, 202, 41, '#dfe4be', 5, INK, 3); text(ctx, game.safe ? 'SAFE ZONE  ✓' : 'SAFE ZONE  →', x + 54, GROUND - 260, 18, '#365747', 'center', 'Impact');
      rect(ctx, x - 55, GROUND - 62, 37, 45, '#d1aa61', 2, INK, 2); path(ctx, [[x - 54, GROUND - 55], [x - 20, GROUND - 35], [x - 54, GROUND - 18]], null, '#586958', 5);
    }
    const sx = game.stage.shopX;
    if (visible(sx - 250, 120)) drawNpc(ctx, { x: sx - 220, type: 'trader', used: false }, this.clock, false);
    if (visible(sx - 200, 400)) {
      rect(ctx, sx - 140, GROUND - 220, 280, 220, '#a2ab8a', 3, INK, 3); rect(ctx, sx - 155, GROUND - 229, 310, 22, '#59786b', 4, INK, 3);
      rect(ctx, sx - 100, GROUND - 196, 200, 38, '#dfe5b2', 3, INK, 2); text(ctx, 'THE LAST SHELF', sx, GROUND - 170, 24, '#3a5b49', 'center', 'Impact');
      rect(ctx, sx - 117, GROUND - 148, 234, 140, '#456a5a', 3);
      for (let i = 0; i < 3; i++) {
        rect(ctx, sx - 105, GROUND - 110 + i * 38, 210, 7, '#c1aa7b', 2);
        for (let j = 0; j < 2; j++) drawWeapon(ctx, ['pistol','shotgun','smg','rifle','bat','ammo'][i*2+j], sx - 53 + j * 105, GROUND - 126 + i * 38, .49);
      }
      rect(ctx, sx - 130, GROUND - 37, 260, 37, '#9b8c68', 3, INK, 2); text(ctx, 'SUPPLIES & SECOND CHANCES', sx, GROUND - 12, 10, '#e8e4bd');
    }
  }
}

export function drawPortrait(canvas, character, selected = false) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); const s = canvas.height / 72; ctx.translate(canvas.width / 2 - 19 * s, 8 * s); ctx.scale(s, s); drawHero(ctx, character, 0, 0, { weapon: 'fists' }); ctx.restore();
}

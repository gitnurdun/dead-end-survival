import { GROUND, STAGE_LENGTH, FINISH_X, SHOP_X, SECTION_TYPES, HOUSE_TYPES, PROFILES, WEAPONS } from './data.js';
import { getLevel } from './levels.js';
import { makeVehicle, vehicleSkin } from './vehicle-data.js';
import { makeMission } from './mission-data.js';
import { makeMechanisms } from './mechanisms.js';

export function random(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// Move supplies out of solid terrain onto its reachable top. The same resolver
// handles authored stashes, random layouts and newly dropped bonus coins.
export function placePickup(item, platforms) {
  for (let pass = 0; pass <= platforms.length; pass++) {
    const block = platforms.find(b => b.solid && overlap({ ...item, y: item.y - 4, h: item.h + 8 }, b));
    if (!block) break;
    item.y = block.y - item.h - 9;
  }
  return item;
}
export function segmentRectTime(x1, y1, x2, y2, box) {
  let low = 0, high = 1;
  const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - box.x], [dx, box.x + box.w - x1], [-dy, y1 - box.y], [dy, box.y + box.h - y1]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) low = Math.max(low, r); else high = Math.min(high, r);
    if (low > high) return null;
  }
  return low;
}
export function segmentHitsRect(x1, y1, x2, y2, box) { return segmentRectTime(x1, y1, x2, y2, box) !== null; }
export function makeStage(seed, stageNumber = 1, levelId = 'outbreak') {
  const rng = random(seed);
  const level = getLevel(levelId), profile = level.profile;
  const sections = [{ x: 0, length: 2400, district: 0, type: 'opening' }], platforms = [], props = [], pickups = [];
  let id = 0;
  const add = (kind, x, y = GROUND - 25, extra = {}) => pickups.push({ id: ++id, kind, x, y, w: 24, h: 24, collected: false, ...extra });
  for (let i = 0; i < 6; i++) {
    const type = SECTION_TYPES[Math.floor(rng() * SECTION_TYPES.length)];
    const sectionX = 2400 + i * 3500;
    sections.push({ x: sectionX, length: 3500, district: Math.floor(sectionX / (STAGE_LENGTH / 3)), type });
    const layouts = { parked: { offset: 0, roof: 1, count: 3 }, balconies: { offset: 130, roof: 0, count: 3 }, roadworks: { offset: -70, roof: 1, count: 2 }, market: { offset: 210, roof: 0, count: 3 }, garden: { offset: 320, roof: 1, count: 2 }, overpass: { offset: 70, roof: 0, count: 3 } };
    const layout = layouts[type];
    for (let j = 0; j < layout.count; j++) {
      const x = sectionX + 350 + layout.offset + j * 1050 + Math.floor(rng() * 100);
      const carColor = ['#cc815e', '#91aaa4', '#d1ae6b', '#717c8b'][Math.floor(rng() * 4)];
      platforms.push({ x, y: GROUND - 69, w: 150, h: 69, type: 'car', solid: true, color: carColor, group: x });
      if (j % 2 === layout.roof) {
        platforms.push({ x: x + 175, y: GROUND - 130, w: 100, h: 13, type: 'awning', solid: false, group: x });
        platforms.push({ x: x + 295, y: GROUND - 200, w: 240, h: 15, type: 'roof', solid: false, group: x });
        add('coins', x + 390, GROUND - 228, { amount: 22, group: x });
        add(j % 3 ? 'ammo' : 'health', x + 480, GROUND - 228, { amount: j % 3 ? 18 : 20, group: x });
      }
      props.push({ x: x + 580, type: type === 'roadworks' || j % 3 === 0 ? 'barricade' : 'bin', variant: rng() });
      if (j % 2 === 0) add('coins', x + 430, GROUND - 24, { amount: 8 });
    }
    add('ammo', sectionX + 1625, GROUND - 25, { amount: Math.round((i >= 4 ? 36 : 18) * PROFILES[profile].ammo) });
    add('health', sectionX + 3230, GROUND - 25, { amount: 15 });
  }
  sections.push({ x: 23400, length: 600, district: 2, type: 'ending' });
  platforms.unshift({ x: 850, y: GROUND - 69, w: 150, h: 69, type: 'car', solid: true, color: '#cc815e', group: 850 });
  add('coins', 1300, GROUND - 24, { amount: 8 });
  // Weapons are purchased once at the shelf; routes contain supplies, not respawning guns.
  const houses = [3400, 8700, 14400, 20700].map((x, i) => {
    const type = ['pantry', 'greenhouse', 'duplex', 'clinic'][i];
    return { id: i, x, y: GROUND - 190, w: 205, h: 190, type, health: 24, maxHealth: 24, remaining: HOUSE_TYPES[type].bundles, entered: 0, insideTime: 0, lastSupplyVisit: 0, collapsed: false };
  });
  // No solid props can cover a doorway or the dog rescue area.
  const dogRescueX = 9800;
  const npcs = ['scout', 'medic', 'supplier', 'ranger'].map((type, i) => ({ id: type, type, x: [620, 5900, 12500, 19200][i], y: GROUND - 65, w: 37, h: 65, used: false, greeted: false }));
  const mission=makeMission(level.objectiveType),mechanisms=makeMechanisms(random(seed^0x6b7421));
  const objectiveZones=mission.generators.map(g=>[g.x-140,g.x+g.w+140]);
  if(mission.escort)objectiveZones.push([mission.escort.x-140,mission.escort.x+180],[mission.extractionX-180,mission.extractionX+180]);
  if(mission.beacon)objectiveZones.push([mission.beacon.x-350,mission.beacon.x+350]);
  const mechanismZones=mechanisms.map(m=>[m.x-90,m.x+m.w+150]);mechanismZones.push([7860,8180],[13730,14030]);
  const protectedZones=[...houses.map(h=>[h.x-100,h.x+h.w+100]),...npcs.map(n=>[n.x-90,n.x+150]),[dogRescueX-200,dogRescueX+300],...objectiveZones,...mechanismZones];
  const vehicleRng=random(seed^0x4c91a7),vehicles=[];
  if(vehicleRng()<.3){let x=1800;for(let tries=0;tries<40;tries++){const candidate=1800+Math.floor(vehicleRng()*16200);if(!protectedZones.some(([a,b])=>candidate+340>a&&candidate-160<b)){x=candidate;break;}}vehicles.push(makeVehicle(vehicleRng()<.7?'buggy':'tank',x,'stage-salvage',GROUND,vehicleSkin(level)));}
  const clearZones = [...protectedZones,...vehicles.map(v=>[v.x-140,v.x+v.w+200]),[1650,2000]];
  const blockedGroups = new Set(platforms.filter(p => clearZones.some(([a, b]) => p.x + p.w > a && p.x < b)).map(p => p.group));
  const filteredPlatforms = platforms.filter(p => !blockedGroups.has(p.group));
  for (const p of filteredPlatforms) { p.variant = level.obstacle; if (p.type === 'car') p.color = p.group === 850 ? '#45484b' : ['#39454a', '#544343', '#474b42', '#3d474f'][Math.floor(rng() * 4)]; }
  for(const v of vehicles)filteredPlatforms.push({x:v.x,y:v.y,w:v.w,h:v.h,type:'vehicle',solid:true,vehicle:v.id});
  for(const m of mechanisms)if(m.kind==='barrel'||m.kind==='pushable')filteredPlatforms.push({x:m.x,y:m.y,w:m.w,h:m.h,type:'mechanism',solid:true,mechanism:m.id});
  for(const m of mechanisms)if(m.kind==='cargo')filteredPlatforms.push({x:m.cargoX,y:m.cargoY,w:m.cargoW,h:m.cargoH,type:'mechanism',solid:true,mechanism:m.id});
  const filteredPickups = pickups.filter(p => p.group === undefined || !blockedGroups.has(p.group));
  for (const item of filteredPickups) placePickup(item, filteredPlatforms);
  const hazards = [{id:'switched-arc',x:7920,y:GROUND-10,w:180,h:12,type:'electric',phase:0,disabled:false}];
  if (level.hazard !== 'none') for (let i = 0; i < 8; i++) {
    const x = 2800 + i * 2600 + Math.floor(rng() * 200);
    if (protectedZones.some(([a,b])=>x+150>a&&x<b) || filteredPlatforms.some(p => p.x + p.w + 50 > x && p.x < x + 150) || houses.some(h => Math.abs(h.x - x) < 350) || npcs.some(n => Math.abs(n.x - x) < 220) || filteredPickups.some(p => Math.abs(p.x - x) < 170 && p.y > GROUND - 100)) continue;
    hazards.push({ x, y: GROUND - 10, w: level.hazard === 'ice' ? 150 : 90, h: 12, type: level.hazard, phase: rng() * 6 });
  }
  return { seed, number: stageNumber, level, profile, sections, platforms: filteredPlatforms, props, hazards, pickups: filteredPickups, houses, npcs, vehicles, mission, mechanisms, dogRescueX, finishX: FINISH_X, shopX: SHOP_X, length: STAGE_LENGTH, endX: SHOP_X + 225 };
}

export function defaultEquipment() {
  return { pistol: false, magazine: 0, reserve: 0, equipped: 'bat', arsenal: Object.fromEntries(Object.keys(WEAPONS).filter(id => !['fists', 'bat', 'pistol'].includes(id)).map(id => [id, { owned: false, magazine: 0, reserve: 0 }])), upgrades: { bat: 0, damage: 0, reload: 0 }, dog: false, dogHealth: 45, health: 100 };
}
export function normalizeEquipment(e = {}) {
  const base = defaultEquipment();
  for (const key of ['health', 'magazine', 'reserve', 'dogHealth']) base[key] = Number.isFinite(e[key]) ? clamp(e[key], 0, key === 'reserve' ? 999 : key === 'health' ? 100 : key === 'dogHealth' ? 45 : 12) : base[key];
  base.pistol = e.pistol === true; base.dog = e.dog === true;
  for (const id of Object.keys(base.arsenal)) {
    const capacity = WEAPONS[id].magazine || 0;
    const gun = e.arsenal?.[id];
    if (gun?.owned === true) base.arsenal[id] = { owned: true, magazine: Number.isFinite(gun.magazine) ? clamp(Math.floor(gun.magazine), 0, capacity) : 0, reserve: Number.isFinite(gun.reserve) ? clamp(Math.floor(gun.reserve), 0, 999) : 0 };
  }
  if (e.equipped === 'fists' || e.equipped === 'pistol' && base.pistol || base.arsenal[e.equipped]?.owned) base.equipped = e.equipped;
  for (const key of Object.keys(base.upgrades)) base.upgrades[key] = Number.isFinite(e.upgrades?.[key]) ? clamp(Math.floor(e.upgrades[key]), 0, key === 'reload' ? 4 : 5) : 0;
  return base;
}

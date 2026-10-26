import { WEAPONS, ENEMIES, HOUSE_TYPES, GROUND, NPC_TYPES, WEAPON_FAMILIES } from './data.js';
import { LEVELS } from './levels.js';
import { drawInfected } from './actors.js';
import { drawHouse, drawPickup, drawDog, drawNpc } from './render.js';
import { drawWeapon } from './armory-art.js';
import { drawLevelPreview } from './scenery.js';
import { VEHICLES, makeVehicle } from './vehicle-data.js';
import { drawVehicle } from './vehicle-art.js';
import { infectedAppearance } from './infected-appearance.js';
import { paintMechanisms } from './stage-art.js';
import { makeMechanisms } from './mechanisms.js';
import { MISSION_TYPES } from './mission-data.js';

export const WEATHER_NAMES = { rain: 'Cold rain', fog: 'Dense fog', spores: 'Spores', dust: 'Dust', storm: 'Thunderstorm', embers: 'Embers', sand: 'Sandstorm', snow: 'Snowfall', blizzard: 'Blizzard', ash: 'Ashfall', stars: 'Starfield', acidrain: 'Acid rain' };
export const HAZARD_NAMES = { none: 'Standard obstacles', thorns: 'Thorn spikes', acid: 'Corrosive pools', electric: 'Electrical arcs', fire: 'Ground fires', radiation: 'Radiation leaks', ice: 'Slippery ice', lava: 'Lava fissures' };
export const CATEGORY_NAMES = { weapons: 'Weapons', vehicles: 'Vehicles', mechanisms:'Mechanisms', supplies: 'Supplies & shelter', survivors: 'Survivors', infected: 'Infected', missions: 'Mission archive' };
const weaponInfo = {
  fists: ['Fists', 'The last resort', 'Weak single-target attacks, very short reach. When the ammunition is gone, these are your last line of defense.', 'Keep a way out. Do not trade blows with a brute.', 'swing'],
  bat: ['Reinforced bat', 'Melee / crowd control', 'Light crowd control: strikes up to two infected with modest damage and knockback.', 'Let them enter your reach, strike, then make space. Upgrade damage at the supply shelf.', 'swing'],
  pistol: ['Service pistol', 'Semi-automatic / 12-round magazine', 'Buy once at the supply shelf; it is equipped immediately and stays in your loadout. Reloading interrupts shooting. The soldier can fire a three-round burst.', 'Cars slow infected, but also stop bullets. Watch the magazine and press R before you run dry.', 'shot'],
  shotgun: ['Pump shotgun', 'Six pellets / 6-shell magazine', 'A close-range weapon that fires six spreading pellets with strong knockback. Buy it at the Last Shelf.', 'Let a group approach, fire, then use the pause between shots to create distance. Shells are tracked separately.', 'shot'],
  smg: ['Submachine gun', 'Automatic / 30-round magazine', 'Rapid sustained fire with a large magazine. Lower damage per shot, high ammunition consumption.', 'Hold Space for automatic fire. Buy crates before a long fight and reload behind cover.', 'shot'],
  rifle: ['Marksman rifle', 'Precision / 8-round magazine', 'High damage and long-range fire. A slow firing cycle rewards careful positioning.', 'Prioritize brutes and spitters. Solid obstacles stop every round; climb to open a firing lane.', 'shot'],
};
const infectedInfo = {
  walker: ['Walker', 'Common infected', 'Stiff joints and a dragging gait. It reaches for nearby prey. Numbers make it dangerous.', 'Use knockback to keep your distance. Cars and platforms slow them down, but they can climb.'],
  runner: ['Runner', 'Fast infected', 'Not yet fully decayed, it closes distance quickly. A brief pause gives away the coming lunge.', 'Prioritize it and save ammunition. Do not get caught reloading in its path.'],
  brute: ['Brute', 'Heavy infected', 'Abnormally enlarged bone and muscle. Heavy footsteps, high endurance, and a clearly telegraphed smash.', 'Retreat when it winds up. Knockback buys time; getting trapped against an obstacle does not.'],
  spitter: ['Spitter', 'Ranged infected', 'A swollen throat sac launches corrosive fluid, threatening you from beyond melee reach.', 'Jump over the spit. Solid cover blocks its projectiles.'],
};
export const CATALOG = [
  ...[
    ['barrel','Explosive drum','Shoot or strike it to light a fuse. Its marked blast damages infected and chains to nearby drums.','Stay outside the blast marker. Solid cover protects you.','explosion'],
    ['switch','Circuit breaker','E toggles the visible electrical strip. Shooting the panel permanently cuts power.','Disarm it to cross, or arm it to trap infected.','switchPower'],
    ['cargo','Suspended cargo','E at the release post or a shot through the hanging latch drops a crate after a warning.','Lure infected under it. Fallen cargo becomes cover.','cargoImpact'],
    ['pushable','Loose barricade','E or enough damage topples it, striking nearby infected and opening a low route.','Save ammunition by using the environment.','houseHit'],
  ].map(([key,name,description,tactics,sound])=>({id:'mechanism-'+key,category:'mechanisms',key,name,subtitle:'Interactive environment',description,tactics,sound,stats:[['Availability','Every stage'],['Reset','Same state on retry']]})),
  ...Object.entries(VEHICLES).map(([key,v])=>({id:'vehicle-'+key,category:'vehicles',key,name:v.name,subtitle:key==='tank'?'Armored support / cannon':'Fast transport / mounted gun',description:key==='tank'?'A slow armored tank with explosive cannon shells. Solid obstacles block its tracks; hop over low wrecks.':'A fast rescue buggy with a mounted machine gun. Ram isolated infected, but watch the lighter hull.',tactics:'Press E beside a vehicle to board or exit. Arrows drive, Up hops, Space fires and R reloads. Fuel, hull and mounted ammo are finite. Down brakes. Fast crashes damage the hull. Snow and space missions use adapted vehicles. The gate parks it outside; retry restores the same salvage. Biscuit rides safely with you.',sound:'vehicleEnter',stats:[['Hull',v.hull],['Drive speed',v.speed],['Fuel',v.fuel+' driving seconds'],['Mounted weapon',v.weapon],['Magazine',v.magazine],['Locations','30% chance per stage / maximum one vehicle']]})),
  ...Object.entries(WEAPONS).map(([key,w]) => {
    const info = weaponInfo[key] || [w.name, WEAPON_FAMILIES[w.family] + ' / ' + w.resource, w.description, w.tactics, w.family === 'melee' ? 'swing' : 'shot'];
    return { id: 'weapon-' + key, category: 'weapons', family: w.family, key, name: info[0], subtitle: info[1], description: info[2], tactics: info[3], sound: info[4], stats: [['Role',w.role],['Family', WEAPON_FAMILIES[w.family]], ['Base damage', w.pellets ? w.damage + ' × ' + w.pellets + ' pellets' : w.damage], ['Attack interval', w.cooldown + 's'], [w.magazine ? 'Magazine / resource' : 'Reach', w.magazine ? w.magazine + ' / ' + w.resource : String(w.reach)], ['Special effect', w.chain ? 'Chain 3 targets' : w.chill ? '65% slow / 3s' : w.blast ? '125-unit blast' : w.pierce ? 'Pierce 3 targets' : w.bleed ? 'Bleeding / 3s' : w.burn ? 'Burning / 3s' : w.stun ? 'Stun / 0.75s' : w.thrust ? 'Thrust / 2 targets' : 'Direct damage'], ['Purchase price', w.price ? w.price + ' coins' : key === 'fists' || key === 'bat' ? 'Starting equipment' : 'Supply shelf']] };
  }),
  ...Object.entries(NPC_TYPES).map(([key, n]) => ({ id: `survivor-${key}`, category: 'survivors', key, name: n.name, subtitle: n.role, description: n.description, tactics: key === 'trader' ? 'Open Armory from the title menu, or reach the shelf after sealing the gate.' : 'Stand beside the protected lookout and press E. Each reward is available once per attempt; retry resets field encounters.', sound: 'npc', stats: [['Interaction', key === 'trader' ? 'Supply shelf' : 'E key'], ['Encounter', key === 'trader' ? 'Safe zone' : 'Every mission']] })),
  ...Object.entries(ENEMIES).map(([key,e]) => {
    const info = infectedInfo[key] || [e.name, 'Special infected', e.description, e.tactics];
    return { id: 'infected-' + key, category: 'infected', key, name: info[0], subtitle: info[1], description: info[2], tactics: info[3], sound: key === 'tremor' ? 'shockwave' : key === 'rammer' ? 'charge' : key === 'lobber' ? 'spit' : key === 'screamer' ? 'scream' : key === 'leaper' ? 'leap' : 'growl', stats: [['Health', e.health], ['Attack damage', e.damage], ['Movement speed', e.speed], ['Instant kill reward', e.reward + ' coins']] };
  }),
  ...[
    ['health', 'Medical kit', 'Restore health', 'First-aid supplies found on streets and elevated routes. Kits are left untouched when health is full.', 'Look on rooftops and inside shelters. Return for missed kits after taking damage.', 'pickup'],
    ['ammo', 'Spare ammunition', 'Rounds, fuel & cells', 'Refills every owned powered weapon. You still need to reload. Full reserves leave the box untouched.', 'Check your magazine before advancing. Spare rounds are not loaded rounds.', 'reload'],
    ['coins', 'Bonus coins', 'Funds persist across missions', 'Every kill pays immediately. Some infected also drop bonus coins; approach to collect them. All collected funds survive death.', 'Bring upgraded equipment back to easier missions to earn more funds.', 'coin'],
    ['dog', 'Rescue: Biscuit', 'Companion', 'A dog trapped along the route. Approach its cage to rescue it. Biscuit follows and distracts infected.', 'He can be hurt and lost for this attempt. Take shelter together.', 'bark'],
  ].map(([key, name, subtitle, description, tactics, sound]) => ({ id: `supply-${key}`, category: 'supplies', key, name, subtitle, description, tactics, sound, stats: [] })),
  ...Object.keys(HOUSE_TYPES).map((key, i) => ({ id: `house-${key}`, category: 'supplies', key, house: true, name: ['Supply cabin', 'Greenhouse shelter', 'Twin-mailbox house', 'Abandoned clinic'][i], subtitle: ['Immediate supplies', 'Delayed refill', 'Return-visit supplies', 'Timed treatment'][i], description: ['One bundle on the first visit. Windows turn blue when exhausted.', 'One bundle on entry; a second after 10 accumulated seconds inside.', 'One bundle on each of the first two visits. Re-entry cannot generate unlimited supplies.', 'Stay inside for 5 accumulated seconds to collect health and ammunition.'][i], tactics: 'Press Up at the door. Infected cannot hit you inside, but they can destroy the house. Being inside a collapse costs 12 health.', sound: 'enter', stats: [['Supply bundles', HOUSE_TYPES[key].bundles], ['Structure health', 24], ['Window signal', 'Green: stocked / Blue: empty'], ['Collapse damage', 12]] })),
  ...LEVELS.map(level => ({ id: `mission-${level.id}`, category: 'missions', key: level.id, name: level.name, subtitle: level.subtitle, description: level.description, tactics: `Four shelters line this shorter route. Watch for ${HAZARD_NAMES[level.hazard].toLowerCase()}. Crossing the final gate stops spawning. Replay with your existing equipment.`, sound: 'safe', level, stats: [['Objective',MISSION_TYPES[level.objectiveType].name],['Weather', WEATHER_NAMES[level.weather]], ['Hazards', HAZARD_NAMES[level.hazard]], ['Gravity', `${level.gravity.toFixed(2)}×`], ['Completion reward', `${level.reward} coins`]] })),
];

export function drawCatalogArt(canvas, entry, time = 0, pose = 'walk',look=0) {
  if (entry.level) { drawLevelPreview(canvas, entry.level, time); return; }
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  const g = c.createRadialGradient(w * .5, h * .62, 0, w * .5, h * .55, w * .68); g.addColorStop(0, '#293b3b'); g.addColorStop(1, '#0c161f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#72917b15'; c.lineWidth = 1; for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(w / 7 * i, 0); c.lineTo(w / 7 * i, h); c.stroke(); } for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, h / 5 * i); c.lineTo(w, h / 5 * i); c.stroke(); }
  if (entry.category === 'infected') {
    const def = ENEMIES[entry.key], scale = h / 120;
    c.save(); c.translate(w / 2 - def.width * scale / 2, h * .14); c.scale(scale, scale);
    drawInfected(c, { ...def, appearance:infectedAppearance(381+entry.key.length,look),x: 0, y: 0, w: def.width, h: def.height, type: entry.key, maxHealth: def.health, facing: 1, attackTarget: entry.key === 'screamer' ? 'scream' : entry.key === 'leaper' ? 'leap' : 'player', phase: pose === 'attack' ? 'windup' : pose === 'idle' ? 'recover' : 'walk', vx: pose === 'walk' ? def.speed : 0, travel: time * def.speed * .7 }, time); c.restore();
  } else if (entry.house) {
    const scale = Math.min(w / 280, h / 245); c.save(); c.translate(w / 2 - 102 * scale, h * .88 - GROUND * scale); c.scale(scale, scale); drawHouse(c, { x: 0, y: GROUND - 190, w: 205, h: 190, type: entry.key, remaining: 1, maxHealth: 24, health: 24, collapsed: false }, false, time); c.restore();
  } else if (entry.category === 'survivors') {
    const scale = Math.min(w / 200, h / 230); c.save(); c.translate(w / 2 - 20 * scale, h * .87 - GROUND * scale); c.scale(scale, scale); drawNpc(c, { type: entry.key, x: 0, used: false }, time, false); c.restore();
  } else if (entry.category === 'vehicles') {
    const v=makeVehicle(entry.key,0,'preview',0,['road','snow','space'][look]||'road'),scale=Math.min(w/210,h/150);c.save();c.translate(w/2-v.w*scale/2,h*.75);c.scale(scale,scale);drawVehicle(c,v,time);c.restore();
  } else if(entry.category==='mechanisms'){
    const m=makeMechanisms(()=>0).find(m=>m.kind===entry.key);m.x=20;if(m.kind==='cargo')m.cargoX=130;const scale=Math.min(w/300,h/(m.kind==='cargo'?380:190));c.save();c.translate(w*.28,h*.85-GROUND*scale);c.scale(scale,scale);paintMechanisms(c,{stage:{mechanisms:[m]},mode:'paused',player:{x:-9999}},time);c.restore();
  } else if (entry.category === 'weapons') {
    drawWeapon(c, entry.key, w / 2, h * .49, Math.min(w / 220, h / 110));
  } else if (entry.key === 'dog') {
    c.save(); const scale = h / 95; c.translate(w / 2 - 22 * scale, h * .3); c.scale(scale, scale); drawDog(c, 0, 0, time * .2, 1, false, 45); c.restore();
  } else { c.save(); const s = h / 65; c.translate(w / 2 - 12 * s, h * .28); c.scale(s, s); drawPickup(c, { x: 0, y: 0, kind: entry.key }, time); c.restore(); }
  c.fillStyle = '#b5b89577'; c.font = `${Math.max(7, w / 65)}px monospace`; c.textAlign = 'left'; c.fillText(entry.id.toUpperCase(), w * .045, h * .94);
}

export class ReviewStore {
  constructor(storage) { this.storage = storage; this.notes = {}; this.available = true; try { const data = JSON.parse(storage.getItem('dead-end-review-v1')); if (data?.version === 1 && data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes)) this.notes = data.notes; } catch { this.available = false; } }
  get(id) { const n = this.notes[id]; return { text: typeof n?.text === 'string' ? n.text : '', status: ['review', 'improve', 'priority', 'approved'].includes(n?.status) ? n.status : 'review', updatedAt: n?.updatedAt || null }; }
  set(id, text, status) { if (!CATALOG.some(e => e.id === id)) return false; this.notes[id] = { text: String(text).slice(0, 8000), status: ['review', 'improve', 'priority', 'approved'].includes(status) ? status : 'review', updatedAt: new Date().toISOString() }; try { this.storage.setItem('dead-end-review-v1', JSON.stringify({ version: 1, notes: this.notes })); this.available = true; } catch { this.available = false; } return this.available; }
  export() { return { game: 'DEAD END', version: 1, generatedAt: new Date().toISOString(), entries: CATALOG.filter(e => this.notes[e.id]).map(e => ({ id: e.id, name: e.name, category: e.category, ...this.get(e.id) })) }; }
}

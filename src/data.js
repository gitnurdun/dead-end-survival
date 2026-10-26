import { EXTRA_WEAPONS, EXTRA_ENEMIES } from './expansion-data.js';
export { WEAPON_FAMILIES } from './expansion-data.js';
export const GROUND = 620;
export const GRAVITY = 1750;
export const PLAYER_SPEED = 200;
export const STAGE_LENGTH = 24000;
export const FINISH_X = STAGE_LENGTH + 300;
export const SHOP_X = FINISH_X + 375;
export const WORLD_ZOOM = 1.5;
export const BONUS_COIN_CHANCE = .28;
export const MAX_ENEMIES = 26;
export const SAVE_KEY = 'dead-end-save-v1';
export const SETTINGS_KEY = 'dead-end-settings-v1';
export const CHARACTERS = [
  { id: 'civilian', name: 'Jamie', role: 'THE CIVILIAN', ability: 'Power shove', cooldown: 8, color: '#de8657', accent: '#f4cf79', skin: '#e9ba8d', hair: '#583d34', description: 'A big shove. A little breathing room.' },
  { id: 'soldier', name: 'Sarge', role: 'THE SOLDIER', ability: 'Triple burst', cooldown: 10, color: '#6c8153', accent: '#dbe599', skin: '#bc8f6b', hair: '#354637', description: 'Three quick shots. Pistol required.' },
  { id: 'mechanic', name: 'Rusty', role: 'THE MECHANIC', ability: 'Barricade', cooldown: 18, color: '#dfaa54', accent: '#426b70', skin: '#d1a17d', hair: '#703c2d', description: 'Build a barricade. Buy some time.' },
  { id: 'nurse', name: 'Cleo', role: 'THE NURSE', ability: 'Second wind', cooldown: 25, color: '#80b4ad', accent: '#f0eee0', skin: '#9a6b50', hair: '#352b34', description: 'Patch up 25 health on the move.' },
  { id: 'scout', name: 'Kit', role: 'THE SCOUT', ability: 'Quick dash', cooldown: 8, color: '#a38bbc', accent: '#e2cb91', skin: '#e1ac86', hair: '#433740', description: 'Dash through trouble, briefly protected.' },
];
export const WEAPONS = {
  fists: { name: 'Fists', damage: 6, reach: 52, cooldown: .4, knockback: 65, maxHits: 1 },
  bat: { name: 'Bat', damage: 18, reach: 99, cooldown: .65, knockback: 180, maxHits: 2 },
  pistol: { name: 'Pistol', damage: 34, cooldown: .29, knockback: 80, magazine: 12, reload: 1.55 },
  shotgun: { name: 'Pump shotgun', damage: 19, cooldown: .85, knockback: 235, magazine: 6, reload: 2.2, pellets: 6, spread: .065, range: 390 },
  smg: { name: 'Submachine gun', damage: 18, cooldown: .095, knockback: 38, magazine: 30, reload: 1.8, range: 660 },
  rifle: { name: 'Marksman rifle', damage: 88, cooldown: .7, knockback: 140, magazine: 8, reload: 2.4, range: 1050 },
  ...EXTRA_WEAPONS,
};
for (const [id, weapon] of Object.entries(WEAPONS)) {
  weapon.role ||= ({fists:'Emergency defense',bat:'Push back up to two targets',pistol:'Economical sidearm',shotgun:'Close crowd burst',smg:'Sustained fire',rifle:'Priority target precision',machete:'Bleed and retreat',spear:'Long two-target thrust',hammer:'Armor break and stun',chainsaw:'Fuel-powered contact damage',revolver:'Heavy stopping power',launcher:'Group demolition',flamer:'Area burning',tesla:'Three-target chain',cryo:'Slow and control',plasma:'Pierce armor and bodies'})[id];
  weapon.family ||= weapon.magazine ? 'firearm' : 'melee';
  weapon.color ||= weapon.family === 'melee' ? '#bdc99a' : '#d5bc86';
  weapon.resource ||= weapon.magazine ? 'ROUNDS' : 'UNLIMITED';
  weapon.resupply ??= ({ pistol: 1, shotgun: 1 / 3, smg: 2, rifle: .5 })[id] || 0;
}
export const ENEMIES = {
  walker: { health: 60, speed: 46, damage: 9, width: 38, height: 61, color: '#93a66d', reward: 5, range: 43, windup: .45 },
  runner: { health: 35, speed: 135, damage: 7, width: 32, height: 52, color: '#becf79', reward: 7, range: 40, windup: .3 },
  brute: { health: 175, speed: 34, damage: 23, width: 64, height: 90, color: '#7a9180', reward: 15, range: 61, windup: .95 },
  spitter: { health: 55, speed: 37, damage: 10, width: 37, height: 62, color: '#b9ac71', reward: 10, range: 480, windup: .95 },
  ...EXTRA_ENEMIES,
};
export const PROFILES = {
  mixed: { label: 'MIXED', spawn: 1, ammo: 1, speed: 1 },
  survival: { label: 'SURVIVAL', spawn: .76, ammo: .65, speed: 1.12 },
  arcade: { label: 'ARCADE', spawn: 1.05, ammo: 1, speed: 1 },
  power: { label: 'MAYHEM', spawn: 1.5, ammo: 2.1, speed: .94 },
};
export const DISTRICTS = [
  { name: 'The outskirts', subtitle: 'Keep your eyes open. And your bat closer.', color: '#d3ad87', type: 'outskirts' },
  { name: 'Bad neighbors', subtitle: 'A friend is waiting somewhere in these streets.', color: '#b2b99a', type: 'neighborhood' },
  { name: 'Downtown, dead town', subtitle: 'One last push. The gate is just ahead.', color: '#a6b4b8', type: 'downtown' },
];
export const SECTION_TYPES = ['parked', 'balconies', 'roadworks', 'market', 'garden', 'overpass'];
export const HOUSE_TYPES = {
  pantry: { name: 'pantry', bundles: 1, color: '#4c4b46', roof: '#252f34', delay: 0 },
  greenhouse: { name: 'greenhouse', bundles: 2, color: '#414f45', roof: '#273b39', delay: 10 },
  duplex: { name: 'duplex', bundles: 2, color: '#4d454d', roof: '#2c2934', delay: 0 },
  clinic: { name: 'clinic', bundles: 1, color: '#52574f', roof: '#293937', delay: 5 },
};
export const SHOP_ITEMS = [
  ...Object.entries(EXTRA_WEAPONS).map(([id, w]) => ({ id, name: w.name, description: w.description, basePrice: w.price, weapon: id, art: id })),
  { id: 'pistol', name: 'Service pistol', description: '12-round sidearm. Includes 36 spare rounds.', basePrice: 75, weapon: 'pistol', art: 'pistol' },
  { id: 'shotgun', name: 'Pump shotgun', description: 'Six pellets per shot. Close-range knockback. Includes 18 shells.', basePrice: 180, weapon: 'shotgun', art: 'shotgun' },
  { id: 'smg', name: 'Submachine gun', description: 'Hold to fire rapidly. Includes 90 spare rounds.', basePrice: 240, weapon: 'smg', art: 'smg' },
  { id: 'rifle', name: 'Marksman rifle', description: 'Heavy single shots and long range. Includes 24 spare rounds.', basePrice: 320, weapon: 'rifle', art: 'rifle' },
  { id: 'heal', name: 'A proper patch-up', description: 'Restore 40 health. Stay in one piece.', basePrice: 40, icon: '✚' },
  { id: 'ammo', name: 'Ammunition & energy crate', description: 'Refill every owned powered weapon. Price scales with the size of your powered arsenal.', basePrice: 25, firearm: true, icon: '▰', art: 'ammo' },
  { id: 'bat', name: 'Heavy hitter', description: '+20% damage for armed melee weapons per upgrade. Fists stay unchanged. Maximum 5.', basePrice: 80, upgrade: 'bat', icon: '↗' },
  { id: 'damage', name: 'Better ballistics', description: '+20% damage for all firearms per upgrade. Maximum 5.', basePrice: 85, firearm: true, upgrade: 'damage', icon: '⌖', art: 'rifle' },
  { id: 'reload', name: 'Quick hands', description: '15% faster firearm reloads per upgrade. Maximum 4.', basePrice: 70, firearm: true, upgrade: 'reload', icon: '↻', art: 'ammo' },
];
export const NPC_TYPES = {
  scout: { name: 'Ada', role: 'Signal scout', character: 'scout', description: 'Clear eight infected, then return for a 50-coin field contract.' },
  medic: { name: 'Dr. Vale', role: 'Field medic', character: 'nurse', description: 'One free 35-health treatment per attempt. Come back when wounded.' },
  supplier: { name: 'Mason', role: 'Supply runner', character: 'mechanic', description: 'One ammunition bundle for every owned firearm per attempt.' },
  ranger: { name: 'Rowan', role: 'Park ranger', character: 'soldier', description: 'Shares a 25-coin emergency cache once per attempt.' },
  trader: { name: 'Morgan', role: 'Quartermaster', character: 'civilian', description: 'Runs the Last Shelf. All weapons, ammunition and upgrades are displayed here.' },
};

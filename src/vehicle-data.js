export const VEHICLES = {
  buggy: { name: 'Rescue buggy', speed: 370, acceleration:720, braking:1080, hull: 120, fuel: 45, width: 128, height: 70, damage: 16, cooldown: .14, magazine: 60, reserve: 120, reload: 2.4, weapon: 'Mounted machine gun', ram: 24, color: '#a58a56' },
  tank: { name: 'Quarantine tank', speed: 230, acceleration:380, braking:760, hull: 260, fuel: 55, width: 154, height: 82, damage: 95, cooldown: 1.2, magazine: 8, reserve: 16, reload: 3.2, weapon: '90 mm cannon', ram: 48, blast: 115, color: '#65776c' },
};
export function vehicleSkin(level){return level.region===3?'space':['snow','blizzard'].includes(level.weather)?'snow':['wetlands','swamp'].includes(level.biome)?'mud':['sand','dust'].includes(level.weather)?'sand':'road';}
export function vehicleName(v){return v.skin==='snow'?(v.type==='tank'?'Polar siege tank':'Snow crawler'):v.skin==='space'?(v.type==='tank'?'Expedition crawler':'Planetary rover'):VEHICLES[v.type].name;}
export function makeVehicle(type, x, id, ground = 620, skin='road') {
  const d = VEHICLES[type];
  return { id, type, skin, x, y: ground-d.height, w: d.width, h: d.height, vy: 0, grounded: true, vx: 0, driveSpeed:0, facing: 1, hull: d.hull, fuel: d.fuel, rounds: d.magazine, reserve: d.reserve, cooldown: 0, reload: 0, destroyed: false, travel: 0, hitCooldown: 0, hurt:0, recoil:0, skid:0, dust:0, impactCooldown:0 };
}

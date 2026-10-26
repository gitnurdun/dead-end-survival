import { WEAPONS, WEAPON_FAMILIES } from './data.js';
import { drawWeapon } from './armory-art.js';
import { VEHICLES } from './vehicle-data.js';

export class WeaponHud {
  constructor(root, onEquip) {
    this.root = root; this.onEquip = onEquip; this.signature = ''; this.current = '';
    root.innerHTML = '<div class="equipped-panel"><canvas width="210" height="100" aria-hidden="true"></canvas><div><span class="equipped-label">EQUIPPED</span><strong id="equippedName"></strong><span id="equippedResource"></span><div class="weapon-load-track"><i></i></div></div></div><div class="weapon-inventory"><div class="weapon-inventory-label">CARRIED WEAPONS <span>X / Z · NEXT / PREVIOUS</span></div><div class="weapon-slots" role="group" aria-label="Equip a carried weapon"></div></div>';
  }
  update(game) {
    const owned = Object.keys(WEAPONS).filter(id => game.ownsWeapon(id)), signature = owned.join('|'), p = game.player, weapon = WEAPONS[p.weapon];
    const slots = this.root.querySelector('.weapon-slots');
    if (signature !== this.signature) {
      this.signature = signature;
      slots.innerHTML = owned.map((id,i) => `<button data-weapon-slot="${id}" title="${WEAPONS[id].name} / ${WEAPON_FAMILIES[WEAPONS[id].family]}" aria-label="Equip ${WEAPONS[id].name}"><canvas width="120" height="52" aria-hidden="true"></canvas><span>${WEAPONS[id].name}</span><small>${i < 9 ? i + 1 : 'X'}</small></button>`).join('');
      for (const button of slots.querySelectorAll('button')) { const c = button.querySelector('canvas').getContext('2d'); drawWeapon(c, button.dataset.weaponSlot, 60, 24, .59); button.onclick = () => this.onEquip(button.dataset.weaponSlot); }
    }
    const ammo = game.ammo(),v=game.vehicle(),mounted=v&&VEHICLES[v.type];
    this.root.querySelector('#equippedName').textContent = mounted ? mounted.weapon : weapon.name;
    const state = game.safe ? 'SAFE ZONE' : game.mode === 'sheltered' ? 'SHELTERED' : p.reload > 0 ? (weapon.resource === 'FUEL' ? 'REFUELING' : 'RELOADING') : weapon.magazine && !ammo.magazine ? 'EMPTY · PRESS R' : WEAPON_FAMILIES[weapon.family].toUpperCase();
    this.root.querySelector('#equippedResource').textContent = mounted ? `${v.reload>0?'RELOADING':'VEHICLE MOUNT'} · ${v.rounds} / ${v.reserve} ROUNDS` : `${state} · ${weapon.magazine ? `${ammo.magazine} / ${ammo.reserve} ${weapon.resource}` : 'NO AMMO NEEDED'}`;
    this.root.querySelector('.weapon-load-track i').style.width = `${mounted ? v.reload>0?(1-v.reload/mounted.reload)*100:v.rounds/mounted.magazine*100 : weapon.magazine ? p.reload > 0 ? Math.max(0, 1 - p.reload / (weapon.reload * (1 - p.upgrades.reload * .15))) * 100 : ammo.magazine / weapon.magazine * 100 : 100}%`;
    for (const button of slots.querySelectorAll('button')) { const selected = button.dataset.weaponSlot === p.weapon; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); button.disabled = !!v || game.mode !== 'playing' || game.safe || p.burst > 0; }
    const display=v?'vehicle-'+v.type:p.weapon;
    if (this.current !== display) {
      this.current = display; const c = this.root.querySelector('.equipped-panel canvas').getContext('2d'); c.clearRect(0,0,210,100); drawWeapon(c,v?(v.type==='tank'?'launcher':'smg'):p.weapon,105,43,1);
      this.root.style.setProperty('--weapon-color',weapon.color); slots.querySelector(`[data-weapon-slot="${p.weapon}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});
    }
  }
}

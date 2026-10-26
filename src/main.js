import { CHARACTERS, WEAPONS, DISTRICTS, PROFILES, SHOP_ITEMS, WEAPON_FAMILIES, SAVE_KEY, SETTINGS_KEY } from './data.js';
import { Game } from './game.js';
import { Renderer, drawPortrait } from './render.js';
import { Audio } from './audio.js';
import { ArchiveScreens } from './screens.js';
import { LEVELS, getLevel } from './levels.js';
import { normalizeEquipment } from './world.js';
import { normalizeSettings } from './settings.js';
import { routeStatus } from './hud-state.js';
import { WeaponHud } from './weapon-hud.js';
import { drawArmoryShelf, drawShopArt } from './armory-art.js';
import { VEHICLES, vehicleName } from './vehicle-data.js';
import { missionStatus } from './mission.js';

const $ = id => document.getElementById(id);
const readStorage = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const storedSettings = readStorage(SETTINGS_KEY);
let shopFamily = 'firearm', shopScroll = 0;
const settings = normalizeSettings(storedSettings, matchMedia('(prefers-reduced-motion: reduce)').matches);
const audio = new Audio(settings);
const renderer = new Renderer($('game'));
const input = { left: false, right: false, attack: false, brake:false, interact:false };
let saved = readStorage(SAVE_KEY), selected = 'civilian', modalType = null, modalReturn = null, previousFocus = null;
let toastTimer = 0, chapterTimer = 0, deathTimer = 0, storageWarned = false, archive = null;
const game = new Game({ onEvent: handleEvent, onSave: data => {
  saved = data;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch { if (!storageWarned) { storageWarned = true; toast('Browser storage unavailable. Progress will last for this session.'); } }
} });
if (saved?.version === 1) {
  game.loadout = normalizeEquipment(saved.loadout || saved.shopEquipment || saved.startEquipment);
  game.money = Number.isFinite(saved.money) ? Math.max(0, Math.min(9999999, Math.floor(saved.money))) : 0;
  game.levelId = getLevel(saved.levelId).id; game.number = getLevel(saved.levelId).index + 1; game.seed = Number.isSafeInteger(saved.seed) ? saved.seed : 7291;
  game.completed = Array.isArray(saved.completed) ? saved.completed.filter(id => LEVELS.some(l => l.id === id)) : [];
  if (CHARACTERS.some(c => c.id === saved.character)) selected = saved.character;
}
archive = new ArchiveScreens({ game, audio, onOpen: () => { clearInput(); if (modalType) closeModal(false); }, onClose: () => { clearInput(); if (game.mode === 'shop') showShop(); else if (game.mode === 'dead') showDeath(); }, onLaunch: level => { game.selectLevel(level.id, selected); } });

const weaponHud = new WeaponHud($('weaponDock'), id => { if (game.equipWeapon(id)) $('game').focus(); });

function clearInput() { input.left = false; input.right = false; input.attack = false; input.brake=false;input.interact=false;game.player.sawRunning = false; }
function toast(message, duration = 3400) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), duration); }
function showChapter(number, title, subtitle) {
  clearTimeout(chapterTimer); $('chapterNumber').textContent = number; $('chapterTitle').textContent = title; $('chapterSubtitle').textContent = subtitle; $('chapter').classList.add('show'); chapterTimer = setTimeout(() => $('chapter').classList.remove('show'), 3300);
}
function handleEvent(event) {
  audio.play(event.type, event);
  if (event.type === 'stage') {
    clearTimeout(deathTimer);
    if (archive?.active) archive.close(false);
    modalType = null; modalReturn = null; $('modalLayer').classList.add('hidden'); $('chapter').classList.remove('show');
    clearInput(); renderer.camera = 0; showGame(); drawPortrait($('portrait'), game.character);
  }
  if (event.type === 'district' && !game.safe) {
    const l = game.stage.level; showChapter(`SECTOR ${String(l.index + 1).padStart(2, '0')} / ${l.subtitle}`, event.district === 0 ? l.name : ['Outer quarantine', 'Infection core', 'Evacuation perimeter'][event.district], event.district === 0 ? l.description : 'Reach the gate. Stay alert.');
  }
  if (event.type === 'safe') showChapter('QUARANTINE GATE SEALED', 'SAFE ZONE REACHED', 'Gate sealed. Proceed to the supply shelf.');
  if (event.type === 'hint') toast(event.text);
  if (event.type === 'dialogue') toast(`${event.name}: ${event.text}`, 6500);
  if (event.type === 'pistol') toast('Pistol found. Hold SPACE to fire · R to reload · X to switch.', 5200);
  if (event.type === 'dogRescue') toast('Meet Biscuit. A good dog on a very bad day.', 4400);
  if (event.type === 'dogLost') toast('Biscuit is out of this attempt. A restart restores the rescue.', 4400);
  if (event.type === 'houseWarning') toast('Shelter structure is failing. Leave before it collapses.',4000);
  if (event.type === 'collapse') toast('Shelter collapsed. Keep moving.');
  if (event.type === 'dead') {
    clearInput();
    showChapter('SIGNAL LOST', 'YOU FELL', 'Your collected money is safe.');
    clearTimeout(deathTimer);
    deathTimer = setTimeout(() => { if (game.mode === 'dead' && !archive.active) showDeath(); }, 1100);
  }
  if (event.type === 'shop') { shopScroll = 0; showShop(); }
}

function renderCharacters() {
  $('characterCards').innerHTML = CHARACTERS.map((c, i) => `<button class="character-card ${selected === c.id ? 'selected' : ''}" data-character="${c.id}" aria-pressed="${selected === c.id}" aria-label="${c.name}, ${c.role.toLowerCase()}, ${c.description}"><span class="card-number">0${i + 1}</span><canvas width="65" height="75" aria-hidden="true"></canvas><span><strong>${c.name}</strong><small>${c.ability}</small></span><span class="selected-mark">${selected === c.id ? '✓' : ''}</span></button>`).join('');
  document.querySelectorAll('[data-character]').forEach(button => {
    drawPortrait(button.querySelector('canvas'), CHARACTERS.find(c => c.id === button.dataset.character));
    button.addEventListener('click', () => { selected = button.dataset.character; game.character = CHARACTERS.find(c => c.id === selected); renderCharacters(); document.querySelector(`[data-character="${selected}"]`)?.focus(); });
  });
}
function showGame() {
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pauseButton').classList.remove('hidden'); document.body.classList.add('in-game');
  $('game').focus();
}
function showMenu() {
  clearTimeout(deathTimer);
  if (archive?.active) archive.close(false);
  game.mode = 'menu'; clearInput(); closeModal(false); $('menu').classList.remove('hidden'); $('hud').classList.add('hidden'); $('pauseButton').classList.add('hidden'); document.body.classList.remove('in-game');
  $('continueButton').classList.toggle('hidden', !saved); $('chapter').classList.remove('show');
  game.character = CHARACTERS.find(c => c.id === selected); renderCharacters();
}
function openModal(type, eyebrow, title, content, { locked = false, shop = false } = {}) {
  if (type !== 'shop' && type !== 'dead') audio.play('page');
  const wasModal = modalType;
  if (!wasModal) previousFocus = document.activeElement;
  if ((wasModal === 'shop' || wasModal === 'dead') && type !== wasModal) modalReturn = wasModal;
  clearInput(); game.pause(); modalType = type;
  $('modalLayer').classList.remove('hidden'); $('modal').classList.toggle('shop-modal', shop); $('modal').classList.toggle('settings-modal', type === 'settings'); $('modalEyebrow').textContent = eyebrow; $('modalTitle').textContent = title; $('modalContent').innerHTML = content; $('closeModal').classList.toggle('hidden', locked);
  $('modal').focus();
}
function closeModal(resume = true) {
  if (modalType) audio.play('page');
  if (resume && modalReturn) { const next = modalReturn; modalReturn = null; next === 'shop' ? showShop() : showDeath(); return; }
  modalType = null; modalReturn = null; $('modalLayer').classList.add('hidden'); clearInput(); if (resume) game.resume(); previousFocus?.focus?.();
}
function startNew() { audio.unlock(); closeModal(false); game.newGame(selected); }
$('playButton').addEventListener('click', () => {
  audio.unlock();
  if (!saved) { startNew(); return; }
  openModal('new', 'A CLEAN SLATE', 'Start a new outbreak?', '<p>This replaces your saved stage, purchases, and collected money. Your selected survivor will start at stage one.</p><div class="modal-actions"><button id="cancelNew" class="button secondary">Keep my save</button><button id="confirmNew" class="button primary">Start fresh <span>↗</span></button></div>');
  $('cancelNew').onclick = () => closeModal(); $('confirmNew').onclick = startNew;
});
$('continueButton').addEventListener('click', () => {
  audio.unlock(); const candidate = saved;
  if (!game.load(candidate)) { toast('This save could not be read. Start a new game to replace it.'); showMenu(); }
});
function updateHud() {
  const p = game.player;
  weaponHud.update(game);
  const vehicle=game.vehicle();$('vehicleStatus').classList.toggle('hidden',!vehicle);
  if(vehicle){const d=VEHICLES[vehicle.type];$('vehicleStatus').innerHTML='<strong>'+vehicleName(vehicle).toUpperCase()+'</strong><span>HULL '+Math.ceil(vehicle.hull)+' / '+d.hull+' · FUEL '+Math.ceil(vehicle.fuel)+'s · '+(vehicle.reload>0?'RELOADING…':vehicle.rounds+' / '+vehicle.reserve+' ROUNDS')+'</span><small>← → DRIVE · ↑ HOP · ↓ BRAKE · SPACE FIRE · R RELOAD · E EXIT</small>';}

  const task=missionStatus(game);$('missionTask').classList.toggle('hidden',!task||task.kind==='escape'||game.safe);
  if(task){$('missionTaskTitle').textContent=task.title;$('missionTaskDetail').textContent=task.detail+(task.target!==null?' · '+(task.target>p.x?'→':'←')+' '+Math.round(Math.abs(task.target-p.x)/100)+'m':'');$('missionTaskProgress').style.width=(task.progress*100)+'%';}
  const route=routeStatus(game);
  $('contractStatus').textContent=route.contractLabel;
  $('missionObjective').textContent=route.objective;$('nextShelter').textContent=game.safe?'':route.nextLabel;
  if($('houseMarkers').dataset.seed!==String(game.stage.seed)){$('houseMarkers').dataset.seed=String(game.stage.seed);$('houseMarkers').innerHTML=game.stage.houses.map(h=>'<i data-house-marker="'+h.id+'" style="left:'+((h.x+h.w/2)/game.stage.finishX*100)+'%"></i>').join('');}
  for(const marker of $('houseMarkers').children){const h=game.stage.houses[Number(marker.dataset.houseMarker)];marker.className=h.collapsed?'collapsed':h.id===p.house?'occupied':h.remaining?'stocked':'empty';marker.title=h.collapsed?'Collapsed shelter':h.remaining?'Shelter with supplies':'Empty shelter';}
  if(route.occupied){$('shelterIntegrityText').textContent='STRUCTURE '+Math.ceil(route.integrity*100)+'%';$('shelterIntegrityFill').style.width=(route.integrity*100)+'%';$('shelterBadge').classList.toggle('critical',route.integrity<.3);}

  $('heroName').textContent = game.character.name.toUpperCase(); $('healthText').textContent = `${Math.ceil(p.health)} / 100`; $('healthFill').style.width = `${p.health}%`; $('healthFill').style.background = p.health < 30 ? '#e99d7e' : '#e1f18a';
  $('weaponText').textContent = WEAPONS[p.weapon].name.toUpperCase();
  const ammo = game.ammo();
  $('ammoText').textContent = WEAPONS[p.weapon].magazine ? p.reload > 0 ? 'RELOADING…' : `${ammo.magazine} / ${ammo.reserve}` : 'NO AMMO NEEDED';
  $('stageText').textContent = `SECTOR ${String(game.stage.level.index + 1).padStart(2, '0')} · ${PROFILES[game.stage.profile].label}`;
  $('districtText').textContent = game.safe ? 'Safe zone' : game.stage.level.name;
  $('routeFill').style.width = `${Math.min(100, game.maxDistance / game.stage.finishX * 100)}%`; $('moneyText').textContent = game.money.toLocaleString();
  $('dogText').textContent = game.dog.lost ? 'BISCUIT · LOST THIS ATTEMPT' : game.dog.rescued ? `BISCUIT · ${Math.max(0, Math.ceil(game.dog.health))} / 45` : 'DOG · NOT RESCUED';
  const unavailable = game.character.id === 'soldier' && (!p.pistol || p.weapon !== 'pistol' || !p.magazine);
  $('abilityText').textContent = p.riding ? 'Exit vehicle to use ability' : p.ability > 0 ? `${game.character.ability} · ${Math.ceil(p.ability)}s` : unavailable ? 'Burst · needs loaded pistol' : `${game.character.ability} · ready`;
  $('abilityHud').style.opacity = p.ability > 0 || !!p.riding || unavailable || game.mode === 'sheltered' || game.safe ? '.45' : '1';
  $('shelterBadge').classList.toggle('hidden', game.player.house === null);
}

function showControls() {
  openModal('controls', 'A QUICK REFRESHER', 'Know your way around.', `<p>Get to the end of the street. Take shelter when you need it. Keep moving when you can.</p><div class="control-list"><span><kbd>←</kbd> <kbd>→</kbd></span><span>Move left / right</span><span><kbd>↑</kbd></span><span>Jump; enter / leave at a doorway</span><span><kbd>↓</kbd></span><span>Brake while driving</span><span><kbd>SPACE</kbd></span><span>Attack (hold to repeat)</span><span><kbd>X</kbd></span><span>Next owned weapon (Z: previous; 1–9: direct slot)</span><span><kbd>R</kbd></span><span>Reload / refuel the equipped weapon</span><span><kbd>E</kbd></span><span>Board / exit; talk; operate mechanisms (hold for generators)</span><span><kbd>C</kbd></span><span>Use your survivor’s special ability</span><span><kbd>L</kbd></span><span>Toggle flashlight</span><span><kbd>ESC</kbd></span><span>Pause / resume</span></div><p>Face your target to aim. Jump onto cars to reach awnings and rooftops. Window light turns blue when a house runs out of supplies.</p><button id="doneControls" class="button primary">Got it <span>→</span></button>`);
  $('doneControls').onclick = () => closeModal();
}
function showGuide() {
  openModal('guide', 'NOT EVERY NEIGHBOR IS FRIENDLY', 'The field guide.', `<div class="guide-grid"><div class="guide-tile"><strong>01 / Know the crowd</strong><p>Thirteen infected roles, including acid lobbers, shockwave-producing tremors and charging rammers. Move out of amber landing circles, jump over ground shockwaves and bait charges into solid cover. Inspect every type in the museum.</p></div><div class="guide-tile"><strong>02 / A light in the window</strong><p>Green means supplies remain; blue means empty. Crates give immediate supplies. Plant-filled houses can refill after 10 seconds inside. Twin mailboxes reward a return visit. Clinics need 5 seconds inside.</p></div><div class="guide-tile"><strong>03 / Safe, for a while</strong><p>Stand at a door and press ↑. You disappear inside; brighter windows show you’re home. Houses crack, smoke, and eventually collapse. Being inside a collapse costs 12 health.</p></div><div class="guide-tile"><strong>04 / A very good dog</strong><p>Find Biscuit’s cage in the neighborhood. Walk close to rescue him. He distracts zombies, but can be lost for the attempt. Take shelter together.</p></div><div class="guide-tile"><strong>05 / Every attempt counts</strong><p>Collected money survives death. Retrying restores stage-entry gear and full health. The same route, pickups, and rescue reset. Coins can be collected again.</p></div><div class="guide-tile"><strong>06 / One more street</strong><p>Cross the gate for safety and a completion bonus. Shop for supplies and upgrades, then continue into a remixed stage. Health and ammo carry forward.</p></div></div><p>Pick a survivor for their special ability: Jamie shoves, Sarge fires a burst, Rusty builds a barricade, Cleo heals, and Kit dashes.</p><button id="guideControls" class="button secondary">Show keyboard controls <span>⌨</span></button>`);
  $('guideControls').onclick = showControls;
}
function showSettings() {
  const sliders = [
    ['master', 'Master volume', 0, 100], ['music', 'Music', 0, 100], ['effects', 'Sound effects', 0, 200],
    ['effectsBoost', 'Effects amplification', 100, 300],
    ['fxIntensity', 'Visual effect strength', 50, 200], ['shakeIntensity', 'Screen shake strength', 0, 150], ['weatherDensity', 'Weather density', 25, 150],
  ];
  const sliderRow = ([key, label, min, max]) => `<label class="settings-row" for="${key}Volume"><span>${label}<output id="${key}Value">${Math.round(settings[key] * 100)}%</output></span><input id="${key}Volume" type="range" min="${min}" max="${max}" value="${Math.round(settings[key] * 100)}"></label>`;
  const toggleRow = (key, label) => `<label class="settings-row" for="${key}"><span>${label}</span><input id="${key}" type="checkbox" ${settings[key] ? 'checked' : ''}></label>`;
  openModal('settings', 'AUDIO / EFFECTS / DISPLAY', 'Tune the atmosphere', `<div class="settings-columns"><section class="settings-group" aria-label="Audio settings"><h3>AUDIO</h3>${sliders.slice(0,4).map(sliderRow).join('')}${toggleRow('recordedAudio','Use recorded sound effects')}<div class="soundtrack-card"><span>MENU SOUNDTRACK</span><strong>ZombievilleIntro.mp3</strong><small>Menu only · no music during gameplay</small><p id="soundtrackStatus" role="status"></p><p id="audioPackStatus"></p></div><button id="testAudio" class="button secondary">Test sound effects ◖</button></section><section class="settings-group" aria-label="Display settings"><h3>DISPLAY & FEEDBACK</h3>${sliders.slice(4).map(sliderRow).join('')}${toggleRow('damageNumbers','Damage numbers')}${toggleRow('hitMarkers','Hit confirmation markers')}${toggleRow('flashlight','Flashlight beam · L')}${toggleRow('reducedShake','Reduce motion & disable flashes')}<button id="testVisual" class="button secondary">Preview visual effects ✦</button><canvas id="fxPreview" width="600" height="70" aria-label="Effect strength preview"></canvas></section></div><div class="settings-footer"><p>Changes save immediately. Music plays in menus only. Reduced motion disables shake and flashes.</p><button id="doneSettings" class="button primary">Done <span>✓</span></button></div>`);
  const persist = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { toast('Settings apply for this session; browser storage is unavailable.'); } };
  for (const [key] of sliders) $(key + 'Volume').oninput = event => { audio.unlock(); settings[key] = Number(event.target.value) / 100; $(key + 'Value').textContent = `${event.target.value}%`; persist(); };
  $('recordedAudio').onchange = event => { settings.recordedAudio = event.target.checked; persist(); };
  for(const key of ['damageNumbers','hitMarkers','flashlight'])$(key).onchange=event=>{settings[key]=event.target.checked;persist();};
  $('reducedShake').onchange = event => { settings.reducedShake = event.target.checked; persist(); };
  $('testAudio').onclick = () => { audio.unlock(); audio.play('shot', { weapon: 'shotgun' }); };
  $('testVisual').onclick = () => {
    const canvas = $('fxPreview'), c = canvas.getContext('2d'), start = performance.now();
    function preview(now) {
      if (modalType !== 'settings' || !canvas.isConnected) return;
      const t = (now - start) / 1100, strength = settings.fxIntensity;
      c.fillStyle = '#0d1920'; c.fillRect(0, 0, 600, 100);
      for (let i = 0; i < 26; i++) { const angle = i * Math.PI * 2 / 26, radius = t * 130 * strength; c.fillStyle = `rgba(231,207,146,${Math.max(0, 1 - t)})`; c.beginPath(); c.arc(300 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius * .28, 3 * strength, 0, Math.PI * 2); c.fill(); }
      if (t < 1) requestAnimationFrame(preview);
    }
    requestAnimationFrame(preview);
  };
  $('testVisual').click(); $('doneSettings').onclick = () => closeModal();
}
function showPause() {
  if (!['playing', 'sheltered', 'paused'].includes(game.mode)) return;
  openModal('pause', 'TAKE A BREATHER', 'The street can wait.', `<p>Everything is paused. Your coins are saved; leaving this attempt restarts the current stage when you return.</p><button id="resumeGame" class="button primary">Back to the street <span>→</span></button><div class="modal-actions"><button id="pauseSettings" class="button secondary">Settings</button><button id="returnMenu" class="button secondary">Save & title</button></div>`);
  $('resumeGame').onclick = () => closeModal(); $('pauseSettings').onclick = showSettings; $('returnMenu').onclick = () => { game.save(); showMenu(); };
}
function showDeath() {
  $('chapter').classList.remove('show');
  openModal('dead', 'ANOTHER BAD DAY', 'Down, not done.', `<p>${game.deathReason||'The street got the better of you.'} Your money stays with you. Retry the same stage with full health and your stage-entry gear.</p><div class="death-stats"><div><strong>${Math.floor(game.maxDistance / game.stage.finishX * 100)}%</strong><span>STREET COVERED</span></div><div><strong>${game.kills}</strong><span>ZOMBIES DEFEATED</span></div><div><strong>${game.money}</strong><span>COINS KEPT</span></div></div><button id="retryGame" class="button primary">One more try <span>↗</span></button><button id="deathMenu" class="button secondary">Back to title <span>←</span></button>`, { locked: true });
  $('retryGame').onclick = () => { audio.unlock(); closeModal(false); game.retry(); }; $('deathMenu').onclick = showMenu;
}
function showShop() {
  const p = game.player, nextMission = game.armory ? game.stage.level : LEVELS[(game.stage.level.index + 1) % LEVELS.length];
  const hasGun = Object.keys(WEAPONS).some(id => WEAPONS[id].magazine && game.ownsWeapon(id));
  const stock = SHOP_ITEMS.filter(item => (item.weapon ? WEAPONS[item.weapon].family : 'supplies') === shopFamily);
  const items = stock.map(item => {
    const locked = item.firearm && !hasGun, owned = item.weapon && game.ownsWeapon(item.weapon);
    const level = item.upgrade ? p.upgrades[item.upgrade] : null, maxed = level !== null && level >= (item.upgrade === 'reload' ? 4 : 5);
    const label = owned ? 'OWNED' : locked ? 'NEEDS A FIREARM' : maxed ? 'MAXED OUT' : item.id === 'heal' && p.health >= 100 ? 'FULL HEALTH' : `BUY · ${game.itemPrice(item)} COINS`;
    const ammo = owned ? game.ammo(item.weapon) : null;
    return `<div class="shop-item ${locked ? 'locked' : ''}"><canvas data-shop-art="${item.id}" width="300" height="130" aria-label="${item.name}"></canvas><strong>${item.name}</strong>${item.weapon ? `<span class="weapon-family-label">${WEAPON_FAMILIES[WEAPONS[item.weapon].family]} · ${WEAPONS[item.weapon].resource}</span>` : ''}${item.weapon?`<div class="shop-weapon-stats">${WEAPONS[item.weapon].role}<br>DMG ${Math.round(WEAPONS[item.weapon].damage*(item.weapon==='fists'?1:1+(WEAPONS[item.weapon].family==='melee'?p.upgrades.bat:p.upgrades.damage)*.2))}${WEAPONS[item.weapon].pellets?' × '+WEAPONS[item.weapon].pellets:''} · ${WEAPONS[item.weapon].cooldown}s INTERVAL · ${WEAPONS[item.weapon].reach?'REACH '+WEAPONS[item.weapon].reach:'RANGE '+(WEAPONS[item.weapon].range||935)}</div>`:''}<small>${item.description}${level !== null ? ` <b>Level ${level}.</b>` : ''}</small>${owned ? `<span class="owned-ammo">${WEAPONS[item.weapon].magazine ? `${ammo.magazine} loaded · ${ammo.reserve} spare` : 'UNLIMITED USE'}</span><button data-equip="${item.weapon}" ${p.weapon === item.weapon ? 'disabled' : ''}>${p.weapon === item.weapon ? 'EQUIPPED' : 'EQUIP'}</button>` : `<button data-buy="${item.id}" ${game.canBuy(item) ? '' : 'disabled'}>${label} +</button>`}</div>`;
  }).join('');
  openModal('shop', game.armory ? 'QUARTERMASTER / ARMORY' : `STAGE ${String(game.number).padStart(2, '0')} COMPLETE · THE LAST SHELF`, 'The Last Shelf', `<div class="armory-banner"><canvas id="armoryShelf" width="900" height="230" aria-label="Weapon rack with pistol, shotgun, SMG, rifle and supplies"></canvas><div><span class="detail-kicker">MORGAN / QUARTERMASTER</span><p>Inspect the rack. Choose your weapon. Every purchase carries into future missions.</p><span>Earn coins from kills, field contracts and bonus stashes.</span></div></div><div class="shop-balance"><span>YOUR POCKETS <strong>✦ ${game.money.toLocaleString()} coins</strong></span><span>HEALTH <strong>${Math.ceil(p.health)} / 100</strong></span></div><div class="armory-tabs" aria-label="Armory categories">${Object.entries({...WEAPON_FAMILIES,supplies:'Supplies & upgrades'}).map(([id,label])=>`<button data-armory-family="${id}" class="${shopFamily===id?'selected':''}">${label} <span>${SHOP_ITEMS.filter(item=>(item.weapon?WEAPONS[item.weapon].family:'supplies')===id).length}</span></button>`).join('')}</div><div class="shop-grid">${items}</div><p class="shop-summary">X cycles owned weapons · Z previous · R reloads · Rounds, fuel and cells are tracked per weapon.<br>Next: ${nextMission.name} / ${PROFILES[nextMission.profile].label.toLowerCase()}. Equipment and funds carry forward.</p><button id="nextStage" class="button primary">${game.armory ? 'Start Game' : 'Continue to next mission'} <span>→</span></button><div class="modal-actions"><button id="shopMenu" class="button secondary">Save & return to title</button><button id="shopLevels" class="button secondary">Choose mission ↗</button><button id="shopSettings" class="button secondary">Audio & effects</button></div>`, { locked: true, shop: true });
  drawArmoryShelf($('armoryShelf'), shopFamily);
  document.querySelectorAll('[data-armory-family]').forEach(button => button.onclick = () => { shopFamily = button.dataset.armoryFamily; shopScroll = 0; showShop(); });
  $('modal').scrollTop = shopScroll;
  document.querySelectorAll('[data-shop-art]').forEach(canvas => drawShopArt(canvas, SHOP_ITEMS.find(item => item.id === canvas.dataset.shopArt)));
  document.querySelectorAll('[data-buy]').forEach(button => button.onclick = () => { shopScroll = $('modal').scrollTop; if (game.buy(button.dataset.buy)) showShop(); });
  document.querySelectorAll('[data-equip]').forEach(button => button.onclick = () => { shopScroll = $('modal').scrollTop; p.weapon = button.dataset.equip; game.loadout = game.equipment(); audio.play('switch'); game.save(); showShop(); });
  $('nextStage').onclick = () => { closeModal(false); clearInput(); game.nextStage(); };
  $('shopMenu').onclick = () => { game.save(); showMenu(); }; $('shopLevels').onclick = () => { game.save(); archive.openLevels(); }; $('shopSettings').onclick = showSettings;
}

$('armoryButton').onclick = () => { audio.unlock(); game.openArmory(); };
$('guideButton').onclick = showGuide; $('settingsButton').onclick = showSettings; $('pauseButton').onclick = showPause; $('controlsButton').onclick = showControls; $('closeModal').onclick = () => closeModal();
$('levelsButton').onclick = () => archive.openLevels(); $('levelsNav').onclick = () => archive.openLevels();
$('museumButton').onclick = () => archive.openMuseum(); $('museumNav').onclick = () => archive.openMuseum();
$('soundButton').onclick = () => { audio.unlock(); audio.play('ui'); $('soundButton').textContent = '◖ Audio enabled'; };
$('fullscreenButton').onclick = async () => { audio.unlock(); try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('Fullscreen is unavailable in this preview. Open the game in a separate browser and press F11.'); } };
document.addEventListener('pointerdown', () => { audio.unlock(); $('soundButton').textContent = '◖ Audio enabled'; }, { passive: true });
// Delegation covers every static and dynamically rendered menu button, including
// keyboard activation. Page transitions have a separate soft transition cue.
document.addEventListener('click', event => {
  const control = event.target.closest?.('button, a.brand');
  if (!control || control.disabled) return;
  audio.unlock(); audio.play('ui');
}, { capture: true });
document.addEventListener('change', event => { if (event.target.matches('select, input[type="checkbox"], input[type="range"]')) audio.play('ui'); });
$('brand').onclick = event => { event.preventDefault(); if (game.mode === 'menu') return; if (['playing', 'sheltered', 'paused'].includes(game.mode)) showPause(); else { game.save(); showMenu(); } };

window.addEventListener('keydown', event => {
  if (archive.active) { if (!event.target.matches('input,select,textarea') && archive.trainingKey(event.code)) { event.preventDefault(); return; } if (event.code === 'Escape') { event.preventDefault(); archive.escape(); } return; }
  if (event.key === 'Tab' && modalType) {
    const focusable = [...$('modal').querySelectorAll('button:not(:disabled):not(.hidden), input, [tabindex="0"]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === $('modal'))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === $('modal'))) { event.preventDefault(); first?.focus(); }
    return;
  }
  if (event.code === 'Escape') {
    event.preventDefault();
    if (modalType && !['shop', 'dead'].includes(modalType)) closeModal(); else if (!modalType) showPause();
    return;
  }
  if (modalType || game.mode === 'menu') return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyZ', 'KeyR', 'KeyC', 'KeyE'].includes(event.code)) event.preventDefault();
  if (event.code === 'ArrowLeft') input.left = true;
  if (event.code === 'ArrowRight') input.right = true;
  if (event.code === 'Space') input.attack = true;
  if(event.code==='ArrowDown')input.brake=true;
  if (event.repeat) return;
  if (event.code === 'ArrowUp') game.jumpOrShelter();
  if (event.code === 'KeyX') game.toggleWeapon();
  if (event.code === 'KeyZ') game.toggleWeapon(-1);
  if (/^Digit[1-9]$/.test(event.code)) { const owned = Object.keys(WEAPONS).filter(id => game.ownsWeapon(id)); game.equipWeapon(owned[Number(event.code.at(-1)) - 1]); }
  if (event.code === 'KeyR') game.reload();
  if (event.code === 'KeyC') game.ability();
  if (event.code === 'KeyE') {input.interact=true;game.interact();}
  if (event.code === 'KeyL') {settings.flashlight=!settings.flashlight;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}audio.play('ui');toast(settings.flashlight?'Flashlight on':'Flashlight off',1200);}
});
window.addEventListener('keyup', event => { archive.trainingKey(event.code,false); if (event.code === 'KeyE') input.interact=false;if(event.code==='ArrowDown')input.brake=false;if (event.code === 'ArrowLeft') input.left = false; if (event.code === 'ArrowRight') input.right = false; if (event.code === 'Space') { input.attack = false; game.player.sawRunning = false; } });
window.addEventListener('blur', () => { archive.stopTraining();clearInput(); if (['playing', 'sheltered'].includes(game.mode) && !modalType) showPause(); });
document.addEventListener('visibilitychange', () => { audio.setHidden(document.hidden);if (document.hidden) { archive.stopTraining(); clearInput(); if (['playing', 'sheltered'].includes(game.mode) && !modalType) showPause(); } });
window.addEventListener('resize', () => renderer.resize());
let lastTime = performance.now(), hudTime = 0;
function frame(now) {
  const dt = Math.min(.035, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  game.update(dt, input, renderer.width);
  if (game.mode === 'dead' || game.mode === 'shop') game.animateVisuals(dt);
  const preview = archive.tick(dt); renderer.draw(preview || game, dt, settings);
  hudTime += dt; if (hudTime > .07 && game.mode !== 'menu') { updateHud(); hudTime = 0; }
  audio.update(preview || game);
  if (modalType === 'settings' && $('audioPackStatus')) {
    $('audioPackStatus').textContent = !audio.context ? 'Enable audio to load the supplied pack.' : `${audio.samples?.buffers.size || 0} recorded clips ready${audio.samples?.pending.size ? ' · loading…' : ''}${audio.samples?.failed.size ? ' · some clips unavailable' : ''}`;
    const bank = audio.samples, track = bank?.music?.key;
    $('soundtrackStatus').textContent = !audio.context ? 'Music starts after enabling audio.' : game.mode !== 'menu' ? 'Gameplay music off · sound effects only' : settings.master === 0 || settings.music === 0 ? 'Music muted' : track ? `Playing · ${track === 'defeat' ? 'death.mp3' : 'ZombievilleIntro.mp3'}` : bank?.pending.size ? 'Loading supplied soundtrack…' : 'Soundtrack unavailable · music remains silent';
  }
  requestAnimationFrame(frame);
}
showMenu(); requestAnimationFrame(frame);

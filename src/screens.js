import { LEVELS, REGIONS, getLevel } from './levels.js';
import { CATALOG, CATEGORY_NAMES, WEATHER_NAMES, HAZARD_NAMES, drawCatalogArt, ReviewStore } from './catalog.js';
import { drawLevelPreview } from './scenery.js';
import { Game } from './game.js';
import { TrainingSession, TRAINING_PRESETS } from './training.js';
import { VEHICLES, vehicleName } from './vehicle-data.js';
import { MISSION_TYPES } from './mission-data.js';
import { makeStage } from './world.js';
import { PROFILES, GROUND, WEAPONS, WEAPON_FAMILIES, ENEMIES } from './data.js';

const $ = id => document.getElementById(id);
export class ArchiveScreens {
  constructor({ game, audio, onOpen, onClose, onLaunch }) {
    this.game = game; this.audio = audio; this.onOpen = onOpen; this.onClose = onClose; this.onLaunch = onLaunch;
    this.active = null; this.region = 'all'; this.level = LEVELS[0]; this.weaponFamily = 'all'; this.category = 'infected'; this.entry = CATALOG.find(e => e.category === 'infected'); this.pose = 'walk';this.look=0; this.time = 0; this.previewGame = null;
    let storage; try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw Error('Storage unavailable'); } }; }
    this.reviews = new ReviewStore(storage);
  }
  begin(kind) {
    this.stopTraining();this.audio.unlock(); this.audio.play('page'); this.onOpen();
    document.body.classList.add('archive-open');
    if (!this.active) { this.previousMode = this.game.mode; this.game.pause(); }
    this.active = kind; $('archiveScreen').classList.remove('hidden');
    for (const id of ['menu', 'header', 'hud']) $(id).inert = true;
  }
  close(resume = true) {
    this.stopTraining();this.audio.play('page');
    document.body.classList.remove('archive-open');
    this.active = null; this.previewGame = null; this.game.previewLevel = null; $('archiveScreen').classList.add('hidden'); $('archiveScreen').classList.remove('photo-screen');
    for (const id of ['menu', 'header', 'hud']) $(id).inert = false;
    if (resume) this.game.resume(); this.onClose();
  }
  escape() { if (!this.active) return false; if (this.active === 'preview') this.openLevels(); else if(this.active==='range')this.openMuseum();else this.close(); return true; }
  openTraining(id,options={}) {
    this.begin('range');this.trainingId=id;
    this.session=new TrainingSession(id,e=>this.audio.play(e.type,e),options);this.previewGame=this.session.game;
    $('archiveScreen').classList.add('photo-screen');
    $('archiveScreen').innerHTML=this.header('QUARANTINE MUSEUM / LIVE WEAPON TRIAL',(options.vehicle?vehicleName({type:options.vehicle,skin:options.skin||'road'}):WEAPONS[id].name),'<button id="rangeBack">← Museum</button>')+`<div class="range-panel"><span class="range-note">${options.vehicle?'VEHICLE TRIAL · Arrows drive · DOWN brakes · UP hops · E exits · SPACE fires':'ISOLATED TRAINING · Your save and funds are unchanged.'}</span><div class="range-options"><label>Scenario<select id="rangePreset">${Object.entries(TRAINING_PRESETS).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')}</select></label><label>Targets<select id="rangeEnemy"><option value="mixed">Mixed infected</option>${Object.entries(ENEMIES).map(([k,v])=>'<option value="'+k+'">'+(v.name||k[0].toUpperCase()+k.slice(1))+'</option>').join('')}</select></label>${options.vehicle?`<label>Terrain<select id="rangeSkin"><option value="road">Road</option><option value="snow">Snow</option><option value="mud">Marsh</option><option value="sand">Desert</option><option value="space">Space</option></select></label>`:''}<label class="range-check"><input id="rangeAutoReload" type="checkbox" ${this.session.autoReload?'checked':''}>Auto reload</label><label class="range-check"><input id="rangeAutoRespawn" type="checkbox" ${this.session.autoRespawn?'checked':''}>Respawn targets</label></div><div id="rangeStats" class="range-stats"></div></div><div class="photo-controls range-controls"><button id="rangePrevious">← Weapon</button><button id="rangeAttack">Fire / swing · SPACE</button><button id="rangeAuto">Repeat: OFF</button><button id="rangeReload">Reload · R</button><button id="rangeReset">Reset bay</button><button id="rangeNext">Weapon →</button><strong id="rangeAmmo"></strong></div>`;
    if(options.vehicle)$('rangeSkin').value=options.skin||'road';
    $('rangePreset').value=this.session.preset;$('rangeEnemy').value=this.session.enemy;
    const chosen=()=>({preset:$('rangePreset').value,enemy:$('rangeEnemy').value,autoReload:$('rangeAutoReload').checked,autoRespawn:$('rangeAutoRespawn').checked,...(options.vehicle?{vehicle:options.vehicle,skin:$('rangeSkin').value}:{})});
    const ids=Object.keys(WEAPONS),i=ids.indexOf(id);
    $('archiveBack').onclick=$('rangeBack').onclick=()=>this.openMuseum();
    $('rangePrevious').onclick=()=>this.openTraining(options.vehicle?'pistol':ids[(i-1+ids.length)%ids.length],options.vehicle?{...chosen(),vehicle:options.vehicle==='tank'?'buggy':'tank'}:chosen());$('rangeNext').onclick=()=>this.openTraining(options.vehicle?'pistol':ids[(i+1)%ids.length],options.vehicle?{...chosen(),vehicle:options.vehicle==='tank'?'buggy':'tank'}:chosen());
    if(options.vehicle){$('rangePrevious').textContent='← Vehicle';$('rangeNext').textContent='Vehicle →';}
    $('rangeAttack').onclick=()=>this.session.attack();$('rangeReload').onclick=()=>this.previewGame.reload();
    $('rangeAuto').onclick=()=>{this.session.repeat=!this.session.repeat;$('rangeAuto').textContent='Repeat: '+(this.session.repeat?'ON':'OFF');};
    $('rangeReset').onclick=()=>this.openTraining(id,chosen());
    $('rangePreset').onchange=$('rangeEnemy').onchange=()=>{Object.assign(this.session,chosen());this.session.resetTargets();};
    if(options.vehicle)$('rangeSkin').onchange=()=>this.openTraining(id,chosen());
    $('rangeAutoReload').onchange=()=>this.session.autoReload=$('rangeAutoReload').checked;
    $('rangeAutoRespawn').onchange=()=>this.session.autoRespawn=$('rangeAutoRespawn').checked;
    $('rangeAttack').focus({preventScroll:true});
  }
  trainingKey(code,down=true) {
    if(this.active!=='range')return false;
    if(code==='ArrowLeft'||code==='ArrowRight'){this.session.controls[code==='ArrowLeft'?'left':'right']=down;return true;}
    if(code==='ArrowDown'){this.session.controls.brake=down;return true;}
    if(code==='ArrowUp'){if(down&&!this.session.upHeld)this.previewGame.jumpOrShelter();this.session.upHeld=down;return true;}
    if(code==='KeyE'){if(down&&!this.session.eHeld)this.previewGame.interact();this.session.eHeld=down;return true;}
    if(code==='Space'){this.session.held=down;return true;}if(code==='KeyR'&&down){this.previewGame.reload();return true;}return false;
  }
  stopTraining(){if(this.active==='range'&&this.session){this.session.release();if($('rangeAuto'))$('rangeAuto').textContent='Repeat: OFF';}}
  header(kicker, title, extra = '') { return `<div class="archive-top"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2></div><div class="archive-top-actions">${extra}<button id="archiveBack">← Back</button></div></div>`; }
  openLevels() {
    this.begin('levels'); this.previewGame = null; this.game.previewLevel = null; $('archiveScreen').classList.remove('photo-screen');
    if (this.region !== 'all' && String(this.level.region) !== String(this.region)) this.level = LEVELS.find(l => String(l.region) === String(this.region)) || LEVELS[0];
    $('archiveScreen').innerHTML = this.header('CAMPAIGN / MISSION SELECT', 'Campaign', `<span class="unlock-badge">${LEVELS.length} / ${LEVELS.length} ALL UNLOCKED</span><button id="startSelectedMission" class="launch-action">Start Game →</button><button id="openMuseumFromLevels">Museum ↗</button>`) + `<div class="filter-tabs" aria-label="Region filter"><button data-region="all" class="${this.region === 'all' ? 'active' : ''}">All / ${LEVELS.length}</button>${REGIONS.map((r, i) => `<button data-region="${i}" class="${String(this.region) === String(i) ? 'active' : ''}">${r}</button>`).join('')}</div><div class="archive-layout"><div id="missionGrid" class="mission-grid" aria-label="Available missions"></div><aside id="missionDetail" class="mission-detail" aria-label="Mission details"></aside></div><div class="archive-bottom"><span>Weapons and upgrades persist. Replay earlier missions to earn funds.</span><span>DEVELOPMENT / ALL ACCESS</span></div>`;
    $('archiveBack').onclick = () => this.close(); $('openMuseumFromLevels').onclick = () => this.openMuseum();
    $('startSelectedMission').onclick = () => this.launch(this.level);
    document.querySelectorAll('[data-region]').forEach(button => button.onclick = () => { this.region = button.dataset.region; this.openLevels(); });
    this.renderMissionGrid(); this.renderMissionDetail(); $('archiveBack').focus({ preventScroll: true });
  }
  renderMissionGrid() {
    const levels = LEVELS.filter(l => this.region === 'all' || String(l.region) === String(this.region));
    $('missionGrid').innerHTML = levels.map(l => `<button class="mission-card ${this.level.id === l.id ? 'selected' : ''}" data-level="${l.id}" aria-label="Mission ${l.index + 1} ${l.name}" aria-pressed="${this.level.id === l.id}"><canvas width="320" height="190" aria-hidden="true"></canvas><span class="mission-number">${String(l.index + 1).padStart(2, '0')}</span><span class="mission-clear">${this.game.completed.includes(l.id) ? '✓ Cleared' : 'Available'}</span><div class="mission-info"><strong>${l.name}</strong><small>${MISSION_TYPES[l.objectiveType].name} / ${'◆'.repeat(l.difficulty)}</small></div></button>`).join('');
    document.querySelectorAll('[data-level]').forEach(button => { const level = getLevel(button.dataset.level); drawLevelPreview(button.querySelector('canvas'), level, 1.5); button.onclick = () => { this.level = level; this.audio.play('ui'); document.querySelectorAll('[data-level]').forEach(b => { b.classList.toggle('selected', b.dataset.level === level.id); b.setAttribute('aria-pressed', String(b.dataset.level === level.id)); }); this.renderMissionDetail(); }; });
  }
  renderMissionDetail() {
    const l = this.level, gear = this.game.loadout,stage=makeStage(l.seed,l.index+1,l.id);
    $('startSelectedMission').title = `Start ${l.name}`;
    $('missionDetail').innerHTML = `<canvas id="missionPreview" width="620" height="350" aria-label="${l.name} environment preview"></canvas><div class="detail-kicker">SECTOR ${String(l.index + 1).padStart(2, '0')} / ${l.subtitle}</div><h3>${l.name}</h3><p>${l.description}</p><div class="mission-facts"><span>Mission objective<strong>${MISSION_TYPES[l.objectiveType].name}</strong></span><span>Vehicle salvage<strong>${stage.vehicles.length?vehicleName(stage.vehicles[0]):'None on this route'}</strong></span><span>Encounter profile<strong>${PROFILES[l.profile].label}</strong></span><span>Weather<strong>${WEATHER_NAMES[l.weather]}</strong></span><span>Environmental hazards<strong>${HAZARD_NAMES[l.hazard]}</strong></span><span>Completion reward<strong>✦ ${l.reward}</strong></span></div><div class="loadout-note">Loadout: Bat${gear.pistol ? ' · Pistol' : ''}${Object.keys(gear.arsenal).filter(id => gear.arsenal[id].owned).map(id => ' · ' + WEAPONS[id].name).join('')} · Bat upgrade ${gear.upgrades.bat} · Firearm upgrade ${gear.upgrades.damage}<br>Funds ✦ ${this.game.money.toLocaleString()} · Deploy with full health; equipment and funds carry over.<br>${MISSION_TYPES[l.objectiveType].description} ${l.objectiveType!=='escape'?'Objective bonus: 60 coins.':''}</div><button id="launchMission" class="button primary">Start Game <span>→</span></button><button id="previewMission" class="button secondary">Immersive Preview <span>◉</span></button><button id="missionArchive" class="button secondary">Mission Dossier & Review <span>↗</span></button>`;
    drawLevelPreview($('missionPreview'), l, this.time);
    $('launchMission').onclick = () => this.launch(l); $('previewMission').onclick = () => this.openPreview(l); $('missionArchive').onclick = () => { this.category = 'missions'; this.entry = CATALOG.find(e => e.key === l.id && e.category === 'missions'); this.openMuseum(); };
  }
  launch(level) { this.audio.unlock(); this.close(false); this.onLaunch(level); }
  openPreview(level) {
    this.begin('preview'); this.level = level;
    this.previewGame = new Game(); this.previewGame.selectLevel(level.id); this.previewGame.mode = 'paused'; this.previewGame.isPreview = true;
    this.previewGame.player.x = 280;
    for (let i = 0; i < 12; i++) { const type = ['walker', 'runner', 'brute', 'spitter'][i % 4]; this.previewGame.safe = false; this.previewGame.spawnEnemy(type, 620 + i * this.previewGame.stage.length / 12); }
    $('archiveScreen').classList.add('photo-screen'); $('archiveScreen').innerHTML = this.header(`ENVIRONMENT INSPECTION / ${level.subtitle}`, level.name, '<button id="previewLaunch">Start Game →</button>') + `<div class="photo-controls"><button id="previousPreview">← Previous</button><strong>${String(level.index + 1).padStart(2, '0')} / ${LEVELS.length}</strong><label for="previewPosition">Route position</label><input id="previewPosition" type="range" min="280" max="${this.previewGame.stage.finishX}" value="280" aria-label="Preview route position"><button id="nextPreview">Next →</button></div>`;
    $('archiveBack').onclick = () => this.openLevels(); $('previewLaunch').onclick = () => this.launch(level);
    $('previousPreview').onclick = () => this.openPreview(LEVELS[(level.index + LEVELS.length - 1) % LEVELS.length]); $('nextPreview').onclick = () => this.openPreview(LEVELS[(level.index + 1) % LEVELS.length]);
    $('previewPosition').oninput = e => { this.previewGame.player.x = Number(e.target.value); };
    $('archiveBack').focus({ preventScroll: true });
  }
  openMuseum() {
    this.begin('museum'); this.previewGame = null; this.game.previewLevel = null; $('archiveScreen').classList.remove('photo-screen');
    $('archiveScreen').innerHTML = this.header('QUARANTINE MUSEUM / FIELD INTELLIGENCE', 'Quarantine Museum', '<button id="museumExport">Export reviews ↓</button><button id="museumMissions">Campaign ↗</button>') + `<div class="museum-tabs" aria-label="Museum categories">${Object.entries(CATEGORY_NAMES).map(([key, name]) => `<button data-category="${key}" class="${this.category === key ? 'active' : ''}">${name} <span>${CATALOG.filter(e => e.category === key).length}</span></button>`).join('')}</div>${this.category === 'weapons' ? `<div class="armory-tabs" aria-label="Weapon families">${Object.entries({all:'All weapons',...WEAPON_FAMILIES}).map(([id,label])=>`<button data-weapon-family="${id}" class="${this.weaponFamily===id?'selected':''}">${label}</button>`).join('')}</div>` : ''}<div class="museum-layout"><div id="museumList" class="museum-list" aria-label="Collection"></div><article id="museumView" class="museum-view"></article><aside id="museumReview" class="museum-review" aria-label="Developer reviews"></aside></div><div class="archive-bottom"><span>Shared game data and artwork. Preview motion, audition sounds, and record feedback.</span><span>FIELD ARCHIVE / ${CATALOG.length} RECORDS</span></div>`;
    $('archiveBack').onclick = () => this.close(); $('museumMissions').onclick = () => this.openLevels(); $('museumExport').onclick = () => this.exportReviews();
    document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { this.category = button.dataset.category; this.entry = CATALOG.find(e => e.category === this.category); this.openMuseum(); });
    document.querySelectorAll('[data-weapon-family]').forEach(button => button.onclick = () => { this.weaponFamily = button.dataset.weaponFamily; this.openMuseum(); });
    this.renderMuseumList(); this.renderMuseumEntry(); $('archiveBack').focus({ preventScroll: true });
  }
  renderMuseumList() {
    const entries = CATALOG.filter(e => e.category === this.category && (this.category !== 'weapons' || this.weaponFamily === 'all' || e.family === this.weaponFamily));
    if (!entries.some(e => e.id === this.entry.id)) this.entry = entries[0];
    $('museumList').innerHTML = entries.map(e => `<button class="specimen-card ${e.id === this.entry.id ? 'selected' : ''}" data-specimen="${e.id}" aria-label="Dossier: ${e.name}" aria-pressed="${e.id === this.entry.id}"><canvas width="250" height="180" aria-hidden="true"></canvas><strong>${e.name}</strong></button>`).join('');
    document.querySelectorAll('[data-specimen]').forEach(button => { const entry = CATALOG.find(e => e.id === button.dataset.specimen); drawCatalogArt(button.querySelector('canvas'), entry, 1, 'idle'); button.onclick = () => { this.entry = entry; this.audio.play('ui'); document.querySelectorAll('[data-specimen]').forEach(b => { b.classList.toggle('selected', b.dataset.specimen === entry.id); b.setAttribute('aria-pressed', String(b.dataset.specimen === entry.id)); }); this.renderMuseumEntry(); }; });
  }
  renderMuseumEntry() {
    const e = this.entry;
    $('museumView').innerHTML = `<canvas id="specimenImage" width="800" height="510" aria-label="${e.name} live specimen"></canvas><div class="specimen-controls">${e.category === 'infected' ? ['idle', 'walk', 'attack'].map((pose, i) => `<button data-pose="${pose}" class="${this.pose === pose ? 'active' : ''}">${['Idle', 'Walk', 'Attack windup'][i]}</button>`).join('') : ''}<button id="specimenSound">◖ Audition sound</button>${e.level ? '<button id="specimenPreview">Immersive preview</button>' : ''}</div><div class="detail-kicker">${e.subtitle}</div><h3>${e.name}</h3><p>${e.description}</p>${e.stats.length ? `<div class="mission-facts">${e.stats.map(([k, v]) => `<span>${k}<strong>${v}</strong></span>`).join('')}</div>` : ''}<div class="detail-kicker">SURVIVAL NOTES / COUNTERMEASURES</div><p>${e.tactics}</p>${e.level ? '<button id="museumLaunch" class="button primary">Start with current loadout →</button>' : ''}`;
    if(e.category==='infected'||e.category==='vehicles'){const controls=$('museumView').querySelector('.specimen-controls');controls.insertAdjacentHTML('beforeend',[0,1,2].map(i=>'<button data-look="'+i+'" class="'+(this.look===i?'active':'')+'">'+(e.category==='vehicles'?['Road','Snow','Space'][i]:'Look '+(i+1))+'</button>').join(''));document.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{this.look=Number(b.dataset.look);this.renderMuseumEntry();});}
    drawCatalogArt($('specimenImage'), e, this.time, this.pose,this.look);
    document.querySelectorAll('[data-pose]').forEach(button => button.onclick = () => { this.pose = button.dataset.pose; document.querySelectorAll('[data-pose]').forEach(b => b.classList.toggle('active', b === button)); });
    $('specimenSound').onclick = () => { this.audio.unlock(); this.audio.play(e.sound, { heavy: e.key === 'brute', weapon: e.key }); };
    if (e.category === 'weapons') { const button = document.createElement('button'); button.id = 'weaponTrial'; button.className = 'button primary'; button.textContent = 'Try in training bay →'; button.onclick = () => this.openTraining(e.key); $('museumView').appendChild(button); }
    if(e.category==='vehicles'){const button=document.createElement('button');button.className='button primary';button.textContent='Try vehicle in training bay →';button.onclick=()=>this.openTraining('pistol',{vehicle:e.key,skin:['road','snow','space'][this.look]});$('museumView').appendChild(button);}
    if (e.level) { $('specimenPreview').onclick = () => this.openPreview(e.level); $('museumLaunch').onclick = () => this.launch(e.level); }
    this.renderReview();
  }
  renderReview() {
    const e = this.entry, note = this.reviews.get(e.id);
    $('museumReview').innerHTML = `<h3>DEVELOPER REVIEW / INSPECTION</h3><p>Record feedback on appearance, motion, audio, and gameplay. Notes stay in this browser and are never sent automatically.</p><label for="reviewStatus">Review status</label><select id="reviewStatus"><option value="review">Not reviewed</option><option value="improve">Needs improvement</option><option value="priority">Priority</option><option value="approved">Approved</option></select><label for="reviewText">Feedback</label><textarea id="reviewText" maxlength="8000" placeholder="For example: a stronger silhouette, slower gait, quieter rain, or more cover in this area..."></textarea><span id="noteStatus" class="note-status"></span><button id="saveReview" class="button secondary">Save feedback <span>✓</span></button><button id="exportReview" class="button secondary">Export all reviews <span>↓</span></button><div class="review-meta">Dossier ID<br><span id="reviewId"></span><br><br>Inspection checklist<br>Contrast & readability / Consistent physics / Animation pace / Audio layers / Risk & reward</div>`;
    $('reviewText').value = note.text; $('reviewStatus').value = note.status; $('reviewId').textContent = e.id;
    const save = () => { const okay = this.reviews.set(e.id, $('reviewText').value, $('reviewStatus').value); $('noteStatus').textContent = okay ? 'Saved locally' : 'Kept for this session. Export a backup.'; };
    $('reviewText').oninput = save; $('reviewStatus').onchange = save; $('saveReview').onclick = save; $('exportReview').onclick = () => this.exportReviews();
    $('noteStatus').textContent = note.updatedAt ? 'Local feedback loaded' : 'No feedback yet';
  }
  exportReviews() {
    const blob = new Blob([JSON.stringify(this.reviews.export(), null, 2)], { type: 'application/json;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'dead-end-review.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  tick(dt) {
    this.time += dt;
    if (this.active === 'range' && this.previewGame) {
      if(!document.hidden)this.session.update(dt);
      this.rangeHudTimer=(this.rangeHudTimer||0)+dt;
      if(this.rangeHudTimer>.1){this.rangeHudTimer=0;const stats=this.session.summary();$('rangeStats').innerHTML='<span>ATTACKS <strong>'+stats.attacks+'</strong></span><span>HITS <strong>'+stats.hits+'</strong></span><span>DAMAGE <strong>'+Math.round(stats.damage)+'</strong></span><span>DPS <strong>'+stats.dps.toFixed(1)+'</strong></span><span>DEFEATED <strong>'+stats.kills+'</strong></span>';} 
      const p=this.previewGame.player,w=WEAPONS[p.weapon],ammo=this.previewGame.ammo();
      const v=this.previewGame.vehicle();
      $('rangeAmmo').textContent = v ? `HULL ${Math.ceil(v.hull)} · FUEL ${Math.ceil(v.fuel)} · ${v.reload>0?'RELOADING…':v.rounds+' / '+v.reserve}` : p.reload > 0 ? 'RELOADING…' : w.magazine ? `${ammo.magazine} / ${ammo.reserve} ${w.resource}` : 'UNLIMITED';
      return this.previewGame;
    }
    if (this.active === 'museum' && $('specimenImage')) drawCatalogArt($('specimenImage'), this.entry, this.time, this.pose,this.look);
    if (this.active === 'levels' && $('missionPreview')) drawLevelPreview($('missionPreview'), this.level, this.time);
    if (this.active === 'preview' && this.previewGame) { for (const e of this.previewGame.enemies) { e.travel += dt * e.speed * .7; e.vx = e.speed; } this.previewGame.time = this.time; return this.previewGame; }
    return null;
  }
}

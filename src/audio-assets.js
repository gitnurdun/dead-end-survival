// User-supplied local Zombieville audio pack. Paths retain their original case.
export const AUDIO_ASSETS = {
  pistol: 'handgun1.wav', shotgun: 'shotgun1.wav', shotgunPump: 'shotgun2.wav', smg: 'automatic1.wav', rifle: 'magnum.wav', revolver: 'magnum.wav',
  launcher: 'emergence.wav', explosion: 'explosion.wav', flamer: 'flamer-burst.wav', flameLoop: 'flamer-loop.wav', flameStop: 'flamer-stop.wav', chainsaw: 'chainsaw.wav', sawIdle: 'chainsawidle.wav',
  tesla: 'laser-startup.wav', cryo: 'laser-loop.wav', plasma: 'laser-loop.wav', powerDown: 'laser-shutdown.wav',
  swing: 'swordSwoosh.wav', punch: 'punch.wav', impact: 'bodyImpact.wav', heavyImpact: 'LightHit.wav',
  kill1: 'zombieDeath1.wav', kill2: 'zombieDeath2.wav', splat: 'splat.wav', door: 'door1.wav', exit: 'carDoor.wav',
  empty: 'dryfire.wav', switch: 'weaponswap.wav', purchase: 'cashregister.wav', safe: 'fanfare.wav', dead: 'playerDeath.wav', error: 'error.wav',
  intro: 'ZombievilleIntro.mp3', defeat: 'death.mp3', engine: 'engineLoop.wav', engineStart: 'engineStart.wav',
};
export function assetForEvent(type, detail = {}, alternate = false) {
  if (type === 'weapon-tail') return detail.clip;
  if (type === 'shot') return detail.weapon || 'pistol';
  if (type === 'swing') return detail.weapon === 'chainsaw' ? 'chainsaw' : detail.weapon === 'fists' ? 'punch' : 'swing';
  if (type === 'impact') return detail.heavy ? 'heavyImpact' : 'impact';
  if (type === 'kill') return alternate ? 'kill2' : 'kill1';
  if (type === 'enter') return 'door';
  if (type === 'vehicleEnter') return 'engineStart';
  if (type === 'vehicleExit') return 'exit';
  if (type === 'vehicleImpact') return 'heavyImpact';
  if (type === 'pistol' || type === 'ui' || type === 'page') return 'switch';
  if (type === 'spit') return 'splat';
  if (['switch','exit','empty','purchase','safe','dead','explosion'].includes(type)) return type;
  return null;
}

export class SampleBank {
  constructor(context, buses) { this.context = context; this.buses = buses; this.buffers = new Map(); this.pending = new Map(); this.failed = new Set(); this.voices = []; this.music = null; this.musicMode = null; this.alternate = false; this.loop = null; }
  load(key) {
    const path = AUDIO_ASSETS[key]; if (!path || this.failed.has(path)) return Promise.resolve(null);
    if (this.buffers.has(path)) return Promise.resolve(this.buffers.get(path));
    if (this.pending.has(path)) return this.pending.get(path);
    const task = fetch('/audio/' + encodeURIComponent(path)).then(response => { if (!response.ok) throw Error('Audio missing'); return response.arrayBuffer(); }).then(data => this.context.decodeAudioData(data)).then(buffer => {
      let peak = .01;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const samples = buffer.getChannelData(ch); for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i])); }
      const clip = { buffer, gain: Math.min(2, .8 / peak) }; this.buffers.set(path, clip); this.pending.delete(path); return clip;
    }).catch(() => { this.failed.add(path); this.pending.delete(path); return null; });
    this.pending.set(path, task); return task;
  }
  preload() { return Promise.all(Object.keys(AUDIO_ASSETS).map(key => this.load(key))); }
  play(type, detail = {}) {
    const key = assetForEvent(type, detail, this.alternate); this.alternate = !this.alternate;
    const clip = this.buffers.get(AUDIO_ASSETS[key]);
    if (!clip) { if (key) this.load(key); return false; }
    if (detail.sustain && ['chainsaw','flamer'].includes(key)) {
      const loopKey=key==='flamer'?'flameLoop':'chainsaw';
      if (this.buffers.has(AUDIO_ASSETS[loopKey])) return true;
    }
    const c = this.context, node = c.createBufferSource(), gain = c.createGain(), pan = c.createStereoPanner();
    const continuous = ['chainsaw','flamer','cryo','plasma'].includes(key), ui = type === 'ui' || type === 'page';
    const length = Math.min(clip.buffer.duration, continuous ? .2 : ui ? .065 : 5);
    const distance = detail.distance == null ? 1 : Math.max(.08, 1 - detail.distance / 800);
    const volume = clip.gain * (ui ? .2 : type === 'impact' ? .3 : type === 'kill' ? .4 : .65) * distance;
    node.buffer = clip.buffer; pan.pan.value = Math.max(-1, Math.min(1, detail.pan || 0)); node.playbackRate.value = key === 'cryo' ? 1.45 : key === 'tesla' ? .8 : 1;
    const seconds = length / node.playbackRate.value, now = c.currentTime;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .003); gain.gain.setValueAtTime(volume, now + Math.max(.004, seconds - .02)); gain.gain.linearRampToValueAtTime(0, now + seconds);
    const uiBus=['ui','page','purchase'].includes(type) ? this.buses.effects : this.buses.world || this.buses.effects;
    node.connect(gain); gain.connect(pan); pan.connect(uiBus);
    node.onended = () => { node.disconnect(); gain.disconnect(); pan.disconnect(); this.voices = this.voices.filter(v => v !== node); };
    this.voices.push(node); if (this.voices.length > 20) { const old = this.voices.shift(); old.stop(); }
    node.start(now, 0, length); return true;
  }
  stopLoop(tail = false) {
    if (!this.loop) return;
    const old=this.loop;this.loop=null;
    old.gain.gain.setTargetAtTime(.0001,this.context.currentTime,.035);old.node.stop(this.context.currentTime+.18);
    if (tail && old.key==='flamer') this.play('weapon-tail',{clip:'flameStop'});
  }
  syncWeapon(game,enabled=true) {
    const p=game.player, key=p.weapon;
    const active=enabled && game.mode==='playing' && !game.safe && p.house===null && (key==='chainsaw' ? p.sawRunning : p.attackPose>0) && p.reload<=0 && ['chainsaw','flamer'].includes(key);
    if (!active) {this.stopLoop(enabled && game.mode==='playing');return;}
    if (this.loop?.key===key && this.loop.owner===p) return;
    this.stopLoop();
    const clip=this.buffers.get(AUDIO_ASSETS[key==='flamer'?'flameLoop':'chainsaw']);if(!clip)return;
    const c=this.context,node=c.createBufferSource(),gain=c.createGain();node.buffer=clip.buffer;node.loop=true;
    if(key==='chainsaw'){node.loopStart=0;node.loopEnd=clip.buffer.duration*.6;}
    gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(clip.gain*.48,c.currentTime+.035);
    node.connect(gain);gain.connect(this.buses.world||this.buses.effects);node.onended=()=>{node.disconnect();gain.disconnect();};
    this.loop={key,node,gain,owner:p};node.start();
  }
  stopVehicleLoop(){if(!this.vehicleLoop)return;const old=this.vehicleLoop;this.vehicleLoop=null;old.gain.gain.setTargetAtTime(.0001,this.context.currentTime,.04);old.node.stop(this.context.currentTime+.2);}
  syncVehicle(v,enabled=true){
    if(!enabled||!v||v.destroyed||v.fuel<=0){this.stopVehicleLoop();return;}
    if(this.vehicleLoop?.owner!==v){
      this.stopVehicleLoop();const clip=this.buffers.get(AUDIO_ASSETS.engine);if(!clip)return;
      const c=this.context,node=c.createBufferSource(),gain=c.createGain();node.buffer=clip.buffer;node.loop=true;gain.gain.value=clip.gain*.2;node.connect(gain);gain.connect(this.buses.world||this.buses.effects);node.onended=()=>{node.disconnect();gain.disconnect();};node.start();this.vehicleLoop={node,gain,owner:v};
    }
    this.vehicleLoop.node.playbackRate.value=.8+Math.min(1,Math.abs(v.vx)/370)*.45;
  }
  updateMusic(mode, enabled) {
    const key = enabled && mode === 'menu' ? 'intro' : null;
    if (this.musicMode === key && (!key || this.music)) return !!this.music;
    if (this.music) { const old = this.music; old.gain.gain.setValueAtTime(0, this.context.currentTime); old.node.stop(); this.music = null; }
    this.musicMode = key;
    const clip = key && this.buffers.get(AUDIO_ASSETS[key]); if (!clip) { if (key) this.load(key); return false; }
    const c = this.context, node = c.createBufferSource(), gain = c.createGain(); node.buffer = clip.buffer; node.loop = true; gain.gain.value = clip.gain * .36;
    const track={node,gain,key};
    node.connect(gain); gain.connect(this.buses.music); node.onended = () => { node.disconnect(); gain.disconnect(); if(this.music===track)this.music=null; }; node.start(); this.music = track; return true;
  }
}

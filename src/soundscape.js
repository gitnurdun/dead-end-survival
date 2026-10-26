import { SampleBank } from './audio-assets.js';
// Supplied recordings for music. Synthesis is reserved for short gameplay cues.
export class Audio {
  constructor(settings) { this.settings = settings; this.context = null; this.buffers = new Map(); this.throttles = new Map(); this.scene = null; }
  setHidden(hidden) {
    this.hidden=hidden;
    if(this.context&&this.output)this.output.gain.setTargetAtTime(hidden?0:this.settings.master??1,this.context.currentTime,.04);
    if(hidden){this.samples?.stopLoop();this.samples?.stopVehicleLoop?.();}
  }
  unlock() {
    try {
      if (!this.context) {
        const c = this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = c.createDynamicsCompressor(); this.master.threshold.value = -12; this.master.knee.value = 18; this.master.ratio.value = 5; this.master.attack.value = .006; this.master.release.value = .2;
        this.output = c.createGain(); this.output.gain.value = this.settings.master ?? 1; this.master.connect(this.output); this.output.connect(c.destination);
        this.buses = {};
        for (const key of ['music', 'effects', 'ambience']) { const bus = c.createGain(); bus.gain.value = (this.settings[key] ?? .45) * (key === 'effects' ? this.settings.effectsBoost ?? 1.8 : 1); bus.connect(this.master); this.buses[key] = bus; }
        this.buses.world=c.createGain();this.buses.world.connect(this.buses.effects);
        const impulse = c.createBuffer(2, c.sampleRate * 1.8, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const data = impulse.getChannelData(ch); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2.6; }
        this.reverb = c.createConvolver(); this.reverb.buffer = impulse; const wet = c.createGain(); wet.gain.value = .21; this.reverb.connect(wet); wet.connect(this.buses.world);
        this.samples = new SampleBank(c, this.buses); this.samples.preload();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Keep the game playable without an audio device. */ }
  }
  route(source, volume, duration, { bus = null, pan = 0, delay = 0, attack = .004, wet = .12 } = {}) {
    bus ||= this.eventBus || 'world';
    const c = this.context, now = c.currentTime + delay, gain = c.createGain(), stereo = c.createStereoPanner(); stereo.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + attack); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(gain); gain.connect(stereo); stereo.connect(this.buses[bus]);
    if (wet && this.reverb) { const send = c.createGain(); send.gain.value = wet; stereo.connect(send); send.connect(this.reverb); }
    return now;
  }
  tone(frequency, duration = .12, type = 'triangle', volume = .1, endFrequency = null, options = {}) {
    if (!this.context || this.context.state !== 'running') return;
    const c = this.context, oscillator = c.createOscillator(); oscillator.type = type;
    const now = this.route(oscillator, volume, duration, options); oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(15, endFrequency), now + duration);
    oscillator.start(now); oscillator.stop(now + duration + .02);
  }
  noise(duration, volume, frequency = 1300, options = {}) {
    if (!this.context || this.context.state !== 'running') return;
    const c = this.context, key = `${duration.toFixed(2)}-${!!options.brown}`;
    if (!this.buffers.has(key)) { const b = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate), data = b.getChannelData(0); let brown = 0; for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .04) / 1.02; data[i] = options.brown ? brown * 3.5 : Math.random() * 2 - 1; } this.buffers.set(key, b); }
    const source = c.createBufferSource(), filter = c.createBiquadFilter(); source.buffer = this.buffers.get(key); filter.type = options.filter || 'lowpass'; filter.frequency.value = frequency; filter.Q.value = options.q || .8; source.connect(filter);
    const now = this.route(filter, volume, duration, options); source.start(now); source.stop(now + duration + .02);
  }
  allow(name, spacing) { const now = this.context.currentTime; if (now < (this.throttles.get(name) || 0)) return false; this.throttles.set(name, now + spacing); return true; }
  play(type, detail = {}) {
    if (!this.context) return;
    if (this.context.state !== 'running') { if(['ui','page'].includes(type)&&this.context.state==='suspended')this.context.resume().then(()=>this.play(type,detail)).catch(()=>{}); return; }
    this.eventBus=['ui','page','purchase'].includes(type)?'effects':'world';
    if (['ui','page','impact','kill'].includes(type) && !this.allow('sample-' + type, type === 'ui' ? .035 : .055)) return;
    if(type==='ui'){this.tone(660,.065,'triangle',.1,390,{bus:'effects',wet:0});this.noise(.025,.045,3200,{bus:'effects',wet:0});return;}
    if(type==='page'){this.tone(330,.11,'sine',.09,470,{bus:'effects',wet:0});this.tone(550,.1,'triangle',.055,660,{bus:'effects',delay:.055,wet:0});return;}
    if (this.settings.recordedAudio !== false && this.samples?.play(type, detail)) return;
    const pan = detail.pan || 0, distance = detail.distance == null ? 1 : Math.max(.08, 1 - detail.distance / 800), opts = { pan, wet: .14 };
    if (type === 'shot') {
      const gun = detail.weapon || 'pistol', heavy = gun === 'shotgun' || gun === 'rifle';
      this.noise(gun === 'smg' ? .065 : heavy ? .2 : .1, heavy ? .5 : .38, gun === 'shotgun' ? 4200 : 7400, { ...opts, wet: .3 });
      this.tone(heavy ? 82 : gun === 'smg' ? 155 : 115, heavy ? .26 : .14, 'triangle', heavy ? .34 : .25, 33, opts);
      this.noise(heavy ? .6 : .26, heavy ? .2 : .1, 950, { ...opts, delay: .025 });
      this.noise(.045, .065, 4300, { pan: -.25, delay: gun === 'shotgun' ? .42 : .18 });
      if (gun === 'shotgun') { this.noise(.16, .15, 1800, { delay: .37 }); this.noise(.07, .14, 3700, { delay: .58 }); }
    }
    else if (type === 'npc') { this.noise(.17, .09, 1900, { filter: 'bandpass' }); for (let i = 0; i < 3; i++) this.tone(550 + i * 170, .09, 'sine', .055, null, { delay: i * .1 }); }
    else if (type === 'scream') { this.tone(230,1.1,'sawtooth',.07,540,{wet:.35});this.tone(317,1,'triangle',.06,705,{wet:.3});this.noise(.8,.11,1500,{filter:'bandpass'}); }
    else if (type === 'leap' || type === 'windup') { this.noise(.24,.09,700,{filter:'bandpass'});this.tone(95,.3,'sawtooth',.04,210); }
    else if (type === 'swing') { this.noise(.16, .1, 1900, { ...opts, filter: 'bandpass' }); this.tone(210, .12, 'sine', .025, 65); }
    else if (type === 'impact') { if (!this.allow('impact', .055)) return; this.noise(.13, .19, 1100, opts); this.tone(detail.heavy ? 65 : 105, .16, 'triangle', .09, 28); }
    else if (['footstep', 'zombieStep', 'land'].includes(type)) {
      if (!this.allow(type, type === 'zombieStep' ? .17 : .09)) return;
      const enemy = type === 'zombieStep', volume = (type === 'land' ? .15 : enemy ? .055 * distance : .075) * (detail.heavy ? 1.6 : 1);
      this.noise(enemy ? .15 : .08, volume, enemy ? 650 : 1700, opts); this.tone(enemy ? 58 : 85, .09, 'sine', volume * .6, 30, opts);
      if (['rain', 'storm', 'acidrain'].includes(this.scene?.weather)) this.noise(.09, volume * .8, 4100, opts);
    } else if (type === 'growl') {
      if (!this.allow('growl', 1.3)) return;
      const f = detail.heavy ? 37 : 53 + Math.random() * 17;
      this.tone(f, 1.35, 'sawtooth', .025 * distance, f * .65, { ...opts, attack: .16, wet: .32 }); this.tone(f * 2.02, .95, 'triangle', .035 * distance, f * 1.4, { ...opts, delay: .12, attack: .1 }); this.noise(.8, .1 * distance, 430, { ...opts, filter: 'bandpass', q: 2, attack: .08 });
    } else if (type === 'hurt') { this.noise(.2, .19, 1400); this.tone(95, .3, 'triangle', .14, 27); this.tone(240, .13, 'sawtooth', .023, 110); }
    else if (type === 'collapse') { this.noise(1.5, .27, 1150, { wet: .5 }); for (let i = 0; i < 6; i++) this.noise(.13, .11, 1700 + i * 400, { delay: i * .12, pan: Math.sin(i) * .4 }); this.tone(62, .9, 'sine', .18, 19); }
    else if (type === 'houseWarning') {this.noise(.5,.13,630,{wet:.3});this.tone(190,.35,'triangle',.065,95);this.tone(165,.3,'triangle',.05,85,{delay:.38});}
    else if (type === 'houseHit') { this.noise(.16, .15, 700, opts); this.tone(130, .12, 'triangle', .055, 48); }
    else if (type === 'reload') { this.noise(.06, .09, 5200); this.noise(.09, .07, 2800, { delay: .3 }); this.tone(450, .035, 'square', .018, 180, { delay: .35 }); }
    else if (type === 'loaded') { this.noise(.08, .12, 3400); this.tone(700, .035, 'triangle', .035, 200); }
    else if (type === 'ricochet') { if (!this.allow('ricochet', .1)) return; this.tone(1900 + Math.random() * 500, .25, 'sine', .025, 500, opts); this.noise(.045, .055, 6000); }
    else if (type === 'enter' || type === 'exit') { this.noise(.4, .08, 600, { wet: .35 }); this.tone(type === 'enter' ? 165 : 110, .4, 'sawtooth', .012, type === 'enter' ? 65 : 195); this.noise(.09, .13, 800, { delay: .23 }); this.tone(330, .8, 'sine', .035, 220, { delay: .17, wet: .4 }); }
    else if (type === 'bark' || type === 'dogRescue') { this.tone(175, .13, 'sawtooth', .035, 90); this.noise(.12, .065, 700, { filter: 'bandpass' }); if (type === 'dogRescue') this.tone(250, .16, 'triangle', .035, 160, { delay: .2 }); }
    else if (type === 'spit') { this.noise(.28, .11, 900, { filter: 'bandpass', q: 2 }); this.tone(230, .14, 'sine', .035, 70); }
    else if (type === 'coin' || type === 'purchase') { if (!this.allow('coin', .09)) return; this.tone(1400, .14, 'sine', .025, 900); this.noise(.035, .025, 6200); }
    else if (type === 'safe') { this.noise(.8, .16, 900, { wet: .4 }); this.tone(82, .5, 'sine', .16, 32); for (const [i, note] of [220, 261.63, 329.63, 440].entries()) this.tone(note, 1.7, 'triangle', .04, null, { delay: .12 + i * .1, attack: .02, wet: .4 }); }
    else if (type === 'pistol' || type === 'switch') { this.noise(.08, .09, 2600); this.tone(320, .04, 'triangle', .03, 150); }
    else if (type === 'dead' || type === 'dogLost') { this.tone(type === 'dead' ? 73 : 170, 1.5, 'triangle', .13, 28, { wet: .5 }); this.noise(.7, .13, 300); if (type === 'dead') { this.tone(880, 1.2, 'sine', .02, 220, { wet: .4 }); this.noise(.13, .2, 1400); } }
    else if (type === 'ability') { this.noise(.3, .09, 1300); this.tone(90, .24, 'triangle', .07, 220); }
    else if (type === 'supply' || type === 'pickup') { this.noise(.12, .06, 2200); this.tone(440, .12, 'sine', .025, 660); }
    else if (type === 'empty' || type === 'ui') { if (type === 'ui' && !this.allow('ui', .035)) return; this.noise(.04, .07, 3200); this.tone(290, .045, 'triangle', .035, 150); }
    else if (type === 'page') { if (!this.allow('page', .08)) return; this.noise(.16, .055, 1700, { filter: 'bandpass', wet: .05 }); this.tone(170, .12, 'sine', .04, 260); }
    else if (type === 'jump') this.noise(.09, .045, 1200);
    else if (type === 'hazard') { this.noise(.3, .12, 3200, { filter: 'bandpass' }); this.tone(150, .2, 'sawtooth', .025, 65); }
    else if(type==='threatWarning'){this.tone(detail.enemy==='lobber'?570:180,.25,'triangle',.08,detail.enemy==='lobber'?360:90);this.noise(.2,.07,730,{filter:'bandpass'});}
    else if(type==='shockwave'){this.noise(.7,.2,360,{brown:true});this.tone(70,.45,'sine',.17,29);}
    else if(type==='charge'){this.noise(.4,.15,820,{filter:'bandpass'});this.tone(95,.3,'sawtooth',.05,65);}
    else if(['generator','objectiveComplete','beacon','switchPower'].includes(type)){this.tone(type==='switchPower'?330:440,.22,'triangle',.11,660);this.tone(880,.24,'sine',.06,null,{delay:.12});this.noise(.12,.06,1300);}
    else if(['cargoRelease','barrelFuse'].includes(type)){this.noise(.32,.14,1600,{filter:'bandpass'});this.tone(210,.25,'triangle',.08,110);}
    else if(['cargoImpact','vehicleCrash'].includes(type)){this.noise(.5,.24,640,{brown:true});this.tone(62,.35,'sine',.17,28);}
    else if(type==='vehicleHop'){this.noise(.15,.12,550);this.tone(85,.16,'triangle',.06,45);}
  }
  update(game) {
    const c = this.context; if (!c || c.state !== 'running' || !game?.stage) return;
    this.scene = game.previewLevel || game.stage.level;
    this.output.gain.setTargetAtTime(this.hidden ? 0 : this.settings.master ?? 1, c.currentTime, .08);
    this.buses.world?.gain.setTargetAtTime(game.mode === 'paused' ? .08 : 1, c.currentTime, .08);
    this.samples?.syncWeapon(game, !this.hidden && this.settings.recordedAudio !== false);
    this.samples?.syncVehicle?.(game.vehicle?.(),!this.hidden&&game.mode==='playing'&&this.settings.recordedAudio!==false);
    for (const bus of ['music', 'effects', 'ambience']) this.buses[bus].gain.setTargetAtTime((this.settings[bus] ?? .45) * (bus === 'effects' ? this.settings.effectsBoost ?? 1.8 : 1) * (bus === 'music' && game.mode === 'paused' ? .4 : 1), c.currentTime, .08);
    // Music never falls back to generated tones or noise, including while loading.
    this.samples?.updateMusic(game.mode, true);
  }
}

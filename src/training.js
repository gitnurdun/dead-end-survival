import { Game } from './game.js';
import { WEAPONS, ENEMIES, GROUND } from './data.js';
import { makeVehicle } from './vehicle-data.js';
import { interactVehicle } from './vehicles.js';

// A separate simulation: no local-storage callbacks, no campaign purchases.
export function createTraining(id, onEvent = () => {}, options = {}) {
  if (!WEAPONS[id]) return null;
  const game = new Game({ onEvent }); game.newGame('soldier', 431);
  if (id === 'pistol') { game.player.pistol = true; game.player.magazine = 12; game.player.reserve = 120; }
  else if (!['fists','bat'].includes(id)) game.player.arsenal[id] = { owned: true, magazine: WEAPONS[id].magazine || 0, reserve: WEAPONS[id].magazine ? 999 : 0 };
  game.training = true; game.player.weapon = id; game.player.invincible = 0; game.spawnTimer = 1e8;
  Object.assign(game.stage, { platforms: [], hazards: [], props: [], houses: [], npcs: [], pickups: [], vehicles: [], mechanisms:[], mission:null, dogRescueX: 99999 });
  configureTargets(game,options.preset||'line',options.enemy||'mixed');
  return game;
}

export const TRAINING_PRESETS={line:'Firing line',crowd:'Crowd control',cover:'Solid cover',moving:'Moving threats'};
export function configureTargets(game,preset='line',enemy='mixed') {
  game.enemies=[];game.projectiles=[];game.pools=[];game.corpses=[];game.effects=[];game.particles=[];game.floats=[];game.hitConfirm=0;
  game.stage.platforms=preset==='cover'?[{x:420,y:GROUND-90,w:100,h:90,type:'car',variant:'car',solid:true,color:'#465356'}]:[];
  for(const v of game.stage.vehicles||[])game.stage.platforms.push({x:v.x,y:v.y,w:v.w,h:v.h,type:'vehicle',solid:true,vehicle:v.id});
  const positions=preset==='crowd'?[365,405,445,485,525]:preset==='cover'?[365,555,660]:preset==='moving'?[500,620,740]:[365,490,610];
  positions.forEach((x,i)=>{const type=ENEMIES[enemy]?enemy:['armored','walker','brute'][i%3],e=game.spawnEnemy(type,x);if(preset!=='moving')e.speed=0;e.facing=-1;});
}
export class TrainingSession {
  constructor(id,onEvent=()=>{},{preset='line',enemy='mixed',autoReload=true,autoRespawn=true,vehicle=null,skin='road'}={}) {
    this.weapon=id;this.preset=preset;this.enemy=enemy;this.autoReload=autoReload;this.autoRespawn=autoRespawn;this.repeat=false;this.held=false;this.respawnIn=0;this.startedAt=null;
    this.game=createTraining(id,onEvent,{preset,enemy});
    this.controls={};
    if(vehicle){const g=this.game,v=makeVehicle(vehicle,200,'trial-vehicle',GROUND,skin);g.stage.vehicles=[v];g.player.x=160;configureTargets(g,preset,enemy);interactVehicle(g);}
  }
  attack(){this.game.attack();if(this.startedAt===null&&this.game.stats.attacks)this.startedAt=this.game.time;}
  release(){this.held=false;this.repeat=false;this.controls={};this.upHeld=false;this.eHeld=false;this.game.player.attackPose=0;this.game.player.sawRunning=false;}
  resetTargets(){configureTargets(this.game,this.preset,this.enemy);this.respawnIn=0;}
  update(dt) {
    const p=this.game.player,w=WEAPONS[p.weapon],ammo=this.game.ammo();
    const v=this.game.vehicle();
    if(this.autoReload&&(v?v.rounds===0&&v.reserve>0:w.magazine&&ammo.magazine===0&&ammo.reserve>0)&&(this.repeat||this.held))this.game.reload();
    this.game.update(dt,{...this.controls,attack:this.repeat||this.held});
    if(this.startedAt===null&&this.game.stats.attacks)this.startedAt=this.game.time;
    if(this.autoRespawn&&!this.game.enemies.some(e=>e.health>0)){this.respawnIn+=dt;if(this.respawnIn>=1.5)this.resetTargets();}else this.respawnIn=0;
  }
  summary(){const s=this.game.stats,elapsed=this.startedAt===null?0:Math.max(.5,this.game.time-this.startedAt);return{...s,kills:this.game.kills,dps:elapsed?s.damage/elapsed:0};}
}

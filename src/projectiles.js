import { segmentRectTime } from './world.js';
import { GROUND } from './data.js';
import { hostileImpact } from './threats.js';
import { damageVehicle } from './vehicles.js';
import { mechanismTarget } from './mechanisms.js';

// Resolve every swept contact in travel order, including terrain and the gate.
// Range is clipped before collision checks, so the last frame cannot overshoot.
export function advanceProjectile(game, shot, dt) {
  if (shot.life <= 0) return;
  const x = shot.x, y = shot.y, step = Math.min(dt, shot.life);
  const nx = x + shot.vx * step, ny = y + shot.vy * step + .5*(shot.gravity||0)*step*step, contacts = [];
  shot.vy += (shot.gravity||0)*step;
  for (const block of game.stage.platforms) {
    if(block.vehicle && block.vehicle===shot.ignoreVehicle)continue;
    const t = segmentRectTime(x,y,nx,ny,block);
    const mechanism=shot.friendly&&block.mechanism&&game.stage.mechanisms?.find(m=>m.id===block.mechanism&&mechanismTarget(m));
    if (t !== null) contacts.push(mechanism?{t,kind:'mechanism',mechanism}:{t,kind:'terrain',block});
  }
  if(shot.friendly)for(const m of game.stage.mechanisms||[]){if(m.kind!=='cargo'&&game.stage.platforms.some(b=>b.mechanism===m.id))continue;const box=mechanismTarget(m),t=box?segmentRectTime(x,y,nx,ny,box):null;if(t!==null)contacts.push({t,kind:'mechanism',mechanism:m});}
  if(shot.mortar&&ny>=GROUND-9&&ny>y)contacts.push({t:Math.max(0,(GROUND-9-y)/(ny-y)),kind:'ground'});
  if (game.safe && (x - game.stage.finishX) * (nx - game.stage.finishX) <= 0 && nx !== x) contacts.push({t:(game.stage.finishX-x)/(nx-x),kind:'gate'});
  shot.struck ||= [];
  if (shot.friendly) for (const enemy of game.enemies) {
    if (enemy.health <= 0 || shot.struck.includes(enemy)) continue;
    const t = segmentRectTime(x,y,nx,ny,enemy);
    if (t !== null) contacts.push({t,kind:'enemy',enemy});
  } else {
    const target=game.vehicle?.()||game.player;
    const t = segmentRectTime(x,y,nx,ny,target);
    if (t !== null) contacts.push({t,kind:'player'});
  }
  contacts.sort((a,b)=>a.t-b.t || (a.kind==='terrain'||a.kind==='gate'?-1:1));
  shot.life -= dt;
  for (const contact of contacts) {
    shot.x = x + (nx-x)*contact.t; shot.y = y + (ny-y)*contact.t;
    if (contact.kind === 'gate') { shot.life=0; return; }
    if(contact.kind==='mechanism'){game.hitMechanism(contact.mechanism,shot.damage);if(shot.blast)game.explode(shot);shot.life=0;return;}
    if (contact.kind === 'ground') {shot.life=0;hostileImpact(game,shot);return;}
    if (contact.kind === 'terrain') {
      // Keep a blast on the incoming side of the obstacle, never inside it.
      const speed=Math.hypot(shot.vx,shot.vy)||1;
      shot.x-=shot.vx/speed*.2;shot.y-=shot.vy/speed*.2;shot.life=0;
      if(!shot.friendly && game.player.riding && contact.block.vehicle===game.player.riding)damageVehicle(game,shot.damage);
      if (shot.blast) game.explode(shot); else if(shot.mortar)hostileImpact(game,shot); else {game.event('ricochet');game.particlesAt(shot.x,shot.y,shot.color||'#eee0b1',3);}
      return;
    }
    if (contact.kind === 'player') { game.damagePlayer(shot.damage);shot.life=0;hostileImpact(game,shot);return; }
    if (shot.blast) {game.explode(shot);shot.life=0;return;}
    game.damageEnemy(contact.enemy,shot.damage,shot.knockback??80,Math.sign(shot.vx),shot.hit||{});shot.struck.push(contact.enemy);
    if (shot.struck.length >= (shot.pierce||1)) {shot.life=0;return;}
  }
  shot.x=nx;shot.y=ny;
  if (shot.life<=0 && shot.blast) game.explode(shot);
}

import { GROUND, GRAVITY } from './data.js';
import { overlap, clamp } from './world.js';

// One solver for survivors, infected and the dog. Knockback and dashes use it too.
export function moveBody(body, horizontal, dt, platforms, { gravity = 1, left = 0, right = Infinity, terrain = [] } = {}) {
  const oldX = body.x, oldBottom = body.y + body.h;
  if (body.grounded && terrain.some(h => h.type === 'ice' && body.x + body.w > h.x && body.x < h.x + h.w && Math.abs(oldBottom - GROUND) < 4)) {
    body.momentum = (body.momentum ?? horizontal) + (horizontal - (body.momentum ?? horizontal)) * Math.min(1, dt * 1.8); horizontal = body.momentum;
  } else body.momentum = horizontal;
  body.blocked = false;
  body.x = clamp(body.x + horizontal * dt, left, right - body.w);
  for (const b of platforms) {
    if (!b.solid || !overlap(body, b)) continue;
    if (oldX + body.w <= b.x + .5) { body.x = b.x - body.w; body.blocked = true; }
    else if (oldX >= b.x + b.w - .5) { body.x = b.x + b.w; body.blocked = true; }
    else if (oldBottom > b.y + 1) {
      // Resolve an initial overlap, including a spawn, without crossing the wall.
      body.x = Math.abs(oldX + body.w - b.x) < Math.abs(oldX - b.x - b.w) ? b.x - body.w : b.x + b.w; body.blocked = true;
    }
  }
  body.vy = (body.vy || 0) + GRAVITY * gravity * dt;
  const oldTop = body.y; body.y += body.vy * dt; body.grounded = false;
  if (body.vy >= 0) {
    let floor = GROUND;
    for (const b of platforms) if (body.x + body.w > b.x && body.x < b.x + b.w && oldBottom <= b.y + 3 && body.y + body.h >= b.y) floor = Math.min(floor, b.y);
    if (body.y + body.h >= floor) { body.y = floor - body.h; body.vy = 0; body.grounded = true; }
  } else {
    for (const b of platforms) if (b.solid && overlap(body, b) && oldTop >= b.y + b.h - 1) { body.y = b.y + b.h; body.vy = 0; }
  }
  body.travel = (body.travel || 0) + Math.abs(body.x - oldX);
  return body.x - oldX;
}
export function obstacleAhead(body, direction, platforms, distance = 60) {
  return platforms.find(b => b.solid && b.y < body.y + body.h - 4 && b.y + b.h > body.y + 4 && (direction > 0 ? b.x >= body.x + body.w - 2 && b.x - body.x - body.w < distance : b.x + b.w <= body.x + 2 && body.x - b.x - b.w < distance));
}
export function jumpVelocity(gravity = 1) { return -690 * Math.sqrt(gravity); }

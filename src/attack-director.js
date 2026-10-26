// Two simultaneous attack commitments at most, with a gap between new warnings.
export const SPECIAL_ATTACKS = ['spitter','leaper','screamer','lobber','tremor','rammer'];
export function beginSpecial(game,e) {
  if(game.safe||game.mode!=='playing'||game.player.house!==null)return false;
  const width=game.viewWidth||960,left=Math.max(0,game.player.x-width*.34);
  if(e.x+e.w<left+20||e.x>left+width-30)return false;
  if(game.time<(game.nextSpecialAt||0))return false;
  const active=new Set();
  for(const other of game.enemies)if(other.health>0&&other.stun<=0&&other.threatToken&&['windup','leap','charge'].includes(other.phase))active.add(other.threatToken);
  for(const shot of game.projectiles)if(!shot.friendly&&shot.life>0&&shot.threatToken)active.add(shot.threatToken);
  if(active.size>=2)return false;
  e.threatToken=++game.threatSequence;game.nextSpecialAt=game.time+1.15;
  return true;
}

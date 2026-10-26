import { clamp } from './world.js';

export function routeStatus(game) {
  const p=game.player,progress=clamp(game.maxDistance/game.stage.finishX,0,1);
  const occupied=game.stage.houses.find(h=>h.id===p.house&&!h.collapsed)||null;
  const nearby=!p.riding&&game.stage.houses.find(h=>!h.collapsed&&p.grounded&&Math.abs(h.x+h.w/2-p.x-p.w/2)<54)||null;
  const next=game.stage.houses.find(h=>!h.collapsed&&h.x+h.w/2>p.x+p.w/2)||null;
  const contract=game.stage.npcs?.find(n=>n.type==='scout'&&n.greeted&&!n.used);
  return {
    progress,occupied,nearby,next,
    integrity:occupied?clamp(occupied.health/occupied.maxHealth,0,1):0,
    contractLabel:contract?game.kills>=8?'ADA CONTRACT · RETURN FOR 50 COINS':`ADA CONTRACT · ${game.kills}/8 INFECTED`:'',
    objective:game.safe?'GATE SEALED · REACH THE SUPPLY SHELF':p.riding?'E · EXIT VEHICLE / UP · HOP':occupied?'SHELTERED · UP TO LEAVE':nearby?'UP · ENTER SHELTER':`REACH THE GATE · ${Math.floor(progress*100)}%`,
    nextLabel:occupied?(occupied.remaining?'SUPPLIES AVAILABLE':'SUPPLIES EXHAUSTED'):next?`NEXT SHELTER · ${Math.max(1,Math.ceil((next.x-p.x)/game.stage.finishX*100))}% AHEAD`:'FINAL PUSH · NO SHELTERS AHEAD',
  };
}

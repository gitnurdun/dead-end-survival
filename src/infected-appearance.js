// Separate deterministic cosmetic stream: clothing never changes encounter rolls.
const coats=['#394a50','#51463e','#414e43','#514251','#535346'];
const skins=['#829082','#8d947d','#7d8f89','#9a977e'];
export function infectedAppearance(seed,index=0) {
  let n=(Math.imul(seed^0x638af,index+17)>>>0);const next=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  return {coat:coats[Math.floor(next()*coats.length)],skin:skins[Math.floor(next()*skins.length)],trousers:['#26353b','#353339','#3b4038'][Math.floor(next()*3)],hat:Math.floor(next()*4),rips:1+Math.floor(next()*3),scar:next()>.5,build:.94+next()*.12,gait:.9+next()*.13,limp:next()>.6};
}

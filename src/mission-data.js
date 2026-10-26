export const MISSION_TYPES = {
  escape: { name: 'Reach the gate', description: 'Survive the route and seal the quarantine gate.' },
  power: { name: 'Restore emergency power', description: 'Hold E at both generators to power the exit gate.' },
  escort: { name: 'Escort a survivor', description: 'Meet the survivor, then escort them to the extraction point.' },
  holdout: { name: 'Secure the extraction beacon', description: 'Activate the beacon and defend its marked area for 18 seconds.' },
};
export function missionKind(index) { return ['escape','power','escort','holdout'][index%4]; }
export function makeMission(kind,ground=620) {
  return { kind, complete:kind==='escape', rewarded:false,
    generators:kind==='power'?[6500,18300].map((x,i)=>({id:i,x,y:ground-72,w:66,h:72,progress:0,complete:false})):[],
    escort:kind==='escort'?{x:6500,y:ground-62,w:34,h:62,vy:0,vx:0,grounded:true,health:90,active:false,extracted:false,hidden:false,facing:1,travel:0,hurt:0}:null,
    beacon:kind==='holdout'?{x:21800,y:ground-110,w:42,h:110,active:false,progress:0,duration:18,radius:320}:null,
    extractionX:22400,
  };
}

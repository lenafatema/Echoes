export interface ParticleSpec { x:number; y:number; z:number; vx:number; vy:number; vz:number; lifetime:number; size:number }
function hashSeed(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0||1}
function next(seed:{value:number}){seed.value=(Math.imul(seed.value,1664525)+1013904223)>>>0;return seed.value/4294967296}

/** Visual-only and repeatable particle parameters; bounded to the requested hard cap. */
export function seededParticles(seedKey:string,count:number):ParticleSpec[]{
  const seed={value:hashSeed(seedKey)};const safe=Math.max(0,Math.min(150,Math.floor(Number.isFinite(count)?count:0)));
  return Array.from({length:safe},()=>({x:(next(seed)-.5)*1.4,y:next(seed)*.65,z:(next(seed)-.5)*.7,vx:(next(seed)-.5)*.28,vy:.12+next(seed)*.45,vz:(next(seed)-.5)*.22,lifetime:.35+next(seed)*.8,size:.012+next(seed)*.02}));
}

export function seededUnit(seedKey:string){return next({value:hashSeed(seedKey)})}

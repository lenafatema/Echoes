import { exportSituation, importSituation } from './import-export.ts';
import type { StudioSituation } from './types.ts';

const MAX_FRAGMENT=12_000;
const bytesToBase64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const base64ToBytes=(base64:string)=>{const padded=base64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64.length%4)%4);const binary=atob(padded);return Uint8Array.from(binary,c=>c.charCodeAt(0));};
async function transform(input:Uint8Array,format:'compress'|'decompress') {
  const Ctor=format==='compress'?globalThis.CompressionStream:globalThis.DecompressionStream;
  if(!Ctor)throw new Error('Compressed share links are not supported by this browser. Use JSON export instead.');
  const stream=new Blob([input]).stream().pipeThrough(new Ctor('gzip'));const reader=stream.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20*1024){await reader.cancel();throw new Error('Decoded share exceeds the 20 KB limit.');}chunks.push(value);}}
  finally{reader.releaseLock()}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
export async function encodeShare(item:StudioSituation,origin=location.origin+location.pathname):Promise<string> {
  const raw=new TextEncoder().encode(exportSituation(item));const compressed=await transform(raw,'compress');const fragment=bytesToBase64(compressed);
  if(fragment.length>MAX_FRAGMENT)throw new Error('Compressed share link exceeds the 12 KB fragment limit. Export JSON instead.');
  return `${origin}#scenario=${fragment}`;
}
export async function decodeShare(fragment:string,now=new Date()):Promise<StudioSituation> {
  const payload=fragment.startsWith('#scenario=')?fragment.slice(10):fragment;
  if(!payload||payload.length>MAX_FRAGMENT)throw new Error('Share link is empty or exceeds the 12 KB limit.');
  let compressed:Uint8Array;try{compressed=base64ToBytes(payload)}catch{throw new Error('Share link encoding is malformed.');}
  if(compressed.byteLength>12*1024)throw new Error('Compressed share exceeds the 12 KB limit.');
  let raw:Uint8Array;try{raw=await transform(compressed,'decompress')}catch{throw new Error('Share link compression is malformed.');}let json:string;try{json=new TextDecoder('utf-8',{fatal:true}).decode(raw)}catch{throw new Error('Share link text is malformed.');}
  return importSituation(json,now);
}

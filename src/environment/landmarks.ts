import { roomLandmarks } from './room-layout';
export type LandmarkId=typeof roomLandmarks[number]['id'];
export const landmarkById=(id:string)=>roomLandmarks.find(item=>item.id===id);

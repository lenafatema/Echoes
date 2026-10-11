export const roomSpatial = {
  table: { width: 14.4, depth: 9.4, top: -0.16 },
  wall: { backZ: -8.4, height: 6.4 },
} as const;

export interface RoomLandmark { id:string; label:string; position:[number,number,number]; target:[number,number,number]; camera:[number,number,number]; description:string }
export const roomLandmarks:readonly RoomLandmark[]=[
  {id:'campaign-board',label:'Campaign board',position:[-6.6,2.05,-8.18],target:[-5.5,1.65,-5.9],camera:[-5.5,4.2,1.4],description:'Campaign completion and star progress'},
  {id:'drawer-cabinet',label:'Drawer cabinet',position:[-7.25,.38,1.7],target:[-6.5,.65,1.6],camera:[-4.1,3.3,6.5],description:'Custom and edited situations'},
  {id:'drafting-desk',label:'Drafting desk',position:[6.75,.38,1.5],target:[6,.72,1.2],camera:[3.9,3.3,6.4],description:'Scenario Studio'},
  {id:'medal-shelf',label:'Medal shelf',position:[6.5,2,-8.18],target:[5.6,1.8,-5.9],camera:[5,4.1,1.5],description:'Earned achievements and ranks'},
  {id:'ledger',label:'Ledger',position:[-5.8,.18,3.5],target:[-5.2,.38,3.1],camera:[-3.5,3.2,7.1],description:'Completed runs and decision history'},
  {id:'radio',label:'Radio',position:[5.9,.42,3.6],target:[5.4,.6,3.2],camera:[3.9,3,7],description:'Effects, audio and motion settings'},
];

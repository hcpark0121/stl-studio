import {TYPES} from './layout.js';
// Read the actual binary download, welding only identical stored coordinates.
export function readSTL(M,buffer){
 const dv=new DataView(buffer),n=dv.getUint32(80,true),verts=[],tris=[],indices=new Map();
 if(buffer.byteLength!==84+n*50)throw Error('Invalid STL length');
 for(let i=0;i<n;i++)for(let j=0;j<3;j++){
  const off=84+i*50+12+j*12,p=[0,4,8].map(k=>dv.getFloat32(off+k,true));
  if(!p.every(Number.isFinite))throw Error('Invalid STL vertex');
  const key=p.join(',');let index=indices.get(key);
  if(index===undefined){index=verts.length/3;indices.set(key,index);verts.push(...p);}tris.push(index);
 }
 const edges=new Map();
 for(let i=0;i<tris.length;i+=3)for(let k=0;k<3;k++){
  const a=tris[i+k],b=tris[i+(k+1)%3];if(a===b)throw Error('Degenerate STL triangle');
  const key=[Math.min(a,b),Math.max(a,b)].join(','),e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e);
 }
 for(const [count,direction] of edges.values())if(count!==2||direction!==0)throw Error('Open or non-manifold STL edge');
 return new M.Manifold(new M.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(tris)}));
}
export function verifyDownloads(M,b,bodyBuffer,lidBuffer){
 const trash=[],keep=m=>(trash.push(m),m),overlap=(a,c)=>keep(a.intersect(c)).volume();
 try{
  const body=keep(readSTL(M,bodyBuffer)),print=keep(readSTL(M,lidBuffer)),L=b.layout;
  const lid=keep(keep(print.translate([0,-L.D,-L.outerZ])).rotate([180,0,0]));
  if(body.volume()<=0||lid.volume()<=0)throw Error('Empty STL');
  const parts=body.decompose();trash.push(...parts);
  if(parts.filter(p=>p.volume()>1e-5).length!==1)throw Error('Disconnected body');
  const lidParts=lid.decompose();trash.push(...lidParts);
  if(lidParts.filter(p=>p.volume()>1e-5).length!==1)throw Error('Disconnected lid');
  if(overlap(body,lid)>1e-3||overlap(b.coins,lid)>1e-3||overlap(body,b.coins)>1e-3)throw Error('Assembly interference');
  const mismatch=body.volume()-b.body.volume();
  // Comparing coincident Boolean surfaces is unstable after float32 storage.
  // Match reconstructed vertex positions to the intended assembled lid instead.
  const ref=b.lid.getMesh(),actual=lid.getMesh(),grid=new Map(),eps=.001;
  for(let i=0;i<ref.vertProperties.length;i+=ref.numProp){const p=Array.from(ref.vertProperties.slice(i,i+3)),key=p.map(v=>Math.floor(v/eps)).join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
  for(let i=0;i<actual.vertProperties.length;i+=actual.numProp){
   const p=Array.from(actual.vertProperties.slice(i,i+3)),q=p.map(v=>Math.floor(v/eps));let match=false;
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)
    for(const r of grid.get([q[0]+x,q[1]+y,q[2]+z].join(','))||[])if(Math.hypot(...p.map((v,k)=>v-r[k]))<eps)match=true;
   if(!match)throw Error('STL orientation mismatch');
  }
  if(Math.abs(mismatch)>.03||Math.abs(lid.volume()-b.lid.volume())>.03)throw Error(`STL volume mismatch ${mismatch}/${lid.volume()-b.lid.volume()}`);
  for(const c of L.cells){
   const t=TYPES[c.type],cell=keep(keep(keep(M.Manifold.cylinder(t.t,t.d/2,t.d/2,64,true)).rotate([0,90+L.design.tilt,0])).translate([c.x,c.y,c.z+1]));
   if(overlap(cell,lid)<.001)throw Error('Missing cell retention pad');
  }
  return true;
 }finally{for(const m of trash)m.delete();}
}

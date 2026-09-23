import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from '../vendor/manifold-3d/manifold.js';
import {build,dispose} from '../coin-cell-box/geometry.js';
import {DEFAULT} from '../coin-cell-box/layout.js';
import {manifoldToSTL} from '../shared/stl.js';
const M=await Module();M.setup();
const scenarios=[DEFAULT,{...DEFAULT,counts:[10,5,5,5,5]},{...DEFAULT,counts:[0,0,0,0,1]},{...DEFAULT,counts:[10,0,0,0,0]}, {...DEFAULT,tilt:0},{...DEFAULT,tilt:30,spacing:8}];
const intersect=(a,b)=>{const x=a.intersect(b),v=x.volume();x.delete();return v;};
for(const [index,design] of scenarios.entries()) {
 const b=build(M,design),L=b.layout;
 for(const part of [b.body,b.lid,b.lidPrint,b.coins]) {assert.equal(part.status(),'NoError');assert(part.volume()>0);}
 assert(intersect(b.body,b.coins)<1e-5,`body/coins ${index}`);
 // A printed lid must reconstruct by a proper rigid rotation, never a mirror.
 const shifted=b.lidPrint.translate([0,-L.D,-L.outerZ]),assembled=shifted.rotate([180,0,0]);
 assert(Math.abs(assembled.volume()+b.lid.volume()-2*intersect(assembled,b.lid))<1e-4,`physical lid flip ${index}`);
 shifted.delete();assembled.delete();
 const p=L.axis;
 for(const a of [0,.25,.5,1,2,5,15,45,90,120]){
 const m=b.lid.translate(p.map(v=>-v)),rot=m.rotate([0,-a,0]),lid=rot.translate(p);
 assert(intersect(b.body,lid)<1e-5,`body/lid ${index} ${a}`);
 assert(intersect(b.coins,lid)<1e-5,`coins/lid ${index} ${a}`);
 m.delete();rot.delete();lid.delete();
 }
 const buf=manifoldToSTL(b.body);const view=new DataView(buf);assert.equal(buf.byteLength,84+view.getUint32(80,true)*50);
 if(index===0)fs.writeFileSync('/tmp/stl-studio-preview.stl',Buffer.from(manifoldToSTL(b.lidPrint)));
 dispose(b);console.log('PASS geometry scenario',index);
}
// Independent retention check: a nominal cell raised 1mm must meet the closed lid.
for(const design of [DEFAULT,{...DEFAULT,counts:[10,5,5,5,5]}, {...DEFAULT,counts:[0,0,0,0,1]}]){
 const b=build(M,design);
 const {TYPES}=await import('../coin-cell-box/layout.js');
 for(const c of b.layout.cells){const t=TYPES[c.type],base=M.Manifold.cylinder(t.t,t.d/2,t.d/2,64,true),rot=base.rotate([0,90+b.layout.design.tilt,0]),up=rot.translate([c.x,c.y,c.z+1]);assert(intersect(up,b.lid)>.001);base.delete();rot.delete();up.delete();}
 dispose(b);
}
console.log('PASS nominal cells meet lid before upward 1mm travel; physical shake test still required');

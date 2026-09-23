import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from '../vendor/manifold-3d/manifold.js';
import {build,dispose} from '../coin-cell-box/geometry.js';
import {DEFAULT,TYPES,normalize} from '../coin-cell-box/layout.js';
import {labelRects} from '../coin-cell-box/labels.js';
import {readSTL,verifyDownloads} from '../coin-cell-box/verify.js';
import {manifoldToSTL} from '../shared/stl.js';
const M=await Module();M.setup();
assert.equal(normalize({}).labels,true);assert.equal(normalize({labels:false}).labels,false);
function unionArea(rects){
 const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){const x=(xs[i-1]+xs[i])/2,ys=rects.filter(r=>r.x<x&&x<r.x+r.w).map(r=>[r.y,r.y+r.h]).sort((a,b)=>a[0]-b[0]);let end=-Infinity;
 for(const [lo,hi] of ys){area+=(xs[i]-xs[i-1])*Math.max(0,hi-Math.max(lo,end));end=Math.max(end,hi);}}
 return area;
}
assert.equal(normalize({tilt:0}).tilt,15);assert.equal(normalize({tilt:90}).tilt,25);assert.equal(normalize({spacing:1}).spacing,9);assert.equal(normalize({spacing:100}).spacing,12);assert.equal(normalize({exposure:1}).exposure,.35);
const cases=[DEFAULT,{...DEFAULT,counts:[5,10,7,7,7]}, {...DEFAULT,counts:[10,5,5,5,5],width:60},
 ...TYPES.map((_,i)=>({...DEFAULT,counts:TYPES.map((_,j)=>i===j?1:0)})),
 ...[15,25].flatMap(tilt=>[9,12].flatMap(spacing=>[.28,.35].map(exposure=>({...DEFAULT,tilt,spacing,exposure,counts:[2,3,1,2,3]}))))];
for(const [i,design] of cases.entries()){
 const b=build(M,design),plain=build(M,{...design,labels:false}),bodyBuf=manifoldToSTL(b.body),lidBuf=manifoldToSTL(b.lidPrint);
 assert(verifyDownloads(M,b,bodyBuf,lidBuf));
 const body=readSTL(M,bodyBuf),lidPrint=readSTL(M,lidBuf),L=b.layout;
 const shifted=lidPrint.translate([0,-L.D,-L.outerZ]),lid=shifted.rotate([180,0,0]);shifted.delete();
 for(const angle of [5,30,90,120]){
  const shift=lid.translate(L.axis.map(v=>-v)),rot=shift.rotate([0,-angle,0]),opened=rot.translate(L.axis),clash=opened.intersect(body),coinClash=opened.intersect(b.coins);
  assert(clash.volume()<.001&&coinClash.volume()<.001,`saved STL opening ${i}/${angle}`);
  for(const m of [shift,rot,opened,clash,coinClash])m.delete();
 }
 const expected=L.blocks.reduce((s,block)=>s+unionArea(labelRects(block,TYPES[block.type].id))*.6,0);
 assert(Math.abs(plain.body.volume()-body.volume()-expected)<.03,`all labels engraved at .6mm depth ${i}`);
 for(const c of L.cells){
  const t=TYPES[c.type],base=M.Manifold.cylinder(t.t,t.d/2,t.d/2,64,true),rot=base.rotate([0,90+L.design.tilt,0]),up=rot.translate([c.x,c.y,c.z+1]),hit=up.intersect(lid);
  assert(hit.volume()>.001,`saved lid retention ${i}/${t.id}`);
  for(const m of [base,rot,up,hit])m.delete();
 }
 // Former bug must be detected: mirror Z is not a physical flip.
 if(i===1){const wrong=b.lid.mirror([0,0,1]),wrongPrint=wrong.translate([0,0,L.outerZ]);assert.throws(()=>verifyDownloads(M,b,bodyBuf,manifoldToSTL(wrongPrint)));wrong.delete();wrongPrint.delete();
 fs.writeFileSync('/tmp/stl-studio-labeled-body.stl',Buffer.from(bodyBuf));
 const raised=lid.translate([0,0,8]),assembly=M.Manifold.union([body,raised]);fs.writeFileSync('/tmp/stl-studio-assembly.stl',Buffer.from(manifoldToSTL(assembly)));raised.delete();assembly.delete();}
 for(const m of [body,lidPrint,lid])m.delete();dispose(b);dispose(plain);
 console.log('PASS downloaded STL + label depth + lid retention',i);
}

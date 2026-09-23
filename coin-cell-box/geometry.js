import {layout,TYPES} from './layout.js';
export function build(M,raw) {
 const L=layout(raw),{Manifold:MF,CrossSection:CS}=M,junk=[];
 const j=m=>(junk.push(m),m),cube=(x,y,z,w,d,h)=>j(j(MF.cube([w,d,h])).translate([x,y,z]));
 const cyl=(r,h)=>j(MF.cylinder(h,r,r,64));
 const uni=xs=>j(MF.union(xs)),cut=(a,b)=>j(a.subtract(b));
 const prism=(pts,h)=>{ const area=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-p[1]*q[0];},0);return j(j(new CS([area<0?[...pts].reverse():pts])).extrude(h)); };
 const {W,D,H,divTop,side,zPlate,outerZ,axis,magnetX}=L;
 const skin=1.2,clr=.35,yl=D+2*(skin+clr),xr=W+skin+clr,xl=-.05;
 const axisZ=axis[2],seg=(D-2)/5;
 function pin(up){
   const shape=j(CS.hull([j(CS.circle(1,48)),j(j(CS.square([.02,.02],true)).translate([0,1.4142]))]));
   return j(j(j(shape.extrude(D+4)).scale([1,up>0?-1:1,1])).rotate([-90,0,0])).translate([axis[0],-2,axisZ]);
 }
 function knuckles(body){
  const all=[];
  for(let k=0;k<5;k++)if((k%2===0)===body){
   const y=1+k*seg+.3,len=seg-.6;
   const cylinder=j(j(cyl(2.5,len).rotate([-90,0,0])).translate([axis[0],y,axisZ]));all.push(cylinder);
   if(body)all.push(j(MF.hull([cylinder,cube(-.01,y,axisZ-6,1,len,3.5)])));
   else all.push(cube(axis[0],y,zPlate,xl-axis[0]+.02,len,2));
  }
  return uni(all);
 }
 let body=uni([cube(0,0,0,W,D,H),knuckles(true)]);
 const bodyCuts=[cube(1.68,1.68,divTop,W-3.36-8.32,D-3.36,H),cube(1.68,-1,side,W+1,D+2,H),pin(1)];
 const a=L.design.tilt*Math.PI/180;
 for(const c of L.cells){
  const t=TYPES[c.type],lo=c.floor,mid=Math.max(lo,divTop-4),top=H+1;
  const x=z=>c.x+(z-c.z)*Math.tan(a),small=(t.t+.6)/2/Math.cos(a),large=(t.t+1.8)/2/Math.cos(a);
  const pts=[[x(lo)-small,lo],[x(lo)+small,lo],[x(mid)+small,mid],[x(divTop)+large,divTop],[x(top)+large,top],[x(top)-large,top],[x(divTop)-large,divTop],[x(mid)-small,mid]];
  bodyCuts.push(j(j(prism(pts,t.d+1).rotate([90,0,0])).translate([0,c.y+(t.d+1)/2,0])));
 }
 const pocket=(y,z)=>j(cyl(2.65,2.2).translate([magnetX,y,z]));
 for(const y of [D/4,D*3/4])bodyCuts.push(pocket(y,L.bodyCeil-2.2));
 // Recessed fingertip opening; sloped roof, same principle as the physical prototype.
 bodyCuts.push(j(j(prism([[W+.2,side-8],[W-2,side-5.8],[W-2,side-3.7],[W+.2,side-1.5]],14).rotate([90,0,0])).translate([0,D/2+7,0])));
 for (let idx=0;idx<bodyCuts.length;idx++) if(bodyCuts[idx].status()!=="NoError") throw Error(`body cut ${idx}: ${bodyCuts[idx].status()}`);
 if(body.status()!=="NoError")throw Error(`body union: ${body.status()}`);
 body=cut(body,uni(bodyCuts));
 const lidBits=[cube(xl,-1.55,zPlate,xr-xl,yl,2),cube(xr-1.2,-1.55,side-4,1.2,yl,outerZ-side+4),knuckles(false)];
 for(const y of [-1.55,D+.35])lidBits.push(cube(xl,y,side-4,xr-xl,1.2,outerZ-side+4));
 for(const y of [D/4,D*3/4])lidBits.push(cube(magnetX-5,y-5.5,side,10,11,outerZ-side));
 for(const b of L.blocks)lidBits.push(cube(b.x+.6,b.y,b.top+.5,b.w-.6,b.h,zPlate-(b.top+.5)+.02));
 const lidCuts=[pin(-1)];
 for(const y of [D/4,D*3/4])lidCuts.push(pocket(y,outerZ-L.lidFloor-2.2));
 const lid=cut(uni(lidBits),uni(lidCuts));
 const lidPrint=j(j(lid.rotate([180,0,0])).translate([0,D,outerZ]));
 const coins=uni(L.cells.map(c=>{const t=TYPES[c.type];return j(j(j(MF.cylinder(t.t,t.d/2,t.d/2,64,true)).rotate([0,90+L.design.tilt,0])).translate([c.x,c.y,c.z]));}));
 // Clone outputs; free construction intermediates when using a long-lived worker.
 const result={body:body.asOriginal(),lid:lid.asOriginal(),lidPrint:lidPrint.asOriginal(),coins:coins.asOriginal(),layout:L};
 for(const m of new Set(junk))m.delete();
 return result;
}
export function dispose(b){for(const k of ['body','lid','lidPrint','coins'])b?.[k]?.delete();}

export const TYPES = [
  {id:'CR2450',d:24.5,t:5}, {id:'CR2032',d:20,t:3.2},
  {id:'CR2025',d:20,t:2.5}, {id:'CR2016',d:20,t:1.6}, {id:'CR1632',d:16,t:3.2}
];
export const DEFAULT = {counts:[7,7,7,7,7], spacing:9, tilt:20, exposure:0.3333333333, width:0};
const rad = a=>a*Math.PI/180;
export function normalize(raw={}) {
  const n=(x,d,a,b)=>Number.isFinite(+x)?Math.min(b,Math.max(a,+x)):d;
  return {counts:TYPES.map((_,i)=>Math.round(n(raw.counts?.[i],7,0,30))),spacing:n(raw.spacing,9,8,14),tilt:n(raw.tilt,20,0,30),exposure:n(raw.exposure,1/3,.28,.4),width:n(raw.width,0,0,210)};
}
function pack(design,width) {
  const a=rad(design.tilt),pitch=design.spacing, shelves=[],blocks=[];
  for (let i=0;i<TYPES.length;i++) {
    const type=TYPES[i];let remaining=design.counts[i];
    const end=Math.max(pitch-1.26,type.d*Math.sin(a)+(type.t+.6)/Math.cos(a)+.8);
    const maxN=Math.floor((width-5-end)/pitch)+1;if(maxN<1&&remaining)return null;
    while(remaining>0) {
      let choice=null;
      for(const shelf of shelves) {
        const space=width-shelf.used-1.26;
        const cap=Math.min(remaining,Math.floor((space-5-end)/pitch)+1);
        if(cap>0&&shelf.h>=type.d+1&&(!choice||cap>choice.count))choice={shelf,count:cap};
      }
      if(!choice) {const shelf={y:shelves.reduce((s,r)=>s+r.h+1.26,0),h:type.d+1,used:0};shelves.push(shelf);choice={shelf,count:Math.min(remaining,maxN)};}
      const {shelf,count}=choice,w=5+end+(count-1)*pitch,x=shelf.used?(shelf.used+1.26):0;
      blocks.push({type:i,count,x,y:shelf.y,w,h:type.d+1,end});shelf.used=x+w;remaining-=count;
    }
  }
  if(!blocks.length)return null;
  const w=Math.max(...shelves.map(s=>s.used)),d=shelves.at(-1).y+shelves.at(-1).h;
  return {w,d,blocks,score:w*d*(1+.12*Math.abs(Math.log(w/d)))};
}
export function layout(raw) {
  const design=normalize(raw);if(!design.counts.some(Boolean))throw Error('코인셀을 최소 1개 선택하세요.');
  let best=null;
  const candidates=design.width?[Math.max(design.width,24)]:Array.from({length:177},(_,i)=>24+i);
  for(const width of candidates) {const p=pack(design,width);if(p&&(!best||p.score<best.score))best=p;}
  if(!best)throw Error('지정한 내부 폭으로는 셀을 배치할 수 없습니다.');
  const a=rad(design.tilt),heights=TYPES.map(t=>t.d*Math.cos(a)+t.t*Math.sin(a));
  // Keep a minimum 1.2mm floor and a common divider height. Exposure is bounded per cell.
  const active=heights.filter((_,i)=>design.counts[i]);
  const divTop=Math.ceil((1.2+Math.max(...active)*(1-design.exposure))/.2)*.2;
  const blocks=best.blocks.map(b=>({...b,x:b.x+1.68,y:b.y+1.68,top:divTop+heights[b.type]*design.exposure,floor:divTop-heights[b.type]*(1-design.exposure)}));
  const W=best.w+2*1.68+8.32,D=Math.max(34,best.d+2*1.68),top=Math.max(...blocks.map(b=>b.top));
  const H=Math.ceil((top+.5)/.2)*.2,side=divTop+1,zPlate=H+.35,outerZ=zPlate+2;
  const bodyCeil=Math.floor((side-.4)/.2)*.2;
  // Lid is upside-down on the bed; quantize its cavity floor in print coordinates.
  const lidFloor=Math.floor((outerZ-side-.4-2.2)/.2)*.2;
  const cells=blocks.flatMap(b=>Array.from({length:b.count},(_,k)=>({type:b.type,x:b.x+5+b.end/2+k*design.spacing,y:b.y+b.h/2,z:b.floor+heights[b.type]/2,top:b.top,floor:b.floor})));
  if(W+7>256||D+3.1>256)throw Error('P1S 256mm 베드를 벗어납니다. 수량 또는 내부 폭을 줄이세요.');
  return {design,blocks,cells,W,D,H,divTop,side,zPlate,outerZ,axis:[-2.85,0,outerZ-2.5],magnetX:W-5,bodyCeil,lidFloor,pauses:[+(lidFloor+2.4).toFixed(2),+(bodyCeil+.2).toFixed(2)],area:W*D};
}

import assert from 'node:assert/strict';
import {layout,TYPES,DEFAULT,parseRows,balanceRows} from '../coin-cell-box/layout.js';
let checked=0;
for(let seed=0;seed<120;seed++) {
 const counts=TYPES.map((_,i)=>(seed*(i+3)+i*7)%16);
 if(!counts.some(Boolean))counts[0]=1;
 let L;try{L=layout({...DEFAULT,counts,tilt:seed%31,spacing:8+seed%7});}catch(e){assert.match(e.message,/256mm/);continue;}
 assert.equal(L.cells.length,counts.reduce((a,b)=>a+b));
 TYPES.forEach((_,i)=>assert.equal(L.cells.filter(c=>c.type===i).length,counts[i]));
 for(let i=0;i<L.blocks.length;i++)for(let j=i+1;j<L.blocks.length;j++){
 const a=L.blocks[i],b=L.blocks[j];assert(a.x+a.w<=b.x+1e-6||b.x+b.w<=a.x+1e-6||a.y+a.h<=b.y+1e-6||b.y+b.h<=a.y+1e-6);
 }
 assert(L.cells.every(c=>c.floor>=1.2-1e-7));checked++;
}
const mixed=layout({...DEFAULT,counts:[10,5,5,5,5]});
assert(mixed.blocks.some(b=>b.x>1.68)); // shorter groups share a shelf
const narrow=layout({...DEFAULT,counts:[10,5,5,5,5],width:65});
assert(narrow.blocks.some(b=>b.type===0&&b.count<10));
assert.throws(()=>layout({counts:[0,0,0,0,0]}));
console.log('PASS layouts',checked,'including mixed quantities, splitting, no overlapping groups');

const manual={...DEFAULT,manual:true,counts:[6,10,6,6,4],order:[1,0,2,3,4],rows:['','5,5','','','']};
const rows=layout(manual);
assert.deepEqual(rows.blocks.map(b=>b.type),[1,1,0,2,3,4]);
assert.deepEqual(rows.blocks.map(b=>b.count),[5,5,6,6,6,4]);
assert(rows.blocks.every((b,i)=>b.x===1.68&&(!i||b.y>=rows.blocks[i-1].y+rows.blocks[i-1].h)));
assert.equal(rows.cells.length,32);
assert.deepEqual(layout(JSON.parse(JSON.stringify(manual))).blocks,rows.blocks);
for(const text of ['4,5','0,10','5,,5','2.5,7.5','-1,11','abc'])assert.throws(()=>layout({...manual,rows:['',text,'','','']}));
assert.throws(()=>layout({...manual,width:25}));
console.log('PASS manual order, exact row counts, round-trip and invalid rows');

assert.equal(balanceRows(12,"5,5"),"6,6");assert.equal(balanceRows(11,"5,5"),"6,5");assert.equal(balanceRows(1,"5,5"),"1");assert.equal(balanceRows(0,"5,5"),"");assert.deepEqual(parseRows("4，6"),[4,6]);assert.equal(parseRows("5,"),null);
const requested={...DEFAULT,manual:true,order:[1,0,2,3,4],counts:[6,12,6,6,6],rows:['6','6,6','6','6','6']};
const aligned=layout(requested),mouth=c=>c.x+(aligned.divTop-c.z)*Math.tan(aligned.design.tilt*Math.PI/180);
for(let i=0;i<aligned.cells.length;i+=6){assert(Math.abs(mouth(aligned.cells[i])-mouth(aligned.cells[0]))<1e-7);assert(Math.abs(mouth(aligned.cells[i+5])-mouth(aligned.cells[5]))<1e-7);}
const short={...requested,counts:[6,12,2,2,3],rows:['6','6,6','2','2','3']};
const separate=layout(short),joined=layout({...short,merge:true}),filled=layout({...short,merge:true,spread:true});
assert(joined.D<separate.D);assert.equal(joined.W,separate.W);assert.equal(joined.cells.length,separate.cells.length);
assert(filled.blocks.some(b=>b.pitch>9));assert(filled.blocks.every(b=>b.pitch<=12));
for(let i=0;i<filled.blocks.length;i++)for(let j=i+1;j<filled.blocks.length;j++){const a=filled.blocks[i],b=filled.blocks[j];assert(a.x+a.w<=b.x+1e-6||b.x+b.w<=a.x+1e-6||a.y+a.h<=b.y+1e-6||b.y+b.h<=a.y+1e-6);}
console.log('PASS slot-opening alignment, merging and bounded spacing');
const {toLanes}=await import('../coin-cell-box/layout.js');
const legacy={...DEFAULT,manual:true,merge:true,counts:[3,9,7,7,7],order:[1,0,2,3,4],rows:['3','7,2','7','7','7']};
for(const spread of [false,true]){const old=layout({...legacy,spread}),lanes=toLanes({...legacy,spread}),updated=layout({...legacy,spread,lanes});assert.equal(updated.cells.length,old.cells.length);updated.cells.forEach((c,i)=>{assert.equal(c.type,old.cells[i].type);for(const key of ["x","y","z","floor","top"])assert(Math.abs(c[key]-old.cells[i][key])<1e-8);});assert.equal(updated.W,old.W);assert.equal(updated.D,old.D);}
const explicit={...DEFAULT,manual:true,lanes:[[{type:1,count:7}],[{type:1,count:2},{type:0,count:3}],[{type:4,count:2},{type:2,count:3},{type:4,count:1}]]};
const E=layout(explicit);assert.deepEqual(E.blocks.map(b=>[b.row,b.type,b.count]),[[0,1,7],[1,1,2],[1,0,3],[2,4,2],[2,2,3],[2,4,1]]);assert.equal(E.cells.length,18);assert.deepEqual(E.design.counts,[3,9,3,0,3]);assert.deepEqual(layout({...explicit,merge:true}).cells,E.cells);
assert.deepEqual(layout(JSON.parse(JSON.stringify(explicit))).cells,E.cells);
for(const lanes of [[],[[]],[[{type:9,count:2}]],[[{type:1,count:0}]],[[{type:1,count:1.5}]],Array.from({length:13},()=>[{type:1,count:1}])])assert.throws(()=>layout({...DEFAULT,manual:true,lanes}));
console.log('PASS explicit rows: legacy migration preserves cells, exact group order, totals, URL roundtrip and invalid input');

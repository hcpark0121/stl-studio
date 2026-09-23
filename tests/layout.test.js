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

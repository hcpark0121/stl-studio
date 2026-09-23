import assert from 'node:assert/strict';
import {layout,TYPES,DEFAULT} from '../coin-cell-box/layout.js';
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

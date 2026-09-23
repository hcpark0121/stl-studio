import {glyphs} from '../vendor/label-font/glyphs.js';
// Genuine bold sans-serif outlines, with curves flattened at fine resolution.
// Rotate text along the group's leading strip; keep 0.8mm end margins.
export function labelPolygons(block,text){
 const raw=[];let advance=0;
 for(const char of text){
  const g=glyphs[char];if(!g)throw Error(`Unsupported label character: ${char}`);
  for(const path of g.paths)raw.push(path.map(([x,y])=>[x+advance,y]));
  advance+=g.advance;
 }
 const all=raw.flat(),minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
 const scale=3.2/(maxY-minY),along=Math.min(scale,(block.h-1.6)/(maxX-minX)),length=(maxX-minX)*along;
 return raw.map(path=>path.map(([x,y])=>[block.x+.9+(maxY-y)*scale,block.y+(block.h-length)/2+(x-minX)*along]));
}

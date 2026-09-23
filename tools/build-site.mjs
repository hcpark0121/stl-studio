import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'_site');
const entries=['index.html','THIRD_PARTY.md','LICENSE-MODELS.md','coin-cell-box','shared','vendor'];
const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=entries.flatMap(e=>{const p=path.join(root,e);return fs.statSync(p).isDirectory()?list(p):[p];}).sort();
const hash=crypto.createHash('sha256');for(const f of files){hash.update(path.relative(root,f));hash.update(fs.readFileSync(f));}
const version=hash.digest('hex').slice(0,16);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const f of files){
 const dest=path.join(out,path.relative(root,f));fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(/\.(html|js)$/.test(f)){
  // Version entry points AND their module/worker imports as one release.
  const text=fs.readFileSync(f,'utf8').replace(/(["'])([.\w/-]+\.(?:js|css|wasm))\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
  fs.writeFileSync(dest,text);
 }else fs.copyFileSync(f,dest);
}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({version})+'\n');
console.log(`Built static site ${version}`);

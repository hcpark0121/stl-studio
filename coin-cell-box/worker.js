import Module from '../vendor/manifold-3d/manifold.js';
import {build,dispose} from './geometry.js';
import {manifoldToSTL} from '../shared/stl.js';
const ready=Module().then(M=>{M.setup();return M;});
onmessage=async({data})=>{let b;try{
 b=build(await ready,data.design);
 for(const p of ['body','lid','lidPrint','coins'])if(b[p].status()!=='NoError')throw Error('형상을 만들 수 없습니다. 설정을 조정해 주세요.');
 const meshes={};for(const p of ['body','lid','coins']){const m=b[p].getMesh();meshes[p]={vertices:new Float32Array(m.vertProperties),indices:new Uint32Array(m.triVerts),stride:m.numProp};}
 const body=manifoldToSTL(b.body,'STL Studio coin cell body'),lid=manifoldToSTL(b.lidPrint,'STL Studio coin cell lid');
 postMessage({id:data.id,layout:b.layout,meshes,body,lid},[body,lid,...Object.values(meshes).flatMap(m=>[m.vertices.buffer,m.indices.buffer])]);
}catch(e){postMessage({id:data.id,error:e.message});}finally{dispose(b);}};

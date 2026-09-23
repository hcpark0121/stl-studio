import * as THREE from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {t} from '../shared/i18n.js';
const host=document.querySelector('#fixed-viewport'),status=document.querySelector('#fixed-status'),slider=document.querySelector('#fixed-opening'),out=document.querySelector('#fixed-angle');
let state='3D를 불러오는 중…';function setStatus(key){state=key;status.textContent=t(key);}window.addEventListener('languagechange',()=>setStatus(state));
async function loadMesh(file,color,metalness=0){
 const response=await fetch(new URL('downloads/'+file,import.meta.url));if(!response.ok)throw Error('STL load');const buffer=await response.arrayBuffer(),view=new DataView(buffer),count=view.getUint32(80,true);if(84+count*50!==buffer.byteLength)throw Error('STL length');const vertices=new Float32Array(count*9);
 for(let i=0;i<count;i++)for(let k=0;k<9;k++)vertices[i*9+k]=view.getFloat32(84+i*50+12+k*4,true);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(vertices,3));g.computeVertexNormals();return new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.65,metalness}));
}
try{
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece5');const camera=new THREE.PerspectiveCamera(38,1,.1,2000);camera.up.set(0,0,1);camera.position.set(175,-210,200);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,22);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x60716b,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(40,-100,180);scene.add(light);
 const [body,lid,cells]=await Promise.all([loadMesh('coincell-tested-body.stl',0x89999f),loadMesh('coincell-tested-lid.stl',0x9aabb1),loadMesh('../assets/preview-cells.stl',0xb9bec1,.75)]);
 // Actual printed lid -> assembled by proper X180 rotation, then hinge rotation.
 lid.geometry.rotateX(Math.PI);lid.geometry.translate(0,0,28.85);
 const pivot=new THREE.Group();pivot.position.set(-43.43,0,26.35);lid.position.set(43.43,0,-26.35);pivot.add(lid);scene.add(body,pivot,cells);
 const update=()=>{out.value=slider.value+'°';pivot.rotation.y=-Number(slider.value)*Math.PI/180;};slider.oninput=update;document.querySelector('#fixed-close').onclick=()=>{slider.value=0;update();};document.querySelector('#fixed-open').onclick=()=>{slider.value=120;update();};update();
 const size=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(size).observe(host);size();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});setStatus('3D 준비 완료');
}catch(e){setStatus('3D를 표시하지 못했습니다. STL 다운로드는 사용할 수 있습니다.');console.error(e);}

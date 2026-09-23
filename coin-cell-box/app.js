import {t,language,applyTranslations} from '../shared/i18n.js';
import * as THREE from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {DEFAULT,TYPES,layout,normalize,parseRows,balanceRows} from './layout.js';
const tQuantity=()=>t('{type} 개수',{type:''}).trim();
const $=s=>document.querySelector(s),colors=['#ca9a62','#739c8a','#94b5a5','#aac7b0','#c6a4b5'];
let generationTimer,statusValues={},statusKey="설정에 맞춰 3D 형상을 자동으로 만듭니다.";
function status(key,values={}){statusKey=key;statusValues=values;$('#status').textContent=t(key,values);}
let design=structuredClone(DEFAULT),L,built=null,revision=0,busy=false,scene,camera,renderer,controls,root,lidPivot;
try{if(location.hash.startsWith('#d='))design=normalize(JSON.parse(decodeURIComponent(location.hash.slice(3))));}catch{}
$('#counts').innerHTML=TYPES.map((t,i)=>`<label class="field"><span><span class="swatch" style="background:${colors[i]}"></span>${t.id}<small>Ø${t.d} × ${t.t}mm</small></span><input type="number" min="0" max="30" step="1" id="count-${i}" aria-label="${t.id} ${tQuantity()}"></label>`).join('');
function renderRows(){
 $('#manual').checked=design.manual;$('#manual-settings').hidden=!design.manual;
 $('#row-settings').innerHTML=design.order.map((i,k)=>`<div class="row-setting"><strong>${TYPES[i].id}</strong><div><button class="secondary" data-move="${i}" data-dir="-1" aria-label="${t('위로 이동')} ${TYPES[i].id}" ${k===0?'disabled':''}>↑</button><button class="secondary" data-move="${i}" data-dir="1" aria-label="${t('아래로 이동')} ${TYPES[i].id}" ${k===4?'disabled':''}>↓</button></div><label>${t('줄별 개수')}<input id="rows-${i}" type="text" inputmode="text" placeholder="${design.counts[i]}" aria-label="${TYPES[i].id} ${t('줄별 개수')}"></label></div>`).join('');
 TYPES.forEach((_,i)=>{$('#rows-'+i).value=design.rows[i];$('#rows-'+i).addEventListener('input',changed);});
 for(const button of document.querySelectorAll('[data-move]'))button.onclick=()=>{const at=design.order.indexOf(+button.dataset.move),to=at+Number(button.dataset.dir);[design.order[at],design.order[to]]=[design.order[to],design.order[at]];renderRows();changed();};
}
function sync(){renderRows();$('#labels').checked=design.labels;TYPES.forEach((_,i)=>$('#count-'+i).value=design.counts[i]);for(const k of ['spacing','tilt','width'])$('#'+k).value=design[k];$('#exposure').value=+(design.exposure*100).toFixed(2);}
function invalidate(){revision++;built=null;for(const id of ['body-download','lid-download','guide-download'])$('#'+id).disabled=true;status('설정에 맞춰 3D 형상을 자동으로 만듭니다.');$('#viewport').hidden=false;if(root)root.visible=false;$('#layout').hidden=!$('#show-plan').checked;}
function showPlan(){
 try{document.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));L=layout(design);$('#metrics').innerHTML=`<span><strong>${L.cells.length}</strong>${t("개 수납")}</span><span><strong>${(L.W+6.9).toFixed(1)} × ${(L.D+3.1).toFixed(1)}</strong>${t("전체 가로 × 세로 mm")}</span><span><strong>${L.outerZ.toFixed(1)}</strong>${t("높이 mm")}</span>`;
 const svg=$('#layout');svg.setAttribute('viewBox',`-8 -5 ${L.W+16} ${L.D+10}`);
 svg.innerHTML=`<rect x="0" y="0" width="${L.W}" height="${L.D}" rx="2" fill="#edf0e7" stroke="#193b37" stroke-width=".5"/>`+L.blocks.map(b=>`<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1" fill="${colors[b.type]}" fill-opacity=".22" stroke="${colors[b.type]}" stroke-width=".4"/><text x="${b.x+2}" y="${b.y+3}" font-size="2.4" fill="#193b37">${TYPES[b.type].id} · ${b.count}</text></g>`).join('')+L.cells.map(c=>`<rect x="${c.x-TYPES[c.type].t/2}" y="${c.y-TYPES[c.type].d/2}" width="${TYPES[c.type].t}" height="${TYPES[c.type].d}" rx=".5" fill="${colors[c.type]}"/>`).join('');
 $('#section').textContent=t('기울기 {tilt}° · 중심 간격 {spacing}mm · 셀 노출 약 {exposure}% · 뚜껑 받침까지 0.5mm',{tilt:design.tilt,spacing:design.spacing,exposure:(design.exposure*100).toFixed(0)});
 $('#pauses').innerHTML=[['뚜껑',L.pauses[0]],['본체',L.pauses[1]]].map(([n,z])=>`<tr><td>${t(n)}</td><td>${(z-.2).toFixed(1)}mm</td><td>${t("{layer}층 ({z}mm) 출력 전",{layer:Math.round(z/.2),z:z.toFixed(1)})}</td></tr>`).join('');
 history.replaceState(null,'','#d='+encodeURIComponent(JSON.stringify(design)));
 }catch(e){L=null;status(e.message,e.values);if(e.field)$('#'+e.field)?.setAttribute('aria-invalid','true');$('#layout').innerHTML='';$('#metrics').textContent=t(e.message,e.values);$('#pauses').innerHTML='';}
}
function changed(event){
 const input=event?.target;
 if($('#manual').checked&&input?.id.startsWith('rows-')){
  const values=parseRows(input.value);if(values&&values.reduce((s,n)=>s+n,0)<=30)$('#count-'+input.id.slice(5)).value=values.reduce((s,n)=>s+n,0);
 }
 if($('#manual').checked&&input?.id.startsWith('count-')&&input.value!==''&&input.validity.valid){
  const rows=$('#rows-'+input.id.slice(6));if(rows.value.trim())rows.value=balanceRows(Number(input.value),rows.value);
 }
 const invalid=[...document.querySelectorAll('input[type=number]')].find(el=>el.value===''||!el.validity.valid);
 if(invalid){invalidate();L=null;invalid.setAttribute('aria-invalid','true');const name=invalid.getAttribute('aria-label')||invalid.closest('label')?.firstChild?.textContent?.trim()||invalid.id;const values={field:name,min:invalid.min,max:invalid.max};status('{field}: {min}–{max} 범위의 값을 입력하세요.',values);$('#metrics').textContent=t(statusKey,values);return;}
 design=normalize({manual:$('#manual').checked,order:design.order,rows:TYPES.map((_,i)=>$('#rows-'+i).value),labels:$('#labels').checked,counts:TYPES.map((_,i)=>+$('#count-'+i).value),spacing:+$('#spacing').value,tilt:+$('#tilt').value,width:+$('#width').value,exposure:+$('#exposure').value/100});
 TYPES.forEach((_,i)=>$('#rows-'+i).placeholder=design.counts[i]);invalidate();showPlan();scheduleGeneration();
}
for(const el of document.querySelectorAll('input[type=number]'))el.addEventListener('input',changed);
$('#labels').addEventListener('change',changed);
$('#manual').onchange=()=>{$('#manual-settings').hidden=!$('#manual').checked;changed();};
$('#reset').onclick=()=>{design=structuredClone(DEFAULT);invalidate();sync();showPlan();scheduleGeneration();};
$('#example').onclick=()=>{design={...design,counts:[10,5,5,5,5]};invalidate();sync();showPlan();scheduleGeneration();};
$('#two-row-example').onclick=()=>{design={...design,manual:true,counts:[6,10,6,6,4],order:[1,0,2,3,4],rows:['','5,5','','',''],width:0};invalidate();sync();showPlan();scheduleGeneration();};
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);status('현재 설정 링크를 복사했습니다.');}catch{status('주소창의 주소를 복사하면 같은 설정을 공유할 수 있습니다.');}};
function init3D(){
 if(renderer)return;
 const el=$('#viewport');renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.append(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece5');camera=new THREE.PerspectiveCamera(40,1,.1,3000);camera.up.set(0,0,1);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 scene.add(new THREE.HemisphereLight(0xffffff,0x65776a,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-90,-130,250);scene.add(light);
 new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(el);
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}
function display(data){
 const firstView=!root;init3D();if(root){root.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});scene.remove(root);}
 root=new THREE.Group();scene.add(root);lidPivot=new THREE.Group();lidPivot.position.fromArray(data.layout.axis);root.add(lidPivot);
 for(const name of ['body','lid','coins']){const m=data.meshes[name],p=new Float32Array(m.vertices.length/m.stride*3);for(let i=0;i<p.length/3;i++)p.set(m.vertices.subarray(i*m.stride,i*m.stride+3),i*3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setIndex(new THREE.BufferAttribute(m.indices,1));g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:name==='coins'?0x99a3a4:name==='lid'?0x829e8b:0xd0b08a,roughness:.7,metalness:name==='coins'?.7:0}));mesh.name=name;if(name==='coins')mesh.visible=$('#show-coins').checked;if(name==='lid'){mesh.position.fromArray(data.layout.axis.map(v=>-v));lidPivot.add(mesh);}else root.add(mesh);}
 const s=Math.max(data.layout.W,data.layout.D);if(firstView){controls.target.set(data.layout.W/2,data.layout.D/2,10);camera.position.set(data.layout.W/2+s,data.layout.D/2-s*1.6,s*1.5);controls.update();}lidPivot.rotation.y=-Number($('#opening').value)*Math.PI/180;
}
$('#opening').oninput=()=>{const angle=Number($('#opening').value);$('#opening-value').value=angle+'°';if(lidPivot)lidPivot.rotation.y=-angle*Math.PI/180;};
$('#lid-close').onclick=()=>{$('#opening').value=0;$('#opening').oninput();};
$('#lid-open').onclick=()=>{$('#opening').value=120;$('#opening').oninput();};
$('#show-plan').onchange=()=>{$('#layout').hidden=!$('#show-plan').checked;};
$('#show-coins').onchange=()=>{const coins=root?.getObjectByName('coins');if(coins)coins.visible=$('#show-coins').checked;};
function scheduleGeneration(){clearTimeout(generationTimer);generationTimer=setTimeout(generate,350);}
function generate(){if(!L||busy)return;busy=true;status('브라우저에서 형상을 만드는 중…');worker.postMessage({id:revision,design});}
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});

worker.onmessage=({data})=>{busy=false;if(data.id!==revision){scheduleGeneration();return;}if(data.error){status(data.error);return;}built=data;for(const id of ['body-download','lid-download','guide-download'])$('#'+id).disabled=false;status('STL 준비 완료. 출력 전에 정지 높이를 확인하세요.');$('#layout').hidden=!$('#show-plan').checked;$('#viewport').hidden=false;try{display(data);}catch(e){status('STL은 준비됐지만 3D 표시를 시작하지 못했습니다. 배치도로 확인하세요.');$('#layout').hidden=false;$('#viewport').hidden=true;}};
worker.onerror=()=>{busy=false;status('형상 엔진을 불러오지 못했습니다. 페이지를 새로고침하세요.');};
function download(data,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#body-download').onclick=()=>built&&download(built.body,'coincell-body.stl');$('#lid-download').onclick=()=>built&&download(built.lid,'coincell-lid-print.stl');
$('#guide-download').onclick=()=>{if(!built)return;const l=built.layout;download(JSON.stringify({design:l.design,units:'mm',hardware:{magnet:'5 x 2mm, 4 pieces',pin:'1.75mm filament'},layer_height:.2,pause_before_z:{lid:l.pauses[0],body:l.pauses[1]},pause_completed_z:{lid:+(l.pauses[0]-.2).toFixed(2),body:+(l.pauses[1]-.2).toFixed(2)},language,note:t('STL에는 정지가 없습니다. 자석 구멍이 열린 마지막 층 다음에 정지를 설정하세요. 이 맞춤 형상의 실물 끼움과 흔들기 유지력은 미검증입니다.')},null,2),`coincell-print-guide-${language}.json`,'application/json');};
window.addEventListener('languagechange',()=>{renderRows();showPlan();status(statusKey,statusValues);TYPES.forEach((cell,i)=>$('#count-'+i).setAttribute('aria-label',t('{type} 개수',{type:cell.id})));});
sync();showPlan();applyTranslations();scheduleGeneration();

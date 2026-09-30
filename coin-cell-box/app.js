import {t,language,applyTranslations} from '../shared/i18n.js';
import * as THREE from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {DEFAULT,TYPES,layout,normalize,parseRows,balanceRows,toLanes} from './layout.js';
const tQuantity=()=>t('{type} 개수',{type:''}).trim();
const $=s=>document.querySelector(s),colors=['#ca9a62','#739c8a','#94b5a5','#aac7b0','#c6a4b5','#a4b7ce','#c9ba7c','#b6a0ce','#ccaaa0'];
let generationTimer,statusValues={},statusKey="설정에 맞춰 3D 형상을 자동으로 만듭니다.";
function status(key,values={}){statusKey=key;statusValues=values;$('#status').textContent=t(key,values);}
let design=structuredClone(DEFAULT),L,built=null,revision=0,busy=false,scene,camera,renderer,controls,root,lidPivot;
try{if(location.hash.startsWith('#d='))design=normalize(JSON.parse(decodeURIComponent(location.hash.slice(3))));}catch{}
if(design.manual&&!design.lanes){try{design={...design,lanes:toLanes(design)};}catch{}}
const countFields=TYPES.map((t,i)=>`<label class="field"><span><span class="swatch" style="background:${colors[i]}"></span>${t.id}<small>Ø${t.d} × ${t.t}mm</small></span><input type="number" min="0" max="30" step="1" id="count-${i}" aria-label="${t.id} ${tQuantity()}"></label>`);
$('#counts').innerHTML=countFields.slice(0,5).join('');$('#extra-counts').innerHTML=countFields.slice(5).join('');
function commitLanes(){design=normalize({...design,manual:true,merge:false});sync();invalidate();showPlan();scheduleGeneration();}
function renderRows(){
 $('#manual').checked=design.manual;$('#manual-settings').hidden=!design.manual;
 TYPES.forEach((_,i)=>$('#count-'+i).disabled=design.manual);
 $('#lane-total').value=design.lanes?.length||1;
 const rows=design.lanes||[];
 $('#row-settings').innerHTML=rows.map((row,r)=>`<section class="lane-card" id="lane-${r}"><div class="toolbar"><strong>${t('{row}줄',{row:r+1})}</strong><button class="secondary" data-row="${r}" data-action="row-up" ${r===0?'disabled':''} aria-label="${t('위로 이동')}">↑</button><button class="secondary" data-row="${r}" data-action="row-down" ${r===rows.length-1?'disabled':''} aria-label="${t('아래로 이동')}">↓</button><button class="secondary" data-row="${r}" data-action="row-delete">${t('줄 삭제')}</button></div><p class="help">${t('뒤 · 힌지 → 앞 · 자석')}</p>${row.map((g,k)=>`<div class="lane-group"><select data-row="${r}" data-group="${k}" aria-label="${t('코인셀 종류')}">${TYPES.map((type,i)=>`${i===0?`<optgroup label="${t('기본 코인셀')}">`:i===5?`</optgroup><optgroup label="${t('기타 코인셀')}">`:''}<option value="${i}" ${i===g.type?'selected':''}>${type.id}</option>`).join('')}</optgroup></select><input id="lane-count-${r}-${k}" type="number" min="1" max="30" step="1" value="${g.count}" data-row="${r}" data-group="${k}" aria-label="${t('수량')}"><button class="secondary" data-row="${r}" data-group="${k}" data-action="group-back" ${k===0?'disabled':''} aria-label="${t('뒤로 이동')}">←</button><button class="secondary" data-row="${r}" data-group="${k}" data-action="group-front" ${k===row.length-1?'disabled':''} aria-label="${t('앞으로 이동')}">→</button><button class="secondary" data-row="${r}" data-group="${k}" data-action="group-delete" aria-label="${t('묶음 삭제')}">×</button></div>`).join('')}<button class="secondary" data-row="${r}" data-action="group-add" ${row.length>=8?'disabled':''}>${t('종류·수량 추가')}</button></section>`).join('');
 $('#add-lane').disabled=rows.length>=12;
}
function sync(){renderRows();$('#other-cells').open=design.counts.slice(5).some(n=>n>0);for(const key of ['align','spread'])$('#'+key).checked=design[key];$('#labels').checked=design.labels;TYPES.forEach((_,i)=>$('#count-'+i).value=design.counts[i]);for(const k of ['spacing','tilt','width'])$('#'+k).value=design[k];$('#exposure').value=+(design.exposure*100).toFixed(2);}
$('#row-settings').onclick=event=>{
 const button=event.target.closest('button[data-action]');if(!button)return;const r=+button.dataset.row,k=+button.dataset.group,rows=design.lanes,row=rows[r];
 switch(button.dataset.action){
 case 'row-up':[rows[r-1],rows[r]]=[rows[r],rows[r-1]];break;
 case 'row-down':[rows[r+1],rows[r]]=[rows[r],rows[r+1]];break;
 case 'row-delete':rows.splice(r,1);break;
 case 'group-back':[row[k-1],row[k]]=[row[k],row[k-1]];break;
 case 'group-front':[row[k+1],row[k]]=[row[k],row[k+1]];break;
 case 'group-delete':row.splice(k,1);break;
 case 'group-add':row.push({type:1,count:1});break;
 }
 commitLanes();
};
$('#row-settings').oninput=event=>{
 const el=event.target;if(!el.matches('input[data-group],select[data-group]'))return;
 const g=design.lanes[+el.dataset.row][+el.dataset.group];g[el.tagName==='SELECT'?'type':'count']=el.value===''?0:Number(el.value);
 design=normalize(design);TYPES.forEach((_,i)=>$('#count-'+i).value=design.counts[i]);invalidate();showPlan();scheduleGeneration();
};
$('#add-lane').onclick=()=>{if(!design.lanes)design.lanes=[];design.lanes.push([{type:1,count:1}]);commitLanes();};
$('#lane-total').onchange=()=>{const el=$('#lane-total');if(!el.validity.valid||!el.value)return;const n=Number(el.value);design.lanes=design.lanes.slice(0,n);while(design.lanes.length<n)design.lanes.push([{type:1,count:1}]);commitLanes();};
function invalidate(){revision++;built=null;for(const id of ['body-download','lid-download','guide-download'])$('#'+id).disabled=true;status('설정에 맞춰 3D 형상을 자동으로 만듭니다.');$('#viewport').hidden=false;if(root)root.visible=false;$('#layout').hidden=!$('#show-plan').checked;}
function showPlan(){
 try{document.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));L=layout(design);$('#metrics').innerHTML=`<span><strong>${L.cells.length}</strong>${t("개 수납")}</span><span><strong>${(L.W+6.9).toFixed(1)} × ${(L.D+3.1).toFixed(1)}</strong>${t("전체 가로 × 세로 mm")}</span><span><strong>${L.outerZ.toFixed(1)}</strong>${t("높이 mm")}</span>`;
 const svg=$('#layout');svg.setAttribute('viewBox',`-8 -12 ${L.W+16} ${L.D+17}`);
 svg.innerHTML=`<text x="0" y="-5" font-size="3" fill="#193b37">${t('뒤 · 힌지')}</text><text x="${L.W}" y="-5" text-anchor="end" font-size="3" fill="#193b37">${t('앞 · 자석')}</text><rect x="0" y="0" width="${L.W}" height="${L.D}" rx="2" fill="#edf0e7" stroke="#193b37" stroke-width=".5"/>`+`<rect x="${L.W-10}" y="1.68" width="8.32" height="${L.D-3.36}" fill="#d0b08a" fill-opacity=".45"/>${[L.D/4,L.D*3/4].map(y=>`<circle cx="${L.magnetX}" cy="${L.D-y}" r="2.65" fill="none" stroke="#725b43" stroke-width=".4" stroke-dasharray="1 .6"/>`).join('')}`+L.blocks.map(b=>`<g><rect x="${b.x}" y="${L.D-b.y-b.h}" width="${b.w}" height="${b.h}" rx="1" fill="${colors[b.type]}" fill-opacity=".22" stroke="${colors[b.type]}" stroke-width=".4"/><text x="${b.x+2}" y="${L.D-b.y-b.h+3}" font-size="2.4" fill="#193b37">${TYPES[b.type].id} · ${b.count}</text></g>`).join('')+L.cells.map(c=>`<rect x="${c.x-TYPES[c.type].t/2}" y="${L.D-c.y-TYPES[c.type].d/2}" width="${TYPES[c.type].t}" height="${TYPES[c.type].d}" rx=".5" fill="${colors[c.type]}"/>`).join('');
 $('#section').textContent=t('기울기 {tilt}° · 중심 간격 {spacing}mm · 셀 노출 약 {exposure}% · 뚜껑 받침까지 0.5mm',{tilt:design.tilt,spacing:design.spread&&design.manual?`${Math.min(...L.blocks.map(b=>b.pitch)).toFixed(1)}–${Math.max(...L.blocks.map(b=>b.pitch)).toFixed(1)}`:design.spacing,exposure:(design.exposure*100).toFixed(0)});
 $('#pauses').innerHTML=[['뚜껑',L.pauses[0]],['본체',L.pauses[1]]].map(([n,z])=>`<tr><td>${t(n)}</td><td>${(z-.2).toFixed(1)}mm</td><td>${t("{layer}층 ({z}mm) 출력 전",{layer:Math.round(z/.2),z:z.toFixed(1)})}</td></tr>`).join('');
 history.replaceState(null,'','#d='+encodeURIComponent(JSON.stringify(design)));
 }catch(e){L=null;status(e.message,e.values);if(e.field)$('#'+e.field)?.setAttribute('aria-invalid','true');$('#layout').innerHTML='';$('#metrics').textContent=t(e.message,e.values);$('#pauses').innerHTML='';}
}
function changed(){
 const invalid=[...document.querySelectorAll('input[type=number]')].filter(el=>!el.disabled&&el.id!=='lane-total'&&!el.closest('#row-settings')).find(el=>el.value===''||!el.validity.valid);
 if(invalid){invalidate();L=null;invalid.setAttribute('aria-invalid','true');const values={field:invalid.getAttribute('aria-label')||invalid.id,min:invalid.min,max:invalid.max};status('{field}: {min}–{max} 범위의 값을 입력하세요.',values);$('#metrics').textContent=t(statusKey,values);return;}
 design=normalize({...design,align:$('#align').checked,spread:$('#spread').checked,manual:$('#manual').checked,labels:$('#labels').checked,counts:TYPES.map((_,i)=>+$('#count-'+i).value),spacing:+$('#spacing').value,tilt:+$('#tilt').value,width:+$('#width').value,exposure:+$('#exposure').value/100});
 invalidate();showPlan();scheduleGeneration();
}
for(const el of document.querySelectorAll('#counts input,#extra-counts input,input#spacing,input#tilt,input#width,input#exposure'))el.addEventListener('input',changed);
for(const key of ['labels','align','spread'])$('#'+key).addEventListener('change',changed);
$('#manual').onchange=()=>{
 if($('#manual').checked&&!design.lanes){try{design.lanes=toLanes(design);}catch{design.lanes=[[{type:1,count:1}]];}}
 design=normalize({...design,manual:$('#manual').checked});if(design.manual)$('#show-plan').checked=true;sync();changed();
};
$('#reset').onclick=()=>{design=structuredClone(DEFAULT);invalidate();sync();showPlan();scheduleGeneration();};
$('#example').onclick=()=>{design={...design,manual:false,lanes:null,counts:[10,5,5,5,5]};invalidate();sync();showPlan();scheduleGeneration();};
$('#two-row-example').onclick=()=>{design={...design,manual:true,lanes:[[{type:1,count:6}],[{type:1,count:6}],[{type:0,count:6}],[{type:2,count:6}],[{type:3,count:6}],[{type:4,count:6}]],width:0};commitLanes();};
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);status('현재 설정 링크를 복사했습니다.');}catch{status('주소창의 주소를 복사하면 같은 설정을 공유할 수 있습니다.');}};
function init3D(){
 if(renderer)return;
 const el=$('#viewport');renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.append(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#f1f4f6');camera=new THREE.PerspectiveCamera(40,1,.1,3000);camera.up.set(0,0,1);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 // Neutral studio lighting keeps cavities readable without metallic glare.
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene.add(new THREE.HemisphereLight(0xffffff,0x8b99a6,1.7));
 const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-90,-130,250);scene.add(light);
 const fill=new THREE.DirectionalLight(0xddeeff,.8);fill.position.set(180,120,100);scene.add(fill);
 new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(el);
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}
function display(data){
 const firstView=!root;init3D();if(root){root.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});scene.remove(root);}
 root=new THREE.Group();scene.add(root);lidPivot=new THREE.Group();lidPivot.position.fromArray(data.layout.axis);root.add(lidPivot);
 for(const name of ['body','lid','coins']){const m=data.meshes[name],p=new Float32Array(m.vertices.length/m.stride*3);for(let i=0;i<p.length/3;i++)p.set(m.vertices.subarray(i*m.stride,i*m.stride+3),i*3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setIndex(new THREE.BufferAttribute(m.indices,1));// Shared CAD vertices must not smooth normals across slot corners and flat faces.
 const surface=g.toNonIndexed();surface.computeVertexNormals();g.dispose();
 const mesh=new THREE.Mesh(surface,new THREE.MeshStandardMaterial({color:name==='coins'?0xc3cbd1:0x8bcddd,roughness:name==='coins'?.48:.82,metalness:name==='coins'?.22:0}));
 if(name!=='coins'){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(surface,35),new THREE.LineBasicMaterial({color:0x35576a,transparent:true,opacity:.16,depthWrite:false}));mesh.add(edges);}
 mesh.name=name;if(name==='coins')mesh.visible=$('#show-coins').checked;if(name==='lid'){mesh.position.fromArray(data.layout.axis.map(v=>-v));lidPivot.add(mesh);}else root.add(mesh);}
 const s=Math.max(data.layout.W,data.layout.D);if(firstView){controls.target.set(data.layout.W/2,data.layout.D/2,10);camera.position.set(data.layout.W/2+s,data.layout.D/2-s*1.6,s*1.5);controls.update();}lidPivot.rotation.y=-Number($('#opening').value)*Math.PI/180;
}
$('#view-top').onclick=()=>{if(!camera||!built)return;const l=built.layout,s=Math.max(l.W,l.D);controls.target.set(l.W/2,l.D/2,0);camera.position.set(l.W/2,l.D/2-.001,s*2);controls.update();};
$('#view-angle').onclick=()=>{if(!camera||!built)return;const l=built.layout,s=Math.max(l.W,l.D);controls.target.set(l.W/2,l.D/2,10);camera.up.set(0,0,1);camera.position.set(l.W/2+s,l.D/2-s*1.6,s*1.5);controls.update();};
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
if(design.manual)$('#show-plan').checked=true;sync();showPlan();applyTranslations();scheduleGeneration();

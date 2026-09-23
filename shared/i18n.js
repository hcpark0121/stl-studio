import {messages} from './messages.js';
export const languages=['ko','en','ja','zh'];
export function chooseLanguage(query,saved,preferred=[]){
 const match=v=>{const c=String(v||'').toLowerCase().split('-')[0];return languages.includes(c)?c:null;};
 return match(query)||match(saved)||preferred.map(match).find(Boolean)||'en';
}
let saved;if(typeof document!=='undefined')try{saved=localStorage.getItem('stl-studio-language');}catch{}
export let language=typeof document==='undefined'?'ko':chooseLanguage(new URL(location.href).searchParams.get('lang'),saved,navigator.languages||[navigator.language]);
export function translate(key,lang=language,values={}){let s=lang==='ko'?key:(messages[key]?.[lang]||key);return s.replace(/\{(\w+)\}/g,(m,k)=>values[k]??m);}
export const t=(key,values={})=>translate(key,language,values);
const sources=new WeakMap(),linkSources=new WeakMap();
export function applyTranslations(){
 document.documentElement.lang=language==='zh'?'zh-Hans':language;
 const walk=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
 while(walk.nextNode()){const node=walk.currentNode;if(node.parentElement?.closest('script,style,[data-no-i18n]'))continue;
  let original=sources.get(node);if(!original&&messages[node.textContent.trim()]){original=node.textContent;sources.set(node,original);}
  if(original){const key=original.trim();node.textContent=original.replace(key,t(key));}
 }
 for(const el of document.querySelectorAll('[alt],[aria-label],meta[name="description"]')){
  for(const attr of ['alt','aria-label','content'])if(el.hasAttribute(attr)){
   let original=el.dataset['i18n'+attr.replace('-','')];if(!original&&messages[el.getAttribute(attr)]){original=el.getAttribute(attr);el.dataset['i18n'+attr.replace('-','')]=original;}
   if(original)el.setAttribute(attr,t(original));
  }
 }
 for(const a of document.querySelectorAll('a[href]')){const raw=linkSources.get(a)||a.getAttribute('href');linkSources.set(a,raw);if(!raw||a.hasAttribute('download'))continue;const u=new URL(raw,location.href);if(u.origin===location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('.html'))){u.searchParams.set('lang',language);a.setAttribute('href',raw.split(/[?#]/)[0]+'?'+u.searchParams.toString()+u.hash);}}
 for(const a of document.querySelectorAll('[data-print-guide]'))a.setAttribute('href',`downloads/PRINT-GUIDE-${language}.md`);
 const selector=document.querySelector('#language-select');if(selector)selector.value=language;
}
export function setLanguage(value){if(!languages.includes(value))return;language=value;try{localStorage.setItem('stl-studio-language',value);}catch{}const u=new URL(location.href);u.searchParams.set('lang',value);history.replaceState(null,'',u);applyTranslations();window.dispatchEvent(new Event('languagechange'));}
if(typeof document!=='undefined'){
 const label=document.createElement('label');label.className='language-picker';label.textContent='🌐 ';const select=document.createElement('select');select.id='language-select';select.setAttribute('aria-label','Language / 언어 / 言語 / 语言');
 for(const [value,name] of [['ko','한국어'],['en','English'],['ja','日本語'],['zh','简体中文']]){const o=document.createElement('option');o.value=value;o.textContent=name;select.append(o);}label.append(select);document.querySelector('header')?.append(label);select.onchange=()=>setLanguage(select.value);applyTranslations();
}

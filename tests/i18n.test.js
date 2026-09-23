import assert from 'node:assert/strict';
import fs from 'node:fs';
import {messages} from '../shared/messages.js';
import {chooseLanguage,translate} from '../shared/i18n.js';
assert.equal(chooseLanguage('ja','ko',['en-US']),'ja');
assert.equal(chooseLanguage(null,'zh',['ja-JP']),'zh');
assert.equal(chooseLanguage(null,null,['fr','en-US']),'en');
assert.equal(chooseLanguage(null,null,['zh-CN']),'zh');
assert.equal(chooseLanguage('bad','bad',['de']),'en');
for(const [key,row] of Object.entries(messages))for(const lang of ['en','ja','zh']){
 assert(row[lang]?.trim(),`${lang} ${key}`);
 const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(params(key),params(row[lang]),`${lang} placeholders ${key}`);
}
for(const lang of ['ko','en','ja','zh']){
 const s=translate('{layer}층 ({z}mm) 출력 전',lang,{layer:58,z:'11.6'});assert(s.includes('58')&&s.includes('11.6')&&!s.includes('{'));
}
for(const file of ['index.html','coin-cell-box/index.html','coin-cell-box/tested.html']){
 const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'');
 for(const match of html.matchAll(/>([^<>]+)</g)){const key=match[1].trim();if(/[가-힣]/.test(key))assert(messages[key],`${file}: untranslated text ${key}`);}
 for(const match of html.matchAll(/(?:alt|aria-label|content)="([^"]+)"/g)){const key=match[1];if(/[가-힣]/.test(key))assert(messages[key],`${file}: untranslated attribute ${key}`);}
}
console.log(`PASS ${Object.keys(messages).length} messages × 3 translations; locale selection, placeholders and HTML coverage`);

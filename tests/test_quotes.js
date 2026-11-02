const assert=require('node:assert/strict');
const fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const s=d.sessions.find(x=>x.id==='sessione-sopravvivenza-01');
assert(s.quotes.length===14);
const groups={funny:0,important:0};
for(const q of s.quotes){
 assert(q.speaker&&q.text&&q.context&&/^\d{2}:\d{2}:\d{2}$/.test(q.time));
 assert(Object.hasOwn(groups,q.type));
 groups[q.type]++;
}
assert(groups.funny===8&&groups.important===6);
assert(s.quotes.every((q,i)=>i===0||s.quotes[i-1].time<=q.time));
assert(s.quotes.some(q=>q.speaker==='Sue Nami'&&q.text.includes('condividere i punti')));
assert(s.quotes.some(q=>q.speaker==='Elisabeth'&&q.text.includes('primo posto')));
assert(d.sessions.find(x=>x.id==='sessione-fiume-01').quotes.length===0);
const js=fs.readFileSync('docs/assets/app-v2.js','utf8');
assert(js.includes('Frasi divertenti')&&js.includes('Frasi importanti'));
console.log('PASS: Two verified quote categories and speaking roles.');

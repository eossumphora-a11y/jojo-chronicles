/** Player-safe offline fallback assertions. */
const fs=require('node:fs');const assert=require('node:assert/strict');
const a=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const formats=JSON.parse(fs.readFileSync('docs/data/session-formats.json','utf8')).sessions;
assert(a.entries.length>=12);assert(a.sessions.length>=1);
const recap=a.sessions.find(s=>s.id==='sessione-fiume-01');
assert(recap&&recap.public===true&&recap.summary===formats['sessione-fiume-01'].standard);
for(const e of a.entries){assert(e.public===true); assert(!('notes' in e));assert(!('transcript' in e));}
for(const bad of ['personaggio-john','personaggio-emma','personaggio-emma-stenvibler','pg-joshwa'])assert(!a.entries.some(e=>e.id===bad));
for(const name of ['FATHOMS BELOW','RUSTY HOOK','JustIn Time','POOR SOULS'])assert(a.entries.some(e=>e.kind==='stand'&&e.title===name&&recap.summary.toLowerCase().includes(name.toLowerCase())));
assert(!JSON.stringify(a).includes('SEGRETO MASTER'));
console.log('PASS: Public fallback preserves approved recap and only verified, public entries.');

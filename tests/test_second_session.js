/** Public chapter 2 review: source-based content and regression protection. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const formats=JSON.parse(fs.readFileSync('docs/data/session-formats.json','utf8')).sessions;
const first=data.sessions.find(x=>x.id==='sessione-fiume-01');
const current=data.sessions.find(x=>x.id==='sessione-sopravvivenza-01');
assert(first?.summary.length>1000,'First session unchanged and public');
assert(current?.public && current.summary.length>4500,'New complete public recap exists');
assert(current.events.length>=20,'Chronology restored with timestamps');
assert(current.events.every(x=>/^\d\d:\d\d$/.test(x.time)), 'Every new event has a timestamp');
assert.equal(current.date,'','Recording date is not assumed to be session date');
assert.equal(current.number,null,'Unverified session number is not invented');
assert(current.sortOrder>0,'New chapter can sort first without faking session number');
assert(current.quotes.length===0,'Do not invent memorable quotes');
const f=formats[current.id];
assert(f&&f.concise&&f.standard&&f.combat&&f.outline?.length>=4,'All four recap views work');
for(const kind of ['character','artifact','other','location']){
 assert(current.related.some(id=>data.entries.some(e=>e.id===id&&e.kind===kind)),kind+' category is connected');
}
for(const id of ['personaggio-betty','personaggio-camille','oggetto-progetti-arena','oggetto-pietra-scritta-rossa',
 'oggetto-medaglione-camille','minaccia-automa-tornado','trial-sopravvivenza']){
 const item=data.entries.find(e=>e.id===id);
 assert(item?.public===true,'Entry must be published: '+id);
 assert(current.related.includes(id),'Entry must link to session: '+id);
}
assert(!data.entries.some(e=>e.kind==='stand'&&e.title.toLowerCase().includes('automa')),'Automa is not an identified Stand');
assert(current.summary.includes('Betty torna a parlare')&&current.summary.includes('Dichiara di aver stretto'),'A reported claim must be attributed');
assert(current.summary.includes('Resta da capire quanto ci sia di vero'),'Unconfirmed pact cannot be described as established fact');
assert(!current.summary.includes('Tremotino'),'Out-of-character design ideas are not published');
const js=fs.readFileSync('docs/assets/app-v2.js','utf8');
assert(js.includes('b.sortOrder??0'),'New session must appear first without invented episode number');
console.log('PASS: second published recap, timeline and linked wiki entries are complete and spoiler-safe.');

/* All published recounts are in-world narratives, without tabletop references. */
for (const chapter of data.sessions) {
 const authored = formats[chapter.id];
 assert(authored?.standard === chapter.summary,'The canonical recap must match the standard version');
 const sections=[chapter.summary,authored.lead,authored.concise,authored.combat,
   ...(chapter.events||[]).map(event=>event.text)];
 const meta=/\b(?:nella scorsa sessione|giocatrici?|giocatori|il master|il narratore|nella trascrizione|dalla registrazione|il tiro di dado|fuori gioco)\b/i;
 for (const narrative of sections) assert(!meta.test(narrative),'No metagame text in published recount: '+chapter.id);
}
assert(current.summary.includes('Mariah mostra un medaglione con il ritratto di Camille'),
  'The medallion is shown by Mariah');
const mariah=data.entries.find(entry=>entry.id==='personaggio-mariah');
const medallion=data.entries.find(entry=>entry.id==='oggetto-medaglione-camille');
assert(mariah?.public_inventory?.some(x=>x.name==='Medaglione con Camille'),
 'Mariah must have the public medallion inventory record');
assert(medallion?.body?.includes('Mariah lo mostra'),
 'Medallion entry must say Mariah showed it');

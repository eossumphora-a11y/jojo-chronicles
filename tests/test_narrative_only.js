/* A JoJo recap is ONLY an in-world story; narrator/player/transcription notes belong elsewhere. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const doc=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const formats=JSON.parse(fs.readFileSync('docs/data/session-formats.json','utf8')).sessions;
const s=doc.sessions.find(x=>x.id==='sessione-sopravvivenza-01');
const f=formats[s.id];
assert(s&&f);
const passages=[
 ['summary',s.summary],
 ['standard',f.standard],
 ['concise',f.concise],
 ['combat',f.combat],
 ...s.events.map(e=>['event '+e.time,e.text]),
 ...f.outline.flatMap(ch=>ch.events.map(x=>['outline '+ch.title,x])),
 ...doc.entries.filter(x=>s.related.includes(x.id)).flatMap(x=>[
  ['entry summary '+x.id,x.summary||''],
  ['entry details '+x.id,x.body||''],
  ...(x.public_history||[]).filter(h=>h.session_id===s.id).map(h=>['history '+x.id,h.text])
 ])
];
const forbidden=/\b(?:narrator[ei]|narratrice|giocatric[ei]|giocatori|giocatore|registrazion[ei]|trascrizion[ei]|audio|traccia|meta|schede|in gioco|non è verificat[oa]|non (?:è|sono) confermat[ioe]|(?:\d+|ventiquattro|tredici|undici) danni)\b/i;
for(const [name,txt] of passages){
 const m=txt.match(forbidden);
 assert(!m,name+' contains a meta reference: '+(m?.[0]));
}
assert.equal(f.standard,s.summary);
assert(s.summary.includes("Elisabeth le domanda cosa abbia da guadagnare"),'In-world dialogue retained');
assert(s.summary.includes('Mariah mostra un medaglione'),'Medallion show attributed to Mariah');
assert(f.concise.includes('Mariah mostra un medaglione'),'Concise medallion attribution');
assert(s.events.some(e=>e.text.includes('Mariah mostra un medaglione')));
const mariah=doc.entries.find(x=>x.id==='personaggio-mariah');
const medal=doc.entries.find(x=>x.id==='oggetto-medaglione-camille');
const camille=doc.entries.find(x=>x.id==='personaggio-camille');
assert(mariah.related.includes(medal.id));
assert(medal.related.includes(mariah.id));
assert(camille.related.includes(mariah.id));
assert(mariah.public_inventory.some(i=>i.name===medal.title&&i.session_id===s.id));
assert(mariah.public_history.some(i=>i.session_id===s.id&&i.text.includes('Mariah mostra')));
assert(medal.body.includes('Mariah lo mostra'));
assert(doc.sessions.find(x=>x.id==='sessione-fiume-01').summary.length>1000,'Preserve first session');
const engine=fs.readFileSync('recap_engine.py','utf8');
assert(engine.includes('Scrivi SOLO una narrazione IN-UNIVERSE'),'Next-generation recaps follow same rule');
console.log('PASS: In-world recap, correctly attributed Mariah medallion and preserved timeline.');

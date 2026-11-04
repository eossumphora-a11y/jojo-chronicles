/** Player-safe offline fallback assertions. */
const fs=require('node:fs');const assert=require('node:assert/strict');
const a=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const formats=JSON.parse(fs.readFileSync('docs/data/session-formats.json','utf8')).sessions;
assert(a.entries.length>=12);assert(a.sessions.length>=1);
const recap=a.sessions.find(s=>s.id==='sessione-fiume-01');
assert(recap&&recap.public===true&&recap.summary===formats['sessione-fiume-01'].standard);
for(const e of a.entries){assert(e.public===true); assert(!('notes' in e));assert(!('transcript' in e));}
for(const bad of ['personaggio-john','personaggio-emma','personaggio-emma-stenvibler'])assert(!a.entries.some(e=>e.id===bad));
for(const name of ['FATHOMS BELOW','RUSTY HOOK','JustIn Time','POOR SOULS'])assert(a.entries.some(e=>e.kind==='stand'&&e.title===name&&recap.summary.toLowerCase().includes(name.toLowerCase())));
const newlyPublished=a.sessions.find(s=>s.id==='sessione-stanza-dei-cuori-01');
assert(newlyPublished?.public && newlyPublished.related.includes('pg-joshwa'));
assert(a.entries.some(e=>e.id==='pg-joshwa' && e.public===true), 'Joshwa now appears in the approved public chapter');
assert(!a.entries.some(e=>e.id==='oggetto-pietra-scritta-rossa'), 'Master-only stone stays private');
assert(!JSON.stringify(a).includes('SEGRETO MASTER'));
// I reperti letti dai concorrenti devono comparire anche nel sito principale.
for(const id of ['fazione-grimm','personaggio-grimm','studio-requiem','studio-catalizzatori','studio-progetto-r','studio-operazione-dp','studio-cicli','studio-steel-ball-run','luogo-sito-dp','luogo-perimetro-ciclo1','oggetto-catalizzatore-r017']){
 const item=a.entries.find(e=>e.id===id);
 assert(item?.public===true,'Scheda pubblica mancante: '+id);
 assert(newlyPublished.related.includes(id),'Collegamento alla stanza dei cuori mancante: '+id);
}
const grim=a.entries.find(e=>e.id==='personaggio-grimm');
assert(grim.character_role==='npc','I guardiani Grimm devono comparire tra gli NPC');
for(const id of ['studio-requiem','studio-catalizzatori','luogo-sito-dp','oggetto-catalizzatore-r017']){
 assert(a.entries.find(e=>e.id===id).source_document,'Fonte PDF mancante: '+id);
}
const home=fs.readFileSync('docs/index.html','utf8');
const app=fs.readFileSync('docs/assets/app-v2.js','utf8');
assert(home.includes('id="view-documenti"')&&home.includes('data-nav="documenti"'),'Documenti non integrati nel sito');
assert(home.includes('assets/documents.css')&&home.includes('documents-preview'),'Grafica e anteprima dei documenti mancanti');
assert(app.includes("function renderDocuments()")&&app.includes("if(currentView==='documenti')renderDocuments()"),'Navigazione Documenti non funzionante');
assert(app.includes('REPERTO DOCUMENTATO'),'L\'indice Oggetti non comprende i reperti della Wiki');
for(const p of ['assets/archivio-joao-pereira.pdf',...Array.from({length:9},(_,i)=>'assets/documenti/'+[
'01-diario-joao.pdf','02-bussola-pellegrino.pdf','03-operazione-dp.pdf','04-progetto-r.pdf',
'05-classificazione-catalizzatori.pdf','06-registro-sperimentale.pdf','07-cicli-sperimentali.pdf',
'08-steel-ball-run.pdf','09-comunicazione-riservata.pdf'][i])]){
 assert(fs.existsSync('docs/'+p),'PDF mancante: '+p);
}

console.log('PASS: Public fallback preserves approved recap and only verified, public entries.');

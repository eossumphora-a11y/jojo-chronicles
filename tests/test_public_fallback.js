/** Regression: GitHub public.json remains the canonical player archive. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('docs/assets/app-v2.js','utf8');
const start=source.indexOf('function mergeData(');
const end=source.indexOf('\nasync function init()',start);
assert(start>=0&&end>start,'The mergeData public archive function is present');
const context={};vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
const merge=context.mergeData;
const published=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
assert(published.entries.length>=20,'Must have preserved published people, objects and Stands');
assert(published.sessions.length>=1,'Published recap must exist');
const local={entries:published.entries,sessions:published.sessions};
const check=(result)=>{
 assert.equal(result.sessions.length>=1,true);
 assert.equal(result.entries.length>=published.entries.length,true);
 assert.equal(result.sessions.find(s=>s.id==='sessione-fiume-01')?.summary,
  published.sessions.find(s=>s.id==='sessione-fiume-01')?.summary,
  'The full approved recap must not be replaced');
 assert(result.entries.some(x=>x.title==='RUSTY HOOK'));
 assert(result.entries.some(x=>x.title==='Metronomo'));
 assert(result.sessions[0].events?.length>=20,'The timeline must remain intact');
};
check(merge(local,{entries:[],sessions:[]}));
check(merge(local,{entries:null,sessions:undefined}));
const additions={entries:[{id:'new-person',kind:'character',title:'Nuovo incontro',public:true},
 {id:'oggetto-metronomo',kind:'artifact',title:'Override non approvato',public:true},
 {id:'private',kind:'character',title:'Spoiler',public:false}],
 sessions:[{id:'new-session',title:'Nuovo recap pubblicato',summary:'Nuovi fatti',public:true},
 {id:'sessione-fiume-01',title:'Sostituzione non approvata',summary:'Riassunto cancellato',public:true},
 {id:'hidden',title:'Segreto',public:false}]};
const result=merge(local,additions);check(result);
assert(result.entries.some(x=>x.id==='new-person'));
assert(result.sessions.some(x=>x.id==='new-session'));
assert(!result.entries.some(x=>x.id==='private'));
assert(!result.sessions.some(x=>x.id==='hidden'));
assert.equal(result.entries.find(x=>x.id==='oggetto-metronomo').title,
 published.entries.find(x=>x.id==='oggetto-metronomo').title);
assert(source.includes('mergeData({entries,sessions},db)'), 'Site must use the safe merge on load');
assert(!source.includes('entries=[];sessions=[];}}catch'), 'Remote empty result must not wipe archive');
console.log('PASS: Offline, empty or incomplete remote database preserves the approved public recap and archive.');

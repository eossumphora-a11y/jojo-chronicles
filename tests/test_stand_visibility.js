const assert=require('node:assert/strict');
const {mentioned,encounterSources,knownStands,evidenceExcerpt}=require('../docs/assets/stand-visibility.js');
assert.equal(mentioned('RUSTY HOOK compare nella gola','Rusty Hook'),true);
assert.equal(mentioned('RUSTY HOOKER compare','Rusty Hook'),false);
assert.equal(mentioned('L’Atto 2 di POOR SOULS appare.','poor souls'),true);
assert.equal(mentioned('Il suo stand viene visto','Rusty Hook'),false);
const published={id:'s-1',public:true,title:'Prova del fiume',number:1,summary:'Sue vede RUSTY HOOK.',related:[]};
const privateRecap={...published,id:'s-2',public:false,summary:'FOREST CHOIR si manifesta.'};
const stands=[
  {id:'a',kind:'stand',title:'Rusty Hook',summary:'Uncini osservati',public:true},
  {id:'b',kind:'stand',title:'Forest Choir',summary:'Concept privato',public:true},
  {id:'c',kind:'stand',title:'Rusty Hooker',summary:'Altro',public:true},
  {id:'d',kind:'stand',title:'Rusty Hook',public:false},
  {id:'e',kind:'character',title:'Rusty Hook',public:true},
];
assert.deepEqual(knownStands(stands,[published,privateRecap]).map(x=>x.id),['a']);
assert.deepEqual(encounterSources(stands[1],[published,privateRecap]),[]);
assert.equal(evidenceExcerpt(published,'Rusty Hook'),'Sue vede RUSTY HOOK.');
assert.equal(evidenceExcerpt(published,'Forest Choir'),'');
assert.deepEqual(knownStands([{id:'s',kind:'stand',title:'Test',public:true}],[]),[]);
assert.equal(encounterSources({id:'a',kind:'stand',title:'Rusty Hook',public:true},[{...published,related:['a'],summary:''}]).length,1);
console.log('PASS: only public Stand witnessed in public sessions; no pre-game Stand leaks.');

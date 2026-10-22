const assert=require('node:assert/strict');
const {mentioned,encounterSources,knownStands,sessionStands,evidenceExcerpt}=require('../docs/assets/stand-visibility.js');
const recapA={id:'s-a',number:1,title:'Il fiume',public:true,summary:'JustIn Time sorveglia la gola. RUSTY HOOK colpisce.',events:[]};
const recapB={id:'s-b',number:2,title:'Altra prova',public:true,summary:'POOR SOULS Atto 2 si manifesta.',events:[]};
const privateRecap={id:'s-private',number:3,public:false,summary:'FOREST CHOIR appare.',events:[]};
const items=[
{id:'justin',kind:'stand',title:'JustIn Time',summary:'Stand con fucile osservato.',public:true},
{id:'rusty',kind:'stand',title:'RUSTY HOOK',summary:'Fili e uncini osservati.',public:true},
{id:'poor',kind:'stand',title:'POOR SOULS',summary:'Chele osservate.',public:true},
{id:'forest',kind:'stand',title:'FOREST CHOIR',summary:'Stand privato mai visto.',public:true},
{id:'secret',kind:'stand',title:'JustIn Time',summary:'Potere nascosto',public:false},
{id:'npc',kind:'character',title:'POOR SOULS',public:true}
];
const sessions=[recapA,recapB,privateRecap];
assert.deepEqual(sessionStands(items,sessions,recapA).map(x=>x.id),['justin','rusty']);
assert.deepEqual(sessionStands(items,sessions,recapB).map(x=>x.id),['poor']);
assert.deepEqual(sessionStands(items,sessions,privateRecap),[]);
assert.deepEqual(knownStands(items,sessions).map(x=>x.id),['justin','rusty','poor']);
assert.equal(mentioned('JustIn Timer','JustIn Time'),false);
assert.equal(evidenceExcerpt(recapA,'JustIn Time'),'JustIn Time sorveglia la gola.');
assert.deepEqual(sessionStands(items,sessions,{...recapA,public:false}),[]);
const recapC={id:'s-c',public:true,summary:'Lo Stand compare, ma non è stato nominato.'};
assert.deepEqual(sessionStands(items,[recapC],recapC),[]);
console.log('PASS: roster globale e stand per sessione filtrati sui recap pubblici.');

/** Pure export-security test without a DOM or network. Run: node tests/check_public_export.js */
const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const source=fs.readFileSync('studio/app.js','utf8');
const start=source.indexOf('function buildPublic(){');if(start<0)throw new Error('Cannot find buildPublic');
let depth=0,end=-1;
for(let i=start;i<source.length;i++){
  if(source[i]==='{')depth++;
  else if(source[i]==='}'&&--depth===0){end=i+1;break;}
}
// The pure function is safe to evaluate: no DOM, no imports, no storage access.
const functionBody=source.slice(start,end);
const state={campaign:{title:'Campagna',subtitle:'Pubblico'},entries:[
 {id:'p1',kind:'stand',title:'Visibile',subtitle:'',summary:'Appare nel corridoio',body:'Attacco a distanza',tags:['stand'],related:['sec1'],public:true,notes:'Segreto nascosto'},
 {id:'sec1',kind:'stand',title:'Segretissimo',subtitle:'',summary:'',body:'',tags:[],related:[],public:false,notes:'LEAK'}
],sessions:[{id:'s1',title:'Resoconto',number:1,date:'',summary:'Fatti verificati',events:[{time:'04:00',text:'Il gruppo avanza'}],quotes:[{speaker:'Narratore',time:'',text:'Tutto tace'}],public:true,notes:'LEAK',transcript:'PRIVATISSIMA'}]};
const sandbox={state};vm.createContext(sandbox);vm.runInContext(functionBody+';this.exported=buildPublic()',sandbox);
const json=JSON.stringify(sandbox.exported);
for(const forbidden of ['Segretissimo','Segreto nascosto','LEAK','PRIVATISSIMA','notes','transcript','sec1'])assert.equal(json.includes(forbidden),false,forbidden);
assert.equal(sandbox.exported.entries.length,1);assert.equal(sandbox.exported.sessions.length,1);
assert.equal(sandbox.exported.sessions[0].events[0].text,'Il gruppo avanza');
console.log('PASS: public export strips all private fields, private entities and private relations.');

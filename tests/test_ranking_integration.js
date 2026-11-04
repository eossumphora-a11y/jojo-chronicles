const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const home=read('docs/index.html');
const app=read('docs/assets/app-v2.js');
const ranking=read('docs/assets/ranking.js');
const css=read('docs/assets/ranking.css');
const backup=JSON.parse(read('docs/data/ranking.json'));
assert(home.includes('data-nav="classifica"'));
assert(home.includes('id="view-classifica"'));
assert(home.includes('id="ranking-root"'));
assert(home.includes('data-go="classifica"'));
assert(home.indexOf('ranking.js?v=1')<home.indexOf('app-v2.js?v=30'));
assert(!home.includes('href="classifica/"'));
assert(app.includes("classifica:'Classifiche del torneo'"));
assert(app.includes("JoJoRanking?.render"));
assert(ranking.includes('window.JoJoRanking={render}'));
assert(ranking.includes('data/ranking.json'));
assert(ranking.includes('Backup completo JSON'));
assert(!ranking.includes('iframe'));
assert(css.includes('#view-classifica')&&css.includes('background:#fff'));
assert(read('docs/classifica/index.html').includes('../#/classifica'));
assert.equal(backup.people.length,42);
assert.equal(backup.events.length,1);
assert.equal(backup.archive.length,2);
assert.equal(backup.people.filter(p=>p.baseline!==null).length,13);
const phases=backup.events[0].phases;
const teams=phases.find(p=>p.type==='teams').teams;
assert.equal(teams.length,14);
assert.equal(teams.filter(t=>t.rank===1).length,5);
assert.equal(teams.find(t=>t.id==='team-4').members.length,7);
assert(teams.find(t=>t.id==='team-3').members.includes('catrice'));
let total=0;const scores=new Map(backup.people.map(p=>[p.id,0]));
for(const phase of phases){
 for(const award of phase.awards||[]){total+=award.points;scores.set(award.personId,scores.get(award.personId)+award.points)}
 for(const team of phase.teams||[]){total+=team.prize;for(const id of team.members)scores.set(id,scores.get(id)+team.prize/team.members.length)}
}
assert.equal(total,9900);
assert.equal(backup.people.find(p=>p.id==='julia-zeppeli').baseline+scores.get('julia-zeppeli'),1900);
assert(!/joao was here|ucciderà Somchai/i.test(JSON.stringify(backup)));
console.log('PASS: Integrated ranking, original data, shared style, and safe archive.');

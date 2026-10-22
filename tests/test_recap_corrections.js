/* Keep corrected canon in public-facing recaps and approved Stand dossier. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const recap=JSON.parse(fs.readFileSync('docs/data/session-formats.json','utf8')).sessions['sessione-fiume-01'];
const notes=JSON.parse(fs.readFileSync('docs/data/editorial-public-v1.json','utf8'));
for(const section of ['standard','concise','combat']){
  const text=recap[section].toLocaleLowerCase('it');
  assert(text.includes('justin time'),section+': JustIn Time missing');
  assert(text.includes('fucile'),section+': rifle missing');
  assert(text.includes('dissonanza'),section+': dissonance missing');
  assert(text.includes('mal di testa'),section+': headache missing');
}
assert(recap.outline.flatMap(x=>x.events).some(x=>x.includes('JustIn Time')&&x.includes('fucile')));
assert(recap.outline.flatMap(x=>x.events).some(x=>x.includes('dissonanza')&&x.includes('mal di testa')));
const rifleFix=notes.story.replacements.find(([old])=>old.includes("stand dotato di un enorme fucile")||old.includes("Stand dotato di un enorme fucile"));
assert(rifleFix && rifleFix[1].includes('JustIn Time'));
const headacheFix=notes.story.replacements.find(([old])=>old.includes('Stand armato di fucile emerse'));
assert(headacheFix && headacheFix[1].includes('dissonanza'));
assert(notes.profiles['stand-justin-time'].details.includes('fucile'));
console.log('PASS: JustIn Time rifle and dissonance headaches are consistent in session recap variants.');

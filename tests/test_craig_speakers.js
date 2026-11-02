/* Ensure canonical Craig speaker mapping stays source based and reachable from the recap. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cast=JSON.parse(fs.readFileSync('docs/data/craig-speakers.json','utf8'));
const archive=JSON.parse(fs.readFileSync('docs/data/public.json','utf8'));
const app=fs.readFileSync('docs/assets/app-v2.js','utf8');
const session=archive.sessions.find(x=>x.id==='sessione-sopravvivenza-01');
assert(session && session.public, 'New session must remain public');
assert.equal(cast.tracks.length,6);
assert.equal(new Set(cast.tracks.map(x=>x.alias)).size,6);
assert.equal(cast.confirmedPlayerCast.length,6);
const expected={cicciofc:'pg-jean',marialuisa9042:'pg-elisabeth',tito_lo:'pg-davi',
 maracuja3914:'pg-yekaterina',maxti077:'pg-julian'};
for(const [alias,id] of Object.entries(expected)){
 const track=cast.tracks.find(x=>x.alias===alias);
 assert(track && track.characterId===id,alias+' mapping');
 assert(archive.entries.some(x=>x.id===id),id+' must exist in public archive');
}
for(const alias of ['maracuja3914','maxti077'])
 assert.equal(cast.tracks.find(x=>x.alias===alias).confidence,'to_confirm','Do not mark inferred mapping verified');
const master=cast.tracks.find(x=>x.alias==='.eruname');
assert.equal(master.role,'master');
assert.equal(master.characterId,null);
assert.equal(cast.sessionRecordings[0].recordingAudioPublished,false,'No audio files were published');
assert.equal(session.craig_recording_id,cast.sessionRecordings[0].recordingId);
assert(session.audio_attributions.length>=4);
for(const mention of session.audio_attributions){
 assert.equal(mention.trackAlias,'marialuisa9042');
 assert.equal(mention.characterId,'pg-elisabeth');
 assert(/^\d\d:\d\d:\d\d$/.test(mention.time));
 assert(mention.confidence!=='verified');
}
assert(app.includes('renderCraigSpeakers(root,s)'));
assert(app.includes("fetch('data/craig-speakers.json'"));
assert(fs.readFileSync('docs/index.html','utf8').includes('craig-speakers.css'));
console.log('PASS: Player cast, track uncertainty, visible provenance and no leaked audio.');

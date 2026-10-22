(()=>{'use strict';
const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const BASE='https://eldluuxqizvrczsnelre.supabase.co',KEY='sb_publishable_l8p97NQI5ELPiJ0OOoIJww_DJIovv7E';
let session=null,current=null,rows=[],newRecord=false,user=null;
try{session=JSON.parse(sessionStorage.getItem('jojo-master-session')||'null')}catch{session=null}
const val=id=>$(id).value;
const set=(id,v)=>$(id).value=v==null?'':v;
const name=entry=>entry.title||entry.id;
function tell(msg){const box=$('master-toast');box.textContent=msg;box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),4000)}
function feedback(msg){$('auth-feedback').textContent=msg}
function setSession(s){session=s;try{if(s)sessionStorage.setItem('jojo-master-session',JSON.stringify(s));else sessionStorage.removeItem('jojo-master-session')}catch{}}
async function request(path,opts={}){const headers={apikey:KEY,Accept:'application/json',...(opts.body?{'Content-Type':'application/json'}:{}),...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{})};const res=await fetch(BASE+path,{...opts,headers:{...headers,...opts.headers},body:opts.body?JSON.stringify(opts.body):undefined});const raw=await res.text();let result;try{result=raw?JSON.parse(raw):null}catch{result=raw}if(!res.ok)throw Error(result?.msg||result?.message||result?.error_description||result?.error||'Richiesta non riuscita ('+res.status+')');return result}
async function refresh(){if(!session?.refresh_token)return false;try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});if(!data.access_token)return false;setSession(data);return true}catch{return false}}
function show(mode){['login','pending','studio'].forEach(id=>$(id).classList.toggle('hidden',id!==mode));$('logout').classList.toggle('hidden',mode==='login')}
async function checkUser(){if(!session?.access_token){show('login');return}try{try{user=await request('/auth/v1/user')}catch(e){if(!(await refresh()))throw e;user=await request('/auth/v1/user')}const admin=await request('/rest/v1/rpc/is_admin',{method:'POST',body:{}});if(admin===true){show('studio');await loadRows()}else{$('user-uid').textContent='UID: '+user.id;show('pending')}}catch(e){setSession(null);show('login');feedback('La sessione è scaduta. Accedi di nuovo. '+e.message)}}
async function signin(ev){ev.preventDefault();feedback('Verifica delle credenziali…');try{const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:val('email'),password:val('password')}});if(!data.access_token)throw Error('Accesso non confermato');setSession(data);set('password','');feedback('');await checkUser()}catch(e){feedback(e.message)}}
async function signup(){feedback('Registrazione in corso…');try{const d=await request('/auth/v1/signup',{method:'POST',body:{email:val('email'),password:val('password')}});if(d.access_token){setSession(d);await checkUser()}else feedback('Account creato. Controlla la tua email per confermarlo, poi torna qui e premi Accedi.')}catch(e){feedback(e.message)}}
function listRenderer(){const root=$('master-list');root.replaceChildren();const needle=val('master-search').toLocaleLowerCase('it').trim(),kind=val('master-filter');const chosen=rows.filter(x=>(kind==='all'||x.category===kind)&&[x.title,x.summary,x.id].join(' ').toLocaleLowerCase('it').includes(needle));if(!chosen.length){root.append(el('p','note','Nessuna voce corrispondente.'));return}
 chosen.forEach(x=>{const b=el('button','master-item'+(current===x.id?' active':''));b.type='button';b.append(el('strong','',name(x)),el('small',x.category+' · '+(x.visibility==='players'?'PUBBLICO':'Solo Master')+' · '+x.status));const small=b.querySelector('small');if(x.visibility==='players')small.classList.add('public');b.onclick=()=>openEditor(x.id);root.append(b)})}
async function applyEditorialInMaster(rows){
 try{
  const response=await fetch('data/editorial-public-v1.json',{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  for(const row of rows){
   const update=data.profiles?.[row.id];
   if(update&&row.summary===update.expected){
    row.summary=update.summary;
    row.public_details=update.details;
    if(Object.prototype.hasOwnProperty.call(update,'condition'))row.public_condition=update.condition;
    if(Array.isArray(update.events)&&Array.isArray(row.public_history))row.public_history=row.public_history.map((v,i)=>({...v,text:update.events[i]||v.text}));
    if(Array.isArray(update.inventory))row.public_inventory=update.inventory;
   }
   if(row.id==='sessione-fiume-01'&&data.story){
    if(row.summary===data.story.expectedSummary)row.summary=data.story.newSummary;
    for(const [before,after] of data.story.replacements||[])if((row.public_details||'').includes(before))row.public_details=row.public_details.split(before).join(after);
    row.public_details=(row.public_details||'').split(/\n\n+/).map(paragraph=>{
     if(paragraph.includes("A un certo punto lo Stand armato di fucile emerse dall'acqua."))return paragraph.replace(/A un certo punto lo Stand armato di fucile emerse dall'acqua\.[\s\S]*$/, "Nel pieno dello scontro Mariah fu colta da un dolore improvviso e si portò una mano alla testa. Sue Nami smise di sorridere.");
     if(paragraph.includes("Un attacco rivolto a Sunshine fu intercettato dall'intervento di Emma"))return paragraph.replace(/Un attacco rivolto a Sunshine fu intercettato dall'intervento di Emma[\s\S]*$/,data.story.recapEnding);
     return paragraph;
    }).join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
   }
  }
 }catch(e){console.warn('Non è stato possibile applicare l’edizione narrativa all’editor',e)}
}
async function loadRows(){try{rows=await request('/rest/v1/entries?select=*&order=updated_at.desc');rows=rows.filter(r=>!['personaggio-emma','personaggio-emma-stenvibler','personaggio-john'].includes(r.id));await applyEditorialInMaster(rows);$('master-total').textContent=rows.length;$('master-review').textContent=rows.filter(x=>x.status==='Da confermare'||x.status==='In preparazione').length;$('master-public').textContent=rows.filter(x=>x.visibility==='players').length;listRenderer();if(current&&rows.some(x=>x.id===current))await openEditor(current);else if(rows.length)await openEditor(rows[0].id)}catch(e){tell('Impossibile leggere l’archivio: '+e.message)}}
function showCharacterFields(){const type=val('f-category');$('character-profile-fields').classList.toggle('hidden',type!=='personaggi');$('stand-profile-help').classList.toggle('hidden',type!=='stand')}
function parseRecords(raw,expected){return String(raw||'').split('\n').map(x=>x.trim()).filter(Boolean).map((line,index)=>{const parts=line.split('|').map(p=>p.trim());if(parts.length<expected)throw Error('Riga '+(index+1)+': mancano alcuni campi. Usa il carattere | come separatore.');return parts})}
function historyFromForm(){return parseRecords(val('f-history'),4).map(parts=>({session_id:parts[0],session_title:rows.find(x=>x.id===parts[0])?.title||'',time:parts[1],type:parts[2]||'evento',text:parts.slice(3).join(' | '),verified:'da verificare'}))}
function inventoryFromForm(){return parseRecords(val('f-inventory'),4).map(parts=>({name:parts[0],state:parts[1],session_id:parts[2],time:parts.length>=5?parts[3]:'',notes:(parts.length>=5?parts.slice(4):parts.slice(3)).join(' | '),verified:'da verificare'}))}
function resetEditor(row,priv){$('edit-form').classList.remove('hidden');$('master-empty').classList.add('hidden');set('f-id',row.id);$('f-id').disabled=!newRecord;set('f-category',row.category||'lore');set('f-title',row.title);set('f-status',row.status||'Da confermare');set('f-visibility',row.visibility||'master');set('f-nature',row.nature||'progetto');set('f-confidence',row.confidence||'media');set('f-summary',row.summary);set('f-public-details',row.public_details);set('f-source',row.source);set('f-number',row.session_number);set('f-date',row.event_date);set('f-tags',(row.tags||[]).join(', '));set('f-events',(row.public_events||[]).map(x=>(x.time||'')+' | '+(x.text||'')).join('\n'));set('f-character-role',row.character_role||'unspecified');set('f-condition',row.public_condition||'');set('f-history',(row.public_history||[]).map(ev=>[ev.session_id||'',ev.time||'',ev.type||'evento',ev.text||''].join(' | ')).join('\n'));set('f-inventory',(row.public_inventory||[]).map(item=>[item.name||'',item.state||'',item.session_id||'',item.time||'',item.notes||''].join(' | ')).join('\n'));showCharacterFields();set('f-master-notes',priv.master_notes);set('f-unrevealed',priv.unrevealed_details);set('f-transcript',priv.transcript);$('editor-label').textContent=newRecord?'NUOVA SCHEDA':'MODIFICA · '+row.id;$('delete-entry').classList.toggle('hidden',newRecord)}
async function openEditor(id){const row=rows.find(r=>r.id===id);if(!row)return;current=id;newRecord=false;try{const privs=await request('/rest/v1/entry_private?select=master_notes,unrevealed_details,transcript&entry_id=eq.'+encodeURIComponent(id));resetEditor(row,privs[0]||{});listRenderer()}catch(e){tell('Impossibile leggere le note private: '+e.message)}}
function addNew(){const suggested='voce-'+Date.now().toString(36);current=null;newRecord=true;resetEditor({id:suggested,category:'lore',title:'',summary:'',public_details:'',source:'',tags:[],visibility:'master',status:'Da confermare',nature:'progetto',confidence:'media',session_number:null,event_date:null},{});listRenderer()}
async function save(ev){ev.preventDefault();const id=val('f-id').trim();if(!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)){tell('ID non valido: usa lettere minuscole, numeri e trattini.');return}
 const row={id,category:val('f-category'),title:val('f-title').trim(),status:val('f-status'),visibility:val('f-visibility'),nature:val('f-nature'),confidence:val('f-confidence'),summary:val('f-summary'),public_details:val('f-public-details'),source:val('f-source'),session_number:val('f-number')?Number(val('f-number')):null,event_date:val('f-date')||null,tags:val('f-tags').split(',').map(x=>x.trim()).filter(Boolean),public_events:val('f-events').split('\n').map(t=>t.trim()).filter(Boolean).map(t=>{const at=t.indexOf('|');return at<0?{time:'',text:t}:{time:t.slice(0,at).trim(),text:t.slice(at+1).trim()}}),character_role:val('f-character-role'),public_history:[],public_inventory:[],public_condition:val('f-condition')};
 if(row.category==='personaggi'){try{row.public_history=historyFromForm();row.public_inventory=inventoryFromForm()}catch(e){tell('Dati del personaggio non validi: '+e.message);return}}
 if(!row.title){tell('Il titolo è obbligatorio.');return}
  if(row.category==='stand'&&row.visibility==='players'){
   if(row.nature!=='accaduto'||row.status!=='Giocato-verificato'){
    tell('Stand non pubblicato: scegli «Accaduto in gioco» e «Giocato-verificato» dopo la verifica della sessione.');return;
   }
   const recordings=rows.filter(s=>s.category==='sessioni'&&s.visibility==='players');
   const sourceFound=recordings.some(s=>window.JoJoStands.mentioned([s.summary,s.public_details,...(s.public_events||[]).map(ev=>ev.text)].join(' '),row.title));
   if(!sourceFound){tell('Stand non pubblicato: il suo nome non compare ancora in un recap pubblico. Inserisci prima l’incontro nel resoconto e approvalo.');return}
   if(!val('f-source').trim()){tell('Indica nel campo Fonte la sessione dove è stato incontrato lo Stand.');return}
  }
 if(row.visibility==='players'){
 const publicParts=[row.title,row.summary,row.public_details,row.public_condition,...(row.public_history||[]).map(x=>x.text||''),...(row.public_inventory||[]).flatMap(x=>[x.name||'',x.state||'',x.notes||''])];
 const outOfWorld=/\b(?:registrazion\w*|trascrizion\w*|ricostruzion\w*|master|giocator\w*|srt|whisper|chatgpt|buzz|bozza|da verificare|da confermare|non confermat\w*|note editoriali|timestamp)\b/i;
 const bad=publicParts.find(x=>outOfWorld.test(x));
 if(bad){tell('Riferimento fuori narrazione nel testo pubblico: '+bad.slice(0,110)+'. Spostalo nelle note riservate oppure riscrivilo come evento della storia.');return}
}
 if(row.visibility==='players'&&!window.confirm(row.category==='stand'?'Confermi che nome, riassunto e dettagli contengono SOLTANTO ciò che i giocatori hanno scoperto nelle sessioni pubbliche? Le abilità non osservate, l’identità del portatore non rivelata e le statistiche devono restare negli appunti riservati.':'Confermi la pubblicazione? Chiunque vedrà titolo, riassunto, dettagli pubblici, fonte e tag della scheda. Le note riservate non sono comprese.'))return;
 $('save-entry').disabled=true;
 try{if(newRecord)await request('/rest/v1/entries',{method:'POST',headers:{Prefer:'return=minimal'},body:row});else await request('/rest/v1/entries?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:row});
 const priv={entry_id:id,master_notes:val('f-master-notes'),unrevealed_details:val('f-unrevealed'),transcript:val('f-transcript')};await request('/rest/v1/entry_private?on_conflict=entry_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:priv});newRecord=false;current=id;tell('Scheda salvata nel database');await loadRows()}
 catch(e){tell('Salvataggio incompleto: '+e.message)}finally{$('save-entry').disabled=false}}
async function remove(){if(!current||newRecord)return;const x=rows.find(r=>r.id===current);if(!window.confirm('Eliminare definitivamente '+(x?.title||current)+' e le sue note riservate? Non potrai annullare.'))return;try{await request('/rest/v1/entries?id=eq.'+encodeURIComponent(current),{method:'DELETE'});current=null;tell('Scheda eliminata');await loadRows()}catch(e){tell(e.message)}}
function parseClock(stamp){const parts=stamp.trim().replace(',','.').split(':');if(parts.length!==3)return null;const sec=Number(parts[0])*3600+Number(parts[1])*60+Number(parts[2]);return Number.isFinite(sec)?sec:null}
function fmtClock(sec){sec=Math.floor(sec);return String(Math.floor(sec/3600)).padStart(2,'0')+':'+String(Math.floor(sec%3600/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function parseSubtitle(raw,speaker){const blocks=raw.replace(/\r/g,'').replace(/^WEBVTT\s*/,'').split(/\n\s*\n/);const out=[];for(const block of blocks){const lines=block.split('\n').map(x=>x.trim()).filter(Boolean);const index=lines.findIndex(x=>x.includes('-->'));if(index<0)continue;const start=lines[index].split('-->')[0].trim().split(' ')[0];const seconds=parseClock(start);if(seconds===null)continue;const text=lines.slice(index+1).map(x=>x.replace(/<[^>]*>/g,'').trim()).filter(Boolean).join(' ');if(!text)continue;out.push({at:seconds,speaker,text})}return out}
async function importSRT(event){const files=[...(event.target.files||[])];if(!files.length)return;let all=[];for(const file of files){const speaker=file.name.split(' (')[0].split('__')[0].replace(/\.(srt|vtt|txt)$/i,'').trim();const raw=await file.text();const chunks=parseSubtitle(raw,speaker);if(chunks.length){all.push(...chunks)}else if(/\.txt$/i.test(file.name)){all.push({at:0,speaker,text:raw.trim()})}}if(!all.length){$('import-info').textContent='Nessun timestamp SRT/VTT riconosciuto. Verifica il formato dei file.';return}
 all.sort((a,b)=>a.at-b.at||a.speaker.localeCompare(b.speaker,'it'));const merged=all.map(x=>'['+fmtClock(x.at)+'] '+x.speaker+': '+x.text).join('\n');
 if(val('f-transcript').trim()&&!window.confirm('Questa scheda contiene già una trascrizione. Vuoi sostituirla con quella importata?'))return;
 set('f-transcript',merged);$('import-info').textContent='Importati '+all.length+' interventi da '+files.length+' file. Controlla il risultato e premi «Salva modifiche» per conservarlo nel database riservato.';tell('Trascrizioni unite e ordinate per timestamp');}
$('auth-form').addEventListener('submit',signin);$('signup').onclick=signup;$('logout').onclick=async()=>{try{await request('/auth/v1/logout',{method:'POST'})}catch{}setSession(null);user=null;show('login')};$('copy-uid').onclick=()=>{navigator.clipboard.writeText(user?.id||'').then(()=>tell('UID copiato')).catch(()=>tell('Puoi selezionare e copiare il codice'))};$('add-entry').onclick=addNew;$('master-search').oninput=listRenderer;$('master-filter').onchange=listRenderer;$('f-category').addEventListener('change',showCharacterFields);$('edit-form').addEventListener('submit',save);$('delete-entry').onclick=remove;$('srt-files').addEventListener('change',e=>importSRT(e).catch(err=>tell('Errore importazione: '+err.message)));checkUser();
})();
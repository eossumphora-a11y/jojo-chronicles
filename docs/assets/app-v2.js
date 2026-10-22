(()=>{'use strict';
const $=id=>document.getElementById(id);
const labels={character:'Personaggi',stand:'Stand',location:'Luoghi',faction:'Fazioni',artifact:'Oggetti',clue:'Indizi',other:'Altro'};
const glyphs={character:'♟',stand:'✧',location:'⌖',faction:'♜',artifact:'✦',clue:'◇',other:'◈'};
const order=['all','character','stand','location','clue','faction','artifact','other','saved'];
let entries=[],sessions=[],filter='all',entryQuery='',standQuery='',activeSession='',currentView='home',searchQuery='',entryView='grid';
let pinned=new Set();
try{pinned=new Set(JSON.parse(localStorage.getItem('jojo-public-pins')||'[]'))}catch{}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const txt=(tag,value,cls)=>el(tag,cls,value);
const safe=s=>String(s==null?'':s);
const normalize=s=>safe(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
const sessionName=s=>s.number!=null?'Sessione '+s.number:'Sessione archiviata';
function words(s){return normalize(s).split(/[^a-z0-9à-ž]+/).filter(w=>w.length>2&&!['della','delle','degli','come','cosa','quale','questo','questa','dopo','prima','sono','loro','sappiamo','abbiamo','stato','stati','sullo','nelle','dove','quando','quali','alla','nelle','con'].includes(w))}
function short(s,n=180){s=safe(s).replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s}
function summaryText(s){return safe(s).split('\n\n')[0].replace(/^[^\n]{1,34}\n/,'')}
function sessionCount(e){return sessions.filter(s=>(s.related||[]).includes(e.id)||normalize(s.summary).includes(normalize(e.title))).length}
function characterRole(e){if(e.kind!=='character')return 'unspecified';if(e.character_role==='pg'||e.character_role==='npc')return e.character_role;return e.id.startsWith('pg-')?'pg':'npc'}
function historyOf(e){return Array.isArray(e.public_history)?e.public_history:[]}
function inventoryOf(e){return Array.isArray(e.public_inventory)?e.public_inventory:[]}
function renderCharacters(role){const root=$(role+'-grid');root.replaceChildren();const chars=entries.filter(e=>characterRole(e)===role).sort((a,b)=>a.title.localeCompare(b.title,'it'));$(role+'-count-label').textContent=chars.length+(role==='pg'?' PG':' NPC')+' nell’archivio';
 if(!chars.length){root.append(noResults('Nessun personaggio','Le schede verranno aggiunte man mano che emergono informazioni dalle sessioni.'));return}
 for(const e of chars){const card=btn('button','','character-card',()=>openEntry(e));
 const head=el('div','character-card-head');head.append(txt('span',e.title.slice(0,1).toUpperCase(),'character-portrait'),txt('span',role==='pg'?'PG · PROTAGONISTA':'NPC · INCONTRATO','character-role'));card.append(head);
 card.append(txt('h3',e.title),txt('p',short(e.summary,145),'character-intro'));
 const h=historyOf(e);const latest=h[h.length-1];
 const block=el('div','character-recent');block.append(txt('small',role==='pg'?'ULTIMO AVVENIMENTO PERSONALE':'ULTIMA APPARIZIONE'));
 block.append(txt('p',latest?short(latest.text,165):'Il cammino di questo personaggio non è ancora stato raccontato.'));card.append(block);
 const foot=el('div','character-card-foot');foot.append(txt('span',h.length+' eventi · '+inventoryOf(e).length+' oggetti'),txt('b','Apri dossier ↗'));card.append(foot);root.append(card);
 }
}
function characterDetails(e,body){const role=characterRole(e);const h=historyOf(e),inventory=inventoryOf(e);
 if(e.public_condition){const part=section(body,role==='pg'?'Condizioni e cambiamenti':'Situazione conosciuta');const p=el('p');linked(p,e.public_condition);part.append(p)}
 const history=section(body,role==='pg'?'Diario personale per sessione':'Incontri e sviluppi nelle sessioni');
 if(!h.length)history.append(txt('p',role==='pg'?'Le cronache non raccontano ancora altre vicende personali.':'Per ora, il suo passato e le sue imprese restano avvolti nell’ombra.','character-empty'));
 else{const map=new Map();for(const ev of h){const id=ev.session_id||ev.session_title||'senza-sessione';if(!map.has(id))map.set(id,[]);map.get(id).push(ev)}
 for(const [key,evs] of map){const grp=el('div','personal-chapter');const sample=evs[0];const session=sessions.find(x=>x.id===sample.session_id);const header=el('div','personal-chapter-head');header.append(txt('b',session?.title||sample.session_title||'Sessione non identificata'));if(session)header.append(btn('button','Leggi la sessione ↗','personal-open-session',()=>{$('detail').close();openSession(session.id)}));grp.append(header);
 const list=el('div','personal-events');for(const event of evs){const row=el('div','personal-event');row.append(txt('time','✦'));const content=el('div');if(event.type)content.append(txt('small',event.type.toUpperCase()));const p=el('p');linked(p,event.text);content.append(p);row.append(content);list.append(row)}grp.append(list);history.append(grp)}}
 const items=section(body,role==='pg'?'Oggetti trovati, usati e conservati':'Oggetti e risorse incontrati');
 if(!inventory.length)items.append(txt('p',role==='pg'?'Nessun oggetto particolare è ancora entrato nella sua storia.':'Nessun oggetto importante è ancora comparso nel suo racconto.','character-empty'));
 else for(const thing of inventory){const card=el('div','inventory-record');card.append(txt('strong',thing.name));card.append(txt('span',thing.state||'Stato da confermare','inventory-state'));if(thing.notes)card.append(txt('p',thing.notes));const source=sessions.find(x=>x.id===thing.session_id);if(source)card.append(btn('button',(source.title||'Sessione')+' ↗','inventory-source',()=>{$('detail').close();openSession(source.id)}));items.append(card)}
}
function standSources(e){return window.JoJoStands.encounterSources(e,sessions)}
function encounteredStands(){return window.JoJoStands.knownStands(entries,sessions)}
function renderStands(){
 const root=$('stand-grid');root.replaceChildren();
 const all=encounteredStands().sort((a,b)=>a.title.localeCompare(b.title,'it'));
 const needle=normalize(standQuery.trim());
 const found=all.filter(e=>normalize([e.title,e.summary,e.body].join(' ')).includes(needle));
 $('stand-count-label').textContent=all.length+' Stand incontrati · '+found.length+' visualizzati';
 if(!found.length){root.append(noResults(all.length?'Nessuno Stand trovato':'Nessuno Stand ancora documentato',all.length?'Modifica la ricerca.':'Gli Stand compariranno qui soltanto quando emergeranno da una sessione pubblicata e dopo l’approvazione del Master.'));return}
 for(const e of found){
  const source=standSources(e);
  const card=btn('button','','stand-card',()=>openEntry(e));
  const flag=el('div','stand-flag');flag.append(txt('span','STAND · INCONTRATO'),txt('span','✧','stand-sigil'));
  card.append(flag,txt('h3',e.title));
  card.append(txt('p',short(e.summary||'È stato incontrato, ma non sono ancora note altre informazioni.',190)));
  const foot=el('div','stand-foot');foot.append(txt('span',source.length+(source.length===1?' sessione documentata':' sessioni documentate')),txt('b','Apri dossier ↗'));card.append(foot);
  root.append(card);
 }
}
function openStand(e){
 if(!standSources(e).length)return;
 const dialog=$('detail');$('detail-type').textContent='STAND INCONTRATO';$('detail-title').textContent=e.title;$('detail-subtitle').textContent='Dossier pubblico · soltanto informazioni rivelate';
 const body=$('detail-content');body.replaceChildren();
 const known=section(body,'Cosa avete scoperto');const desc=el('div','stand-known');linked(desc,e.summary||'Lo Stand è stato incontrato, ma non ne sono ancora state identificate le capacità.');known.append(desc);
 const observed=section(body,'Poteri e caratteristiche osservati');if(e.body){const t=el('div','stand-known');linked(t,e.body);observed.append(t)}else observed.append(txt('p','Nessun altro potere confermato nelle cronache pubblicate.'));
 const appearance=section(body,'Incontri documentati');
 for(const s of standSources(e)){
   const excerpt=window.JoJoStands.evidenceExcerpt(s,e.title);
   const card=btn('button','','stand-source-card',()=>{dialog.close();openSession(s.id)});
   card.append(txt('strong',(s.number!=null?'Sessione '+s.number+' · ':'')+s.title));
   if(excerpt)card.append(txt('span',short(excerpt,200)));
   appearance.append(card);
 }
 const footer=el('div','session-reader-actions');footer.append(txt('p','Le identità e le capacità non rivelate restano escluse da questa scheda.','character-empty'));body.append(footer);
 if(!dialog.open)dialog.showModal();
}
function openEntry(e){if(e.kind==='stand'){openStand(e);return}const dialog=$('detail');$('detail-type').textContent=labels[e.kind]||'Archivio';$('detail-title').textContent=e.title;$('detail-subtitle').textContent=e.subtitle||'Scheda del compendio';const body=$('detail-content');body.replaceChildren();if(e.summary){const p=el('p');linked(p,e.summary);body.append(p)}if(e.body){const part=section(body,'Cosa è stato scoperto');const p=el('p');linked(p,e.body);part.append(p)}
 const info=section(body,'Presenza nella campagna');info.append(txt('p','Apparizioni conosciute: '+sessionCount(e)+'.'));
 const related=(e.related||[]).map(id=>entries.find(x=>x.id===id)).filter(Boolean);if(related.length){const part=section(body,'Collegamenti');const pills=el('div','related-pills');related.forEach(x=>pills.append(btn('button',x.title,'',()=>openEntry(x))));part.append(pills)}
 if(e.kind==='character')characterDetails(e,body);
 if(e.tags&&e.tags.length){const part=section(body,'Parole chiave');e.tags.forEach(t=>part.append(el('span','tag',t)))}
 const actions=el('div','session-reader-actions');const pinnedNow=pinned.has(e.id);const b=btn('button',pinnedNow?'★ Rimuovi dai salvati':'☆ Salva questa scheda','action-button',()=>{if(pinned.has(e.id))pinned.delete(e.id);else pinned.add(e.id);try{localStorage.setItem('jojo-public-pins',JSON.stringify([...pinned]))}catch{};openEntry(e);renderEntries()});actions.append(b);body.append(actions);
 if(!dialog.open)dialog.showModal();
}
function btn(tag,label,cls,fn){const b=el(tag,cls,label);if(tag==='button')b.type='button';b.onclick=fn;return b}
function section(parent,label){const s=el('div','detail-section');s.append(el('div','detail-label',label));parent.append(s);return s}
function boundary(s,i,len){const left=i?s[i-1]:'';const right=s[i+len]||'';return !/[a-zA-ZÀ-ž0-9]/.test(left)&&!/[a-zA-ZÀ-ž0-9]/.test(right)}
function linked(node,value){const text=safe(value),lower=text.toLocaleLowerCase('it');const names=entries.filter(x=>['character','stand','location'].includes(x.kind)&&safe(x.title).length>=4).sort((a,b)=>b.title.length-a.title.length);let i=0,start=0;while(i<text.length){let hit=null;for(const x of names){if(lower.startsWith(x.title.toLocaleLowerCase('it'),i)&&boundary(text,i,x.title.length)){hit=x;break}}if(hit){node.append(document.createTextNode(text.slice(start,i)));node.append(btn('button',text.slice(i,i+hit.title.length),'inline-link',()=>openEntry(hit)));i+=hit.title.length;start=i}else i++}node.append(document.createTextNode(text.slice(start)))}
function prose(parent,str){const parts=safe(str).split(/\n\s*\n/).filter(Boolean);for(const seg of parts){const at=seg.indexOf('\n');if(at>0&&at<45&&seg.slice(0,at).length<40&&!/[.!?]$/.test(seg.slice(0,at))){const h=txt('h3',seg.slice(0,at));h.id='capitolo-'+(parent.querySelectorAll('h3').length+1);parent.append(h);const p=el('p');linked(p,seg.slice(at+1));parent.append(p)}else{const p=el('p');linked(p,seg);parent.append(p)}}}
function references(parent,ids){const shown=[...new Set(ids||[])].map(id=>entries.find(x=>x.id===id)).filter(Boolean);if(!shown.length)return;const box=el('div','related-pills');shown.forEach(e=>box.append(btn('button',e.title,'',()=>openEntry(e))));parent.append(box)}
function openSession(id){const s=sessions.find(s=>s.id===id);if(!s)return;activeSession=id;activeSessionPanel='recap';activeRecapTab='standard';const target='#/sessioni/'+encodeURIComponent(id);if(location.hash!==target)location.hash=target;else route()}

let recapFormats={},activeRecapTab='standard',activeSessionPanel='recap';
async function loadRecapFormats(){
 try{const res=await fetch('data/session-formats.json',{cache:'no-store'});if(res.ok){const d=await res.json();recapFormats=d.sessions||{}}}
 catch(e){console.warn('Formati del riepilogo non disponibili',e)}
}
function sessionInfo(s){return recapFormats[s.id]||{}}
function renderSessionSections(root,s){
 const mode=activeSessionPanel;
 const formats=sessionInfo(s);
 if(mode==='recap'){
  const tabs=el('div','sq-format-pills');
  for(const [key,label,desc] of [['concise','Breve','Per riprendere subito'],['standard','Standard','Per iniziare la serata'],['detailed','Dettagliato','Tutto ciò che è successo'],['combat','Combattimento','Scontri e poteri']]){
   if(key!=='detailed'&&!formats[key])continue;
   const b=btn('button','', 'sq-format'+(activeRecapTab===key?' active':''),()=>{activeRecapTab=key;drawSessionReader()});
   b.append(txt('strong',label),txt('small',desc));tabs.append(b);
  }
  root.append(tabs);
  const panel=el('div','sq-recap-paper');
  panel.append(txt('div','RIEPILOGO DELLA SCORSA SESSIONE','sq-paper-label'));
  const story=el('div','reader-content sq-recitation');
  const text=activeRecapTab==='detailed'?s.summary:(formats[activeRecapTab]||s.summary);
  if(activeRecapTab==='detailed'&&formats.lead){
   const opener=el('p','sq-recap-intro');linked(opener,formats.lead);story.append(opener);
  }
  prose(story,text);
  const headings=[...story.querySelectorAll('h3[id^="capitolo-"]')];
  if(headings.length>3){
   const toc=el('nav','chapter-toc');toc.setAttribute('aria-label','Capitoli del riepilogo');toc.append(txt('div','I CAPITOLI DI QUESTA SESSIONE','reader-subtitle'));
   const g=el('div','chapter-index');for(const [i,h] of headings.entries()){g.append(btn('button',String(i+1).padStart(2,'0')+'  '+h.textContent,'chapter-index-link',()=>h.scrollIntoView({behavior:'smooth',block:'start'})))}toc.append(g);panel.append(toc)
  }
  panel.append(story);root.append(panel);
  const actions=el('div','session-reader-actions');
  actions.append(btn('button','Copia questo riepilogo','action-button',async()=>{try{await navigator.clipboard.writeText(s.title+'\n\n'+(activeRecapTab==='detailed'?(formats.lead+'\n\n'+s.summary):(formats[activeRecapTab]||s.summary)));notice('Riepilogo copiato')}catch{notice('Impossibile copiare dal browser')}}));
  actions.append(btn('button','Condividi il link','action-button',async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname+'#/sessioni/'+encodeURIComponent(s.id));notice('Link copiato')}catch{notice('Copia del link non disponibile')}}));
  root.append(actions);
 }else if(mode==='outline'){
  root.append(txt('h3','Scaletta della sessione','sq-panel-title'),txt('p','Le scene che avete attraversato, nell’ordine in cui sono avvenute.','sq-panel-sub'));
  if(s.events?.length){
   const list=el('div','sq-outline');
   s.events.forEach((event,i)=>{const row=el('div','sq-outline-row');row.append(txt('span',String(i+1).padStart(2,'0'),'sq-outline-no'));const p=el('p');linked(p,event.text);row.append(p);list.append(row)});
   root.append(list);
  }else root.append(noResults('Nessuna scaletta','La storia di questa sessione non ha ancora una scaletta.'));
 }else if(mode==='notes'){
  root.append(txt('h3','Note della sessione','sq-panel-title'),txt('p','I volti, i luoghi, i poteri e gli oggetti incontrati nel corso di questa avventura.','sq-panel-sub'));
  const related=[...new Set(s.related||[])].map(id=>entries.find(x=>x.id===id)).filter(Boolean);
  const groups=[['Personaggi giocanti',related.filter(e=>characterRole(e)==='pg')],['Personaggi non giocanti',related.filter(e=>characterRole(e)==='npc')],['Stand e poteri',related.filter(e=>e.kind==='stand')],['Luoghi',related.filter(e=>e.kind==='location')],['Prove e obiettivi',related.filter(e=>e.kind==='other'&&(e.id.startsWith('trial-')||e.tags?.includes('prova')))]];
  for(const [heading,items] of groups){if(!items.length)continue;const area=el('div','sq-note-section');area.append(txt('h4',heading,'sq-notes-heading'));const list=el('div','sq-notes-grid');
   for(const e of items){const item=btn('button','','sq-note-card',()=>openEntry(e));item.append(txt('strong',e.title),txt('span',short(e.summary,140)));list.append(item)}
   area.append(list);root.append(area);
  }
  const items=entries.filter(e=>characterRole(e)!=='unspecified').flatMap(e=>(e.public_inventory||[]).filter(x=>x.session_id===s.id).map(x=>({owner:e,item:x})));
  if(items.length){const area=el('div','sq-note-section');area.append(txt('h4','Oggetti incontrati','sq-notes-heading'));for(const {owner,item} of items){const row=el('div','sq-item-in-session');row.append(txt('strong',item.name),txt('span',item.state||''),txt('small','Visto con '+owner.title));area.append(row)}root.append(area)}
  if(!groups.some(g=>g[1].length)&&!items.length)root.append(noResults('Nessuna nota ancora disponibile','Le persone, i luoghi e gli oggetti compariranno qui quando saranno collegati a questa sessione.'));
 }else if(mode==='quotes'){
  root.append(txt('h3','Frasi memorabili','sq-panel-title'));
  if(s.quotes?.length){for(const q of s.quotes){const card=el('blockquote','sq-quote');card.append(txt('p','“'+q.text+'”'),txt('small',q.speaker||'Voce sconosciuta'));root.append(card)}}
  else root.append(noResults('Nessuna citazione inserita','Le battute significative compariranno qui quando saranno riconosciute con certezza.'));
 }
}

let libraryCategory='recaps',libraryQuery='',librarySessionOnly=false;
const libraryCats={recaps:'Recaps',players:'Players',npcs:'NPCs',stands:'Stands',items:'Items',locations:'Locations',factions:'Factions',quests:'Quests'};
function libraryMatches(value){return !libraryQuery||normalize(value).includes(normalize(libraryQuery))}
function libraryIsRelated(e,s){
 if(!s)return false;
 if((s.related||[]).includes(e.id))return true;
 if((e.public_history||[]).some(x=>x.session_id===s.id))return true;
 return e.kind==='faction'&&normalize(s.summary).includes(normalize(e.title));
}
function downloadLibraryText(name,body){const blob=new Blob([body],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function libraryTitle(parent,title,downloadContent='',fileName=''){const heading=el('div','library-section-heading');const line=el('span','library-heading-line');heading.append(line,txt('h3',title),el('span','library-heading-line'));const tools=el('div','library-heading-tools');
 const edit=el('a','library-icon-button','✎');edit.href='master.html';edit.title='Apri lo Studio Master';edit.setAttribute('aria-label','Apri lo Studio Master');tools.append(edit);
 if(downloadContent){const dl=btn('button','↓','library-icon-button',()=>downloadLibraryText(fileName||title,downloadContent));dl.title='Scarica '+title.toLowerCase();dl.setAttribute('aria-label','Scarica '+title.toLowerCase());tools.append(dl)}
 heading.append(tools);parent.append(heading)}
function libraryNotesData(s){const related=entries.filter(e=>libraryIsRelated(e,s));
 const npcs=related.filter(e=>characterRole(e)==='npc');
 const locations=related.filter(e=>e.kind==='location');
 const objects=[];
 for(const entry of entries){if(entry.kind!=='character')continue;for(const thing of entry.public_inventory||[]){if(thing.session_id!==s.id)continue;const key=normalize(thing.name);if(!objects.some(x=>normalize(x.name)===key))objects.push({name:thing.name,text:thing.notes||'',state:thing.state||'',holder:entry.title})}}
 for(const entry of related.filter(e=>e.kind==='artifact')){if(!objects.some(x=>normalize(x.name)===normalize(entry.title)))objects.push({name:entry.title,text:entry.body||entry.summary,state:''})}
 return {npcs,objects,locations}
}
function renderLibraryNotes(root,s){const notes=libraryNotesData(s);const download=[
 ...notes.npcs.map(e=>'NPC: '+e.title+' — '+(e.body||e.summary)),
 ...notes.objects.map(o=>'OGGETTO: '+o.name+' — '+o.text),
 ...notes.locations.map(e=>'LUOGO: '+e.title+' — '+(e.body||e.summary))
 ].join('\n\n');
 libraryTitle(root,'Notes',download,s.title+'_note');
 const columns=el('div','library-notes-columns');
 const specs=[
 {title:'NPCs',icon:'♙',items:notes.npcs.map(e=>({name:e.title,description:e.body||e.summary,open:()=>openEntry(e)}))},
 {title:'Items',icon:'⬡',items:notes.objects.map(e=>({name:e.name,description:e.text||(e.state?'Condizione: '+e.state:''),open:()=>{const found=entries.find(x=>x.kind==='character'&&(x.public_inventory||[]).some(item=>item.name===e.name));if(found)openEntry(found)}}))},
 {title:'Locations',icon:'⌖',items:notes.locations.map(e=>({name:e.title,description:e.body||e.summary,open:()=>openEntry(e)}))}
 ];
 for(const spec of specs){
  const column=el('section','library-note-column');
  const label=el('div','library-note-label');label.append(txt('span',spec.icon),txt('strong',spec.title));column.append(label);
  const preview=el('div','library-note-preview');preview.textContent=spec.items.length?spec.items[0].description:'Nessuna informazione emersa finora.';column.append(preview);
  const list=el('div','library-note-list');let current=null;
  for(const [i,item] of spec.items.entries()){const b=btn('button','', 'library-note-entry'+(i===0?' active':''),()=>{if(current)current.classList.remove('active');b.classList.add('active');current=b;preview.textContent=item.description;});
   b.append(txt('span',spec.icon,'library-mini-icon'),txt('span',item.name));
   const detail=el('span','library-note-open','↗');detail.setAttribute('aria-hidden','true');b.append(detail);b.ondblclick=item.open;list.append(b);if(i===0)current=b}
  if(!spec.items.length)list.append(el('div','library-empty-mini','Nessuna voce'));
  column.append(list);columns.append(column);
 }
 root.append(columns);
}
function renderLibraryQuotes(root,s){const quotes=s.quotes||[];const text=quotes.map(q=>'"'+q.text+'"\n'+(q.speaker||'')+(q.context?'\n'+q.context:'')).join('\n\n');
 libraryTitle(root,'Quotes',text,s.title+'_citazioni');
 if(!quotes.length){const empty=el('div','library-quotes-empty');empty.append(txt('span','❝','library-quote-symbol'),txt('p','Nessuna citazione autentica è stata ancora inserita per questa sessione.'));root.append(empty);return}
 const grid=el('div','library-quotes-grid');
 quotes.forEach(q=>{const card=el('figure','library-quote-card');card.append(txt('blockquote','"'+q.text+'"'));const line=el('div','library-quote-rule');card.append(line);card.append(txt('figcaption',q.context||q.speaker||'','library-quote-context'));if(q.context&&q.speaker)card.append(txt('small',q.speaker,'library-quote-source'));grid.append(card)});root.append(grid);
}
function libraryOutlineGroups(s){
 const authored=sessionInfo(s).outline;
 if(Array.isArray(authored)&&authored.length)return authored.map(g=>({title:g.title,events:(g.events||[]).map(text=>({text}))}));
 const ev=s.events||[];if(!ev.length)return[];
 if(s.id==='sessione-fiume-01'&&ev.length>=8)return [
 {title:'L’arrivo nella gola',events:ev.slice(0,2)},
 {title:'L’ultimatum e lo scontro',events:ev.slice(2,4)},
 {title:'Il metronomo e la fuga',events:ev.slice(4,6)},
 {title:'Il traguardo e la nuova arena',events:ev.slice(6)}
 ];
 const groups=[];for(let i=0;i<ev.length;i+=3)groups.push({title:i===0?'L’inizio della sessione':i+3>=ev.length?'Gli ultimi avvenimenti':'Lo sviluppo della sessione',events:ev.slice(i,i+3)});return groups
}
function renderLibraryOutline(root,s){const groups=libraryOutlineGroups(s);
 const download=groups.map(g=>g.title+'\n'+g.events.map(e=>'• '+e.text).join('\n')).join('\n\n');
 libraryTitle(root,'Outline',download,s.title+'_scaletta');
 if(!groups.length){root.append(el('p','library-empty-mini','Non ci sono ancora eventi da mostrare.'));return}
 const holder=el('div','library-outline');
 groups.forEach((group,i)=>{const details=el('details','library-outline-group');details.open=i<2;
  const header=el('summary','library-outline-header');header.append(txt('span',group.title),txt('span','⌄','library-chevron'));details.append(header);
  const ul=el('ul','library-outline-items');group.events.forEach(event=>{const li=el('li');linked(li,event.text);ul.append(li)});details.append(ul);holder.append(details)});root.append(holder)
}
function renderLibraryFullRecap(root,s){
 const format=sessionInfo(s);
 const formatTabs=el('div','library-recap-format');
 for(const [key,label] of [['concise','Breve'],['standard','Standard'],['detailed','Dettagliato'],['combat','Combattimento']]){
  if(key!=='detailed'&&!format[key])continue;
  const b=btn('button',label,'library-format-btn'+(activeRecapTab===key?' active':''),()=>{activeRecapTab=key;drawSessionReader()});b.setAttribute('aria-pressed',String(activeRecapTab===key));formatTabs.append(b)}
 root.append(formatTabs);
 const text=activeRecapTab==='detailed'?(format.lead?format.lead+'\n\n'+s.summary:s.summary):(format[activeRecapTab]||s.summary);
 const panel=el('div','library-recap-document');const title=el('div','library-recap-title');title.append(txt('span','RECAP DELLA SCORSA SESSIONE'),btn('button','↓ Scarica','library-rec-download',()=>downloadLibraryText(s.title+'_recap',text)));panel.append(title);
 const story=el('div','reader-content');prose(story,text);panel.append(story);root.append(panel)
}
function drawSessionReader(){
 const root=$('session-reader');root.replaceChildren();const s=sessions.find(x=>x.id===activeSession)||sessions[0];if(!s)return;activeSession=s.id;
 const heading=el('header','library-recap-heading');heading.append(txt('span','RECAP · '+sessionName(s).toUpperCase(),'library-recap-eyebrow'),txt('h2',s.title));
 heading.append(txt('p',sessionInfo(s).lead||'Rivivete quello che è accaduto durante la vostra avventura.'));root.append(heading);
 renderLibraryFullRecap(root,s);
 const lower=el('div','library-recap-lower');renderLibraryQuotes(lower,s);renderLibraryOutline(lower,s);renderLibraryNotes(lower,s);root.append(lower);
}
function renderSessions(){
 const root=$('session-list');root.replaceChildren();const found=sessions.filter(s=>libraryMatches(s.title+' '+(sessionInfo(s).lead||'')+' '+s.summary));
 if(!found.length){root.append(noResults('Nessun recap trovato','Cambia la ricerca per visualizzare altre sessioni.'));$('session-reader').replaceChildren();return}
 if(!found.some(s=>s.id===activeSession))activeSession=found[0].id;
 found.forEach((s,i)=>{const b=btn('button','','journal-item'+(s.id===activeSession?' active':''),()=>{activeSession=s.id;activeRecapTab='standard';if(location.hash!=='#/sessioni/'+s.id)location.hash='#/sessioni/'+s.id;else renderLibrary()});
 b.append(txt('span',i===0?'ULTIMA SESSIONE':sessionName(s).toUpperCase(),'mini-label'),txt('h3',s.title),txt('p',short(sessionInfo(s).lead||summaryText(s.summary),145)));root.append(b)});drawSessionReader()
}
function renderLibraryEntityIndex(){
 const root=$('library-entity-list');root.replaceChildren();const current=sessions.find(x=>x.id===activeSession)||sessions[0];const cat=libraryCategory;const rowset=[];
 if(cat==='players'||cat==='npcs'){for(const e of entries){if(characterRole(e)!==(cat==='players'?'pg':'npc'))continue;rowset.push({name:e.title,body:e.body||e.summary,summary:e.summary,ref:e,icon:cat==='players'?'♟':'♙'})}}
 if(cat==='stands'){for(const e of encounteredStands())rowset.push({name:e.title,body:e.body||e.summary,summary:e.summary,ref:e,icon:'✧'})}
 if(cat==='locations'||cat==='factions'){for(const e of entries){if(cat==='locations'&&e.kind!=='location')continue;if(cat==='factions'&&e.kind!=='faction')continue;rowset.push({name:e.title,body:e.body||e.summary,summary:e.summary,ref:e,icon:cat==='locations'?'⌖':'⚔'})}}
 if(cat==='quests'){for(const e of entries){if(!(e.id.startsWith('trial-')||(e.tags||[]).includes('prova')))continue;rowset.push({name:e.title,body:e.body||e.summary,summary:e.summary,ref:e,icon:'▤'})}}
 if(cat==='items'){const map=new Map();for(const e of entries){if(e.kind==='artifact')map.set(normalize(e.title),{name:e.title,body:e.body||e.summary,ref:e,icon:'⬡'});
 for(const thing of (e.public_inventory||[])){const k=normalize(thing.name);if(!map.has(k))map.set(k,{name:thing.name,body:(thing.notes||'')+(thing.state?' · '+thing.state:''),ref:e,icon:'⬡'})}}
 rowset.push(...map.values())}
 const matches=rowset.filter(e=>libraryMatches(e.name+' '+e.summary+' '+e.body)&&(!librarySessionOnly||!current||libraryIsRelated(e.ref,current)||(cat==='items'&&e.ref?.public_inventory?.some(x=>x.session_id===current.id&&normalize(x.name)===normalize(e.name)))));
 $('library-count-label').textContent=matches.length+' '+(matches.length===1?'voce':'voci');
 if(!matches.length){root.append(noResults('Nessuna voce in '+libraryCats[cat],'Qui appariranno soltanto i contenuti conosciuti durante la campagna.'));return}
 for(const e of matches.sort((a,b)=>a.name.localeCompare(b.name,'it'))){const button=btn('button','','library-entry-row',()=>openEntry(e.ref));button.append(txt('span',e.icon,'library-entry-icon'));const content=el('span','library-entry-text');content.append(txt('strong',e.name),txt('span',short(e.summary||e.body,170)));button.append(content);button.append(txt('span','›','library-entry-arrow'));root.append(button)}
}
function renderLibrary(){
 const recap=libraryCategory==='recaps';
 $('library-recap-pane').classList.toggle('hidden',!recap);$('library-entity-pane').classList.toggle('hidden',recap);
 document.querySelectorAll('[data-library]').forEach(b=>{const selected=b.dataset.library===libraryCategory;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected))});
 $('library-filter-indicator').textContent=librarySessionOnly?'•':'';
 $('library-count-label').textContent='';
 if(recap){renderSessions();$('library-count-label').textContent=sessions.filter(s=>libraryMatches(s.title+' '+s.summary)).length+' '+(sessions.length===1?'recap':'recap')}else renderLibraryEntityIndex()
}
function renderFilters(){const root=$('filters');root.replaceChildren();order.forEach(type=>{if(type!=='all'&&type!=='saved'&&!entries.some(e=>e.kind===type))return;const name=type==='all'?'Tutti':type==='saved'?'★ Salvati':labels[type]||type;const b=btn('button',name+' · '+(type==='all'?entries.length:type==='saved'?entries.filter(e=>pinned.has(e.id)).length:entries.filter(e=>e.kind===type).length),'chip'+(filter===type?' active':''),()=>{filter=type;renderFilters();renderEntries()});b.setAttribute('aria-pressed',String(filter===type));root.append(b)})}
function renderEntries(){const root=$('entry-grid');root.replaceChildren();root.classList.toggle('is-list',entryView==='list');$('view-grid').classList.toggle('active',entryView==='grid');$('view-list').classList.toggle('active',entryView==='list');$('view-grid').setAttribute('aria-pressed',String(entryView==='grid'));$('view-list').setAttribute('aria-pressed',String(entryView==='list'));const shown=entries.filter(e=>(filter==='all'||(filter==='saved'?pinned.has(e.id):e.kind===filter))&&normalize([e.title,e.subtitle,e.summary,e.body,...(e.tags||[])].join(' ')).includes(normalize(entryQuery)));$('entry-count-label').textContent=shown.length+' voci visualizzate';if(!shown.length){root.append(noResults('Nessun risultato','Prova un altro filtro o modifica la ricerca.'));return}
 shown.sort((a,b)=>a.title.localeCompare(b.title,'it'));shown.forEach(e=>{const card=btn('button','','entity-card',()=>openEntry(e));const header=el('div','entity-icon');header.append(txt('span',glyphs[e.kind]||'◈','diamond'),txt('span',labels[e.kind]||'Altro','type'));card.append(header,txt('h3',e.title),txt('p',short(e.summary||e.body,142)));const footer=el('div','entity-card-footer');footer.append(txt('span',sessionCount(e)+' sessione/i'),txt('b',(pinned.has(e.id)?'★ ':'')+'Apri scheda ↗'));card.append(footer);root.append(card)})}
function renderHome(){const last=sessions[0];$('featured-session').replaceChildren();if(last){const b=btn('button','','session-feature',()=>openSession(last.id));b.append(txt('span',sessionName(last).toUpperCase(),'mini-label'),txt('h3',last.title),txt('p',short(sessionInfo(last).lead||summaryText(last.summary),350)));const foot=el('div','card-bottom');foot.append(txt('span',(last.related||[]).length+' elementi collegati'),txt('b','Leggi la cronaca →'));b.append(foot);$('featured-session').append(b)}else $('featured-session').append(noResults('Nessuna cronaca','Il diario si riempirà quando verranno pubblicate le sessioni.'));
 $('home-entities').replaceChildren();const featured=[...entries.filter(x=>x.kind==='character'),...entries.filter(x=>x.kind==='stand')].slice(0,3);featured.forEach(e=>{const b=btn('button','','small-entity',()=>openEntry(e));b.append(txt('span',(labels[e.kind]||'COMPENDIO').toUpperCase()),txt('b',e.title),txt('small',e.summary));$('home-entities').append(b)});if(!featured.length)$('home-entities').append(noResults('Compendio vuoto','Nessuna scoperta registrata.'));
 $('home-moments').replaceChildren();const moments=last?.events?.slice(-3)||[];for(const [index,m] of moments.entries()){const d=el('div','moment-preview');d.append(txt('b','✦ '+String(index+1)),txt('p',short(m.text,110)));$('home-moments').append(d)}if(!moments.length)$('home-moments').append(txt('p','I momenti chiave appariranno qui.'));
 $('count-sessions').textContent=String(sessions.length);$('count-entries').textContent=String(entries.length);$('count-stand').textContent=String(encounteredStands().length);$('nav-stand-count').textContent=String(encounteredStands().length);$('count-events').textContent=String(sessions.reduce((n,s)=>n+(s.events?.length||0),0));$('nav-session-count').textContent=String(sessions.length);$('nav-entry-count').textContent=String(entries.length);$('nav-pg-count').textContent=String(entries.filter(e=>characterRole(e)==='pg').length);$('nav-npc-count').textContent=String(entries.filter(e=>characterRole(e)==='npc').length);
 $('sidebar-party').replaceChildren();entries.filter(e=>e.id.startsWith('pg-')).slice(0,7).forEach(e=>{const b=btn('button','','side-person',()=>openEntry(e));b.append(txt('span',e.title.trim()[0]||'?','avatar'),txt('span',e.title));$('sidebar-party').append(b)});}
function renderItemsIndex(){
 const root=$('items-index');root.replaceChildren();const grouped=new Map();
 for(const e of entries){if(e.kind!=='character')continue;for(const item of e.public_inventory||[]){const key=normalize(item.name);if(!key)continue;
 const existing=grouped.get(key)||{name:item.name,users:[],notes:[]};existing.users.push({character:e,item});if(item.notes)existing.notes.push(item.notes);grouped.set(key,existing);
 }}
 if(!grouped.size){root.append(noResults('Nessun oggetto conosciuto','Gli oggetti compariranno qui quando avranno un ruolo nelle vostre vicende.'));return}
 for(const group of [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'it'))){const card=el('article','sq-item-archive-card');card.append(txt('div','OGGETTO INCONTRATO','sq-kicker'),txt('h3',group.name));const p=el('p');p.textContent=group.notes[0]||'Un oggetto comparso nel corso delle vostre avventure.';card.append(p);const refs=el('div','related-pills');for(const u of group.users){refs.append(btn('button',u.character.title+' · '+(u.item.state||'incontrato'),'',()=>openEntry(u.character)))}card.append(refs);root.append(card)}
}
function renderTrialIndex(){
 const root=$('trials-index');root.replaceChildren();const trials=entries.filter(e=>e.id.startsWith('trial-')||(e.tags||[]).includes('prova'));
 if(!trials.length){root.append(noResults('Nessuna prova conosciuta','Le prossime sfide compariranno qui quando saranno incontrate.'));return}
 for(const e of trials){const card=btn('button','','entity-card',()=>openEntry(e));const h=el('div','entity-icon');h.append(txt('span','⚑','diamond'),txt('span','PROVA','type'));card.append(h,txt('h3',e.title),txt('p',e.summary||'Una sfida affrontata dai sopravvissuti.'));card.append(txt('div','entity-card-footer','Apri la prova e i riferimenti →'));root.append(card)}
}
function renderTimeline(){const root=$('timeline-list');root.replaceChildren();const withEvents=sessions.filter(s=>s.events?.length);if(!withEvents.length){root.append(noResults('Nessuna cronologia','I momenti significativi delle sessioni verranno indicizzati qui.'));return}withEvents.forEach(s=>{const g=el('div','history-group');g.append(btn('button',s.title,'history-group-title',()=>openSession(s.id)));s.events.forEach((e,index)=>{const row=el('div','history-event');row.append(txt('time',String(index+1).padStart(2,'0')));const box=el('div');const line=el('b');linked(line,e.text||'');box.append(line,btn('button','Apri la sessione ↗','',()=>openSession(s.id)));row.append(box);g.append(row)});root.append(g)})}
function renderMysteries(){const root=$('mystery-list');root.replaceChildren();const ids=['personaggio-giulia-zeppeli','stand-uncini-killian','personaggio-raven','personaggio-sue-nami','personaggio-emma'];const unknown=entries.filter(e=>e.kind==='clue'||ids.includes(e.id));if(!unknown.length){root.append(noResults('Nessun indizio pubblicato','Il Master aggiungerà le domande che i personaggi hanno effettivamente incontrato.'));return}unknown.forEach(e=>{const b=btn('button','','mystery',()=>openEntry(e));b.append(txt('small','◇ INFORMAZIONE DA APPROFONDIRE'),txt('h3',e.title),txt('p',short(e.summary,210)));root.append(b)})}
function resultScore(hay,tokens,query){const n=normalize(hay);let hits=0;for(const w of tokens)if(n.includes(w))hits++;return (n.includes(normalize(query))?10:0)+hits}
function runMemory(q){const root=$('memory-results');root.replaceChildren();q=safe(q).trim();if(!q){root.append(noResults('Consulta la memoria','Scrivi una parola, un nome o una domanda sugli avvenimenti registrati.'));return}const tokens=words(q);if(!tokens.length){root.append(noResults('Cerca un dettaglio preciso','Prova con il nome di un personaggio, un luogo o un evento.'));return}
 const collection=[...entries.map(e=>({type:'Scheda del compendio',title:e.title,text:[e.summary,e.body].join(' '),open:()=>openEntry(e)})),...sessions.map(s=>({type:'Resoconto',title:s.title,text:s.summary,open:()=>openSession(s.id)})),...sessions.flatMap(s=>(s.events||[]).map(e=>({type:'Avvenimento della sessione',title:s.title,text:e.text,open:()=>openSession(s.id)})))];
 const ranked=collection.map(c=>({...c,score:resultScore(c.title+' '+c.text,tokens,q)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,20);
 if(!ranked.length){root.append(noResults('Non risulta nell’archivio','Le schede e i resoconti pubblicati non contengono un riferimento sufficiente. Potrebbe non essere stato ancora registrato, oppure essere un’informazione riservata.'));return}
 root.append(txt('div',ranked.length+' risultati basati sul diario e sulle schede disponibili','memory-hint'));for(const item of ranked){const b=btn('button','','search-result',item.open);b.append(txt('span',item.type.toUpperCase()),txt('h3',item.title),txt('p',short(item.text,310)));root.append(b)}}
function noResults(title,description){const card=el('div','no-results');card.append(txt('h3',title),txt('p',description));return card}
function notice(msg){const b=txt('div',msg,'toast');b.style.cssText='position:fixed;right:20px;bottom:20px;background:#302c39;color:#f2d6ab;padding:12px 18px;border:1px solid #7c6274;border-radius:8px;z-index:200';document.body.append(b);setTimeout(()=>b.remove(),2400)}
function go(view){if(!['home','sessioni','pg','npc','stand','compendio','oggetti','prove','cronologia','misteri','ricerca'].includes(view))view='home';if(location.hash!=='#/'+view){location.hash='/'+view}else route()}
function route(){const parts=(location.hash||'#/sessioni').replace(/^#\/?/,'').split('/');const view=parts[0]||'home';if(view==='sessioni'&&parts[1]){const id=decodeURIComponent(parts[1]);if(sessions.some(x=>x.id===id)){activeSession=id;libraryCategory='recaps'}}currentView=['home','sessioni','pg','npc','stand','compendio','oggetti','prove','cronologia','misteri','ricerca'].includes(view)?view:'home';
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('hidden',x.id!=='view-'+currentView));document.querySelectorAll('[data-nav]').forEach(x=>{const a=x.dataset.nav===currentView;x.classList.toggle('active',a);if(a)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});const names={home:'Panoramica',sessioni:'Diario delle sessioni',pg:'Personaggi giocanti',npc:'Personaggi non giocanti',stand:'Stand incontrati',compendio:'Compendio',oggetti:'Oggetti incontrati',prove:'Prove e obiettivi',cronologia:'Cronologia',misteri:'Fili aperti',ricerca:'Ricerca'};$('breadcrumb').textContent=names[currentView];
 if(currentView==='home')renderHome();document.body.classList.toggle('library-focused',currentView==='sessioni');if(currentView==='sessioni')renderLibrary();if(currentView==='pg'||currentView==='npc')renderCharacters(currentView);if(currentView==='stand')renderStands();if(currentView==='compendio'){renderFilters();renderEntries()}if(currentView==='oggetti')renderItemsIndex();if(currentView==='prove')renderTrialIndex();if(currentView==='cronologia')renderTimeline();if(currentView==='misteri')renderMysteries();if(currentView==='ricerca'){$('memory-query').value=searchQuery;runMemory(searchQuery)}
 $('sidebar').classList.remove('open');$('mobile-shade').classList.remove('open');window.scrollTo(0,0)}
const PUBLIC_DB='https://eldluuxqizvrczsnelre.supabase.co/rest/v1';
const PUBLIC_DB_KEY='sb_publishable_l8p97NQI5ELPiJ0OOoIJww_DJIovv7E';
async function loadPublicDB(){const headers={apikey:PUBLIC_DB_KEY,Accept:'application/json'};const fields='id,category,title,subtitle,summary,public_details,tags,event_date,session_number,visibility,public_events,character_role,public_history,public_inventory,public_condition';const res=await fetch(PUBLIC_DB+'/entries?select='+encodeURIComponent(fields)+'&visibility=eq.players',{headers,cache:'no-store'});if(!res.ok)throw Error('DB HTTP '+res.status);const rows=await res.json();const linkRes=await fetch(PUBLIC_DB+'/entry_links?select=from_id,to_id,relation',{headers,cache:'no-store'});const links=linkRes.ok?await linkRes.json():[];const ids=new Set(rows.map(x=>x.id));const related=id=>[...new Set(links.filter(l=>l.from_id===id||l.to_id===id).map(l=>l.from_id===id?l.to_id:l.from_id).filter(x=>ids.has(x)))];const type={personaggi:'character',stand:'stand',luoghi:'location',indizi:'clue',lore:'other',meccaniche:'other',prove:'other',eventi:'other'};return{entries:rows.filter(x=>x.category!=='sessioni').map(x=>({id:x.id,kind:(x.category==='lore'&&Array.isArray(x.tags)&&x.tags.includes('fazione')?'faction':type[x.category]||'other'),title:x.title,subtitle:x.subtitle||'',summary:x.summary||'',body:x.public_details||'',tags:x.tags||[],related:related(x.id),character_role:x.character_role||'unspecified',public_history:x.public_history||[],public_inventory:x.public_inventory||[],public_condition:x.public_condition||'',public:true})),sessions:rows.filter(x=>x.category==='sessioni').map(x=>({id:x.id,number:x.session_number??null,date:x.event_date||'',title:x.title,summary:x.public_details||x.summary||'',events:x.public_events||[],related:related(x.id),public:true}))};}
async function applyNarrativeEdition(){
 try{
  const response=await fetch('data/editorial-public-v1.json',{cache:'no-store'});
  if(!response.ok)throw Error('Edizione narrativa non caricata');
  const edition=await response.json();
  for(const e of entries){
   const patch=edition.profiles?.[e.id];
   if(!patch||e.summary!==patch.expected)continue;
   e.summary=patch.summary;
   e.body=patch.details;
   if(Object.prototype.hasOwnProperty.call(patch,'condition'))e.public_condition=patch.condition;
   if(Array.isArray(patch.events)){const list=historyOf(e);for(let i=0;i<patch.events.length;i++){if(i<list.length)list[i]={...list[i],text:patch.events[i]};else list.push({session_id:'sessione-fiume-01',session_title:'La prova del fiume',time:'',type:'azione',text:patch.events[i]})}e.public_history=list}
   if(Array.isArray(patch.inventory))e.public_inventory=patch.inventory;
  }
  const chap=sessions.find(x=>x.id==='sessione-fiume-01');
  if(chap&&edition.story){
   if(chap.summary===edition.story.expectedSummary)chap.summary=edition.story.newSummary;
   for(const [original,replacement] of (edition.story.replacements||[])){
    if(chap.summary.includes(original))chap.summary=chap.summary.split(original).join(replacement);
   }
   // I Grimm entrano in scena soltanto dopo il traguardo, per fermare Jean.
   // Le vecchie battute audio contenevano attribuzioni errate: si corregge
   // l'intero paragrafo, non soltanto il nome del personaggio.
   chap.summary=chap.summary.split(/\n\n+/).map(paragraph=>{
    if(paragraph.includes("A un certo punto lo Stand armato di fucile emerse dall'acqua.")){
     return paragraph.replace(/A un certo punto lo Stand armato di fucile emerse dall'acqua\.[\s\S]*$/, "Nel pieno dello scontro Mariah fu colta da un dolore improvviso e si portò una mano alla testa. Sue Nami smise di sorridere.");
    }
    if(paragraph.includes("Un attacco rivolto a Sunshine fu intercettato dall'intervento di Emma")){
     return paragraph.replace(/Un attacco rivolto a Sunshine fu intercettato dall'intervento di Emma[\s\S]*$/,edition.story.recapEnding);
    }
    return paragraph;
   }).join('\n\n');
   chap.summary=chap.summary.replace(/\n{3,}/g,'\n\n').trim();
  }
 }catch(e){console.warn('L’edizione narrativa non è stata caricata',e)}
}
function mergeData(local,db){const localEntries=Array.isArray(local.entries)?local.entries.filter(x=>x&&x.public!==false):[];const localSessions=Array.isArray(local.sessions)?local.sessions.filter(x=>x&&x.public!==false):[];const mapE=new Map(localEntries.map(x=>[x.id,x]));db.entries.forEach(x=>mapE.set(x.id,{...mapE.get(x.id),...x,related:[...new Set([...(mapE.get(x.id)?.related||[]),...(x.related||[])])]}));const mapS=new Map(localSessions.map(x=>[x.id,x]));db.sessions.forEach(x=>mapS.set(x.id,{...mapS.get(x.id),...x,events:mapS.get(x.id)?.events||[],quotes:mapS.get(x.id)?.quotes||[],related:[...new Set([...(mapS.get(x.id)?.related||[]),...(x.related||[])])]}));return{entries:[...mapE.values()],sessions:[...mapS.values()]};}
async function init(){try{const res=await fetch('data/public.json',{cache:'no-store'});if(!res.ok)throw Error('Archivio non disponibile');const data=await res.json();const name=data.campaign?.title||'Un destino bizzarro.';$('campaign-title').replaceChildren();$('campaign-title').append(document.createTextNode(name.replace(/\.+$/,'').replace(/\s+bizzarro$/i,'')));if(/bizzarro/i.test(name))$('campaign-title').append(txt('em','bizzarro.'));if(data.campaign?.subtitle)$('campaign-subtitle').textContent=data.campaign.subtitle;document.title=name+' · JoJo Chronicles';entries=Array.isArray(data.entries)?data.entries.filter(x=>x.public!==false):[];sessions=Array.isArray(data.sessions)?data.sessions.filter(x=>x.public!==false):[];try{const db=await loadPublicDB();entries=db.entries.filter(e=>!['personaggio-emma','personaggio-emma-stenvibler','personaggio-john'].includes(e.id));sessions=db.sessions;await applyNarrativeEdition();await loadRecapFormats();}catch(e){console.warn('Archivio remoto non raggiungibile, dati locali utilizzati',e)}
 sessions.sort((a,b)=>(b.number??0)-(a.number??0));entries=entries.filter(e=>e.kind!=='stand'||window.JoJoStands.encounterSources(e,sessions).length>0);activeSession=sessions[0]?.id||'';renderHome();route();
 }catch(e){$('featured-session').append(noResults('Impossibile caricare l’archivio','La pagina deve essere aperta dal sito GitHub Pages.'));console.error(e)}}

document.querySelectorAll('[data-library]').forEach(b=>b.addEventListener('click',()=>{
 libraryCategory=b.dataset.library;if(!['recaps','players','npcs','stands','items','locations','factions','quests'].includes(libraryCategory))libraryCategory='recaps';
 if(libraryCategory!=='recaps'&&location.hash.startsWith('#/sessioni/'))location.hash='#/sessioni';
 renderLibrary();
}));
$('library-search-input').addEventListener('input',e=>{libraryQuery=e.target.value;renderLibrary()});
$('library-filter-toggle').addEventListener('click',()=>{const popup=$('library-filter-popup');const open=popup.classList.toggle('hidden')===false;$('library-filter-toggle').setAttribute('aria-expanded',String(open))});
$('library-filter-session').addEventListener('change',e=>{librarySessionOnly=e.target.checked;renderLibrary()});
$('library-filter-clear').addEventListener('click',()=>{libraryQuery='';librarySessionOnly=false;$('library-search-input').value='';$('library-filter-session').checked=false;$('library-filter-popup').classList.add('hidden');$('library-filter-toggle').setAttribute('aria-expanded','false');renderLibrary()});
document.addEventListener('click',e=>{const wrap=document.querySelector('.library-filter-wrap');if(wrap&&!wrap.contains(e.target)&&!$('library-filter-popup').classList.contains('hidden')){$('library-filter-popup').classList.add('hidden');$('library-filter-toggle').setAttribute('aria-expanded','false')}});
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.nav)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$('hero-session').onclick=()=>sessions.length?openSession(sessions[0].id):go('sessioni');
$('search-jump').onclick=()=>go('ricerca');
$('stand-search').addEventListener('input',e=>{standQuery=e.target.value;renderStands()});$('entry-search').addEventListener('input',e=>{entryQuery=e.target.value;renderEntries()});$('view-grid').addEventListener('click',()=>{entryView='grid';try{localStorage.setItem('jojo-entry-view',entryView)}catch{};renderEntries()});$('view-list').addEventListener('click',()=>{entryView='list';try{localStorage.setItem('jojo-entry-view',entryView)}catch{};renderEntries()});try{entryView=localStorage.getItem('jojo-entry-view')==='list'?'list':'grid'}catch{};
$('memory-form').addEventListener('submit',e=>{e.preventDefault();searchQuery=$('memory-query').value;runMemory(searchQuery)});
$('detail-close').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
$('menu-toggle').onclick=()=>{$('sidebar').classList.toggle('open');$('mobile-shade').classList.toggle('open')};
$('mobile-shade').onclick=()=>{$('sidebar').classList.remove('open');$('mobile-shade').classList.remove('open')};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();go('ricerca');setTimeout(()=>$('memory-query').focus(),35)}});
window.addEventListener('hashchange',route);
init();
})();
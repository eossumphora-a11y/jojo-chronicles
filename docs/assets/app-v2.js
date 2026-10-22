(()=>{'use strict';
const $=id=>document.getElementById(id);
const labels={character:'Personaggi',stand:'Stand',location:'Luoghi',faction:'Fazioni',artifact:'Oggetti',clue:'Indizi',other:'Altro'};
const glyphs={character:'♟',stand:'✧',location:'⌖',faction:'♜',artifact:'✦',clue:'◇',other:'◈'};
const order=['all','character','stand','location','clue','faction','artifact','other','saved'];
let entries=[],sessions=[],filter='all',entryQuery='',activeSession='',currentView='home',searchQuery='';
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
function openEntry(e){const dialog=$('detail');$('detail-type').textContent=labels[e.kind]||'Archivio';$('detail-title').textContent=e.title;$('detail-subtitle').textContent=e.subtitle||'Scheda del compendio';const body=$('detail-content');body.replaceChildren();if(e.summary){const p=el('p');linked(p,e.summary);body.append(p)}if(e.body){const part=section(body,'Cosa è stato scoperto');const p=el('p');linked(p,e.body);part.append(p)}
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
function openSession(id){const s=sessions.find(s=>s.id===id);if(!s)return;activeSession=id;go('sessioni');}

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
  actions.append(btn('button','Condividi il link','action-button',async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname+'#/sessioni');notice('Link copiato')}catch{notice('Copia del link non disponibile')}}));
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
function drawSessionReader(){
 const root=$('session-reader');root.replaceChildren();const s=sessions.find(x=>x.id===activeSession)||sessions[0];
 if(!s){root.append(noResults('Il diario è vuoto','Non ci sono ancora sessioni da leggere.'));return}
 activeSession=s.id;
 const header=el('div','sq-reader-header');header.append(txt('div','LE VOSTRE AVVENTURE  /  '+sessionName(s).toUpperCase(),'sq-kicker'),txt('h2',s.title));
 header.append(txt('p','Rivivete gli eventi, rivedete i protagonisti e ritrovate tutto ciò che avete scoperto.','sq-reader-subtitle'));
 root.append(header);
 const panels=el('div','sq-session-tabs');for(const [key,label,icon] of [['recap','Riepilogo','▤'],['outline','Scaletta','☷'],['notes','Note e wiki','◈'],['quotes','Citazioni','❞']]){
  const b=btn('button',icon+'  '+label,'sq-session-tab'+(activeSessionPanel===key?' active':''),()=>{activeSessionPanel=key;drawSessionReader()});b.setAttribute('aria-pressed',String(activeSessionPanel===key));panels.append(b)}
 root.append(panels);
 const content=el('div','sq-session-content');renderSessionSections(content,s);root.append(content);
}
function renderSessions(){
 const root=$('session-list');root.replaceChildren();
 if(!sessions.length){root.append(noResults('Nessuna sessione','Le avventure appariranno qui dopo essere state raccontate.'));$('session-reader').replaceChildren();return}
 sessions.forEach((s,i)=>{const active=activeSession===s.id;const card=btn('button','','journal-item'+(active?' active':''),()=>{activeSession=s.id;activeSessionPanel='recap';activeRecapTab='standard';renderSessions()});
 card.append(txt('span',i===0?'ULTIMA SESSIONE':sessionName(s).toUpperCase(),'mini-label'),txt('h3',s.title),txt('p',short(sessionInfo(s).lead||summaryText(s.summary),145)));root.append(card)});
 drawSessionReader();
}
function renderFilters(){const root=$('filters');root.replaceChildren();order.forEach(type=>{if(type!=='all'&&type!=='saved'&&!entries.some(e=>e.kind===type))return;const name=type==='all'?'Tutti':type==='saved'?'★ Salvati':labels[type]||type;const b=btn('button',name+' · '+(type==='all'?entries.length:type==='saved'?entries.filter(e=>pinned.has(e.id)).length:entries.filter(e=>e.kind===type).length),'chip'+(filter===type?' active':''),()=>{filter=type;renderFilters();renderEntries()});b.setAttribute('aria-pressed',String(filter===type));root.append(b)})}
function renderEntries(){const root=$('entry-grid');root.replaceChildren();const shown=entries.filter(e=>(filter==='all'||(filter==='saved'?pinned.has(e.id):e.kind===filter))&&normalize([e.title,e.subtitle,e.summary,e.body,...(e.tags||[])].join(' ')).includes(normalize(entryQuery)));$('entry-count-label').textContent=shown.length+' voci visualizzate';if(!shown.length){root.append(noResults('Nessun risultato','Prova un altro filtro o modifica la ricerca.'));return}
 shown.sort((a,b)=>a.title.localeCompare(b.title,'it'));shown.forEach(e=>{const card=btn('button','','entity-card',()=>openEntry(e));const header=el('div','entity-icon');header.append(txt('span',glyphs[e.kind]||'◈','diamond'),txt('span',labels[e.kind]||'Altro','type'));card.append(header,txt('h3',e.title),txt('p',short(e.summary||e.body,142)));const footer=el('div','entity-card-footer');footer.append(txt('span',sessionCount(e)+' sessione/i'),txt('b',(pinned.has(e.id)?'★ ':'')+'Apri scheda ↗'));card.append(footer);root.append(card)})}
function renderHome(){const last=sessions[0];$('featured-session').replaceChildren();if(last){const b=btn('button','','session-feature',()=>openSession(last.id));b.append(txt('span',sessionName(last).toUpperCase(),'mini-label'),txt('h3',last.title),txt('p',short(summaryText(last.summary),350)));const foot=el('div','card-bottom');foot.append(txt('span',(last.related||[]).length+' elementi collegati'),txt('b','Leggi la cronaca →'));b.append(foot);$('featured-session').append(b)}else $('featured-session').append(noResults('Nessuna cronaca','Il diario si riempirà quando verranno pubblicate le sessioni.'));
 $('home-entities').replaceChildren();const featured=[...entries.filter(x=>x.kind==='character'),...entries.filter(x=>x.kind==='stand')].slice(0,3);featured.forEach(e=>{const b=btn('button','','small-entity',()=>openEntry(e));b.append(txt('span',(labels[e.kind]||'COMPENDIO').toUpperCase()),txt('b',e.title),txt('small',e.summary));$('home-entities').append(b)});if(!featured.length)$('home-entities').append(noResults('Compendio vuoto','Nessuna scoperta registrata.'));
 $('home-moments').replaceChildren();const moments=last?.events?.slice(-3)||[];for(const [index,m] of moments.entries()){const d=el('div','moment-preview');d.append(txt('b','✦ '+String(index+1)),txt('p',short(m.text,110)));$('home-moments').append(d)}if(!moments.length)$('home-moments').append(txt('p','I momenti chiave appariranno qui.'));
 $('count-sessions').textContent=String(sessions.length);$('count-entries').textContent=String(entries.length);$('count-stand').textContent=String(entries.filter(e=>e.kind==='stand').length);$('count-events').textContent=String(sessions.reduce((n,s)=>n+(s.events?.length||0),0));$('nav-session-count').textContent=String(sessions.length);$('nav-entry-count').textContent=String(entries.length);$('nav-pg-count').textContent=String(entries.filter(e=>characterRole(e)==='pg').length);$('nav-npc-count').textContent=String(entries.filter(e=>characterRole(e)==='npc').length);
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
function go(view){if(!['home','sessioni','pg','npc','compendio','oggetti','prove','cronologia','misteri','ricerca'].includes(view))view='home';if(location.hash!=='#/'+view){location.hash='/'+view}else route()}
function route(){const parts=(location.hash||'#/home').replace(/^#\/?/,'').split('/');const view=parts[0]||'home';currentView=['home','sessioni','pg','npc','compendio','cronologia','misteri','ricerca'].includes(view)?view:'home';
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('hidden',x.id!=='view-'+currentView));document.querySelectorAll('[data-nav]').forEach(x=>{const a=x.dataset.nav===currentView;x.classList.toggle('active',a);if(a)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});const names={home:'Panoramica',sessioni:'Diario delle sessioni',pg:'Personaggi giocanti',npc:'Personaggi non giocanti',compendio:'Compendio',oggetti:'Oggetti incontrati',prove:'Prove e obiettivi',cronologia:'Cronologia',misteri:'Fili aperti',ricerca:'Ricerca'};$('breadcrumb').textContent=names[currentView];
 if(currentView==='home')renderHome();if(currentView==='sessioni')renderSessions();if(currentView==='pg'||currentView==='npc')renderCharacters(currentView);if(currentView==='compendio'){renderFilters();renderEntries()}if(currentView==='oggetti')renderItemsIndex();if(currentView==='prove')renderTrialIndex();if(currentView==='cronologia')renderTimeline();if(currentView==='misteri')renderMysteries();if(currentView==='ricerca'){$('memory-query').value=searchQuery;runMemory(searchQuery)}
 $('sidebar').classList.remove('open');$('mobile-shade').classList.remove('open');window.scrollTo(0,0)}
const PUBLIC_DB='https://eldluuxqizvrczsnelre.supabase.co/rest/v1';
const PUBLIC_DB_KEY='sb_publishable_l8p97NQI5ELPiJ0OOoIJww_DJIovv7E';
async function loadPublicDB(){const headers={apikey:PUBLIC_DB_KEY,Accept:'application/json'};const fields='id,category,title,subtitle,summary,public_details,tags,event_date,session_number,visibility,public_events,character_role,public_history,public_inventory,public_condition';const res=await fetch(PUBLIC_DB+'/entries?select='+encodeURIComponent(fields)+'&visibility=eq.players',{headers,cache:'no-store'});if(!res.ok)throw Error('DB HTTP '+res.status);const rows=await res.json();const linkRes=await fetch(PUBLIC_DB+'/entry_links?select=from_id,to_id,relation',{headers,cache:'no-store'});const links=linkRes.ok?await linkRes.json():[];const ids=new Set(rows.map(x=>x.id));const related=id=>[...new Set(links.filter(l=>l.from_id===id||l.to_id===id).map(l=>l.from_id===id?l.to_id:l.from_id).filter(x=>ids.has(x)))];const type={personaggi:'character',stand:'stand',luoghi:'location',indizi:'clue',lore:'other',meccaniche:'other',prove:'other',eventi:'other'};return{entries:rows.filter(x=>x.category!=='sessioni').map(x=>({id:x.id,kind:type[x.category]||'other',title:x.title,subtitle:x.subtitle||'',summary:x.summary||'',body:x.public_details||'',tags:x.tags||[],related:related(x.id),character_role:x.character_role||'unspecified',public_history:x.public_history||[],public_inventory:x.public_inventory||[],public_condition:x.public_condition||'',public:true})),sessions:rows.filter(x=>x.category==='sessioni').map(x=>({id:x.id,number:x.session_number??null,date:x.event_date||'',title:x.title,summary:x.public_details||x.summary||'',events:x.public_events||[],related:related(x.id),public:true}))};}
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
   if(Array.isArray(patch.events)){const list=historyOf(e);for(let i=0;i<patch.events.length&&i<list.length;i++)list[i]={...list[i],text:patch.events[i]};e.public_history=list}
   if(Array.isArray(patch.inventory))e.public_inventory=patch.inventory;
  }
  const chap=sessions.find(x=>x.id==='sessione-fiume-01');
  if(chap&&edition.story){
   if(chap.summary===edition.story.expectedSummary)chap.summary=edition.story.newSummary;
   for(const [original,replacement] of (edition.story.replacements||[])){
    if(chap.summary.includes(original))chap.summary=chap.summary.replace(original,replacement);
   }
   chap.summary=chap.summary.replace(/\n{3,}/g,'\n\n').trim();
  }
 }catch(e){console.warn('L’edizione narrativa non è stata caricata',e)}
}
function mergeData(local,db){const localEntries=Array.isArray(local.entries)?local.entries.filter(x=>x&&x.public!==false):[];const localSessions=Array.isArray(local.sessions)?local.sessions.filter(x=>x&&x.public!==false):[];const mapE=new Map(localEntries.map(x=>[x.id,x]));db.entries.forEach(x=>mapE.set(x.id,{...mapE.get(x.id),...x,related:[...new Set([...(mapE.get(x.id)?.related||[]),...(x.related||[])])]}));const mapS=new Map(localSessions.map(x=>[x.id,x]));db.sessions.forEach(x=>mapS.set(x.id,{...mapS.get(x.id),...x,events:mapS.get(x.id)?.events||[],quotes:mapS.get(x.id)?.quotes||[],related:[...new Set([...(mapS.get(x.id)?.related||[]),...(x.related||[])])]}));return{entries:[...mapE.values()],sessions:[...mapS.values()]};}
async function init(){try{const res=await fetch('data/public.json',{cache:'no-store'});if(!res.ok)throw Error('Archivio non disponibile');const data=await res.json();const name=data.campaign?.title||'Un destino bizzarro.';$('campaign-title').replaceChildren();$('campaign-title').append(document.createTextNode(name.replace(/\.+$/,'').replace(/\s+bizzarro$/i,'')));if(/bizzarro/i.test(name))$('campaign-title').append(txt('em','bizzarro.'));if(data.campaign?.subtitle)$('campaign-subtitle').textContent=data.campaign.subtitle;document.title=name+' · JoJo Chronicles';entries=Array.isArray(data.entries)?data.entries.filter(x=>x.public!==false):[];sessions=Array.isArray(data.sessions)?data.sessions.filter(x=>x.public!==false):[];try{const db=await loadPublicDB();entries=db.entries;sessions=db.sessions;await applyNarrativeEdition();await loadRecapFormats();}catch(e){console.warn('Archivio remoto non raggiungibile, dati locali utilizzati',e)}
 sessions.sort((a,b)=>(b.number??0)-(a.number??0));activeSession=sessions[0]?.id||'';renderHome();route();
 }catch(e){$('featured-session').append(noResults('Impossibile caricare l’archivio','La pagina deve essere aperta dal sito GitHub Pages.'));console.error(e)}}
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.nav)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$('hero-session').onclick=()=>sessions.length?openSession(sessions[0].id):go('sessioni');
$('search-jump').onclick=()=>go('ricerca');
$('entry-search').addEventListener('input',e=>{entryQuery=e.target.value;renderEntries()});
$('memory-form').addEventListener('submit',e=>{e.preventDefault();searchQuery=$('memory-query').value;runMemory(searchQuery)});
$('detail-close').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
$('menu-toggle').onclick=()=>{$('sidebar').classList.toggle('open');$('mobile-shade').classList.toggle('open')};
$('mobile-shade').onclick=()=>{$('sidebar').classList.remove('open');$('mobile-shade').classList.remove('open')};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();go('ricerca');setTimeout(()=>$('memory-query').focus(),35)}});
window.addEventListener('hashchange',route);
init();
})();
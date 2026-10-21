(()=>{'use strict';
const $=id=>document.getElementById(id);const labels={character:'Personaggi',stand:'Stand',location:'Luoghi',faction:'Fazioni',artifact:'Oggetti',clue:'Indizi',other:'Altro'};
let entries=[],sessions=[],filter='all',query='';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function empty(container,title,description){container.replaceChildren();const card=el('div','empty'),part=el('div');part.append(el('div','eyebrow','ARCHIVIO'),el('h3','',title),el('p','',description));card.append(part);container.append(card)}
function renderFilters(){const box=$('filters');box.replaceChildren();const types=['all','character','stand','artifact',...Object.keys(labels).filter(k=>!['character','stand','artifact'].includes(k)&&entries.some(e=>e.kind===k))];types.forEach(type=>{const b=el('button','chip'+(filter===type?' active':''),type==='all'?'Tutti':labels[type]);b.type='button';b.setAttribute('aria-pressed',String(filter===type));b.onclick=()=>{filter=type;renderFilters();renderEntries()};box.append(b)})}
function renderEntries(){const root=$('entry-grid');const shown=entries.filter(e=>(filter==='all'||e.kind===filter)&&[e.title,e.subtitle,e.summary,...(e.tags||[])].join(' ').toLocaleLowerCase('it').includes(query));$('entry-count-label').textContent=shown.length+' voci';root.replaceChildren();if(!shown.length){empty(root,entries.length?'Nessun risultato':'L’archivio attende la prima scoperta',filter!=='all'&&!entries.some(e=>e.kind===filter)?'Non ci sono ancora schede pubblicate in questa categoria. Il Master le renderà disponibili dopo aver verificato cosa conoscono i giocatori.':entries.length?'Prova a modificare la ricerca o il filtro.':'Le voci saranno visibili qui quando il Master le renderà pubbliche.');return}for(const e of shown){const card=el('button','lore-card');card.type='button';card.append(el('span','card-kicker',labels[e.kind]||labels.other),el('h3','',e.title),el('p','',e.summary||e.subtitle||''));if(e.tags?.length){const tags=el('div','card-tags');e.tags.slice(0,3).forEach(t=>tags.append(el('span','tag',t)));card.append(tags)}card.onclick=()=>openEntry(e);root.append(card)}}
function section(parent,title){const s=el('div','detail-section');s.append(el('div','detail-label',title));parent.append(s);return s}
// Rende cliccabili i nomi dei personaggi e degli Stand già pubblicati.
// Usa SOLO entries filtrate dal public.json: nessuna scheda Master può comparire qui.
function appendLinkedProse(node,value){
 const text=String(value||'');
 const names=new Map();
 for(const e of entries){
  if(!['character','stand'].includes(e.kind))continue;
  const title=String(e.title||'').trim();
  if(title.length>3&&!names.has(title.toLocaleLowerCase('it')))names.set(title.toLocaleLowerCase('it'),e);
 }
 const variants=[...names.keys()].sort((a,b)=>b.length-a.length);
 if(!variants.length){node.textContent=text;return;}
 const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const re=new RegExp('(?<![\\p{L}\\p{N}])('+variants.map(escapeRe).join('|')+')(?![\\p{L}\\p{N}])','giu');
 let last=0;
 for(const match of text.matchAll(re)){
  const e=names.get(match[0].toLocaleLowerCase('it'));
  if(!e)continue;
  node.append(document.createTextNode(text.slice(last,match.index)));
  const b=el('button','lore-inline-link',match[0]);b.type='button';b.title='Apri la scheda di '+e.title;b.onclick=()=>openEntry(e);
  node.append(b);last=match.index+match[0].length;
 }
 node.append(document.createTextNode(text.slice(last)));
}
function openEntry(e){$('detail-type').textContent=labels[e.kind]||labels.other;$('detail-title').textContent=e.title;$('detail-subtitle').textContent=e.subtitle||'';const root=$('detail-content');root.replaceChildren();if(e.summary){const p=el('p');appendLinkedProse(p,e.summary);root.append(p)}if(e.body){const s=section(root,'Scheda');const body=el('div','modal-body');appendLinkedProse(body,e.body);s.append(body)}if(e.tags?.length){const wrap=el('div','detail-list');e.tags.forEach(t=>wrap.append(el('span','tag',t)));root.append(wrap)}const related=(e.related||[]).map(id=>entries.find(x=>x.id===id)).filter(Boolean);if(related.length){const s=section(root,'Collegamenti');const wrap=el('div','detail-list');for(const x of related){const b=el('button','btn ghost',x.title);b.onclick=()=>openEntry(x);wrap.append(b)}s.append(wrap)}$('detail').showModal()}
function openSession(s){$('detail-type').textContent='SESSIONE '+(s.number||'');$('detail-title').textContent=s.title;$('detail-subtitle').textContent=s.date||'';const root=$('detail-content');root.replaceChildren();if(s.summary){const wrap=section(root,'Resoconto');const body=el('div','modal-body');appendLinkedProse(body,s.summary);wrap.append(body)}if(s.events?.length){const wrap=section(root,'Cronologia');for(const e of s.events){const item=el('div','moment');item.append(el('time','',e.time||'—'),el('div','',e.text||''));wrap.append(item)}}if(s.related?.length){const related=s.related.map(id=>entries.find(e=>e.id===id)).filter(Boolean);if(related.length){const sec=section(root,'Schede collegate');const wrap=el('div','detail-list');for(const e of related){const b=el('button','btn ghost',e.title);b.type='button';b.onclick=()=>openEntry(e);wrap.append(b)}sec.append(wrap)}}if(s.quotes?.length){const wrap=section(root,'Citazioni');for(const q of s.quotes){const block=el('blockquote','quote','“'+(q.text||'')+'”');block.append(el('small','',(q.speaker||'Voce non attribuita')+(q.time?' · '+q.time:'')));wrap.append(block)}}$('detail').showModal()}
function renderSessions(){const root=$('session-list');root.replaceChildren();if(!sessions.length){empty(root,'Nessuna sessione pubblicata','I resoconti compariranno qui dopo l’approvazione del Master.');return}sessions.forEach(s=>{const card=el('button','session');card.type='button';const n=el('div','session-number',String(s.number||'—').padStart(2,'0')),r=el('div');r.append(el('div','session-date',s.date||'Diario di sessione'),el('h3','',s.title),el('p','',s.summary?.slice(0,210)||''));card.append(n,r);card.onclick=()=>openSession(s);root.append(card)})}
async function start(){try{const res=await fetch('data/public.json',{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);const data=await res.json();const cfg=data.campaign||{};if(cfg.title){$('campaign-title').textContent=cfg.title;document.title=cfg.title+' · JoJo Chronicles'}if(cfg.subtitle)$('campaign-subtitle').textContent=cfg.subtitle;entries=Array.isArray(data.entries)?data.entries.filter(x=>x&&x.public!==false):[];sessions=Array.isArray(data.sessions)?data.sessions.filter(x=>x&&x.public!==false):[];sessions.sort((a,b)=>(b.number||0)-(a.number||0));$('count-entries').textContent=entries.length;$('count-stand').textContent=entries.filter(x=>x.kind==='stand').length;$('count-sessions').textContent=sessions.length;renderFilters();renderEntries();renderSessions()}catch(e){empty($('entry-grid'),'Impossibile caricare l’archivio','Apri il sito da un server locale o da GitHub Pages.');empty($('session-list'),'Archivio non disponibile','Il file pubblico non è stato caricato.');$('entry-count-label').textContent='Errore di caricamento';console.error(e)}}
$('search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('it');renderEntries()});$('detail-close').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});start();
})();

(()=>{'use strict';
const ROOT='ranking-root';
const TABS=[['panoramica','Panoramica'],['terza-prova','Terza prova'],['generale','Generale'],['evoluzione','Evoluzione'],['squadre','Squadre'],['storico','Archivio'],['esporta','Esporta']];
const number=new Intl.NumberFormat('it-IT',{maximumFractionDigits:2});
let model=null,promise=null;
const format=n=>number.format(Math.abs(n)<1e-8?0:n);
const element=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=String(text);return n};
const append=(parent,...nodes)=>{for(const n of nodes)if(n)parent.append(n);return parent};
const rankCell=rank=>({type:'rank',rank});
const boldCell=value=>({type:'strong',value});
const namesCell=value=>({type:'names',value});
function classify(data){
 const people=new Map(data.people.map(p=>[p.id,p]));
 const scores=new Map(data.people.map(p=>[p.id,0]));
 const event=data.events[0],phases=event.phases;
 for(const phase of phases){
  for(const a of phase.awards||[])scores.set(a.personId,(scores.get(a.personId)||0)+a.points);
  for(const team of phase.teams||[]){
   const amount=team.prize/team.members.length;
   for(const id of team.members)scores.set(id,(scores.get(id)||0)+amount);
  }
 }
 const persons=data.people.map(p=>({...p,earned:scores.get(p.id)||0,total:p.baseline==null?null:p.baseline+(scores.get(p.id)||0)}));
 const general=rankRows(persons.filter(p=>p.total!==null),'total');
 const earlier=rankRows(persons.filter(p=>p.baseline!==null),'baseline');
 const latest=rankRows(persons.filter(p=>p.earned>0),'earned');
 const teams=phases.find(p=>p.type==='teams').teams.map(t=>({...t,display:t.label||'Formazione '+t.rank+'° posto',names:t.members.map(id=>people.get(id)?.name||id),share:t.prize/t.members.length}));
 const totalAwards=phases.reduce((sum,p)=>sum+(p.awards||[]).reduce((acc,a)=>acc+a.points,0)+(p.teams||[]).reduce((acc,t)=>acc+t.prize,0),0);
 const previousRanks=new Map(earlier.map(p=>[p.id,p.rank]));
 return {raw:data,people,persons,general,earlier,latest,teams,phases,totalAwards,previousRanks,unknown:persons.filter(p=>p.total===null)};
}
function rankRows(array,key){
 const sorted=[...array].sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name,'it'));
 let rank=0,prev=null;
 return sorted.map((p,i)=>{if(prev===null||Math.abs(prev-p[key])>0.00001)rank=i+1;prev=p[key];return {...p,rank}});
}
function metric(label,value,desc){
 const b=element('div','ranking-metric');
 append(b,element('span','ranking-metric-label',label),element('strong','ranking-metric-value',value),element('small','ranking-metric-note',desc));
 return b;
}
function metrics(root,items){const grid=element('div','ranking-metrics');for(const m of items)grid.append(metric(...m));root.append(grid);return grid;}
function panel(root,title,subtitle){
 const box=element('section','ranking-panel');
 const h=element('div','ranking-panel-heading');
 append(h,element('h2','',title));
 if(subtitle)h.append(element('p','',subtitle));
 box.append(h);root.append(box);return box;
}
function note(root,message,kind=''){
 const n=element('p','ranking-note'+(kind?' ranking-note-'+kind:''),message);root.append(n);return n;
}
function heading(root,title,subtitle){
 const row=element('div','ranking-section-heading');
 append(row,element('h2','',title),subtitle?element('p','',subtitle):null);
 root.append(row);return row;
}
function cellContent(cell,td){
 if(cell&&typeof cell==='object'){
  if(cell.type==='rank'){
   const p=element('span','ranking-place ranking-place-'+(cell.rank<=3?cell.rank:'rest'),cell.rank+'°');
   td.append(p);return;
  }
  if(cell.type==='strong'){td.append(element('strong','ranking-strong',cell.value));return;}
  if(cell.type==='names'){
   const group=element('div','ranking-chips');
   for(const name of cell.value)group.append(element('span','ranking-chip',name));
   td.append(group);return;
  }
 }
 td.textContent=String(cell??'—');
}
function table(root,headers,rows,opts={}){
 const scroll=element('div','ranking-table-scroll');
 const node=element('table','ranking-table');
 const thead=element('thead');const headrow=element('tr');
 for(const h of headers)headrow.append(element('th','',h));
 thead.append(headrow);node.append(thead);
 const tbody=element('tbody');
 for(const row of rows){
  const tr=element('tr');
  for(const cell of row){
   const td=element('td');
   cellContent(cell,td);
   tr.append(td);
  }
  tbody.append(tr);
 }
 node.append(tbody);scroll.append(node);
 if(opts.search){
  const filterWrap=element('div','ranking-filter');
  const input=element('input','ranking-search');
  input.type='search';input.placeholder='Filtra per nome o squadra…';input.setAttribute('aria-label','Filtra i risultati');
  input.addEventListener('input',()=>{
   const query=input.value.trim().toLocaleLowerCase('it');
   for(const tr of tbody.rows)tr.hidden=query!==''&&!tr.textContent.toLocaleLowerCase('it').includes(query);
  });
  filterWrap.append(input);root.append(filterWrap);
 }
 root.append(scroll);return scroll;
}
function button(text,onClick,kind=''){
 const b=element('button','ranking-button'+(kind?' ranking-button-'+kind:''),text);
 b.type='button';b.addEventListener('click',onClick);return b;
}
function overview(root,m){
 metrics(root,[
  ['PARTECIPANTI',format(m.persons.length),'Personaggi censiti'],
  ['SQUADRE',format(m.teams.length),'Terza parte della prova'],
  ['PRIMI EX AEQUO',format(m.teams.filter(t=>t.rank===1).length),'Squadre vincitrici a pari merito'],
  ['PUNTI ASSEGNATI',format(m.totalAwards),'Nelle tre parti della prova']
 ]);
 const columns=element('div','ranking-overview-layout');
 const first=panel(columns,'Classifica generale · Top 10','I totali comprendono lo storico disponibile e i premi della terza prova.');
 table(first,['POS.','PERSONAGGIO','TERZA PROVA','TOTALE'],m.general.slice(0,10).map(p=>[rankCell(p.rank),boldCell(p.name),format(p.earned),boldCell(format(p.total))]));
 first.append(button('Apri la classifica generale →',()=>location.hash='#/classifica/generale','link'));
 const second=panel(columns,'Cinque squadre al primo posto','Premio di 1.000 punti assegnato a ciascuna formazione.');
 for(const t of m.teams.filter(t=>t.rank===1)){
  const row=element('div','ranking-winner');
  const title=element('div','ranking-winner-title');
  append(title,element('span','ranking-winner-icon','✦'),element('strong','',t.display));
  append(row,title,element('p','',t.names.join(' · ')),element('span','ranking-winner-points',format(t.prize)+' punti'));
  second.append(row);
 }
 columns.append(second);root.append(columns);
 note(root,'La classifica generale non attribuisce punti storici presunti: '+m.unknown.length+' partecipanti restano senza un totale verificabile.');
}
function trials(root,m){
 metrics(root,[['PREMIO PRIMO POSTO','1.000','Per ciascuna squadra vincitrice'],['PRIMI EX AEQUO','5','Formazioni in prima posizione'],['PREMI DELLA PROVA',format(m.totalAwards),'Somma delle tre parti']]);
 const phaseGrid=element('div','ranking-phase-grid');
 for(const phase of m.phases.filter(p=>p.type==='individual')){
  const card=panel(phaseGrid,phase.title,'Bonus individuali');
  const records=phase.awards.map(a=>[boldCell(m.people.get(a.personId)?.name||a.personId),'+'+format(a.points)]);
  table(card,['PARTECIPANTE','BONUS'],records);
 }
 root.append(phaseGrid);
 const teams=panel(root,'Terza parte · Classifica delle squadre','Quattordici formazioni, con i premi divisi equamente fra i componenti.');
 table(teams,['POS.','SQUADRA','COMPONENTI','PREMIO','A TESTA'],m.teams.map(t=>[rankCell(t.rank),boldCell(t.display),namesCell(t.names),format(t.prize),boldCell(format(t.share))]),{search:true});
 const individuals=panel(root,'Graduatoria individuale · Terza prova','Bonus delle prime due parti più quota di squadra dell’ultima parte.');
 const bonuses=new Map();
 for(const phase of m.phases.filter(p=>p.type==='individual'))for(const a of phase.awards)bonuses.set(a.personId,(bonuses.get(a.personId)||0)+a.points);
 table(individuals,['POS.','PERSONAGGIO','BONUS','QUOTA SQUADRA','TOTALE'],m.latest.map(p=>{
  const bonus=bonuses.get(p.id)||0;
  return [rankCell(p.rank),boldCell(p.name),bonus?'+'+format(bonus):'—',format(p.earned-bonus),boldCell(format(p.earned))];
 }),{search:true});
}
function general(root,m){
 metrics(root,[['CLASSIFICATI',format(m.general.length),'Totale storico disponibile'],['DA VERIFICARE',format(m.unknown.length),'Storico non completo'],['PRIMA POSIZIONE',m.general[0]?.name||'—',format(m.general[0]?.total||0)+' punti']]);
 const main=panel(root,'Classifica generale','Solo personaggi con totale storico accertato o saldo iniziale zero confermato.');
 table(main,['POS.','PERSONAGGIO','STORICO','TERZA PROVA','TOTALE'],m.general.map(p=>[rankCell(p.rank),boldCell(p.name),format(p.baseline),'+'+format(p.earned),boldCell(format(p.total))]),{search:true});
 const pending=panel(root,'Partecipanti con storico da verificare ('+m.unknown.length+')','Sono indicati i punti dell’ultima prova, ma non viene inventata una posizione generale.');
 table(pending,['PARTECIPANTE','PUNTI TERZA PROVA','STATO'],[...m.unknown].sort((a,b)=>a.name.localeCompare(b.name,'it')).map(p=>[boldCell(p.name),'+'+format(p.earned),'Storico incompleto']),{search:true});
}
function evolution(root,m){
 note(root,'Il confronto usa la classifica rettificata del 4 giugno 2025 come punto di partenza. La terza prova non ha una data verificata.');
 const view=panel(root,'I primi cinque · Prima e dopo','Confronto fra il punteggio storico e il totale dopo l’ultima prova.');
 const max=Math.max(...m.general.slice(0,5).map(p=>p.total));
 for(const p of m.general.slice(0,5)){
  const row=element('div','ranking-chart-row');
  const head=element('div','ranking-chart-label');
  append(head,element('strong','',p.name),element('span','',format(p.baseline)+' → '+format(p.total)));
  const bars=element('div','ranking-chart-bars');
  for(const [label,value,kind] of [['Storico',p.baseline,'baseline'],['Attuale',p.total,'current']]){
   const line=element('div','ranking-chart-track');
   line.setAttribute('aria-label',label+': '+format(value)+' punti');
   const fill=element('span','ranking-chart-fill ranking-chart-fill-'+kind);
   fill.style.width=(Math.max(0,value)/max*100)+'%';
   line.append(fill);bars.append(line);
  }
  append(row,head,bars);view.append(row);
 }
 const legend=element('div','ranking-chart-legend');
 append(legend,element('span','ranking-legend-before','■ Storico'),element('span','ranking-legend-after','■ Dopo la prova'));
 view.append(legend);
 const moves=panel(root,'Variazioni in classifica','Movimenti rispetto al piazzamento nello storico conosciuto.');
 table(moves,['PERSONAGGIO','PRIMA','ORA','PUNTI GUADAGNATI'],m.general.slice(0,10).map(p=>{
  const prior=m.previousRanks.get(p.id);
  return [boldCell(p.name),prior?prior+'°':'—',p.rank+'°','+'+format(p.earned)];
 }));
}
function teams(root,m){
 heading(root,'Le quattordici formazioni','Componenti e premi della terza parte della prova.');
 const grid=element('div','ranking-team-grid');
 for(const t of m.teams){
  const card=element('article','ranking-team-card'+(t.rank===1?' ranking-team-card-winner':''));
  const head=element('div','ranking-team-head');
  append(head,rankCell(t.rank).rank===1?element('span','ranking-place ranking-place-1','1°'):element('span','ranking-place ranking-place-'+(t.rank<=3?t.rank:'rest'),t.rank+'°'),element('h3','',t.display),element('strong','ranking-team-prize',format(t.prize)+' pt'));
  const members=element('div','ranking-chips');
  for(const name of t.names)members.append(element('span','ranking-chip',name));
  append(card,head,members,element('p','ranking-team-foot','Quota individuale: '+format(t.share)+' punti · '+t.members.length+' component'+(t.members.length===1?'e':'i')));
  grid.append(card);
 }
 root.append(grid);
}
function historic(root,m){
 const snapshot=m.raw.baseSnapshot;
 const date=String(snapshot.date||'');
 const pretty=date==='2025-06-04'?'4 giugno 2025':date||'Data non disponibile';
 const base=panel(root,snapshot.label+' · '+pretty,snapshot.note);
 table(base,['POS.','PERSONAGGIO','PUNTEGGIO STORICO'],m.earlier.filter(p=>p.baseline>0).slice(0,10).map(p=>[rankCell(p.rank),boldCell(p.name),boldCell(format(p.baseline))]));
 for(const event of [...m.raw.archive].reverse()){
  const d=event.date==='2025-03-15'?'15 marzo 2025':event.date==='2025-04-24'?'24 aprile 2025':event.date||'Data sconosciuta';
  const card=panel(root,event.title+' · '+d,event.note);
  table(card,['POS.','PARTECIPANTI','PREMIO'],event.entries.map(e=>[rankCell(e.rank),e.participants,format(e.prize)]));
  if(event.extras)note(card,event.extras);
 }
 note(root,'I premi delle prove storiche risultano già compresi nei totali base quando disponibili; non vengono sommati due volte.');
}
function csvValue(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
function csv(rows){return '\uFEFF'+rows.map(row=>row.map(csvValue).join(';')).join('\r\n')+'\r\n';}
function download(name,content,type){
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob);
 const link=element('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportPage(root,m){
 const area=panel(root,'Esportazioni e backup','I dati del torneo si possono scaricare. Questa è una vista consultabile: modifiche e sincronizzazione online non sono attive.');
 const actions=element('div','ranking-export-actions');
 actions.append(button('↓ Backup completo JSON',()=>download('jojo-board-backup.json',JSON.stringify(m.raw,null,2),'application/json;charset=utf-8'),'primary'));
 actions.append(button('↓ Classifica generale CSV',()=>download('classifica-generale.csv',csv([['Posizione','Personaggio','Punteggio precedente','Punti terza prova','Totale'],...m.general.map(p=>[p.rank,p.name,p.baseline,p.earned,p.total])]),'text/csv;charset=utf-8')));
 actions.append(button('↓ Squadre della terza prova CSV',()=>download('classifica-squadre.csv',csv([['Posizione','Squadra','Partecipanti','Premio squadra','Punti per componente'],...m.teams.map(t=>[t.rank,t.display,t.names.join(', '),t.prize,t.share])]),'text/csv;charset=utf-8')));
 actions.append(button('↓ Registro punti CSV',()=>download('registro-punti.csv',csv([['Parte','Posizione','Squadra','Partecipante','Punti'],...m.phases.flatMap((phase,i)=>[
  ...(phase.awards||[]).map(a=>[i+1,'','',m.people.get(a.personId)?.name||a.personId,a.points]),
  ...(phase.teams||[]).flatMap(t=>t.members.map(id=>[i+1,t.rank,t.label||'Formazione '+t.rank+'° posto',m.people.get(id)?.name||id,t.prize/t.members.length]))
 ])]),'text/csv;charset=utf-8')));
 area.append(actions);
 const notes=panel(root,'Criteri della classifica','Informazioni presenti nel backup originale.');
 const ul=element('ul','ranking-notes');
 for(const item of m.raw.notes||[])ul.append(element('li','',item));
 notes.append(ul);
}
function draw(root,m,selected){
 root.replaceChildren();
 const menu=element('nav','ranking-tabs');menu.setAttribute('aria-label','Sezioni della classifica');
 for(const [id,label] of TABS){
  const b=element('button','ranking-tab'+(id===selected?' active':''),label);
  b.type='button';
  b.setAttribute('aria-current',id===selected?'page':'false');
  b.addEventListener('click',()=>{location.hash='#/classifica/'+id});
  menu.append(b);
 }
 root.append(menu);
 const body=element('div','ranking-content');
 root.append(body);
 if(selected==='panoramica')overview(body,m);
 else if(selected==='terza-prova')trials(body,m);
 else if(selected==='generale')general(body,m);
 else if(selected==='evoluzione')evolution(body,m);
 else if(selected==='squadre')teams(body,m);
 else if(selected==='storico')historic(body,m);
 else if(selected==='esporta')exportPage(body,m);
}
async function render(root,tab){
 if(!root)return;
 if(!model){
  root.replaceChildren(element('p','ranking-loading','Caricamento della classifica…'));
  try{
   if(!promise)promise=fetch('data/ranking.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Dati classifica non disponibili');return r.json()}).then(d=>classify(d));
   model=await promise;
  }catch(e){
   promise=null;root.replaceChildren(element('p','ranking-note ranking-note-error','Impossibile caricare la classifica: '+e.message));return;
  }
 }
 const selected=TABS.some(x=>x[0]===tab)?tab:'panoramica';
 draw(root,model,selected);
}
window.JoJoRanking={render};
})();
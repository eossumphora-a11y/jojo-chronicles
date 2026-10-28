/* La Tavola Stregata: portable JSON backups, confirmed full restore, manual sync. */
(() => {
  'use strict';
  const FORMAT='la-tavola-stregata';
  const VERSION=1;
  const MAX_FILE=20*1024*1024;
  const tiers=new Set(['S','A','B','C','D','unranked']);
  const nav=document.querySelector('.nav-tabs');
  if(!nav)return;
  const bar=document.createElement('section');
  bar.className='backup-toolbar';
  bar.setAttribute('aria-label','Backup e sincronizzazione del menù');
  bar.innerHTML='<div class="backup-toolbar-copy"><strong>Archivio della tavola</strong><small>Conserva una copia JSON oppure ripristina le scelte del gruppo.</small></div><div class="backup-toolbar-buttons"><button class="btn btn-ghost" type="button" id="backup-json">↓ Backup JSON</button><button class="btn btn-ghost" type="button" id="import-json">↑ Ripristina JSON</button><button class="btn btn-ghost" type="button" id="sync-json">⟳ Sincronizza</button></div><input type="file" id="backup-json-file" accept=".json,application/json" hidden>';
  nav.after(bar);
  const download=bar.querySelector('#backup-json');
  const upload=bar.querySelector('#import-json');
  const sync=bar.querySelector('#sync-json');
  const picker=bar.querySelector('#backup-json-file');
  let busy=false;
  const setBusy=value=>{
    busy=value;
    [download,upload,sync].forEach(b=>b.disabled=value);
    bar.setAttribute('aria-busy',String(value));
  };
  const fail=e=>toast(e?.message || 'Operazione non riuscita',true);
  const snapshot=()=>structuredClone(board);
  const roomHint=()=>cloudMode ? (new URLSearchParams(location.hash.slice(1)).get('room')||'').slice(0,10) : null;
  function validate(value){
    if(!value || typeof value!=='object' || !Array.isArray(value.recipes) || !Array.isArray(value.people)) throw Error('Il file JSON non contiene una tavola valida');
    if(value.recipes.length>300 || value.people.length>100)throw Error('Backup troppo grande: massimo 300 ricette e 100 persone');
    const personIds=new Set(),recipeIds=new Set();
    const ident=x=>typeof x==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(x);
    const bounded=(x,n)=>typeof x==='string' && x.length<=n;
    const people=value.people.map(p=>{
      if(!p || !ident(p.id) || personIds.has(p.id) || !bounded(p.name,100) || !p.name.trim())throw Error('Persona con dati non validi nel backup');
      personIds.add(p.id);return {id:p.id,name:p.name};
    });
    const recipes=value.recipes.map(r=>{
      if(!r||!ident(r.id)||recipeIds.has(r.id)||!bounded(r.title,160)||!r.title.trim()||!bounded(r.note??'',4000)||!tiers.has(r.tier))throw Error('Ricetta o fascia non valida nel backup');
      if(![r.order,r.assignmentOrder].every(n=>n==null || (Number.isFinite(n)&&n>=0&&n<1000000)))throw Error('Ordine delle ricette non valido');
      if(r.selected!==undefined&&typeof r.selected!=='boolean')throw Error('Selezione non valida');
      if(r.assignedTo!=null && (!ident(r.assignedTo)||!personIds.has(r.assignedTo)))throw Error('Assegnazione a una persona inesistente');
      if(r.assignedTo && !r.selected)throw Error('Una ricetta non scelta non può avere un responsabile');
      if(r.image!=null && (typeof r.image!=='string' || !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(r.image) || r.image.length>6500000))throw Error('Immagine non valida o troppo grande');
      recipeIds.add(r.id);
      return {id:r.id,title:r.title,note:r.note||'',image:r.image||null,tier:r.tier,order:r.order||0,selected:!!r.selected,assignedTo:r.assignedTo||null,assignmentOrder:r.assignmentOrder||0,createdAt:bounded(r.createdAt,100)?r.createdAt:null};
    });
    return {revision:Number.isFinite(value.revision)?Math.max(0,value.revision):0,recipes,people};
  }
  download.addEventListener('click',()=>{
    if(busy)return;
    try{
      const data={format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),roomHint:roomHint(),board:snapshot()};
      const bytes=JSON.stringify(data,null,2);
      const file=new Blob([bytes],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(file);
      const a=document.createElement('a');
      a.href=url;a.download='La_Tavola_Stregata_backup_'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast('Backup JSON scaricato (include anche le fotografie)');
    }catch(e){fail(e);}
  });
  upload.addEventListener('click',()=>{if(!busy){picker.value='';picker.click();}});
  picker.addEventListener('change',async()=>{
    if(busy || !picker.files?.[0])return;
    setBusy(true);
    try{
      const file=picker.files[0];
      if(file.size>MAX_FILE)throw Error('File JSON troppo grande (massimo 20 MB)');
      let doc;
      try{doc=JSON.parse(await file.text());}catch{throw Error('Il file selezionato non è un JSON valido');}
      if(!doc||typeof doc!=='object'||doc.format!==FORMAT||doc.version!==VERSION)throw Error('Formato backup non riconosciuto: usa un JSON esportato da La Tavola Stregata');
      const imported=validate(doc.board);
      const totalChosen=imported.recipes.filter(r=>r.selected).length;
      const differentRoom=cloudMode&&doc.roomHint&&doc.roomHint!==roomHint();
      const warning=differentRoom?'\nATTENZIONE: il backup proviene da un’altra stanza.\n':'';
      const message='Ripristinare '+imported.recipes.length+' ricette, '+totalChosen+' selezionate e '+imported.people.length+' persone?\n\n'+warning+'Questa operazione SOSTITUISCE completamente le ricette, le valutazioni e le assegnazioni attuali'+(cloudMode?' per TUTTI gli amici nella stanza':'')+'.\n\nScarica prima un backup se vuoi conservare lo stato attuale.';
      if(!window.confirm(message))return;
      let restored;
      if(cloudMode){
        if(!window.HALLOWEEN_CLOUD.status())throw Error('Sei offline: il ripristino condiviso richiede una connessione attiva');
        restored=await window.HALLOWEEN_CLOUD.replaceAll(imported);
      }else if(previewOnly){
        restored={...imported,revision:Math.max(Date.now(),board.revision+1)};
        localStorage.setItem('halloween-preview-board',JSON.stringify(restored));
        localStorage.setItem('halloween-preview-import-2026-v1','ok');
      }else throw Error('Ripristino non disponibile senza server');
      board=structuredClone(restored);hasLoaded=true;render();
      toast('Backup ripristinato: '+restored.recipes.length+' ricette');
    }catch(e){fail(e);}finally{picker.value='';setBusy(false);}
  });
  sync.addEventListener('click',async()=>{
    if(busy)return;
    setBusy(true);
    try{
      if(!cloudMode)throw Error('La sincronizzazione manuale è disponibile nella stanza condivisa online');
      const latest=await window.HALLOWEEN_CLOUD.syncNow();
      if(latest?.revision>board.revision){board=structuredClone(latest);hasLoaded=true;render();}
      toast('Sincronizzazione completata con la stanza');
    }catch(e){fail(e);}finally{setBusy(false);}
  });
})();
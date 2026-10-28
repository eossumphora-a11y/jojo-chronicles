/* La Tavola Stregata — JSON backup/restore and responsive tier board.
   Restore is explicit and shared. No automatic overwrite of another session. */
(() => {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
  .backup-btn{display:inline-flex;gap:7px;align-items:center;justify-content:center;border-color:#a87865!important;color:#f8dac2!important;white-space:nowrap}
  .backup-btn .backup-icon{font-size:16px;line-height:1}
  .backup-dialog{border:1px solid #9d6e72;border-radius:15px;background:#211a27;color:#f4e2dc;box-shadow:0 25px 90px #000b;width:min(460px,calc(100vw - 28px));max-height:calc(100dvh - 30px);overflow:auto;padding:22px 22px 20px;box-sizing:border-box}
  .backup-dialog::backdrop{background:#08050acc;backdrop-filter:blur(4px)}
  .backup-dialog h2{margin:0 0 8px;font-size:22px;font-family:var(--font-head,serif);color:#f7d0ad}
  .backup-dialog p{font-size:13px;line-height:1.65;color:#d9c4ca;margin:0 0 18px}
  .backup-actions{display:grid;gap:10px}
  .backup-actions button{width:100%;padding:13px 14px;min-height:46px;font-weight:750;text-align:left;cursor:pointer;border-radius:8px;background:#3d2a3d;border:1px solid #7e5668;color:#fff0e6}
  .backup-actions button:focus-visible{outline:3px solid #e9b078;outline-offset:2px}
  .backup-actions button:hover{background:#54344a}
  .backup-actions button:disabled{cursor:progress;opacity:.65}
  .backup-actions small{display:block;margin-top:3px;font-size:11px;font-weight:400;color:#ceb9c2}
  .backup-note{background:#2e2431;border:1px solid #574152;border-radius:7px;padding:10px 12px;margin-top:13px!important;font-size:12px!important}
  .backup-foot{display:flex;justify-content:flex-end;margin-top:14px}
  .backup-foot button{border:1px solid #76596b;background:transparent;color:#e6d4d7;border-radius:6px;padding:8px 13px;min-height:36px}
  .backup-input{display:none}
  @media(max-width:740px){
    .topbar{flex-wrap:wrap;gap:8px}
    .top-actions{gap:6px;margin-left:auto}
    .backup-btn{padding:8px 10px!important;min-width:65px;min-height:37px}
    .backup-btn .backup-title{font-size:11px}
    .tier-board{border:0;background:transparent;overflow:visible;display:grid;gap:13px}
    .tier-row{display:flex;flex-direction:column;grid-template-columns:none;min-height:0;min-width:0;border:1px solid #564055;border-radius:13px;overflow:visible;background:#251c2a}
    .tier-row:last-child{border-bottom:1px solid #564055}
    .tier-label{width:100%;min-width:0;min-height:48px;padding:9px 13px;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;box-sizing:border-box;border-radius:12px 12px 0 0}
    .tier-letter{font-size:29px;line-height:1;min-width:29px;flex:none}
    .tier-label small{font-size:12px;letter-spacing:.02em;line-height:1.25;text-align:left;font-weight:800}
    .tier-cards{width:100%;min-width:0;box-sizing:border-box;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,122px),1fr));gap:10px;padding:11px;align-items:stretch}
    .tier-card{width:100%;min-width:0;box-sizing:border-box;overflow:visible;border-radius:9px;display:flex;flex-direction:column;min-height:0}
    .tier-card .thumb{height:clamp(94px,30vw,142px);flex:none;border-radius:8px 8px 0 0;overflow:hidden}
    .tier-card .thumb img{width:100%;height:100%;object-fit:cover}
    .tier-card .tier-info{display:flex;flex-direction:column;flex:1;gap:8px;padding:9px}
    .tier-card .name{font-size:12px;line-height:1.4;min-height:33px;max-height:none}
    .tier-card .tier-actions{display:flex;align-items:center;gap:5px;margin-top:auto;justify-content:space-between}
    .tier-card .tier-picker-trigger{flex:1 1 auto;min-width:0!important;max-width:none!important;width:auto!important;min-height:37px;box-sizing:border-box;font-size:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:6px 8px}
    .tier-card .pick{min-width:32px;min-height:37px;display:grid;place-items:center;font-size:22px;padding:0}
    .tier-card .thumb .drag-handle{width:34px;height:34px;min-height:34px;min-width:34px;right:7px;top:7px}
    .tier-hint{grid-column:1/-1;font-size:12px;text-align:center;padding:18px 7px}
    .tier-helper{font-size:12px;line-height:1.55;padding:12px}
  }
  @media(min-width:741px){
    .tier-card{width:clamp(130px,12vw,158px)}
    .tier-card .thumb{height:104px}
    .tier-card .name{font-size:12px}
  }
  @media(max-width:335px){
    .tier-cards{gap:7px;padding:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,116px),1fr))}
    .tier-card .tier-info{padding:7px}
    .tier-label{padding:8px 11px}
    .backup-dialog{padding:16px}
  }
  `;
  document.head.appendChild(css);

  const topActions=document.querySelector('.top-actions');
  const share=document.querySelector('#share');
  if (!topActions || !share) return;
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='btn btn-ghost backup-btn';trigger.id='backup-sync-open';
  trigger.innerHTML='<span class="backup-icon" aria-hidden="true">⇩</span><span class="backup-title">Backup JSON</span>';
  trigger.setAttribute('aria-label','Backup e sincronizzazione JSON');
  topActions.insertBefore(trigger,share);

  const dialog=document.createElement('dialog');
  dialog.id='backup-sync-dialog';dialog.className='backup-dialog';
  dialog.innerHTML=`
    <h2>Backup e sincronizzazione JSON</h2>
    <p>Salva una copia completa della tavola, con ricette, foto, voti, persone e assegnazioni. Puoi ripristinarla anche da un altro dispositivo.</p>
    <div class="backup-actions">
      <button id="backup-download" type="button">↓ Scarica backup JSON<small>Salva le scelte attuali in un file sul dispositivo</small></button>
      <button id="backup-restore" type="button">↻ Ripristina e sincronizza JSON<small>Sostituisce la tavola condivisa per tutti i partecipanti</small></button>
    </div>
    <input class="backup-input" type="file" id="backup-file" accept=".json,application/json">
    <p class="backup-note" id="backup-info" role="status">Il ripristino richiede una connessione attiva alla stanza. I dati già esistenti verranno sostituiti solo dopo conferma.</p>
    <div class="backup-foot"><button id="backup-close" type="button">Chiudi</button></div>`;
  document.body.appendChild(dialog);
  const fileInput=dialog.querySelector('#backup-file');
  const downloadBtn=dialog.querySelector('#backup-download');
  const restoreBtn=dialog.querySelector('#backup-restore');
  const info=dialog.querySelector('#backup-info');
  const closeBtn=dialog.querySelector('#backup-close');
  trigger.addEventListener('click',()=>dialog.showModal());
  closeBtn.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});

  const clone = value => structuredClone(value);
  function requireLoaded(){
    if(typeof hasLoaded==='undefined' || !hasLoaded)throw Error('Attendi il caricamento del menù.');
    if(typeof board==='undefined' || !Array.isArray(board?.recipes) || !Array.isArray(board?.people))throw Error('Menù non disponibile.');
  }
  const plain=s=>typeof s==='string' ? s : '';
  function parseBackup(input){
    if(!input || typeof input!=='object' || Array.isArray(input))throw Error('Il file non contiene un backup valido.');
    if(input.app !== 'la-tavola-stregata' || input.version!==1)throw Error('Formato del backup non riconosciuto.');
    const src=input.board;
    if(!src || !Array.isArray(src.recipes)||!Array.isArray(src.people))throw Error('Ricette e persone mancanti dal backup.');
    if(src.recipes.length>400 || src.people.length>150)throw Error('Backup troppo grande.');
    const ids=new Set(),personIds=new Set();
    const people=src.people.map(p=>{
      if(!p || typeof p.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(p.id)||personIds.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>160)throw Error('Dati di una persona non validi.');
      personIds.add(p.id);return {id:p.id,name:p.name.trim()};
    });
    const validTiers=new Set(['S','A','B','C','D','unranked']);
    const recipes=src.recipes.map(r=>{
      if(!r||typeof r.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(r.id)||ids.has(r.id))throw Error('ID ricetta duplicato o non valido.');
      if(typeof r.title!=='string'||!r.title.trim()||r.title.length>180)throw Error('Nome di una ricetta non valido.');
      if(!validTiers.has(r.tier))throw Error('Tier non valida nel file.');
      if(r.note!=null&&(typeof r.note!=='string'||r.note.length>10000))throw Error('Note non valide.');
      if(r.image!=null&&(typeof r.image!=='string'||r.image.length>9000000||!(r.image.startsWith('data:image/jpeg;base64,')||r.image.startsWith('data:image/png;base64,')||r.image.startsWith('data:image/webp;base64,')||/^[a-zA-Z0-9_.-]{1,200}$/.test(r.image))))throw Error('Immagine non valida nel backup.');
      if(r.assignedTo!=null && !personIds.has(r.assignedTo))throw Error('Assegnazione a una persona inesistente.');
      const selected=r.selected===true;
      const order=Number.isFinite(r.order)?Math.max(0,r.order):0;
      const assignmentOrder=Number.isFinite(r.assignmentOrder)?Math.max(0,r.assignmentOrder):0;
      ids.add(r.id);
      return {id:r.id,title:r.title.trim(),note:plain(r.note),image:r.image||null,tier:r.tier,order,selected,assignedTo:selected?(r.assignedTo||null):null,assignmentOrder};
    });
    return {revision:0,recipes,people};
  }
  const displayError = err => {const msg=err?.message||'Operazione non riuscita';info.textContent=msg;if(typeof toast==='function')toast(msg,true);};
  downloadBtn.addEventListener('click',()=>{
    try{
      requireLoaded();
      const payload={app:'la-tavola-stregata',version:1,exportedAt:new Date().toISOString(),board:clone(board)};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='la-tavola-stregata-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      info.textContent=`Backup creato: ${board.recipes.length} ricette, ${board.people.length} persone e relative fotografie.`;
      if(typeof toast==='function')toast('Backup JSON scaricato');
    }catch(err){displayError(err);}
  });
  restoreBtn.addEventListener('click',()=>{try{requireLoaded();fileInput.value='';fileInput.click();}catch(err){displayError(err);}});
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];if(!file)return;
    restoreBtn.disabled=true;
    try{
      if(file.size>25*1024*1024)throw Error('File JSON troppo grande (massimo 25 MB).');
      let input;
      try{input=JSON.parse(await file.text());}catch{throw Error('Il file selezionato non è un JSON valido.');}
      const updated=parseBackup(input);
      const question=`Ripristinare ${updated.recipes.length} ricette e ${updated.people.length} persone?\n\nATTENZIONE: tutte le ricette, i voti e le assegnazioni attuali della stanza saranno sostituiti anche per i tuoi amici.\n\nVuoi continuare?`;
      if(!window.confirm(question)){info.textContent='Ripristino annullato: nessun dato modificato.';return;}
      if(typeof cloudMode!=='undefined' && cloudMode){
        if(!window.HALLOWEEN_CLOUD?.status())throw Error('Connessione assente: nessun dato modificato.');
        const result=await window.HALLOWEEN_CLOUD.apply({type:'board.restore'},()=>{
          board=clone(updated);render();return board;
        });
        board=result;
        hasLoaded=true;render();
      }else if(typeof previewOnly!=='undefined' && previewOnly){
        board=clone(updated);board.revision=Date.now()*1000;
        localStorage.setItem('halloween-preview-board',JSON.stringify(board));
        hasLoaded=true;render();
      }else{
        throw Error('Il ripristino JSON richiede la stanza condivisa o la modalità anteprima.');
      }
      info.textContent='Ripristino completato e inoltrato alla stanza condivisa.';
      if(typeof toast==='function')toast('JSON ripristinato e sincronizzato');
      dialog.close();
    }catch(err){
      if(typeof cloudMode!=='undefined' && cloudMode){
        try{board=await window.HALLOWEEN_CLOUD.getBoard();hasLoaded=true;render();}catch{}
      }
      displayError(err);
    }finally{restoreBtn.disabled=false;fileInput.value='';}
  });
})();
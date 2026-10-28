/* Halloween: drag and drop funzionante con mouse, touch e penna. */
(() => {
  'use strict';
  let active=null, scrollFrame=0;
  const styles=document.createElement('style');
  styles.textContent=[
    '.tier-card,.mini-recipe{touch-action:none;-webkit-user-select:none;user-select:none;cursor:grab}',
    '.tier-card .thumb img,.mini-recipe-image img{-webkit-user-drag:none;pointer-events:none}',
    '.tier-card .drag-handle,.mini-recipe .drag-handle{min-width:34px;min-height:34px;touch-action:none;display:grid;place-items:center;font-size:17px}',
    '.tier-row.over,.person-card.over,.unassigned-zone.over{outline:3px solid #f6b572;outline-offset:-3px}',
    '.dragging-source{opacity:.34}',
    '.drag-ghost{pointer-events:none!important;z-index:2000!important;transition:none!important}'
  ].join('\n');
  document.head.appendChild(styles);
  const interactive='button,select,input,textarea,a,[contenteditable="true"]';
  const targetAt=()=>getDropAt(active.x,active.y,active.kind,active.id);
  function cancelScroll(){if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0;}}
  function paint(){
    if(!active || !active.moved)return;
    const ghost=active.ghost;
    if(ghost){ghost.style.left=Math.max(-10,active.x-ghost.offsetWidth/2)+'px';ghost.style.top=(active.y-34)+'px';}
    showDrop(targetAt()?.zone||null);
  }
  function autoScroll(){
    scrollFrame=0;
    if(!active || !active.moved)return;
    const h=window.innerHeight,edge=Math.min(110,Math.round(h*.17)),y=active.y;
    let dy=0;
    if(y<edge)dy=-Math.round(5+19*(1-Math.max(0,y)/edge));
    else if(y>h-edge)dy=Math.round(5+19*(1-Math.max(0,h-y)/edge));
    if(!dy)return;
    const oldY=window.scrollY;
    window.scrollBy(0,dy);
    paint();
    if(window.scrollY!==oldY)scrollFrame=requestAnimationFrame(autoScroll);
  }
  function scheduleScroll(){cancelScroll();if(active?.moved)scrollFrame=requestAnimationFrame(autoScroll);}
  function cleanup(){
    cancelScroll();
    if(!active)return;
    const s=active;
    active=null;
    try{if(s.tile.hasPointerCapture?.(s.pointerId))s.tile.releasePointerCapture(s.pointerId);}catch{}
    s.ghost?.remove();
    s.tile?.classList.remove('dragging-source');
    document.body.classList.remove('dragging-active');
    clearDrop();
  }
  document.addEventListener('dragstart',e=>{
    if(e.target.closest?.('[data-drag-kind]')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('pointerdown',e=>{
    if(active || e.button!==0 || !e.isPrimary || !e.target.closest)return;
    const tile=e.target.closest('[data-drag-kind]');
    if(!tile || (e.target.closest(interactive) && !e.target.closest('.drag-handle')))return;
    e.preventDefault();
    e.stopImmediatePropagation();
    active={pointerId:e.pointerId,kind:tile.dataset.dragKind,id:tile.dataset.id,tile,
      startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,ghost:null};
    try{tile.setPointerCapture(e.pointerId);}catch{}
  },true);
  document.addEventListener('pointermove',e=>{
    if(!active || e.pointerId!==active.pointerId)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    active.x=e.clientX;active.y=e.clientY;
    if(!active.moved && Math.hypot(active.x-active.startX,active.y-active.startY)<5)return;
    if(!active.moved){
      active.moved=true;
      const rect=active.tile.getBoundingClientRect();
      const ghost=active.tile.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.classList.remove('dragging-source');
      ghost.removeAttribute('draggable');
      ghost.setAttribute('aria-hidden','true');
      ghost.style.width=Math.min(rect.width,170)+'px';
      ghost.style.position='fixed';
      document.body.appendChild(ghost);
      active.ghost=ghost;
      active.tile.classList.add('dragging-source');
      document.body.classList.add('dragging-active');
    }
    paint();
    scheduleScroll();
  },{capture:true,passive:false});
  function finish(e){
    if(!active || e.pointerId!==active.pointerId)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    active.x=e.clientX;active.y=e.clientY;
    const s=active;
    const target=(e.type==='pointerup'&&s.moved)?targetAt():null;
    cleanup();
    if(target)performDrop(s.kind,s.id,target);
  }
  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);
  window.addEventListener('blur',cleanup);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cleanup();});
})();
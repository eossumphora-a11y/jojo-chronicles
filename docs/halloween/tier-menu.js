/* Menù di valutazione sempre visibile: montato direttamente nel body.
   Evita il taglio delle opzioni da parte di .tier-card e .tier-board (overflow:hidden).
   Mantiene il <select> originale come sorgente di verità e invia il suo evento change. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .tier-card select[data-tier-select][data-picker-enhanced="true"] {display:none!important}
    .tier-picker-trigger {
      width: 62px; max-width: 62px; min-height: 29px;
      display: flex; align-items: center; justify-content: space-between; gap: 2px;
      padding: 4px 5px; background: #302439; color: #ffe9da;
      border: 1px solid #9e7792; border-radius: 5px; cursor: pointer;
      font-size: 11px; font-weight: 800; line-height: 1.2;
      touch-action: manipulation; position: relative; z-index: 2;
    }
    .tier-picker-trigger::after {content: '▾'; color: #f4b57a; font-size: 11px}
    .tier-picker-trigger[aria-expanded="true"] {border-color: #f8b777; box-shadow: 0 0 0 2px #f8b77744}
    .tier-picker-menu {
      position: fixed !important; z-index: 2147483640 !important;
      box-sizing: border-box; width: 204px; max-width: calc(100vw - 16px);
      overflow-y: auto; overscroll-behavior: contain;
      border: 1px solid #b38b92; border-radius: 9px;
      background: #241825; color: #fff0e4; box-shadow: 0 18px 56px #000c;
      padding: 6px; isolation: isolate;
      -webkit-overflow-scrolling: touch;
    }
    .tier-picker-title {font-size: 11px; color: #debfa8; padding: 6px 9px 8px; font-weight: 700}
    .tier-picker-option {
      display: block; width: 100%; padding: 10px 9px; min-height: 39px; text-align: left;
      font-size: 12px; line-height: 1.25; font-weight: 650;
      background: transparent; border: 0; color: #f5e7eb; border-radius: 6px; cursor: pointer;
      touch-action: manipulation;
    }
    .tier-picker-option:hover,.tier-picker-option:focus-visible {background: #55364a;outline: 2px solid #eab482;outline-offset: -2px}
    .tier-picker-option[aria-checked="true"] {background: #674153;color: #fff3ce}
    .tier-picker-option[aria-checked="true"]::after {content: ' ✓'; color: #ffd08a}
    @media(max-width:600px){.tier-card .tier-picker-trigger{width:52px;max-width:52px;padding:5px 4px}}
  `;
  document.head.appendChild(style);

  let popup = null;
  let activeTrigger = null;
  const SELECTOR = 'select[data-tier-select]';
  const triggerSelector = '.tier-picker-trigger';

  const close = (restoreFocus = false) => {
    if (!popup) return;
    popup.remove(); popup = null;
    if (activeTrigger) {
      const trigger = activeTrigger;
      activeTrigger = null;
      trigger.setAttribute('aria-expanded','false');
      if (restoreFocus && trigger.isConnected) trigger.focus({preventScroll:true});
    }
  };
  const position = () => {
    if (!popup || !activeTrigger || !activeTrigger.isConnected) {close();return;}
    const rect = activeTrigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(204, window.innerWidth - margin * 2);
    popup.style.width = width + 'px';
    // The menu lives outside every cropped card and row; it overlays images.
    const height = Math.min(popup.scrollHeight, window.innerHeight - margin * 2, 296);
    const belowSpace = window.innerHeight - rect.bottom - margin;
    const aboveSpace = rect.top - margin;
    const above = belowSpace < Math.min(height,210) && aboveSpace > belowSpace;
    const available = Math.max(56, above ? aboveSpace - 5 : belowSpace - 5);
    popup.style.maxHeight = Math.max(56, Math.min(height, available)) + 'px';
    const actualHeight = Math.min(popup.scrollHeight, parseFloat(popup.style.maxHeight));
    let top = above ? rect.top - actualHeight - 5 : rect.bottom + 5;
    top = Math.max(margin, Math.min(top, window.innerHeight - actualHeight - margin));
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    popup.style.left = left + 'px'; popup.style.top = top + 'px';
  };

  function open(trigger) {
    if (popup && activeTrigger === trigger) {close();return;}
    close();
    const select = trigger.previousElementSibling;
    if (!select || !select.matches(SELECTOR)) return;
    const menu = document.createElement('div');
    menu.className = 'tier-picker-menu'; menu.setAttribute('role','menu');
    menu.setAttribute('aria-label','Scegli la valutazione');
    const heading = document.createElement('div');
    heading.className = 'tier-picker-title'; heading.textContent = 'Scegli la valutazione';
    menu.appendChild(heading);
    for (const option of select.options) {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'tier-picker-option';
      item.setAttribute('role','menuitemradio');
      item.setAttribute('aria-checked', String(option.value === select.value));
      item.dataset.tierOption = option.value;
      item.textContent = option.textContent;
      item.addEventListener('click', () => {
        // Close the popup first: render() rebuilds the whole tier-board.
        const tier = item.dataset.tierOption;
        const originalSelect = select;
        close();
        if (originalSelect.isConnected && originalSelect.value !== tier) {
          originalSelect.value = tier;
          originalSelect.dispatchEvent(new Event('change', {bubbles:true}));
        }
      });
      menu.appendChild(item);
    }
    popup = menu; activeTrigger = trigger;
    trigger.setAttribute('aria-expanded','true');
    document.body.appendChild(menu);
    position();
    const focused = menu.querySelector('[aria-checked="true"]') || menu.querySelector('.tier-picker-option');
    focused?.focus({preventScroll:true});
  }

  function enhance() {
    document.querySelectorAll(SELECTOR).forEach(select => {
      if (select.dataset.pickerEnhanced === 'true') return;
      select.dataset.pickerEnhanced = 'true';
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'tier-picker-trigger';
      trigger.setAttribute('aria-label', select.getAttribute('aria-label') || 'Scegli valutazione');
      trigger.setAttribute('aria-haspopup','menu');
      trigger.setAttribute('aria-expanded','false');
      const opt = select.options[select.selectedIndex];
      trigger.textContent = opt?.value === 'unranked' ? '?' : opt?.value || '?';
      select.insertAdjacentElement('afterend',trigger);
    });
  }

  // Delegated event handling survives re-rendering and keeps the trigger out of DnD.
  document.addEventListener('click', e => {
    const trigger = e.target.closest?.(triggerSelector);
    if (trigger) {e.preventDefault();open(trigger);return;}
    if (popup && !popup.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => {
    if (!popup) return;
    if (e.key === 'Escape') {e.preventDefault();close(true);return;}
    if (e.key === 'Tab') {close();return;}
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(popup.querySelectorAll('.tier-picker-option'));
      const at = items.indexOf(document.activeElement);
      if (at >= 0) {
        e.preventDefault();
        items[(at+(e.key === 'ArrowDown'?1:items.length-1))%items.length].focus();
      }
    }
  });
  document.addEventListener('pointerdown', e => {
    if (popup && !popup.contains(e.target) && !e.target.closest?.(triggerSelector)) close();
  });
  window.addEventListener('resize',position);
  window.addEventListener('scroll',event=>{if(popup && popup.contains(event.target))return;close();},true);
  const main = document.getElementById('main-content');
  if (main) {
    new MutationObserver(() => {
      if (popup && (!activeTrigger || !activeTrigger.isConnected)) close();
      enhance();
    }).observe(main,{childList:true,subtree:true});
  }
  enhance();
})();
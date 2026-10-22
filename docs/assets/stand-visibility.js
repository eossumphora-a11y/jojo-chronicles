/* Stand canon pubblico: appare solo se approvato e documentato in una sessione pubblica.
 * Funzioni pure testabili in Node, nessuna lettura di dati Master. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.JoJoStands=api;
})(typeof window!=='undefined'?window:null,function(){
  "use strict";
  function normalize(text){
    return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it");
  }
  function character(c){return !!c&&/[\p{L}\p{N}]/u.test(c)}
  function mentioned(text,name){
    const hay=normalize(text),needle=normalize(name).trim();
    if(needle.length<3)return false;
    let from=0;
    while(from<hay.length){
      const i=hay.indexOf(needle,from);
      if(i<0)return false;
      if(!character(hay[i-1])&&!character(hay[i+needle.length]))return true;
      from=i+needle.length;
    }
    return false;
  }
  function publicSession(session){
    return !!session&&session.public!==false&&session.visibility!=="master"&&typeof session.id==="string";
  }
  function encounterSources(entry,sessions){
    if(!entry||entry.kind!=="stand"||entry.public===false)return [];
    return (Array.isArray(sessions)?sessions:[]).filter(s=>publicSession(s)&&(
      mentioned(s.summary,entry.title)||
      (Array.isArray(s.events)&&s.events.some(ev=>mentioned(ev.text,entry.title)))||
      (Array.isArray(s.recapVariants)&&s.recapVariants.some(text=>mentioned(text,entry.title)))
    )).sort((a,b)=>(a.number??9999)-(b.number??9999));
  }
  function knownStands(entries,sessions){
    return (Array.isArray(entries)?entries:[]).filter(e=>e?.kind==="stand"&&e.public!==false&&encounterSources(e,sessions).length>0);
  }
  function sessionStands(entries,sessions,session){
    if(!publicSession(session))return [];
    const registered=knownStands(entries,sessions);
    return registered.filter(e=>encounterSources(e,[session]).length>0);
  }
  function evidenceExcerpt(session,name){
    const texts=[String(session?.summary||""),...(Array.isArray(session?.recapVariants)?session.recapVariants:[])];
    const parts=texts.flatMap(text=>text.split(/(?<=[.!?])\s+|\n+/));
    const found=parts.find(p=>mentioned(p,name));
    return found?found.trim().slice(0,350):"";
  }
  return Object.freeze({mentioned,encounterSources,knownStands,sessionStands,evidenceExcerpt});
});

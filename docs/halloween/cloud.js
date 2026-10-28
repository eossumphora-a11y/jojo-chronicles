/* La Tavola Stregata · shared-room transport. No tracking or third-party scripts.
 * Anonymous encrypted MQTT retained snapshots are a short-term collaboration
 * convenience, NOT durable hosting. Download a JSON backup after decisions.
 */
(() => {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const encode = s => enc.encode(s);
  const merge = (...arrays) => { const z=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let i=0;for(const a of arrays){z.set(a,i);i+=a.length;}return z; };
  const field = s => {const b=encode(s);return merge(new Uint8Array([b.length>>8,b.length&255]),b);};
  const packet = (header,content) => {let n=content.length;const len=[];do{let x=n%128;n=Math.floor(n/128);len.push(n?x|128:x);}while(n);return merge(new Uint8Array([header,...len]),content);};
  const base64 = bytes => btoa(Array.from(bytes, b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const unbase64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
  const seed = window.HALLOWEEN_PREVIEW_SEED || {revision:0,recipes:[],people:[]};
  const seedPhotos = new Map(seed.recipes.map(r=>[r.id,r.image]));
  let hash = location.hash.slice(1);
  let token = new URLSearchParams(hash).get('room');
  if(!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    token=base64(crypto.getRandomValues(new Uint8Array(32)));
    history.replaceState(null,'',location.pathname+location.search+'#room='+token);
  }
  const roomBytes = unbase64(token);
  const storageKey='halloween-shared-'+token.slice(0,14);
  let key, topic, online=false, mqtt=null, startupDone=false, receivedRemote=false;
  let board=null, newestRevision=0, notification=()=>{}, connNotification=()=>{};
  let startResolve;
  const startPromise=new Promise(resolve=>{startResolve=resolve;});
  let initialTimer;
  let reconnectTimer;
  const endpoints=['wss://broker.emqx.io:8084/mqtt'];
  let endpointIndex=0;
  const randomId=()=>base64(crypto.getRandomValues(new Uint8Array(12)));
  const savedBoard=()=>{try{const v=JSON.parse(localStorage.getItem(storageKey)||'null');return Array.isArray(v?.recipes)&&Array.isArray(v?.people)?v:null;}catch{return null;}};
  function readyBoard(){return savedBoard()||structuredClone(seed);}
  function unpackState(raw){
    if(!raw||!Array.isArray(raw.recipes)||!Array.isArray(raw.people)) throw Error('Dati di stanza non validi');
    const photos=new Map([...seedPhotos]);
    const cached=savedBoard();
    for(const r of cached?.recipes||[])if(r.image)photos.set(r.id,r.image);
    return {revision:raw.revision,people:raw.people,recipes:raw.recipes.map(r=>({
      id:r.id,title:r.title,note:r.note||'',tier:r.tier||'unranked',order:r.order||0,
      selected:!!r.selected,assignedTo:r.assignedTo||null,assignmentOrder:r.assignmentOrder||0,
      image:r.image||photos.get(r.id)||null
    }))};
  }
  function packState(b){return {revision:b.revision,people:b.people,recipes:b.recipes.map(r=>({
    id:r.id,title:r.title,note:r.note||'',tier:r.tier,order:r.order||0,
    selected:!!r.selected,assignedTo:r.assignedTo||null,assignmentOrder:r.assignmentOrder||0,
    ...(r.image && r.image!==seedPhotos.get(r.id)?{image:r.image}:{})
  }))};}
  function persist(b){try{localStorage.setItem(storageKey,JSON.stringify(b));}catch{console.warn('Memoria browser insufficiente per copia di sicurezza');}}
  function announce(b){board=b;newestRevision=b.revision;persist(b);if(startupDone)notification(structuredClone(board));}
  function notifyConnection(x){online=x;connNotification(online?'Connesso · modifiche condivise':'Offline · modifiche bloccate');}
  class MqttSocket {
    constructor(url){this.url=url;this.socket=null;this.bytes=new Uint8Array();this.packetID=1;this.pending=new Map();this.pingTimer=null;this.onConnect=()=>{};this.onPublish=()=>{};this.onClose=()=>{};}
    open(){
      const ws=new WebSocket(this.url,['mqtt']);this.socket=ws;ws.binaryType='arraybuffer';
      ws.onopen=()=>{const cid='halloween-'+randomId();const payload=merge(field('MQTT'),new Uint8Array([4,2,0,30]),field(cid));ws.send(packet(0x10,payload));};
      ws.onmessage=event=>{const input=new Uint8Array(event.data);this.bytes=merge(this.bytes,input);let i=0;
        while(i<this.bytes.length){const start=i;const header=this.bytes[i++];let size=0,factor=1,b,n=0;
          do{if(i>=this.bytes.length){i=start;break;}b=this.bytes[i++];size+=(b&127)*factor;factor*=128;n++;if(n>4){ws.close();return;}}while(b&128);
          if(i===start)break;
          if(this.bytes.length-i<size){i=start;break;}
          this.handle(header,this.bytes.slice(i,i+size));i+=size;
        }
        this.bytes=this.bytes.slice(i);
      };
      ws.onclose=()=>{clearInterval(this.pingTimer);for(const item of this.pending.values())item.reject(Error("Connessione interrotta"));this.pending.clear();this.onClose();};ws.onerror=()=>{};
    }
    handle(header,data){const type=header>>4;
      if(type===2){if(data[1]!==0){this.socket.close();return;}this.pingTimer=setInterval(()=>{if(this.socket?.readyState===1)this.socket.send(new Uint8Array([0xC0,0]));},18000);this.onConnect();}
      if(type===4){const id=(data[0]<<8)|data[1];const ack=this.pending.get(id);if(ack){clearTimeout(ack.timer);ack.resolve();this.pending.delete(id);}}
      if(type===3){const length=data[0]*256+data[1];let p=2+length;if((header&6)!==0)p+=2;this.onPublish(dec.decode(data.slice(2,2+length)),data.slice(p));}
    }
    subscribe(name){this.socket.send(packet(0x82,merge(new Uint8Array([0,this.packetID++]),field(name),new Uint8Array([0]))));}
    publish(name,body){if(this.socket?.readyState!==1)throw Error('Connessione interrotta');const id=(this.packetID++%65535)+1;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Mancata conferma dal servizio di sincronizzazione'));},6500);this.pending.set(id,{timer,resolve,reject});this.socket.send(packet(0x33,merge(field(name),new Uint8Array([id>>8,id&255]),encode(body))));});}
    close(){this.socket?.close();}
  }
  async function encrypt(value){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encode(JSON.stringify(value)));return JSON.stringify({v:1,iv:base64(iv),body:base64(new Uint8Array(encrypted))});}
  async function decrypt(body){const parsed=JSON.parse(body);if(parsed.v!==1)throw Error('Formato dati sconosciuto');const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(parsed.iv)},key,unbase64(parsed.body));return JSON.parse(dec.decode(raw));}
  async function send(b){if(!online||!mqtt)throw Error('Sincronizzazione non disponibile: riprova quando sei online');const str=await encrypt(packState(b));if(str.length>550000)throw Error('Troppi dati per la stanza: usa foto più piccole');await mqtt.publish(topic,str);}
  function startIfReady(){if(startupDone)return;startupDone=true;clearTimeout(initialTimer);if(!board)board=readyBoard();newestRevision=board.revision;startResolve(structuredClone(board));}
  async function onIncoming(payload){
    if(!payload.length)return;
    try{const obj=await decrypt(dec.decode(payload));const b=unpackState(obj);
      if(typeof b.revision!=='number')return;
      receivedRemote=true;
      if(!board || b.revision>newestRevision){announce(b);startIfReady();}
    }catch(e){console.warn('Impossibile leggere un aggiornamento della stanza',e.message);}
  }
  function startConnection(){
    mqtt=new MqttSocket(endpoints[endpointIndex%endpoints.length]);
    mqtt.onConnect=()=>{notifyConnection(true);mqtt.subscribe(topic); // subscription yields retained snapshot, if any
      clearTimeout(initialTimer);initialTimer=setTimeout(async()=>{
        if(!receivedRemote && savedBoard()?.revision>0){try{await send(savedBoard());}catch(e){console.warn(e.message);}}
        startIfReady();
      },2300);
    };
    mqtt.onPublish=(name,payload)=>{if(name===topic)onIncoming(payload);};
    mqtt.onClose=()=>{
      notifyConnection(false);clearTimeout(initialTimer);if(!startupDone)startIfReady();
      endpointIndex++;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(startConnection,2500);
    };
    mqtt.open();
    if(!startupDone)setTimeout(startIfReady,5000);
  }
  async function initialize(){try{
    key=await crypto.subtle.importKey('raw',roomBytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',roomBytes));
    topic='halloween/voting-room-v2/'+base64(digest).slice(0,37);
    startConnection();
  }catch(e){console.error(e);startIfReady();}}
  initialize();
  window.HALLOWEEN_CLOUD={
    getBoard:()=>startupDone?Promise.resolve(structuredClone(board)):startPromise,
    subscribe:(onUpdate,onStatus)=>{notification=onUpdate;connNotification=onStatus;connNotification(online?'Connesso · modifiche condivise':'Connessione in corso…');},
    async apply(op, mutate){
      if(!online)throw Error('Connessione assente: la modifica non è stata salvata');
      const previous=structuredClone(board);
      try{
        const updated=mutate();
        updated.revision=Math.max(Date.now()*1000,newestRevision+1);
        await send(updated);
        announce(structuredClone(updated));
        return updated;
      }catch(e){board=previous;newestRevision=previous.revision;persist(board);throw e;}
    },
    getLink:()=>location.origin+location.pathname+location.search+'#room='+token,
    status:()=>online,
    key:storageKey
  };
})();
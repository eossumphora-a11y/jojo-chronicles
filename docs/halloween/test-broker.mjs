import { randomBytes } from 'node:crypto';
const address = 'wss://broker.emqx.io:8084/mqtt';
const topic = 'halloween/smoke/' + randomBytes(12).toString('hex');
const encoder = new TextEncoder(), decoder = new TextDecoder();
function bytes(...arrays) { const out = new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let k=0;for(const a of arrays){out.set(a,k);k+=a.length;}return out; }
function field(s){const x=encoder.encode(s);return bytes(new Uint8Array([x.length>>8,x.length&255]),x);}
function frame(type,payload){let v=payload.length,a=[];do{const x=v%128;v=Math.floor(v/128);a.push(v?x|128:x);}while(v);return bytes(new Uint8Array([type,...a]),payload);}
function onceTestTimeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(Error('MQTT smoke timeout')),ms));}
async function connect(id){
 const ws = new WebSocket(address,'mqtt');
 ws.binaryType='arraybuffer';const listeners=[];
 let ready,fail;const connected = new Promise((yes,no)=>{ready=yes;fail=no;});
 ws.addEventListener('open',()=>ws.send(frame(0x10,bytes(field('MQTT'),new Uint8Array([4,2,0,20]),field(id)))));
 ws.addEventListener('error',()=>fail(Error('WebSocket connection error')));
 ws.addEventListener('close',()=>fail(Error('WebSocket closed')));
 ws.addEventListener('message',e=>{
  const raw=new Uint8Array(e.data);let i=1,n=0,m=1,v;do{v=raw[i++];n+=(v&127)*m;m*=128;}while(v&128);const p=raw.slice(i,i+n),type=raw[0]>>4;
  if(type===2){if(p[1]!==0)fail(Error('MQTT CONNACK failure'));else ready();}
  if(type===3){const count=(p[0]<<8)|p[1];const name=decoder.decode(p.slice(2,2+count));listeners.forEach(fn=>fn(name,decoder.decode(p.slice(2+count+(raw[0]&6?2:0)))));}
 });
 await Promise.race([connected,onceTestTimeout(10000)]);
 return {ws,listen:fn=>listeners.push(fn),subscribe:name=>ws.send(frame(0x82,bytes(new Uint8Array([0,1]),field(name),new Uint8Array([0])))),publish:(name,body,retain)=>ws.send(frame(retain?0x31:0x30,bytes(field(name),encoder.encode(body))))};
}
const connected=[];
try{
 const a=await connect('hallow-test-a'+randomBytes(4).toString('hex'));connected.push(a);
 const first=new Promise(resolve=>a.listen((t,v)=>{if(t===topic)resolve(v);}));
 a.subscribe(topic);
 const b=await connect('hallow-test-b'+randomBytes(4).toString('hex'));connected.push(b);
 b.publish(topic,'shared-test-yes',true);
 const received=await Promise.race([first,onceTestTimeout(10000)]);
 if(received!=='shared-test-yes')throw Error('Live sync message mismatch: '+received);
 const c=await connect('hallow-test-c'+randomBytes(4).toString('hex'));connected.push(c);
 const retained=new Promise(resolve=>c.listen((t,v)=>{if(t===topic)resolve(v);}));
 c.subscribe(topic);
 const stored=await Promise.race([retained,onceTestTimeout(10000)]);
 if(stored!=='shared-test-yes')throw Error('Retained message missing: '+stored);
 console.log('OK MQTT realtime publish/subscribe + retained state on EMQX WSS');
 b.publish(topic,'',true);
}finally{connected.forEach(x=>x.ws.close());}

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHandler, secretMatches } from '../api/telegram.js';
import { allowedAdmins, imageType, parseLocation, parseServices, validateProvider } from '../lib/validation.mjs';

const ADMIN=5549806778,SECRET='test-webhook-secret-with-more-than-32-characters';
function fixture() {
  let sequence=100;
  const sessions=new Map(),providers=new Map(),photos=new Map(),updates=new Map(),messages=[];
  const context={sessions,providers,photos,updates,messages,failNextSend:false};
  const store={
    async getSession(chat){return structuredClone(sessions.get(chat) ?? null);},
    async putSession(chat,user,step,data){sessions.set(chat,{chat_id:chat,user_id:user,step,data:structuredClone(data)});},
    async clearSession(chat){sessions.delete(chat);},
    async getProvider(id){return structuredClone(providers.get(id) ?? null);},
    async listProviders({category,offset=0,query=''}){return [...providers.values()].filter(p=>(!category||p.category===category)&&(!query||p.name.includes(query))).slice(offset,offset+10);},
    async saveProvider(data){providers.set(data.id,{rating_sum:0,rating_count:0,rating_average:0,...providers.get(data.id),...structuredClone(data)});return data.id;},
    async setStatus(id,status){providers.get(id).status=status;},
    async listPhotos(id){return structuredClone(photos.get(id) ?? []);},
    async upload(){},
    async savePhotos(id,items,replace){const current=replace?[]:photos.get(id) ?? [];for(const item of items){const existing=current.find(p=>p.position===item.position);if(existing)Object.assign(existing,item);else current.push({...item,id:randomUUID()});}photos.set(id,current);},
    async removeFiles(){},photoUrl(path){return 'https://photos.example/'+path;},
    async stats(){return {published:0,draft:0,archived:0,ratings:0};},
    async claim(id){const row=updates.get(id);if(row&&row.status!=='failed')return false;updates.set(id,{...row,status:'processing'});return true;},
    async snapshot(id,chat){const row=updates.get(id);if(!Object.hasOwn(row,'snapshot'))row.snapshot=structuredClone(sessions.get(chat) ?? null);return structuredClone(row.snapshot);},
    async updateStatus(id){return updates.get(id)?.status;},
    async finish(id,status){updates.get(id).status=status;},
  };
  const telegram={async call(method,payload){if(method==='sendMessage'&&context.failNextSend){context.failNextSend=false;throw new Error('Simulated transport failure');}messages.push({method,payload});return {};},async download(){return {bytes:Buffer.from([255,216,255]),extension:'jpg',mime:'image/jpeg'};}};
  const handler=createHandler({store,telegram,secret:SECRET,adminIds:allowedAdmins(String(ADMIN))});
  const update=(data,{actor=ADMIN,group=false,id=++sequence}={})=>({update_id:id,...(data.callback?{callback_query:{id:'callback-'+id,from:{id:actor},data:data.callback,message:{chat:{id:actor,type:group?'group':'private'}}}}:{message:{from:{id:actor},chat:{id:actor,type:group?'group':'private'},...data}})});
  async function request(body,secret=SECRET){const res={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};await handler({method:'POST',headers:{'x-telegram-bot-api-secret-token':secret},body},res);return res;}
  context.store=store;context.update=update;context.request=request;
  context.click=async value=>{const result=await request(update({callback:value}));assert.equal(result.statusCode,200);return result;};
  context.text=async text=>{const result=await request(update({text}));assert.equal(result.statusCode,200);return result;};
  return context;
}
const baseProvider=()=>({id:randomUUID(),category:'doctors',name:'Clinic name',specialty:'Cardiology',specialty_id:'heart',city:'سلێمانی',address:'A real street address',description:'',services:[],phone:null,latitude:null,longitude:null,available:true,status:'published'});

test('invalid webhook secret, unknown accounts and group chats never touch the database',async()=>{
  const f=fixture();
  assert.equal((await f.request(f.update({text:'/start'}),'wrong')).statusCode,401);
  assert.equal((await f.request(f.update({text:'/start'},{actor:123}))).statusCode,200);
  assert.equal((await f.request(f.update({text:'/start'},{group:true}))).statusCode,200);
  assert.equal(f.updates.size,0);assert.equal(f.messages.length,0);
  assert.equal(secretMatches(SECRET,SECRET),true);assert.equal(secretMatches(undefined,SECRET),false);
});

test('guided Add accepts a real listing, coordinates and photo, then publishes only after confirmation',async()=>{
  const f=fixture();
  await f.text('/start');await f.click('add');await f.click('new:doctors');
  await f.text('د. ناوی پزیشک');await f.text('پسپۆڕی دڵ');await f.click('specialty:heart');
  await f.click('value:سلێمانی');await f.text('شەقامی گشتی');await f.click('skip');await f.click('skip');
  await f.text('ECG, Consultation');await f.text('35.55,45.43');
  const photo=f.update({photo:[{file_id:'telegram-photo',file_unique_id:'unique-photo',file_size:1024}]});
  assert.equal((await f.request(photo)).statusCode,200);
  const pendingId=f.sessions.get(ADMIN).data.provider.id;
  await f.click(`photos_done:${pendingId}`);assert.equal(f.providers.size,0);
  await f.click(`save:published:${pendingId}`);assert.equal(f.providers.size,1);
  const provider=[...f.providers.values()][0];
  assert.equal(provider.status,'published');assert.equal(provider.latitude,35.55);
  assert.deepEqual(provider.services,['ECG','Consultation']);
  assert.equal(f.photos.get(provider.id).length,1);assert.equal(f.sessions.has(ADMIN),false);
  const buttons=f.messages.filter(m=>m.payload.reply_markup?.inline_keyboard).flatMap(m=>m.payload.reply_markup.inline_keyboard.flat());
  assert.ok(buttons.every(b=>Buffer.byteLength(b.callback_data)<=64));
});

test('Update preserves rating aggregates and edits only the selected field',async()=>{
  const f=fixture(),provider={...baseProvider(),rating_sum:14,rating_count:3};f.providers.set(provider.id,provider);
  await f.click(`field:name:${provider.id}`);await f.text('Updated clinic');
  assert.equal(f.providers.get(provider.id).name,'Updated clinic');
  assert.equal(f.providers.get(provider.id).rating_sum,14);assert.equal(f.providers.get(provider.id).rating_count,3);
});

test('Delete asks for confirmation and archives rather than discarding data',async()=>{
  const f=fixture(),provider=baseProvider();f.providers.set(provider.id,provider);
  await f.click(`delete:${provider.id}`);assert.equal(provider.status,'published');
  await f.click(`archive:${provider.id}`);assert.equal(provider.status,'archived');assert.ok(f.providers.has(provider.id));
  await f.click(`status:published:${provider.id}`);assert.equal(provider.status,'published');
});

test('duplicate completed updates do not repeat responses or form transitions',async()=>{
  const f=fixture(),update=f.update({text:'/start'});
  await f.request(update);const count=f.messages.length;
  await f.request(update);assert.equal(f.messages.length,count);
});

test('an in-flight duplicate is retried, not acknowledged as completed',async()=>{
  const f=fixture(),update=f.update({text:'/start'});f.updates.set(update.update_id,{status:'processing'});
  assert.equal((await f.request(update)).statusCode,503);
});

test('invalid input keeps the form and responds without an endless webhook retry',async()=>{
  const f=fixture();await f.click('new:doctors');await f.text('x'.repeat(161));
  assert.equal(f.sessions.get(ADMIN).step,'name');assert.match(f.messages.at(-1).payload.text,/160/);
  await f.click('search:select');await f.text('x'.repeat(101));
  assert.equal(f.sessions.get(ADMIN).step,'search');
});

test('a transport retry reuses the original form snapshot instead of filling the next field',async()=>{
  const f=fixture();await f.click('new:doctors');
  const update=f.update({text:'A doctor name'});f.failNextSend=true;
  assert.equal((await f.request(update)).statusCode,503);assert.equal(f.sessions.get(ADMIN).step,'specialty');
  assert.equal((await f.request(update)).statusCode,200);assert.equal(f.sessions.get(ADMIN).step,'specialty');
  assert.equal(f.sessions.get(ADMIN).data.provider.name,'A doctor name');assert.equal(f.sessions.get(ADMIN).data.provider.specialty,undefined);
});

test('photo batch retries do not append the same photo twice',async()=>{
  const f=fixture(),provider=baseProvider();f.providers.set(provider.id,provider);
  f.photos.set(provider.id,[{id:randomUUID(),storage_path:`${provider.id}/original.jpg`,position:0}]);
  await f.click(`field:photos:${provider.id}`);
  await f.request(f.update({photo:[{file_id:'new-file',file_unique_id:'new-unique',file_size:1024}]}));
  const done=f.update({callback:`photos_done:${provider.id}`});f.failNextSend=true;
  assert.equal((await f.request(done)).statusCode,503);
  assert.equal(f.photos.get(provider.id).length,2);
  assert.equal((await f.request(done)).statusCode,200);
  assert.equal(f.photos.get(provider.id).length,2);
  assert.deepEqual(f.photos.get(provider.id).map(p=>p.position),[0,1]);
});

test('validation rejects invalid coordinates, forged aggregates and unsupported images',()=>{
  assert.throws(()=>parseLocation('91,45'));assert.throws(()=>parseLocation(','));
  assert.deepEqual(parseLocation({latitude:35,longitude:45}),{latitude:35,longitude:45});
  assert.deepEqual(parseServices('A، B, A'),['A','B']);
  assert.equal(validateProvider({...baseProvider(),rating_sum:999}).rating_sum,undefined);
  assert.throws(()=>validateProvider({...baseProvider(),phone:'not a phone'}));
  assert.throws(()=>imageType(Buffer.from('<svg>bad</svg>')));
  assert.equal(imageType(Buffer.from([255,216,255])).mime,'image/jpeg');
});

test('an old Publish button cannot publish a different active preview',async()=>{
  const f=fixture(),provider=baseProvider();
  f.sessions.set(ADMIN,{chat_id:ADMIN,user_id:ADMIN,step:'preview',data:{provider,files:[]}});
  await f.click(`save:published:${randomUUID()}`);assert.equal(f.providers.size,0);
  await f.click(`save:published:${provider.id}`);assert.equal(f.providers.size,1);
});

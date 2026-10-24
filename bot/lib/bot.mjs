import { randomUUID } from 'node:crypto';
import { categories, cleanText, InputError, isAdmin, isUuid, parseLocation, parseServices, validateProvider } from './validation.mjs';

const button=(text,callback_data)=>({text,callback_data});
const keyboard=rows=>({inline_keyboard:rows});
const menu=keyboard([
  [button('➕ Add','add'),button('📂 Select','browse:select')],
  [button('✏️ Update','browse:update'),button('🗑 Delete','browse:delete')],
  [button('📊 Statistics','stats'),button('❓ Help','help')],
]);
const home=[button('↩ Main menu','menu')];
const cancel=keyboard([[button('✖ Cancel','cancel')]]);
const fields={name:'Name',specialty:'Specialty / title',city:'City',address:'Address',description:'About',phone:'Phone',services:'Services',location:'Map location'};
const prompts={
  name:'Send the provider’s full display name (2–160 characters).',
  specialty:'Send the medical specialty or service title (up to 200 characters).',
  city:'Send the city name in Kurdish, or choose below.',
  address:'Send the full street address (2–500 characters).',
  description:'Send an about / description (up to 4,000 characters), or tap Skip.',
  phone:'Send a phone number including country code, or tap Skip.',
  services:'Send services separated by commas, or tap Skip. Maximum 30.',
  location:'Send a Telegram location pin, or coordinates: latitude,longitude. Tap Skip to use address search.',
};
const sequence=['name','specialty','specialty_id','city','address','description','phone','services','location','photos'];
const optional=new Set(['description','phone','services','location']);
const statusIcon=status=>status==='published'?'🟢':status==='draft'?'🟡':'⚪';

export function createBot({store,telegram,adminIds}) {
  const send=(chat,text,reply_markup)=>telegram.call('sendMessage',{chat_id:chat,text,reply_markup,link_preview_options:{is_disabled:true}});
  const state=(chat,user,step,data)=>store.putSession(chat,user,step,data);

  async function main(chat) {
    await store.clearSession(chat);
    return send(chat,'Dctoria · Directory administration\n\nAdd verified listings, manage photos, and keep the directory up to date.\n\nChoose an action:',menu);
  }
  async function ask(chat,step,data) {
    let rows=[];
    if(step==='city')rows=[[button('سلێمانی','value:سلێمانی'),button('هەولێر','value:هەولێر'),button('دهۆک','value:دهۆک')]];
    if(step==='specialty_id')return send(chat,'Choose the specialty filter. The title you entered remains visible in the app.',keyboard([
      [button('Heart','specialty:heart'),button('Dental','specialty:dental')],
      [button('Children','specialty:children'),button('General / other','specialty:general')],
      [button('✖ Cancel','cancel')],
    ]));
    if(step==='photos')return send(chat,`Send photos as Telegram photos, one at a time (up to 10, each under 5 MB). The first photo is the cover.\n\n${data.files?.length ?? 0} photos attached. Tap Done when ready.`,keyboard([[button('✅ Done',`photos_done:${data.provider.id}`)],[button('✖ Cancel','cancel')]]));
    if(optional.has(step))rows.push([button('Skip','skip')]);
    rows.push([button('✖ Cancel','cancel')]);
    return send(chat,prompts[step] ?? 'Send the value.',keyboard(rows));
  }
  async function browse(chat,user,mode,category=null,offset=0,query='') {
    if(!['select','update','delete'].includes(mode))throw new InputError('Choose an action from the menu.');
    if(!category && !query) {await store.clearSession(chat);return send(chat,`Choose a category to ${mode}:`,keyboard([
      ...Object.entries(categories).map(([id,label])=>[button(label,`list:${mode}:${id}:0`)]),
      [button('🔎 Search by name',`search:${mode}`)],home,
    ]));}
    const rows=await store.listProviders({category,offset,query});
    await state(chat,user,'list',{mode,category,offset,query});
    const buttons=rows.map(row=>[button(`${statusIcon(row.status)} ${row.name.slice(0,65)}`,`pick:${mode}:${row.id}`)]);
    const pages=[];
    if(offset>0)pages.push(button('‹ Previous',`page:${Math.max(0,offset-10)}`));
    if(rows.length===10)pages.push(button('Next ›',`page:${offset+10}`));
    if(pages.length)buttons.push(pages);
    buttons.push(home);
    return send(chat,rows.length?`Directory · ${category?categories[category]:'Search'}\nPage ${Math.floor(offset/10)+1} · ${query || 'Choose a listing'}`:'No listings found. Use Add to create the first one.',keyboard(buttons));
  }
  async function show(chat,id) {
    if(!isUuid(id))throw new InputError('Invalid listing.');
    const provider=await store.getProvider(id);
    if(!provider)throw new InputError('This listing no longer exists.');
    await store.clearSession(chat);
    const photos=await store.listPhotos(id);
    const text=`${statusIcon(provider.status)} ${provider.name}\n${categories[provider.category]} · ${provider.status}\n\n${provider.specialty}\n📍 ${provider.city} · ${provider.address}\n📞 ${provider.phone || 'Not set'}\n⭐ ${provider.rating_count?Number(provider.rating_average).toFixed(1):'No ratings'} · ${provider.rating_count} ratings\n🖼 ${photos.length} photos\n${provider.available?'✓ Available':'Unavailable'}\n\n${(provider.description || '').slice(0,1200)}`;
    return send(chat,text,keyboard([
      [button('✏️ Update',`edit:${id}`),button('🗑 Delete',`delete:${id}`)],
      [button(provider.status==='published'?'⏸ Unpublish':'🚀 Publish',`status:${provider.status==='published'?'draft':'published'}:${id}`),button('🖼 Photos',`gallery:${id}`)],home,
    ]));
  }
  async function edit(chat,id) {
    if(!isUuid(id))throw new InputError('Invalid listing.');
    await store.clearSession(chat);
    return send(chat,'Choose a field to update:',keyboard([
      ...Object.entries(fields).map(([field,label])=>[button(label,`field:${field}:${id}`)]),
      [button('Specialty filter',`field:specialty_id:${id}`)],
      [button('Add photos',`field:photos:${id}`),button('Replace photos',`field:replace_photos:${id}`)],
      [button('Toggle availability',`availability:${id}`)],[button('↩ Listing',`pick:select:${id}`)],home,
    ]));
  }
  async function advance(chat,user,data,next) {
    await state(chat,user,next,data);
    if(next==='preview')return preview(chat,data);
    return ask(chat,next,data);
  }
  async function preview(chat,data) {
    const p=data.provider;
    return send(chat,`Review before saving\n\n${p.name}\n${categories[p.category]}\n${p.specialty}\n📍 ${p.city} · ${p.address}\n📞 ${p.phone || 'Not set'}\nMap: ${p.latitude!=null?`${p.latitude}, ${p.longitude}`:'Address search'}\nServices: ${(p.services ?? []).join(', ') || 'Not set'}\n🖼 ${data.files?.length ?? 0} photos\n\n${(p.description || '').slice(0,1200)}\n\nPublish makes this listing visible immediately.`,keyboard([[button('🚀 Publish',`save:published:${p.id}`),button('💾 Save draft',`save:draft:${p.id}`)],[button('✖ Cancel','cancel')]]));
  }
  async function uploadPhotos(id,files,replace,user,update) {
    const existing=await store.listPhotos(id);
    let nextPosition=existing.reduce((max,photo)=>Math.max(max,photo.position+1),0);
    const plan=files.map((file,index)=>{
      const unique=file.file_unique_id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120);
      if(!unique)throw new InputError('Invalid photo. Please resend it.');
      const prior=existing.find(photo=>photo.storage_path.startsWith(`${id}/${unique}.`));
      return {file,unique,position:replace?index:prior?.position ?? nextPosition++};
    });
    if(plan.some(file=>file.position>=50))throw new InputError('This listing can have at most 50 photos.');
    const photos=new Array(files.length);
    let nextJob=0;
    await Promise.all(Array.from({length:Math.min(3,files.length)},async()=>{
      while(nextJob<plan.length) {
        const index=nextJob++;
        const item=plan[index];
        const image=await telegram.download(item.file.file_id);
        const path=`${id}/${item.unique}.${image.extension}`;
        await store.upload(path,image.bytes,image.mime);
        photos[index]={storage_path:path,position:item.position,caption:''};
      }
    }));
    await store.savePhotos(id,photos,replace,user,update);
    if(replace) {
      const retained=new Set(photos.map(photo=>photo.storage_path));
      try {await store.removeFiles(existing.map(photo=>photo.storage_path).filter(path=>!retained.has(path)));} catch { /* The current photos are committed; stale files can be cleaned later. */ }
    }
  }
  async function save(chat,user,update,session,status) {
    if(session?.step!=='preview')throw new InputError('This preview has expired. Use Add again.');
    let provider;
    try {provider=validateProvider({...session.data.provider,status:'draft'});} catch(error){throw new InputError(error.message);}
    await send(chat,'Saving your listing…');
    await store.saveProvider(provider,user,update);
    if(session.data.files?.length)await uploadPhotos(provider.id,session.data.files,true,user,update);
    await store.setStatus(provider.id,status,user,update);
    await store.clearSession(chat);
    await send(chat,status==='published'?'✅ Published. This listing is now visible in Dctoria.':'✅ Draft saved. Publish it when you are ready.');
    return show(chat,provider.id);
  }
  async function input(chat,user,update,session,text,location) {
    if(!session)return send(chat,'Choose an action to begin. Use /menu at any time.',menu);
    if(session.user_id!==user && String(session.user_id)!==String(user))throw new InputError('Session expired. Use /menu.');
    const {step,data}=session;
    if(step==='search') {let query;try{query=cleanText(text,1,100);}catch(error){throw new InputError(error.message);}return browse(chat,user,data.mode,null,0,query);}
    if(step==='photos')throw new InputError('Send a photo, then tap Done.');
    if(!sequence.includes(step))throw new InputError('Use the buttons below, or /cancel.');
    const provider={...data.provider};
    try {
      if(step==='location')Object.assign(provider,text==='/skip'?{latitude:null,longitude:null}:parseLocation(location ?? text));
      else if(step==='services')provider.services=text==='/skip'?[]:parseServices(text);
      else if(step==='phone') {provider.phone=text==='/skip'?null:cleanText(text,7,30);if(provider.phone && !/^\+?[0-9 ()-]{7,30}$/.test(provider.phone))throw new Error('Send a phone number including country code.');}
      else if(step==='specialty_id') {if(!/^[a-z][a-z0-9_-]{0,79}$/.test(text))throw new Error('Use a specialty button.');provider.specialty_id=text;}
      else {
        const lengths={name:[2,160],specialty:[0,200],city:[2,100],address:[2,500],description:[0,4000]};
        const bounds=lengths[step];if(!bounds)throw new Error('Choose a valid field.');
        provider[step]=cleanText(text==='/skip'?'':text,...bounds);
      }
    } catch(error){throw new InputError(error.message);}
    if(data.editing) {
      await store.saveProvider(validateProvider(provider),user,update);
      await store.clearSession(chat);
      await send(chat,'✅ Updated.');
      return show(chat,provider.id);
    }
    let next=sequence[sequence.indexOf(step)+1];
    if(next==='specialty_id' && provider.category!=='doctors')next='city';
    return advance(chat,user,{...data,provider},next);
  }
  async function callback(chat,user,update,session,value) {
    const [action,...args]=value.split(':');
    if(action==='menu'||action==='cancel')return main(chat);
    if(action==='help')return send(chat,'Dctoria Admin\n\n➕ Add: guided listing and photo upload, then review and publish.\n📂 Select: browse or search all statuses.\n✏️ Update: change details, coordinates or photos.\n🗑 Delete: archive a listing after confirmation. Ratings and photos are retained; publish restores it.\n\nOnly allowlisted accounts can manage data, in a private chat.\n/menu — main menu\n/cancel — discard the current form',menu);
    if(action==='stats') {const s=await store.stats();return send(chat,`Directory statistics\n\n🟢 Published: ${s.published}\n🟡 Drafts: ${s.draft}\n⚪ Archived: ${s.archived}\n⭐ Ratings: ${s.ratings}`,menu);}
    if(action==='add') {await store.clearSession(chat);return send(chat,'What would you like to add?',keyboard([...Object.entries(categories).map(([id,label])=>[button(label,`new:${id}`)]),home]));}
    if(action==='new') {
      if(!Object.hasOwn(categories,args[0]))throw new InputError('Invalid category.');
      return advance(chat,user,{provider:{id:randomUUID(),category:args[0],specialty_id:'general',services:[],available:true},files:[]},'name');
    }
    if(action==='browse')return browse(chat,user,args[0]);
    if(action==='list') {if(!Object.hasOwn(categories,args[1]))throw new InputError('Invalid category.');return browse(chat,user,args[0],args[1],Math.min(100000,Math.max(0,Number(args[2])||0)));}
    if(action==='search') {if(!['select','update','delete'].includes(args[0]))throw new InputError('Invalid action.');await state(chat,user,'search',{mode:args[0]});return send(chat,'Send a name to search for.',cancel);}
    if(action==='page') {if(session?.step!=='list')throw new InputError('List expired. Open Select again.');return browse(chat,user,session.data.mode,session.data.category,Math.min(100000,Math.max(0,Number(args[0])||0)),session.data.query);}
    if(action==='pick') {
      if(args[0]==='update')return edit(chat,args[1]);
      if(args[0]==='delete')return callback(chat,user,update,session,`delete:${args[1]}`);
      return show(chat,args[1]);
    }
    if(action==='edit')return edit(chat,args[0]);
    if(action==='delete') {
      const provider=isUuid(args[0])?await store.getProvider(args[0]):null;
      if(!provider)throw new InputError('Listing not found.');
      return send(chat,`Delete “${provider.name}” from the public directory?\n\nThis archives it. Photos and ratings are retained, and you can restore it by publishing again.`,keyboard([[button('🗑 Confirm archive',`archive:${provider.id}`)],[button('Cancel',`pick:select:${provider.id}`)]]));
    }
    if(action==='archive'||action==='status') {
      const id=action==='archive'?args[0]:args[1];const status=action==='archive'?'archived':args[0];
      if(!isUuid(id)||!['draft','published','archived'].includes(status))throw new InputError('Invalid action.');
      await store.setStatus(id,status,user,update);await send(chat,`✅ ${status==='archived'?'Archived':status==='published'?'Published':'Unpublished'}.`);return show(chat,id);
    }
    if(action==='field') {
      const [field,id]=args;
      if(!Object.hasOwn(fields,field)&&!['photos','replace_photos','specialty_id'].includes(field))throw new InputError('Invalid field.');
      const provider=isUuid(id)?await store.getProvider(id):null;
      if(!provider)throw new InputError('Listing not found.');
      const data={editing:true,provider,files:[],replace:field==='replace_photos'};
      return advance(chat,user,data,field==='replace_photos'?'photos':field);
    }
    if(action==='availability') {
      const provider=isUuid(args[0])?await store.getProvider(args[0]):null;
      if(!provider)throw new InputError('Listing not found.');
      await store.saveProvider(validateProvider({...provider,available:!provider.available}),user,update);return show(chat,provider.id);
    }
    if(action==='specialty'||action==='value') {
      if(!session || (action==='specialty' && session.step!=='specialty_id') || (action==='value' && session.step!=='city'))throw new InputError('That button has expired.');
      return input(chat,user,update,session,args.join(':'));
    }
    if(action==='skip') {
      if(!session||!optional.has(session.step))throw new InputError('This field cannot be skipped.');
      return input(chat,user,update,session,'/skip');
    }
    if(action==='photos_done') {
      if(session?.step!=='photos'||session.data.provider.id!==args[0])throw new InputError('This photo form has expired.');
      if(session.data.editing) {
        if(!session.data.files.length)throw new InputError('Send at least one photo, or /cancel.');
        await uploadPhotos(session.data.provider.id,session.data.files,session.data.replace,user,update);
        await store.clearSession(chat);await send(chat,'✅ Photos updated.');return show(chat,session.data.provider.id);
      }
      return advance(chat,user,session.data,'preview');
    }
    if(action==='save') {if(!['published','draft'].includes(args[0])||session?.data?.provider?.id!==args[1])throw new InputError('This preview has expired. Use the latest preview.');return save(chat,user,update,session,args[0]);}
    if(action==='gallery') {
      if(!isUuid(args[0]))throw new InputError('Invalid listing.');
      const photos=await store.listPhotos(args[0]);
      if(!photos.length)return send(chat,'No photos yet. Choose Update → Add photos.',keyboard([[button('Add photos',`field:photos:${args[0]}`)],home]));
      // A single sendPhoto also handles a one-image gallery (media groups need 2+).
      for(const photo of photos.slice(0,10))await telegram.call('sendPhoto',{chat_id:chat,photo:store.photoUrl(photo.storage_path),caption:photo.position===0?'Cover photo':`Photo ${photo.position+1}`});
      return send(chat,`${photos.length} photos in total. Showing up to 10.`,keyboard([[button('Manage photos',`edit:${args[0]}`)],home]));
    }
    throw new InputError('That button has expired. Use /menu.');
  }
  async function handle(update,originalSession=undefined) {
    const cb=update.callback_query;
    const message=cb?.message ?? update.message;
    const actor=cb?.from ?? message?.from;
    if(!actor || !isAdmin(actor.id,adminIds) || message?.chat?.type!=='private' || message.chat.id!==actor.id) return {ignored:true};
    const chat=message.chat.id,user=actor.id;
    if(cb)await telegram.call('answerCallbackQuery',{callback_query_id:cb.id});
    try {
      const text=message.text?.trim() ?? '';
      if(!cb && /^\/(start|menu|cancel)(?:@\w+)?(?:\s|$)/.test(text))return await main(chat);
      if(!cb && /^\/help(?:@\w+)?$/.test(text))return await callback(chat,user,update.update_id,null,'help');
      const session=originalSession===undefined?await store.getSession(chat):originalSession;
      if(cb) {if(typeof cb.data!=='string'||Buffer.byteLength(cb.data)>64)throw new InputError('Invalid button.');return await callback(chat,user,update.update_id,session,cb.data);}
      if(message.photo?.length) {
        if(session?.step!=='photos')throw new InputError('Choose Add, or Update → Add photos, before sending a photo.');
        const file=message.photo[message.photo.length-1];
        if(file.file_size>5*1024*1024)throw new InputError('Each photo must be smaller than 5 MB.');
        const files=session.data.files ?? [];
        if(files.some(photo=>photo.file_unique_id===file.file_unique_id))return send(chat,'That photo is already attached.');
        if(files.length>=10)throw new InputError('Up to 10 photos per batch. Tap Done, then add more later.');
        if(typeof file.file_id!=='string'||typeof file.file_unique_id!=='string')throw new InputError('Please resend the photo.');
        const data={...session.data,files:[...files,{file_id:file.file_id,file_unique_id:file.file_unique_id}]};
        await state(chat,user,'photos',data);return await ask(chat,'photos',data);
      }
      return await input(chat,user,update.update_id,session,text,message.location);
    } catch(error) {
      if(error instanceof InputError)return send(chat,`⚠ ${error.message}\n\nYour form is still saved. Use /cancel to discard it.`,cancel);
      throw error;
    }
  }
  return {handle};
}

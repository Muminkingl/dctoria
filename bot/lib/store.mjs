import { createClient } from '@supabase/supabase-js';

const checked = ({data,error}) => {if(error)throw new Error(`Database operation failed (${error.code ?? 'unknown'})`);return data;};
export function createStore(url,key) {
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  return {
    async getSession(chat) {
      const session=checked(await db.from('bot_sessions').select('*').eq('chat_id',chat).maybeSingle());
      return session && new Date(session.expires_at).getTime()>Date.now() ? session : null;
    },
    async putSession(chat,user,step,data) {checked(await db.from('bot_sessions').upsert({chat_id:chat,user_id:user,step,data,updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+24*60*60*1000).toISOString()}));},
    async clearSession(chat) {checked(await db.from('bot_sessions').delete().eq('chat_id',chat));},
    async getProvider(id) {return checked(await db.from('providers').select('*').eq('id',id).maybeSingle());},
    async listProviders({category,offset=0,query=''}) {
      let request=db.from('providers').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+9);
      if(category)request=request.eq('category',category);
      if(query)request=request.ilike('name','%'+query.replace(/[\\%_]/g,match=>'\\'+match)+'%');
      return checked(await request);
    },
    async saveProvider(data,user,update) {return checked(await db.rpc('bot_save_provider',{p_data:data,p_admin_id:user,p_update_id:update}));},
    async setStatus(id,status,user,update) {checked(await db.rpc('bot_set_status',{p_id:id,p_status:status,p_admin_id:user,p_update_id:update}));},
    async listPhotos(id) {return checked(await db.from('provider_photos').select('*').eq('provider_id',id).order('position'));},
    async upload(path,bytes,mime) {
      const result=await db.storage.from('provider-photos').upload(path,bytes,{contentType:mime,upsert:true,cacheControl:'31536000'});
      if(result.error)throw new Error('Photo upload failed.');
    },
    async savePhotos(id,photos,replace,user,update) {checked(await db.rpc('bot_save_photos',{p_id:id,p_photos:photos,p_replace:replace,p_admin_id:user,p_update_id:update}));},
    async removeFiles(paths) {if(paths.length){const result=await db.storage.from('provider-photos').remove(paths);if(result.error)throw new Error('Photo cleanup failed.');}},
    photoUrl(path) {return db.storage.from('provider-photos').getPublicUrl(path).data.publicUrl;},
    async stats() {
      const [published,draft,archived,ratings]=await Promise.all([
        db.from('providers').select('*',{head:true,count:'exact'}).eq('status','published'),
        db.from('providers').select('*',{head:true,count:'exact'}).eq('status','draft'),
        db.from('providers').select('*',{head:true,count:'exact'}).eq('status','archived'),
        db.from('ratings').select('*',{head:true,count:'exact'}),
      ]);
      for(const result of [published,draft,archived,ratings])checked(result);
      return {published:published.count,draft:draft.count,archived:archived.count,ratings:ratings.count};
    },
    async claim(id) {return checked(await db.rpc('claim_bot_update',{p_update_id:id}));},
    async snapshot(id,chat) {return checked(await db.rpc('bot_update_snapshot',{p_update_id:id,p_chat_id:chat}));},
    async updateStatus(id) {return checked(await db.from('bot_updates').select('status').eq('update_id',id).maybeSingle())?.status;},
    async finish(id,status) {checked(await db.from('bot_updates').update({status}).eq('update_id',id));},
  };
}

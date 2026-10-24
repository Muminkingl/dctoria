import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));
const base=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
const directory=await fetch(base+'/rest/v1/rpc/search_directory',{method:'POST',headers,body:JSON.stringify({p_limit:20})});
assert.equal(directory.status,200);assert.ok(Array.isArray(await directory.json()));
for(const [path,body] of [['providers',{}],['rpc/rate_provider',{p_provider_id:'00000000-0000-4000-8000-000000000000',p_score:5}],['rpc/claim_bot_update',{p_update_id:1}]]) {
  const response=await fetch(base+'/rest/v1/'+path,{method:'POST',headers,body:JSON.stringify(body)});
  assert.ok([401,403].includes(response.status),`Anonymous write must be denied: ${path} (${response.status})`);
}
const privateRead=await fetch(base+'/rest/v1/bot_sessions?select=*',{headers});
assert.ok([401,403].includes(privateRead.status));
console.log('Passed live REST checks: public directory works; anonymous ratings, provider/admin writes and private bot reads are denied.');

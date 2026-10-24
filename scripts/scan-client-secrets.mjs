import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir,readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
process.loadEnvFile(path.join(root,'bot/.env.local'));
const credentials=[process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.TELEGRAM_BOT_TOKEN,process.env.TELEGRAM_WEBHOOK_SECRET,new URL(process.env.DATABASE_URL).password].filter(Boolean);
const excluded=new Set(['node_modules','.git','.expo','.vercel','output','dist','android','ios']);
let count=0;
async function scan(folder,all=false) {
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    if(!all && excluded.has(entry.name))continue;
    if(entry.name.startsWith('.env'))continue;
    const target=path.join(folder,entry.name);
    if(entry.isDirectory())await scan(target,all);
    else if(all || /\.(?:tsx?|m?js|json|sql|md|txt)$/.test(entry.name)) {
      const data=await readFile(target);count++;
      for(const secret of credentials)assert.equal(data.includes(Buffer.from(secret)),false,`Server credential found in ${path.relative(root,target)}`);
    }
  }
}
await scan(root);
await scan(path.join(root,'output/release-check'),true);
const ignored=execFileSync('git',['check-ignore','.env.local','bot/.env.local'],{cwd:root,encoding:'utf8'});
assert.ok(ignored.includes('bot/.env.local')&&ignored.includes('.env.local'));
console.log(`Checked ${count} source/export files: no server credentials in source or mobile/web exports; local environment files are ignored.`);

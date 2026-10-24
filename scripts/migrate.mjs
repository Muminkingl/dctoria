import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

process.loadEnvFile(fileURLToPath(new URL('../bot/.env.local',import.meta.url)));
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,connect_timeout:15,onnotice:()=>{}});
try {
  await sql`create schema if not exists dctoria_private`;
  await sql`create table if not exists dctoria_private.migrations(name text primary key,applied_at timestamptz not null default now())`;
  const directory=new URL('../supabase/migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) {
    if((await sql`select 1 from dctoria_private.migrations where name=${name}`).length) { console.log(`Already applied: ${name}`);continue; }
    const source=await readFile(new URL(name,directory),'utf8');
    await sql.begin(async tx=>{await tx.unsafe(source);await tx`insert into dctoria_private.migrations(name) values(${name})`;});
    console.log(`Applied: ${name}`);
  }
} catch(error) { console.error(`Migration failed (${error.code ?? 'error'}): ${error.message}`);process.exitCode=1; }
finally {await sql.end({timeout:3});}

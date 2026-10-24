import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

process.loadEnvFile(fileURLToPath(new URL('../bot/.env.local',import.meta.url)));
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,connect_timeout:15,onnotice:()=>{}});
const rollback=new Error('Verification rollback');
const published=randomUUID(),draft=randomUUID(),userA=randomUUID(),userB=randomUUID();
let checks=0;
try {
  await sql.begin(async tx=>{
    const role=async (name,user=null,provider='google')=>{
      await tx.unsafe('reset role');
      await tx`select set_config('request.jwt.claims',${JSON.stringify(user?{sub:user,role:'authenticated',app_metadata:{provider,providers:[provider]},is_anonymous:false}:{role:'anon'})},true)`;
      await tx.unsafe(`set local role ${name}`);
    };
    const denied=async fn=>{await assert.rejects(()=>tx.savepoint(fn),error=>error.code==='42501');checks++;};
    await tx`insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values(${userA},${userA+'@example.invalid'},${tx.json({provider:'google',providers:['google']})},${tx.json({full_name:'Verification A'})}),(${userB},${userB+'@example.invalid'},${tx.json({provider:'apple',providers:['apple']})},${tx.json({name:'Verification B'})})`;
    await tx`insert into public.providers(id,category,name,city,address,status) values(${published},'doctors','Verification public','سلێمانی','Verification address','published'),(${draft},'hospitals','Verification private','هەولێر','Verification address','draft')`;
    await role('anon');
    assert.equal((await tx`select id from public.search_directory('Verification')`).length,1);checks++;
    assert.equal((await tx`select id from public.providers where id=${draft}`).length,0);checks++;
    await denied(t=>t`insert into public.providers(category,name,city,address) values('doctors','Forbidden','City','Address')`);
    await denied(t=>t`select public.rate_provider(${published}::uuid,5::smallint)`);
    await denied(t=>t`select * from public.bot_sessions`);
    await denied(t=>t`select public.claim_bot_update(1)`);
    await denied(t=>t`insert into storage.objects(bucket_id,name) values('provider-photos','forbidden.jpg')`);

    await role('authenticated',userA);
    await tx`select public.rate_provider(${published}::uuid,4::smallint)`;
    await tx`select public.rate_provider(${published}::uuid,5::smallint)`;
    let [total]=await tx`select rating_sum,rating_count,rating_average from public.providers where id=${published}`;
    assert.equal(Number(total.rating_sum),5);assert.equal(Number(total.rating_count),1);assert.equal(Number(total.rating_average),5);checks++;
    assert.equal((await tx`select id from public.user_profiles`).length,1);checks++;
    await denied(t=>t`select public.rate_provider(${draft}::uuid,4::smallint)`);
    await denied(t=>t`select public.bot_set_status(${published}::uuid,'archived',5549806778,10)`);

    await role('authenticated',userB,'apple');
    assert.equal((await tx`select * from public.ratings`).length,0);checks++;
    assert.equal((await tx`update public.ratings set score=1 where user_id=${userA} returning score`).length,0);checks++;
    await tx`select public.rate_provider(${published}::uuid,3::smallint)`;
    [total]=await tx`select rating_sum,rating_count,rating_average from public.providers where id=${published}`;
    assert.equal(Number(total.rating_sum),8);assert.equal(Number(total.rating_count),2);assert.equal(Number(total.rating_average),4);checks++;
    await assert.rejects(()=>tx.savepoint(t=>t`select public.rate_provider(${published}::uuid,6::smallint)`),error=>error.code==='23514');checks++;
    await role('authenticated',userB,'email');
    await denied(t=>t`select public.rate_provider(${published}::uuid,4::smallint)`);

    await role('service_role');
    const update=Date.now();
    assert.equal((await tx`select public.claim_bot_update(${update}) as claimed`)[0].claimed,true);checks++;
    assert.equal((await tx`select public.claim_bot_update(${update}) as claimed`)[0].claimed,false);checks++;
    await tx`update public.bot_updates set status='failed' where update_id=${update}`;
    assert.equal((await tx`select public.claim_bot_update(${update}) as claimed`)[0].claimed,true);checks++;
    const savedData={id:draft,category:'hospitals',name:'Verification updated hospital',specialty:'Hospital',specialty_id:'general',city:'هەولێر',address:'Verification address',services:['Consultation'],available:true,status:'draft',rating_sum:99999};
    await tx`select public.bot_save_provider(${tx.json(savedData)},5549806778,${update+1})`;
    assert.equal(Number((await tx`select rating_sum from public.providers where id=${draft}`)[0].rating_sum),0);checks++;
    const photoData=[{storage_path:`${draft}/verification.jpg`,position:0,caption:'Verification'}];
    await tx`select public.bot_save_photos(${draft}::uuid,${tx.json(photoData)},true,5549806778,${update+2})`;
    assert.equal((await tx`select storage_path from public.provider_photos where provider_id=${draft}`).length,1);checks++;
    await tx`insert into public.bot_sessions(chat_id,user_id,step,data) values(5549806778,5549806778,'name',${tx.json({provider:{id:draft}})}) on conflict(chat_id) do update set step=excluded.step,data=excluded.data`;
    const snapshot=(await tx`select public.bot_update_snapshot(${update},5549806778) as data`)[0].data;
    await tx`update public.bot_sessions set step='specialty' where chat_id=5549806778`;
    const retry=(await tx`select public.bot_update_snapshot(${update},5549806778) as data`)[0].data;
    assert.equal(snapshot.step,'name');assert.equal(retry.step,'name');checks++;
    await tx`select public.bot_set_status(${published}::uuid,'archived',5549806778,${update})`;
    await role('anon');
    assert.equal((await tx`select id from public.providers where id=${published}`).length,0);checks++;
    throw rollback;
  });
} catch(error) {
  if(error!==rollback) {console.error(`Database verification failed: ${error.message} (${error.code ?? 'assertion'})`);process.exitCode=1;}
}
try {
  assert.equal((await sql`select id from public.providers where id in (${published},${draft})`).length,0);
  assert.equal((await sql`select id from auth.users where id in (${userA},${userB})`).length,0);
  checks+=2;
  if(!process.exitCode)console.log(`Passed ${checks} live database checks. All verification records were rolled back.`);
} finally {await sql.end({timeout:3});}

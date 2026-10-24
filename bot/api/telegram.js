import { timingSafeEqual } from 'node:crypto';
import { createBot } from '../lib/bot.mjs';
import { createStore } from '../lib/store.mjs';
import { createTelegram } from '../lib/telegram.mjs';
import { allowedAdmins, isAdmin } from '../lib/validation.mjs';

export function secretMatches(actual,expected) {
  if(typeof actual!=='string'||!expected)return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export function createHandler({store,telegram,secret,adminIds}) {
  const bot=createBot({store,telegram,adminIds});
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST')return res.status(405).json({ok:false});
    if(!secretMatches(req.headers['x-telegram-bot-api-secret-token'],secret))return res.status(401).json({ok:false});
    let update=req.body;
    if(typeof update==='string') {try {if(update.length>1_000_000)throw new Error();update=JSON.parse(update);}catch{return res.status(400).json({ok:false});}}
    if(!update || !Number.isSafeInteger(update.update_id) || update.update_id<0)return res.status(400).json({ok:false});
    const cb=update.callback_query,message=cb?.message ?? update.message,actor=cb?.from ?? message?.from;
    // Authenticate before touching the database or responding through Telegram.
    if(!actor||!isAdmin(actor.id,adminIds)||message?.chat?.type!=='private'||message.chat.id!==actor.id)return res.status(200).json({ok:true});
    let claimed=false;
    try {
      claimed=await store.claim(update.update_id);
      if(!claimed) {
        if(await store.updateStatus(update.update_id)==='done')return res.status(200).json({ok:true});
        res.setHeader('Retry-After','3');return res.status(503).json({ok:false});
      }
      const originalSession=await store.snapshot(update.update_id,message.chat.id);
      await bot.handle(update,originalSession);
      await store.finish(update.update_id,'done');
      return res.status(200).json({ok:true});
    } catch {
      if(claimed) {try {await store.finish(update.update_id,'failed');}catch{ /* Lease permits recovery after a database outage. */ }}
      // Never log request bodies, auth tokens, photo URLs, or credentials.
      console.error(`Telegram update ${update.update_id} failed; delivery will be retried.`);
      return res.status(503).json({ok:false});
    }
  };
}

let handler;
export default async function telegramWebhook(req,res) {
  const env=process.env;
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_WEBHOOK_SECRET||!allowedAdmins(env.TELEGRAM_ADMIN_IDS).size)return res.status(503).json({ok:false});
  handler ??= createHandler({store:createStore(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),telegram:createTelegram(env.TELEGRAM_BOT_TOKEN),secret:env.TELEGRAM_WEBHOOK_SECRET,adminIds:allowedAdmins(env.TELEGRAM_ADMIN_IDS)});
  return handler(req,res);
}

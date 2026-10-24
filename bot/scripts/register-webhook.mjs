import { fileURLToPath } from 'node:url';
import { createTelegram } from '../lib/telegram.mjs';
import { allowedAdmins } from '../lib/validation.mjs';

try {process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));}catch { /* Vercel or CI may supply environment variables directly. */ }
const {TELEGRAM_BOT_TOKEN,TELEGRAM_WEBHOOK_SECRET,BOT_PUBLIC_URL,TELEGRAM_ADMIN_IDS}=process.env;
if(!TELEGRAM_BOT_TOKEN || !/^[A-Za-z0-9_-]{32,256}$/.test(TELEGRAM_WEBHOOK_SECRET ?? '') || !allowedAdmins(TELEGRAM_ADMIN_IDS).size)throw new Error('Configure bot token, admin IDs and a 32+ character webhook secret.');
const url=new URL('/api/telegram',BOT_PUBLIC_URL);
if(url.protocol!=='https:')throw new Error('Use the deployed HTTPS Vercel URL.');
const telegram=createTelegram(TELEGRAM_BOT_TOKEN);
await telegram.call('setMyCommands',{commands:[{command:'start',description:'Open Dctoria administration'},{command:'menu',description:'Main menu'},{command:'cancel',description:'Cancel the current form'},{command:'help',description:'How to manage the directory'}]});
await telegram.call('setWebhook',{url:url.toString(),secret_token:TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message','callback_query'],max_connections:1,drop_pending_updates:false});
const info=await telegram.call('getWebhookInfo');
console.log(JSON.stringify({registered:true,url:info.url,pendingUpdates:info.pending_update_count,lastError:info.last_error_message ?? null},null,2));

import { imageType } from './validation.mjs';

const MAX_IMAGE = 5*1024*1024;
export function createTelegram(token,fetcher=fetch) {
  async function call(method,payload={}) {
    const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed (${data.error_code ?? response.status})`);
    return data.result;
  }
  async function download(fileId) {
    const file = await call('getFile',{file_id:fileId});
    if (file.file_size>MAX_IMAGE || !file.file_path || !/^[a-zA-Z0-9_./-]+$/.test(file.file_path) || file.file_path.includes('..')) throw new Error('Invalid file or image exceeds 5 MB.');
    const response = await fetcher(`https://api.telegram.org/file/bot${token}/${file.file_path}`,{signal:AbortSignal.timeout(15_000)});
    if (!response.ok) throw new Error('Photo download failed.');
    const reader=response.body.getReader();
    const chunks=[];let length=0;
    try {
      while (true) { const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>MAX_IMAGE)throw new Error('Image exceeds 5 MB.');chunks.push(chunk.value); }
    } finally { await reader.cancel(); }
    const bytes=Buffer.concat(chunks,length);
    return {bytes,...imageType(bytes)};
  }
  return {call,download};
}

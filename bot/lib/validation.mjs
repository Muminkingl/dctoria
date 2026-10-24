export const categories = { doctors: '🩺 Doctors', hospitals: '🏥 Hospitals', centers: '🏢 Centers', labs: '🧪 Laboratories', offers: '🏷 Offers' };
export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const isAdmin = (id, allowed) => Number.isSafeInteger(id) && allowed.has(String(id));
export const allowedAdmins = value => new Set((value ?? '').split(',').map(id => id.trim()).filter(id => /^[1-9][0-9]{0,15}$/.test(id)));
export const cleanText = (value, min, max) => {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) throw new Error(`Please send ${min}–${max} characters.`);
  return text;
};
export function parseLocation(value) {
  const parts = typeof value === 'string' ? value.split(',').map(part => part.trim()) : [value?.latitude,value?.longitude];
  if (parts.length !== 2 || parts.some(part => part === '' || part == null)) throw new Error('Send a Telegram location, or latitude,longitude.');
  const [latitude,longitude] = parts.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) throw new Error('The coordinates are out of range.');
  return { latitude,longitude };
}
export function parseServices(value) {
  const list = String(value ?? '').split(/[,،\n]/).map(item => item.trim()).filter(Boolean);
  if (list.length>30 || list.some(item => item.length>100)) throw new Error('Send up to 30 services, each under 100 characters.');
  return [...new Set(list)];
}
export function imageType(bytes) {
  if (bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {extension:'jpg',mime:'image/jpeg'};
  if (bytes.length>=8 && Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {extension:'png',mime:'image/png'};
  if (bytes.length>=12 && Buffer.from(bytes.subarray(0,4)).toString()==='RIFF' && Buffer.from(bytes.subarray(8,12)).toString()==='WEBP') return {extension:'webp',mime:'image/webp'};
  throw new Error('Only JPEG, PNG and WebP images are supported.');
}
export function validateProvider(data) {
  if (!isUuid(data.id) || !Object.hasOwn(categories,data.category)) throw new Error('Invalid provider.');
  const provider = {
    id:data.id,category:data.category,name:cleanText(data.name,2,160),specialty:cleanText(data.specialty,0,200),
    specialty_id:cleanText(data.specialty_id || 'general',1,80),city:cleanText(data.city,2,100),address:cleanText(data.address,2,500),
    description:cleanText(data.description,0,4000),phone:data.phone || null,services:data.services ?? [],
    available:data.available!==false,status:data.status ?? 'draft',latitude:null,longitude:null,
  };
  if (!['draft','published','archived'].includes(provider.status)) throw new Error('Invalid status.');
  if (provider.phone && !/^\+?[0-9 ()-]{7,30}$/.test(provider.phone)) throw new Error('Send a valid phone number, for example +9647510201840.');
  if (!Array.isArray(provider.services) || provider.services.length>30 || provider.services.some(s => typeof s!=='string' || s.length>100)) throw new Error('Invalid services.');
  if (data.latitude!=null || data.longitude!=null) Object.assign(provider,parseLocation(data));
  return provider;
}
export class InputError extends Error {}

const CACHE_NAME = 'fallkartei-1.3.8';
const CACHE_PREFIXES = ['fallkartei-','spurzeichen-','ddf-tracker-'];
const APP_SHELL = [
  './','./index.html','./style.css','./install-guide.css','./install-guide.js','./app.js','./manifest.json','./episodes-seed.js','./episodes.json',
  './core.js','./catalog.js','./recommendations.js','./playlists.js','./backup.js','./app-controller.js',
  './favicon-32.png','./icon-192.png','./icon-512.png','./icon-maskable-192.png','./icon-maskable-512.png','./apple-touch-icon.png'
];

self.addEventListener('install',(event)=>{
  event.waitUntil((async()=>{
    const previousKeys = await caches.keys();
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((url)=>cache.add(url)));
    if (previousKeys.some((key)=>CACHE_PREFIXES.some((prefix)=>key.startsWith(prefix)))) await self.skipWaiting();
  })());
});
self.addEventListener('message',(event)=>{ if(event.data?.type==='SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate',(event)=>{
  event.waitUntil(Promise.all([
    caches.keys().then((keys)=>Promise.all(keys.filter((key)=>CACHE_PREFIXES.some((prefix)=>key.startsWith(prefix))&&key!==CACHE_NAME).map((key)=>caches.delete(key)))),
    self.clients.claim(),
  ]));
});
async function networkFirst(request,timeout=3500){
  const cache=await caches.open(CACHE_NAME); const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(request,{signal:controller.signal});if(response?.ok)cache.put(request,response.clone());return response;}catch{const cached=await cache.match(request);return cached||Response.error();}finally{clearTimeout(timer);}
}
async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME); const cached=await cache.match(request); const network=fetch(request).then((response)=>{if(response?.ok)cache.put(request,response.clone());return response;}).catch(()=>null); return cached||network||Response.error();
}
self.addEventListener('fetch',(event)=>{
  const url=new URL(event.request.url); if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(caches.match('./index.html').then((cached)=>{const update=fetch(event.request).then((response)=>{if(response?.ok)caches.open(CACHE_NAME).then((cache)=>cache.put('./index.html',response.clone()));return response;}).catch(()=>null);return cached||update||Response.error();}));return;}
  if(url.pathname.endsWith('/episodes.json')){event.respondWith(networkFirst(event.request));return;}
  event.respondWith(staleWhileRevalidate(event.request));
});

self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>self.clients.claim());
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>new Response('<h3 style="font-family:sans-serif;color:#fff;background:#0b0a10">Phoenix is offline - check your connection</h3>',{headers:{'Content-Type':'text/html'}})))}});

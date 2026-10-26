// Service worker "rede primeiro": sempre busca a versão nova do site e só usa o cache se estiver sem internet.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  if(new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{
    if(res.ok){const c=res.clone();caches.open('nerorpg-offline').then(x=>x.put(r,c))}
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
});

/* ---------- notificações push ---------- */
// Chega um aviso do servidor (função enviar-push do Supabase). Se o app já está aberto na tela, não mostra nada
// (o app já toca o som e mostra a bolinha de não lidas).
self.addEventListener('push',e=>{
  let d={};
  try{d=e.data?e.data.json():{}}catch(_){d={corpo:e.data?e.data.text():''}}
  e.waitUntil((async()=>{
    const cs=await clients.matchAll({type:'window',includeUncontrolled:true});
    if(cs.some(c=>c.visibilityState==='visible'))return;
    await self.registration.showNotification(d.titulo||'NeroRPG',{
      body:d.corpo||'Mensagem nova',
      icon:'icone-180.png',
      badge:'badge-96.png',
      tag:d.tag||undefined,
      renotify:!!d.tag,
      data:{cid:d.cid||'',dm:d.dm||''}
    });
    // bolinha/número no ícone do app = quantas notificações estão pendentes
    try{const n=(await self.registration.getNotifications()).length;if(self.navigator.setAppBadge)await self.navigator.setAppBadge(n||1)}catch(_){}
  })());
});
// Tocar na notificação abre (ou traz para frente) o app e vai direto para a campanha ou conversa.
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const d=e.notification.data||{};
  e.waitUntil((async()=>{
    const cs=await clients.matchAll({type:'window',includeUncontrolled:true});
    const alvo=cs.find(c=>'focus' in c);
    if(alvo){await alvo.focus();alvo.postMessage({tipo:'push-abrir',cid:d.cid,dm:d.dm});return}
    const a=d.dm?'d:'+d.dm:d.cid?'c:'+d.cid:'';
    await clients.openWindow(a?'./?abrir='+encodeURIComponent(a):'./');
  })());
});

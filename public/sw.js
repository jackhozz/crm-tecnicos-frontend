// Mantenizapp Background Service Worker
// Este archivo se ejecuta en segundo plano en el navegador del dispositivo, incluso si la pestaña de la app está cerrada.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Escuchar eventos PUSH enviados desde el servidor (Supabase, FCM, OneSignal)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Mantenizapp',
    body: 'Tienes un nuevo recordatorio técnico o mantenimiento pendiente.',
    url: '/'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver en Mantenizapp' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// 2. Controlar la acción al hacer clic sobre la notificación en el sistema operativo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta en alguna pestaña, la enfoca
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no está abierta, abre una nueva ventana con la ruta
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

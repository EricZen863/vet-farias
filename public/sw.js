self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Lembrete Vet Farias 🐾', body: event.data ? event.data.text() : 'Você tem um novo lembrete!' };
  }

  const title = data.title || 'Lembrete Vet Farias 🐾';
  const options = {
    body: data.body || 'Você tem uma tarefa ou compromisso agendado!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'vet-farias-reminder',
    renotify: true,
    data: { url: data.url || '/kanban' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/kanban';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('/kanban') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

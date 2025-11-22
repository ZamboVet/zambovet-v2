// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Notification',
      body: event.data.text(),
    };
  }

  const { title, body, icon, badge, data } = notificationData;

  const options = {
    body: body || '',
    icon: icon || '/icon-192x192.png',
    badge: badge || '/badge-72x72.png',
    data: data || {},
    tag: 'notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title || 'ZamboVet Notification', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data;
  let urlToOpen = '/';

  // Navigate based on notification data
  if (data?.appointmentId) {
    urlToOpen = `/veterinarian/consultations/${data.appointmentId}`;
  } else if (data?.postId) {
    urlToOpen = `/pet_owner/moments/${data.postId}`;
  } else if (data?.url) {
    urlToOpen = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// sw.js

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// في ملف sw.js
self.addEventListener('push', event => {
    const data = event.data.json();
    const { callId, callerId, callerName, callerAvatar } = data;

    event.waitUntil(
        fetch(`https://football-az-5a50d-default-rtdb.firebaseio.com/users/${callerId}.json`)
            .then(res => res.json())
            .then(userData => {
                const finalCallerName = userData?.username || callerName || 'مستخدم';
                const finalCallerAvatar = userData?.profilePic || callerAvatar || 'https://via.placeholder.com/150';

                return self.registration.showNotification(`مكالمة واردة من ${finalCallerName}`, {
                    body: 'اضغط للرد على المكالمة',
                    icon: finalCallerAvatar,
                    vibrate: [200, 100, 200],
                    data: { callId, callerId }
                });
            })
            .catch(() => {
                return self.registration.showNotification('مكالمة واردة', {
                    body: `مكالمة واردة من ${callerName || 'مستخدم'}`,
                    icon: callerAvatar || 'https://via.placeholder.com/150',
                    vibrate: [200, 100, 200],
                    data: { callId, callerId }
                });
            })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const { callId, callerId } = event.notification.data;

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            const url = `/?callId=${callId}&callerId=${callerId}`;
            if (windowClients.length > 0) {
                return windowClients[0].navigate(url).then(client => client.focus());
            } else {
                return clients.openWindow(url);
            }
        })
    );
});

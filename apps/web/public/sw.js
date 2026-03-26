self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.roomId
    ? `/rift/${event.notification.data.roomId}`
    : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.focus();
        if ("navigate" in existing) {
          return existing.navigate(targetUrl);
        }
        return undefined;
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

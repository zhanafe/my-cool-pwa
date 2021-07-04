self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const { title, options } = event.data.json();
      await self.registration.showNotification(title, options);
    })()
  );
});

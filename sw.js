// Một Ổ Nha! - emergency cache cleanup
// Tạm thời KHÔNG cache/preload asset.

self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const names = await caches.keys();

        await Promise.all(
            names
                .filter(name =>
                    name.startsWith("mot-o-nha-")
                )
                .map(name =>
                    caches.delete(name)
                )
        );

        await self.clients.claim();

        // Tự gỡ registration sau khi đã dọn cache cũ.
        await self.registration.unregister();
    })());
});

// Không có fetch handler.
// Mọi request đi thẳng ra network/browser bình thường.

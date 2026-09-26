const CACHE_NAME = "mot-o-nha-v3";
const ROOT = self.registration.scope;

const url = (path) => new URL(path, ROOT).href;

// Những file bắt buộc để game mở được.
const coreFiles = [
    "./",
    "index.html",
    "style.css",
    "game.js"
];

// Tên nguyên liệu đang dùng trong game.js.
const ingredients = [
    "pate",
    "grilled-pork",
    "egg",
    "cha",
    "cucumber",
    "pickles",
    "herbs",
    "chili",
    "meatballs",
    "jambon",
    "cheese",
    "butter",
    "ketchup",
    "sriracha",
    "mayonnaise"
];

// Ảnh, font và âm thanh. File nào chưa có sẽ được bỏ qua.
const extraFiles = [
    "images/icon.png",
    "images/recipe.png",
    "images/banh-mi.png",
    "images/board.png",
    "images/ingredient-table.png",
    "images/bread.png",
    "images/grab.png",
    "images/ingredients/bread-bottom.png",
    "images/ingredients/bread-top.png",

    ...ingredients.map((name) => `images/${name}.png`),
    ...ingredients.map((name) => `images/ingredients/${name}.png`),

    ...["A", "B", "C", "D", "E", "F"].flatMap((id) =>
        [1, 2, 3].map((mood) =>
            `images/customer/${id}/${id}${mood}.png`
        )
    ),

    "fonts/SVN-Freude.otf",
    "fonts/SVN-Rush-Hour.otf",

    "audio/ingredient.mp3",
    "audio/click.mp3",
    "audio/lobby.mp3",
    "audio/kitchen1.mp3",
    "audio/kitchen2.mp3",
    "audio/openstore.mp3",
    "audio/correct.mp3",
    "audio/wrong.mp3"
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Thiếu file cốt lõi thì không cài bản offline bị hỏng.
        await cache.addAll(coreFiles.map(url));

        // Một file phụ bị thiếu sẽ không làm hỏng toàn bộ quá trình cài.
        await Promise.allSettled(
            extraFiles.map((path) => cache.add(url(path)))
        );

        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();

        await Promise.all(
            names
                .filter((name) =>
                    name.startsWith("mot-o-nha-") &&
                    name !== CACHE_NAME
                )
                .map((name) => caches.delete(name))
        );

        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const requestUrl = new URL(request.url);

    if (
        request.method !== "GET" ||
        requestUrl.origin !== self.location.origin ||
        !request.url.startsWith(ROOT)
    ) {
        return;
    }

    const isGameCode =
        request.mode === "navigate" ||
        request.destination === "script" ||
        request.destination === "style";

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        if (isGameCode) {
            // Có mạng: lấy phiên bản mới nhất.
            // Mất mạng: dùng bản đã lưu.
            try {
                const response = await fetch(request);

                if (response.ok) {
                    await cache.put(request, response.clone())
                        .catch(() => {});
                }

                return response;
            } catch {
                return (
                    await cache.match(request) ||
                    (request.mode === "navigate"
                        ? await cache.match(url("index.html"))
                        : undefined) ||
                    Response.error()
                );
            }
        }

        // Ảnh, font và âm thanh: có mạng thì lấy bản mới.
        // Mất mạng mới dùng bản đã lưu.
        try {
            const response = await fetch(request, {
                cache: "no-store"
            });

            if (response.ok) {
                await cache.put(request, response.clone())
                    .catch(() => {});
            }

            return response;
        } catch {
            return (
                await cache.match(request) ||
                Response.error()
            );
        }
    })());
});
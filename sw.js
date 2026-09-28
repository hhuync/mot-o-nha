const CACHE_NAME = "mot-o-nha-v6";
const ROOT = self.registration.scope;

const url = (path) => new URL(path, ROOT).href;

// Những file bắt buộc để game mở offline.
const coreFiles = [
    "./",
    "index.html",
    "style.css",
    "game.js",
    "manifest.json"
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

// Ảnh, font và âm thanh.
// File nào chưa có sẽ được bỏ qua, không làm fail toàn bộ SW.
const extraFiles = [
    "images/icon.png",
    "images/icon-192.png",
    "images/icon-512.png",
    "images/recipe.png",
    "images/banh-mi.png",
    "images/board.png",
    "images/ingredient-table.png",
    "images/drinks/coc-back.png",
    "images/drinks/coc-front.png",
    "images/drinks/da.png",
    "images/drinks/tra-chanh.png",
    "images/drinks/tra-tac.png",
    "images/drinks/thach-ca.png",
    "images/drinks/thach-dua.png",
    "images/drinks/tc-trang.png",
    "images/drinks/tc-den.png",
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

async function fetchFresh(path) {
    return fetch(url(path), {
        cache: "no-store"
    });
}

async function cacheFreshFile(cache, path, required = false) {
    try {
        const response = await fetchFresh(path);

        if (!response.ok) {
            if (required) {
                throw new Error(
                    `Không tải được ${path}: HTTP ${response.status}`
                );
            }

            return;
        }

        await cache.put(
            url(path),
            response.clone()
        );
    } catch (error) {
        if (required) {
            throw error;
        }

        console.warn(
            "Bỏ qua file phụ khi cài PWA:",
            path,
            error
        );
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // QUAN TRỌNG:
        // Luôn lấy core code trực tiếp từ network, không dùng HTTP cache cũ.
        for (const path of coreFiles) {
            await cacheFreshFile(
                cache,
                path,
                true
            );
        }

        // File phụ lỗi/thiếu không làm hỏng bản cập nhật.
        await Promise.allSettled(
            extraFiles.map((path) =>
                cacheFreshFile(
                    cache,
                    path,
                    false
                )
            )
        );

        // Bản SW mới không đứng chờ bản cũ đóng.
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();

        // Xóa toàn bộ cache Một Ổ Nha cũ.
        await Promise.all(
            names
                .filter((name) =>
                    name.startsWith("mot-o-nha-") &&
                    name !== CACHE_NAME
                )
                .map((name) =>
                    caches.delete(name)
                )
        );

        // Nhận quyền điều khiển cả những tab/PWA đang mở.
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

    const isNavigation =
        request.mode === "navigate";

    const isLiveCode =
        isNavigation ||
        request.destination === "script" ||
        request.destination === "style" ||
        requestUrl.pathname.endsWith("/manifest.json");

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        if (isLiveCode) {
            /*
             * HTML / JS / CSS / manifest:
             * ONLINE  -> luôn lấy trực tiếp bản mới nhất từ server.
             * OFFLINE -> fallback sang cache.
             *
             * cache:"no-store" là phần quan trọng:
             * không cho Safari/PWA lấy lại response cũ từ HTTP cache.
             */
            try {
                const response = await fetch(
                    request,
                    {
                        cache: "no-store"
                    }
                );

                if (response.ok) {
                    await cache.put(
                        request,
                        response.clone()
                    ).catch(() => {});
                }

                return response;
            } catch {
                return (
                    await cache.match(request) ||
                    (
                        isNavigation
                            ? await cache.match(
                                url("index.html")
                            )
                            : undefined
                    ) ||
                    Response.error()
                );
            }
        }

        /*
         * Asset (ảnh/font/audio):
         * Online -> network fresh, đồng thời cập nhật cache.
         * Offline -> cache.
         */
        try {
            const response = await fetch(
                request,
                {
                    cache: "no-store"
                }
            );

            if (response.ok) {
                await cache.put(
                    request,
                    response.clone()
                ).catch(() => {});
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

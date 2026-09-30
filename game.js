// ======================================================
// MỘT Ổ NHA! - game.js
// Bread stock + expanded recipes + recipe book
// ======================================================

const SAVE_KEY = "mot-o-nha-save-v3";
const BASE_DAILY_UTILITIES = 15000;

function getDailyUtilityCost() {

    const seatingLevel =
        Number(
            game?.upgrades?.seating
        ) || 0;

    const airconLevel =
        Number(
            game?.upgrades?.aircon
        ) || 0;


    // Base 15k/ngày.
    // Chỗ ngồi tăng 2k mỗi cấp.
    // Làm mát tăng 4k mỗi cấp.
    return (
        BASE_DAILY_UTILITIES +
        seatingLevel * 2000 +
        airconLevel * 4000
    );
}
const DAY_START_KEY = "mot-o-nha-day-start-v1";


// ======================================================
// BACKGROUND MUSIC
// ======================================================

// ======================================================
// LOW-LATENCY SFX
// iOS/PWA có thể bị trễ khi liên tục rewind cùng 1 Audio element.
// Dùng một pool nhỏ để lần bấm kế tiếp có audio sẵn sàng phát.
// ======================================================

// ======================================================
// WEB AUDIO LOW-LATENCY LAYER
// HTMLAudioElement trên iOS/PWA vẫn có thể có startup latency.
// Web Audio phát AudioBuffer trực tiếp nên phản hồi nhanh hơn rõ rệt.
// ======================================================

const LowLatencyAudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

const lowLatencyAudioContext =
    LowLatencyAudioContext
        ? new LowLatencyAudioContext()
        : null;

const lowLatencySfxBuffers =
    new Map();


async function preloadLowLatencySfx(
    key,
    src
) {
    if (!lowLatencyAudioContext) {
        return;
    }

    try {
        const response =
            await fetch(
                src,
                {
                    cache: "force-cache"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const arrayBuffer =
            await response.arrayBuffer();

        const audioBuffer =
            await lowLatencyAudioContext
                .decodeAudioData(
                    arrayBuffer.slice(0)
                );

        lowLatencySfxBuffers.set(
            key,
            audioBuffer
        );

    } catch (error) {
        console.warn(
            "Không preload được SFX low-latency:",
            key,
            error
        );
    }
}


function unlockLowLatencyAudio() {
    if (
        lowLatencyAudioContext &&
        lowLatencyAudioContext.state ===
            "suspended"
    ) {
        lowLatencyAudioContext
            .resume()
            .catch(() => {});
    }
}


function playLowLatencySfx(
    key,
    volume
) {
    if (!lowLatencyAudioContext) {
        return false;
    }

    const buffer =
        lowLatencySfxBuffers.get(key);

    if (!buffer) {
        return false;
    }

    unlockLowLatencyAudio();

    // iOS may still be resuming after the first tap back into the app.
    // Let the HTMLAudio pool handle this tap instead of claiming it played.
    if (lowLatencyAudioContext.state !== "running") {
        return false;
    }

    try {
        const source =
            lowLatencyAudioContext
                .createBufferSource();

        const gain =
            lowLatencyAudioContext
                .createGain();

        source.buffer =
            buffer;

        gain.gain.value =
            volume;

        source.connect(gain);

        gain.connect(
            lowLatencyAudioContext
                .destination
        );

        source.onended = () => {
            try {
                source.disconnect();
                gain.disconnect();
            } catch {}
        };

        source.start(0);

        return true;

    } catch {
        return false;
    }
}


// Decode sẵn ngay khi JS khởi động.
// AudioContext có thể đang suspended nhưng decode vẫn chuẩn bị buffer được.
preloadLowLatencySfx(
    "ui-click",
    "audio/click.mp3"
);

preloadLowLatencySfx(
    "ingredient",
    "audio/ingredient.mp3"
);


// Cú chạm đầu tiên trên iOS/PWA sẽ unlock AudioContext.
document.addEventListener(
    "pointerdown",
    unlockLowLatencyAudio,
    {
        capture: true,
        passive: true
    }
);


function createSfxPool(
    src,
    volume,
    size = 4
) {
    return Array.from(
        { length: size },
        () => {
            const sound = new Audio(src);

            sound.volume = volume;
            sound.preload = "auto";

            try {
                sound.load();
            } catch {}

            return sound;
        }
    );
}


const ingredientSoundPool =
    createSfxPool(
        "audio/ingredient.mp3",
        0.45,
        4
    );

let ingredientSoundCursor = 0;

let earlyIngredientSound = {
    name: null,
    at: 0
};


function playIngredientSoundNow() {
    // Ưu tiên Web Audio vì latency thấp hơn trên iOS/PWA.
    if (
        playLowLatencySfx(
            "ingredient",
            0.45
        )
    ) {
        return;
    }

    // Fallback cho browser chưa decode buffer xong.
    const sound =
        ingredientSoundPool[
            ingredientSoundCursor %
            ingredientSoundPool.length
        ];

    ingredientSoundCursor++;

    try {
        sound.pause();
        sound.currentTime = 0;
    } catch {}

    sound.play().catch(() => {});
}


function primeIngredientSound(name) {
    earlyIngredientSound = {
        name,
        at: performance.now()
    };

    playIngredientSoundNow();
}


function playIngredientSound(name = null) {
    const now =
        performance.now();

    // Nếu âm thanh đã phát ngay ở pointerdown,
    // click/toggle sau đó không phát lại lần thứ hai.
    if (
        name &&
        earlyIngredientSound.name === name &&
        now - earlyIngredientSound.at < 600
    ) {
        earlyIngredientSound = {
            name: null,
            at: 0
        };

        return;
    }

    playIngredientSoundNow();
}


// Âm thanh bóp sốt.
// Chạy trong suốt lúc người chơi đang nhấn giữ chai sốt.
const squirtSound = new Audio("audio/squirt.mp3");
squirtSound.volume = 0.45;
squirtSound.loop = true;

function startSquirtSound() {
    squirtSound.pause();
    squirtSound.currentTime = 0;
    squirtSound.play().catch(() => {});
}

function stopSquirtSound() {
    squirtSound.pause();
    squirtSound.currentTime = 0;
}

const correctSound = new Audio("audio/correct.mp3");
const wrongSound = new Audio("audio/wrong.mp3");

correctSound.volume = 0.6;
wrongSound.volume = 0.20;

function playOrderResultSound(correct) {
    const sound = correct ? correctSound : wrongSound;
    const otherSound = correct ? wrongSound : correctSound;

    otherSound.pause();
    otherSound.currentTime = 0;

    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

const MUSIC_VOLUME = 0.2;

const musicTracks = {
    lobby: "audio/lobby.mp3",
    kitchen1: "audio/kitchen1.mp3",
    kitchen2: "audio/kitchen2.mp3"
};

const backgroundMusic = new Audio();
backgroundMusic.loop = true;
backgroundMusic.volume = MUSIC_VOLUME;

let currentMusicKey = null;
let desiredMusicKey = "lobby";
let musicUnlocked = false;
let musicEnabled = true;

/* =========================
   LANGUAGE
========================= */

const translations = {
    vi: {
        languageName: "Tiếng Việt",

        settings: "Cài đặt",
        about: "Giới thiệu",
        howToPlay: "Hướng dẫn chơi",
        comingSoon: "Sắp có",
        version: "Phiên bản",
        credits: "Credit",
        music: "Nhạc nền",
        musicOn: "Bật",
        musicOff: "Tắt",
        language: "Ngôn ngữ",
        close: "Đóng",

        aboutTitle: "Giới thiệu",
        aboutMessage:
        "Một Ổ Nha! là game quản lý một tiệm bánh mì nhỏ, nơi bạn chuẩn bị nguyên liệu, làm bánh theo yêu cầu của khách và phát triển tiệm qua từng ngày.",
        creditTitle: "Credit",
        creditMessage:
    "Thiết kế & phát triển game: Huy Nguyen (@hhuync trên Threads và Instagram)<br><br>🎵 Âm nhạc: Andrii Hroza - andriih trên Pixabay<br><br>Một số hình ảnh và asset trong game được tạo với sự hỗ trợ của AI, sau đó được lựa chọn và chỉnh sửa để phù hợp với trò chơi."
    },

    en: {
        languageName: "English",

        settings: "Settings",
        about: "About",
        howToPlay: "How to Play",
        comingSoon: "Coming soon",
        version: "Version",
        credits: "Credits",
        music: "Music",
        musicOn: "On",
        musicOff: "Off",
        language: "Language",
        close: "Close",

        aboutTitle: "About",
        aboutMessage:
    "Một Ổ Nha! is a cozy bánh mì shop management game where you prepare ingredients, make sandwiches to each customer's order, and grow your shop day by day.",
        creditTitle: "Credits",
creditMessage:
    "Game design & development: Huy Nguyen (@hhuync trên Threads và Instagram)<br><br>🎵 Music: Andrii Hroza - andriih on Pixabay<br><br>Some visual assets in the game were created with the assistance of AI, then selected and edited to fit the game."
}
};

let currentLanguage =
    localStorage.getItem("mot-o-nha-language") || "vi";


function t(key) {
    return (
        translations[currentLanguage]?.[key] ??
        translations.vi[key] ??
        key
    );
}


function setLanguage(language) {
    if (!translations[language]) {
        return;
    }

    currentLanguage = language;

    localStorage.setItem(
        "mot-o-nha-language",
        language
    );
}

/* =========================
   TUTORIAL / GUIDE
========================= */

const TUTORIAL_SEEN_KEY = "mot-o-nha-tutorial-version";
const TUTORIAL_VERSION = "0.3.2";

const tutorialSlides = [
    {
        image: "images/guide/g1.png",
        title: "Chào mừng đến với Một Ổ Nha!",
        caption:
            "Bạn sẽ điều hành một tiệm bánh mì nhỏ.\nMỗi ngày hãy nhập hàng, phục vụ khách thật chuẩn và kiếm tiền để phát triển tiệm."
    },
    {
        image: "images/guide/g2.png",
        title: "Chuẩn bị trước khi mở cửa",
        caption:
            "Đầu mỗi ngày, hãy nhập thêm hoặc mở khóa nguyên liệu mới.\nĐừng để hết hàng giữa lúc khách đang chờ nha!"
    },
    {
        image: "images/guide/g3.png",
        title: "Xem sổ công thức",
        caption:
            "Nhấn vào quyển sổ để xem công thức gốc của từng món.\nKhách đôi khi sẽ có yêu cầu riêng, nên nhớ đọc kỹ lời thoại."
    },
    {
        image: "images/guide/g4.png",
        title: "Làm bánh theo yêu cầu",
        caption:
            "Lấy một ổ bánh mì trước, sau đó chọn đúng nguyên liệu khách cần.\nChú ý các yêu cầu như không cho rau, không cho sốt hoặc thêm nguyên liệu."
    },
    {
        image: "images/guide/g5.png",
        title: "Giữ để bóp sốt",
        caption:
            "Với Ketchup, Sriracha và Mayonnaise, hãy nhấn giữ chai sốt cho đến khi vòng tròn đầy.\nThả tay quá sớm thì sốt sẽ chưa được thêm vào bánh."
    },
    {
        image: "images/guide/g6.png",
        title: "Pha thêm đồ uống 🥤",
        caption:
            "Trượt sang quầy đồ uống để lấy cốc, nhấn giữ bình trà 2 giây để rót, thêm đá và tối đa 1 topping.\nKhách có thể gọi bánh mì kèm nước, nên nhớ đọc đủ cả đơn nhé!"
    },
    {
        image: "images/guide/g7.png",
        title: "Phục vụ thật nhanh!",
        caption:
            "Khách càng chờ lâu càng mất kiên nhẫn và đánh giá thấp hơn.\nPhục vụ chính xác, kiếm tiền và phát triển tiệm qua từng ngày!"
    }
];

let tutorialIndex = 0;
let tutorialForcedRead = false;

function getTutorialRefs() {
    return {
        modal: document.getElementById("tutorial-modal"),
        image: document.getElementById("tutorial-image"),
        title: document.getElementById("tutorial-title"),
        caption: document.getElementById("tutorial-caption"),
        step: document.getElementById("tutorial-step"),
        prev: document.getElementById("tutorial-prev"),
        next: document.getElementById("tutorial-next"),
        close: document.getElementById("tutorial-close")
    };
}

function renderTutorialSlide() {
    const refs = getTutorialRefs();
    if (!refs.modal) return;

    const slide = tutorialSlides[tutorialIndex];
    if (!slide) return;

    refs.image.src = slide.image;
    refs.image.alt = slide.title;
    refs.title.textContent = slide.title;
    refs.caption.textContent = slide.caption;
    refs.step.textContent =
        `${tutorialIndex + 1} / ${tutorialSlides.length}`;

    refs.prev.disabled = tutorialIndex === 0;

    refs.next.textContent =
        tutorialIndex === tutorialSlides.length - 1
            ? "Bắt đầu chơi"
            : "Tiếp →";

    const atLastSlide =
        tutorialIndex === tutorialSlides.length - 1;

    // Hướng dẫn chơi không có nút X.
    // Chỉ thoát bằng "Bắt đầu chơi" ở trang 7.
    refs.close.hidden = true;
    refs.close.disabled = true;
}

function openTutorial(
    startIndex = 0,
    forcedRead = false
) {
    const refs = getTutorialRefs();
    if (!refs.modal) return;

    tutorialForcedRead = true;

    tutorialIndex = Math.max(
        0,
        Math.min(startIndex, tutorialSlides.length - 1)
    );

    refs.modal.classList.remove("hidden");
    document.body.classList.add("tutorial-open");

    renderTutorialSlide();
}

function closeTutorial(markSeen = true) {
    const refs = getTutorialRefs();
    if (!refs.modal) return;

    if (
        tutorialIndex <
            tutorialSlides.length - 1
    ) {
        return;
    }

    refs.modal.classList.add("hidden");
    document.body.classList.remove("tutorial-open");

    if (markSeen) {
        localStorage.setItem(
            TUTORIAL_SEEN_KEY,
            TUTORIAL_VERSION
        );
    }

    tutorialForcedRead = false;
}

function nextTutorialSlide() {
    if (tutorialIndex < tutorialSlides.length - 1) {
        tutorialIndex++;
        renderTutorialSlide();
        return;
    }

    closeTutorial(true);
}

function prevTutorialSlide() {
    if (tutorialIndex > 0) {
        tutorialIndex--;
        renderTutorialSlide();
    }
}

function maybeShowTutorialOnFirstTime() {
    const seenVersion =
        localStorage.getItem(TUTORIAL_SEEN_KEY);

    if (seenVersion !== TUTORIAL_VERSION) {
        openTutorial(
            0,
            true
        );
    }
}

function bindTutorialEvents() {
    const refs = getTutorialRefs();
    if (!refs.modal) return;

    refs.close.addEventListener("click", () => {
        closeTutorial(true);
    });

    refs.next.addEventListener("click", () => {
        nextTutorialSlide();
    });

    refs.prev.addEventListener("click", () => {
        prevTutorialSlide();
    });

    document.addEventListener("keydown", event => {
        if (refs.modal.classList.contains("hidden")) return;

        if (event.key === "Escape") {
            event.preventDefault();
        } else if (event.key === "ArrowRight") {
            nextTutorialSlide();
        } else if (event.key === "ArrowLeft") {
            prevTutorialSlide();
        }
    });
}

function getKitchenMusicKey() {
    return game.day % 2 === 0
        ? "kitchen2"
        : "kitchen1";
}

let musicBackgroundPaused = false;
let resumeMusicOnReturn = false;
let musicRequestId = 0;
let musicStarting = false;

function switchMusic(key) {
    desiredMusicKey = key;

    if (
        !musicTracks[key] ||
        !musicUnlocked ||
        !musicEnabled ||
        document.hidden ||
        musicBackgroundPaused
    ) {
        return;
    }

    if (currentMusicKey !== key) {
        musicRequestId++;
        musicStarting = false;
        backgroundMusic.pause();
        backgroundMusic.src = musicTracks[key];
        backgroundMusic.currentTime = 0;
        currentMusicKey = key;
    }

    backgroundMusic.volume = MUSIC_VOLUME;
    if (!backgroundMusic.paused || musicStarting) return;

    const requestId = ++musicRequestId;
    musicStarting = true;
    backgroundMusic.play().then(() => {
        if (requestId === musicRequestId) musicStarting = false;
    }).catch((error) => {
        if (requestId === musicRequestId) {
            musicStarting = false;
            console.warn("Không phát được nhạc:", error);
        }
        // Giữ src và key để tương tác tiếp theo có thể thử lại.
    });
}

function unlockMusic() {
    musicUnlocked = true;
    switchMusic(desiredMusicKey);
}

function setMusicEnabled(enabled) {
    musicEnabled = enabled;

    if (!enabled) {
        musicRequestId++;
        musicStarting = false;
        backgroundMusic.pause();
        return;
    }

    unlockMusic();
}

function pauseMusicInBackground() {
    if (!musicBackgroundPaused) {
        resumeMusicOnReturn =
            musicEnabled &&
            musicUnlocked &&
            (musicStarting || !backgroundMusic.paused);
    }

    musicBackgroundPaused = true;
    musicRequestId++;
    musicStarting = false;
    backgroundMusic.pause();
}

function resumeMusicFromBackground() {
    if (document.hidden || !musicBackgroundPaused) return;

    musicBackgroundPaused = false;
    const shouldResume = resumeMusicOnReturn;
    resumeMusicOnReturn = false;

    if (shouldResume && musicEnabled) {
        switchMusic(desiredMusicKey);
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pauseMusicInBackground();
    } else {
        resumeMusicFromBackground();
    }
});

window.addEventListener("pagehide", pauseMusicInBackground);
window.addEventListener("pageshow", resumeMusicFromBackground);

// Nếu trình duyệt chặn play() khi quay lại, cú chạm tiếp theo sẽ thử lại.
document.addEventListener("pointerdown", () => {
    if (
        musicEnabled &&
        musicUnlocked &&
        !document.hidden &&
        !musicBackgroundPaused &&
        backgroundMusic.paused
    ) {
        switchMusic(desiredMusicKey);
    }
}, { capture: true });

// ======================================================
// INGREDIENTS
// tableImage = hình trên bàn nguyên liệu
// image      = sprite nằm trong ổ bánh khi làm
// ======================================================

const ingredients = {
    "Pâté": {
        emoji: "🍖",
        tableImage: "images/pate.png",
        image: "images/ingredients/pate.png",
        unlocked: true,
        unlockPrice: 0,
        stock: 10,
        restock: 5,
        restockPrice: 12000
    },

    "Thịt nướng": {
        emoji: "🥩",
        tableImage: "images/grilled-pork.png",
        image: "images/ingredients/grilled-pork.png",
        unlocked: false,
        unlockPrice: 65000,
        stock: 0,
        restock: 5,
        restockPrice: 13000
    },

    "Trứng": {
        emoji: "🍳",
        tableImage: "images/egg.png",
        image: "images/ingredients/egg.png",
        unlocked: true,
        unlockPrice: 0,
        stock: 10,
        restock: 5,
        restockPrice: 9000
    },

    "Chả": {
        emoji: "🍥",
        tableImage: "images/cha.png",
        image: "images/ingredients/cha.png",
        unlocked: false,
        unlockPrice: 50000,
        stock: 0,
        restock: 5,
        restockPrice: 9000
    },

    "Dưa leo": {
        emoji: "🥒",
        tableImage: "images/cucumber.png",
        image: "images/ingredients/cucumber.png",
        unlocked: true,
        unlockPrice: 0,
        stock: 12,
        restock: 5,
        restockPrice: 3000
    },

    "Đồ chua": {
        emoji: "🥕",
        tableImage: "images/pickles.png",
        image: "images/ingredients/pickles.png",
        unlocked: false,
        unlockPrice: 30000,
        stock: 0,
        restock: 5,
        restockPrice: 4000
    },

    "Rau": {
        emoji: "🌿",
        tableImage: "images/herbs.png",
        image: "images/ingredients/herbs.png",
        unlocked: true,
        unlockPrice: 0,
        stock: 12,
        restock: 5,
        restockPrice: 3000
    },

    "Ớt": {
        emoji: "🌶️",
        tableImage: "images/chili.png",
        image: "images/ingredients/chili.png",
        unlocked: false,
        unlockPrice: 25000,
        stock: 0,
        restock: 5,
        restockPrice: 3000
    },

    "Meatballs": {
        emoji: "🧆",
        tableImage: "images/meatballs.png",
        image: "images/ingredients/meatballs.png",
        unlocked: false,
        unlockPrice: 100000,
        stock: 0,
        restock: 5,
        restockPrice: 15000
    },

    "Jambon": {
        emoji: "🥓",
        tableImage: "images/jambon.png",
        image: "images/ingredients/jambon.png",
        unlocked: false,
        unlockPrice: 80000,
        stock: 0,
        restock: 5,
        restockPrice: 12000
    },

    "Cheese": {
        emoji: "🧀",
        tableImage: "images/cheese.png",
        image: "images/ingredients/cheese.png",
        unlocked: false,
        unlockPrice: 90000,
        stock: 0,
        restock: 5,
        restockPrice: 12000
    },

    "Bơ": {
        emoji: "🧈",
        tableImage: "images/butter.png",
        image: "images/ingredients/butter.png",
        unlocked: false,
        unlockPrice: 55000,
        stock: 0,
        restock: 5,
        restockPrice: 7000
    },

    "Ketchup": {
        emoji: "🍅",
        tableImage: "images/ketchup.png",
        image: "images/ingredients/ketchup.png",
        unlocked: true,
        unlockPrice: 0,
        stock: 10,
        restock: 5,
        restockPrice: 5000
    },

    "Sriracha": {
        emoji: "🌶️",
        tableImage: "images/sriracha.png",
        image: "images/ingredients/sriracha.png",
        unlocked: false,
        unlockPrice: 40000,
        stock: 0,
        restock: 5,
        restockPrice: 6000
    },

    "Mayonnaise": {
        emoji: "🥛",
        tableImage: "images/mayonnaise.png",
        image: "images/ingredients/mayonnaise.png",
        unlocked: false,
        unlockPrice: 35000,
        stock: 0,
        restock: 5,
        restockPrice: 6000
    },

    // Bánh mì là nguyên liệu đặc biệt.
    // Không chiếm một trong 12 khay.
    "Bánh mì": {
        emoji: "🥖",
        tableImage: "images/bread.png",
        image: null,
        unlocked: true,
        unlockPrice: 0,
        stock: 10,
        restock: 5,
        restockPrice: 7000,
        special: "bread"
    }
};


// ======================================================
// VỊ TRÍ NGUYÊN LIỆU
// ======================================================

const stationSlots = [
    "Pâté",
    "Thịt nướng",
    "Trứng",
    "Chả",

    "Dưa leo",
    "Đồ chua",
    "Rau",
    "Ớt",

    "Meatballs",
    "Jambon",
    "Cheese",
    "Bơ"
];

const sauceSlots = [
    "Ketchup",
    "Sriracha",
    "Mayonnaise"
];


// ======================================================
// SAUCE HOLD INTERACTION
// Giữ chai sốt đủ 2.5 giây để bóp sốt.
// Trong lúc giữ, sprite sốt được reveal từ trái sang phải.
// ======================================================

const SAUCE_HOLD_MS = 2500;

let activeSauceHold = null;


// ======================================================
// RECIPES
//
// ingredients chỉ chứa TOPPING.
// Mọi recipe đều mặc định cần 1 Bánh mì.
//
// weight càng cao càng dễ được khách gọi.
// Bánh mì không weight = 3 nên hiếm.
// ======================================================

const recipes = [
    {
        name: "Bánh mì trứng",
        emoji: "🍳",
        price: 13000,
        weight: 18,
        ingredients: [
            "Pâté",
            "Trứng",
            "Dưa leo",
            "Rau",
            "Ketchup"
        ]
    },

    {
        name: "Bánh mì pâté",
        emoji: "🥖",
        price: 12000,
        weight: 16,
        ingredients: [
            "Pâté",
            "Rau"
        ]
    },

    {
        name: "Bánh mì bơ trứng",
        emoji: "🧈",
        price: 14000,
        weight: 13,
        ingredients: [
            "Bơ",
            "Trứng",
            "Dưa leo",
            "Rau",
            "Mayonnaise"
        ]
    },

    {
        name: "Bánh mì chay",
        emoji: "🥬",
        price: 11000,
        weight: 11,
        ingredients: [
            "Dưa leo",
            "Đồ chua",
            "Rau",
            "Mayonnaise"
        ]
    },

    {
        name: "Bánh mì thịt nướng",
        emoji: "🥩",
        price: 21000,
        weight: 16,
        ingredients: [
            "Pâté",
            "Thịt nướng",
            "Dưa leo",
            "Đồ chua",
            "Rau",
            "Ketchup"
        ]
    },

    {
        name: "Bánh mì chả",
        emoji: "🍥",
        price: 18000,
        weight: 14,
        ingredients: [
            "Pâté",
            "Chả",
            "Dưa leo",
            "Đồ chua",
            "Rau",
            "Ketchup"
        ]
    },

    {
        name: "Bánh mì thịt viên",
        emoji: "🧆",
        price: 23000,
        weight: 13,
        ingredients: [
            "Pâté",
            "Meatballs",
            "Dưa leo",
            "Đồ chua",
            "Rau",
            "Ketchup"
        ]
    },

    {
        name: "Bánh mì jambon phô mai",
        emoji: "🧀",
        price: 24000,
        weight: 10,
        ingredients: [
            "Bơ",
            "Jambon",
            "Cheese",
            "Dưa leo",
            "Rau",
            "Mayonnaise"
        ]
    },

    {
        name: "Bánh mì thịt nướng cay",
        emoji: "🌶️",
        price: 22000,
        weight: 8,
        ingredients: [
            "Pâté",
            "Thịt nướng",
            "Đồ chua",
            "Rau",
            "Ớt",
            "Sriracha"
        ]
    },

    {
        name: "Bánh mì đặc biệt",
        emoji: "👑",
        price: 29000,
        weight: 6,
        ingredients: [
            "Pâté",
            "Thịt nướng",
            "Chả",
            "Trứng",
            "Đồ chua",
            "Rau",
            "Mayonnaise"
        ]
    },

    {
        name: "Bánh mì không",
        emoji: "🥖",
        price: 6000,
        weight: 3,
        ingredients: []
    }
];


// ======================================================
// CUSTOMERS
// ======================================================

const customers = [
    "👩🏻",
    "👨🏻",
    "👩🏽",
    "👨🏽",
    "👩🏻‍🦱",
    "👨🏻‍🦱",
    "👩🏼",
    "👨🏼"
];


// ======================================================
// GAME STATE
// ======================================================

function randomCustomersToday(day = 1) {

    const currentDay =
        Math.max(
            1,
            Number(day) || 1
        );

    let minCustomers;
    let maxCustomers;

    if (currentDay <= 5) {

        minCustomers = 7;
        maxCustomers = 9;

    } else if (currentDay <= 15) {

        minCustomers = 8;
        maxCustomers = 11;

    } else if (currentDay <= 29) {

        minCustomers = 9;
        maxCustomers = 13;

    } else {

        minCustomers = 13;
        maxCustomers = 18;
    }

    return (
        minCustomers +
        Math.floor(
            Math.random() *
            (
                maxCustomers -
                minCustomers +
                1
            )
        )
    );
}

const game = {
    day: 1,
    money: 100000,

    phase: "home",
    pausedPhase: null,

    hasStarted: false,
    shopOpen: false,

    customersToday: randomCustomersToday(1),
    customerNumber: 0,
    completedOrders: 0,
    dailyRevenue: 0,

    dailyIngredientSpend: 0,
    dailyRentPaid: 0,
    waitingCustomers: [],
    activeTicketId: null,
    nextTicketId: 1,
    dailyStarTotal: 0,
    dailyReviewCount: 0,
    reviewStarsTotal: 0,
    reviewCount: 0,
    ratingStreak: 0,
    ratingHistory: [],
    shopXp: 0,
    upgrades: {
    advertising: 0,
    seating: 0,
    aircon: 0
},

    skinOwned: {
    recipe: ["mac-dinh"],
    background: ["troi-xanh"],
    board: ["mac-dinh"],
    ingredientTable: ["mac-dinh"],
    drinkTable: ["mac-dinh"],
    cupHolder: ["mac-dinh"],
    counter: ["mac-dinh"]
},
    currentRecipe: null,
    currentCustomer: null,

    // Đây là order SAU KHI áp dụng yêu cầu riêng của khách
    currentOrder: [],

    selectedIngredients: [],

    // Bánh mì phải được người chơi click riêng
    breadSelected: false,

    orderNote: "Cho mình một ổ như bình thường nha!"
};


// ======================================================
// DOM
// ======================================================

const screen = document.getElementById("screen");
const mainButton = document.getElementById("main-button");
const settingsButton = document.getElementById("settings-button");

const dayDisplay = document.getElementById("day-display");
const statusDisplay = document.getElementById("status-display");
const moneyDisplay = document.getElementById("money-display");

const recipeModal = document.getElementById("recipe-modal");
const recipeList = document.getElementById("recipe-list");
const closeRecipeButton = document.getElementById("close-recipe");


// ======================================================
// BASIC HELPERS
// ======================================================

function formatMoney(amount) {
    return `${Math.floor(amount / 1000)}k`;
}


function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


function slugify(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

const UI_ICONS = {
    settings: `
        <svg class="ui-icon" viewBox="0 0 24 24"
             fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
            <path d="M10 2h4l.6 2.2 1.7.7 2-.9 2.8 2.8-.9 2 .7 1.7L23 11v2l-2.1.5-.7 1.7.9 2-2.8 2.8-2-.9-1.7.7L14 22h-4l-.6-2.2-1.7-.7-2 .9-2.8-2.8.9-2-.7-1.7L1 13v-2l2.1-.5.7-1.7-.9-2L5.7 4l2 .9 1.7-.7L10 2Z"/>
            <circle cx="12" cy="12" r="3.2"/>
        </svg>`,

    pause: `
        <svg class="ui-icon" viewBox="0 0 24 24"
            fill="currentColor" aria-hidden="true">
            <rect x="4" y="3" width="6" height="18" rx="1.5"/>
            <rect x="14" y="3" width="6" height="18" rx="1.5"/>
        </svg>`,

    play: `
        <svg class="ui-icon" viewBox="0 0 24 24"
             fill="currentColor" aria-hidden="true">
            <path d="M7 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 7 19.5Z"/>
        </svg>`
};

const SHOP_OPEN_MINUTES = 7 * 60;
const SHOP_CLOSE_MINUTES = 18 * 60;
const EXPECTED_CUSTOMER_SERVICE_MS = 22000;


function getHeaderClockText() {

    const totalCustomers =
        Math.max(
            1,
            Number(game.customersToday) || 1
        );


    /*
        Đồng hồ trong game, KHÔNG dùng giờ trên máy.

        Ngày mở cửa lúc 07:00 và kết thúc lúc 18:00.
        11 tiếng được chia đều theo số khách của ngày đó.

        Ví dụ 7 khách:
        mỗi "slot" khách tương đương khoảng 94 phút game.

        Khi đang phục vụ một khách, đồng hồ tiếp tục chạy
        trong slot đó dựa trên thời gian người chơi đang làm bánh.
    */

    const completedCustomers =
        Math.min(
            totalCustomers,
            Math.max(
                0,
                Number(game.dailyReviewCount) || 0
            )
        );


    let partialCustomer = 0;

    const ticket =
        typeof activeTicket === "function"
            ? activeTicket()
            : null;


    if (
        ticket &&
        game.phase === "making"
    ) {

        const totalPatience =
            Math.max(
                1,
                Number(
                    ticket.totalPatienceMs
                ) || EXPECTED_CUSTOMER_SERVICE_MS
            );

        const elapsed =
            Math.max(
                0,
                totalPatience -
                Math.max(
                    0,
                    Number(ticket.remainingMs) || 0
                )
            );


        // Dùng ~22 giây như nhịp phục vụ bình thường.
        // Không cho partial vượt quá 95% slot trước khi khách xong.
        partialCustomer =
            Math.min(
                0.95,
                elapsed /
                EXPECTED_CUSTOMER_SERVICE_MS
            );
    }


    const dayProgress =
        Math.min(
            1,
            (
                completedCustomers +
                partialCustomer
            ) /
            totalCustomers
        );


    const gameMinutes =
        Math.round(
            SHOP_OPEN_MINUTES +
            (
                SHOP_CLOSE_MINUTES -
                SHOP_OPEN_MINUTES
            ) *
            dayProgress
        );


    const hour =
        Math.floor(
            gameMinutes / 60
        );

    const minute =
        gameMinutes % 60;


    return (
        `${String(hour).padStart(2, "0")}:` +
        `${String(minute).padStart(2, "0")}`
    );
}


function getRemainingCustomersToday() {

    return Math.max(
        0,
        game.customersToday -
        game.dailyReviewCount
    );
}


function syncDayHeaderInfo() {

    if (game.phase === "prep") {

        dayDisplay.textContent =
            `Ngày ${game.day} · 👥 ${game.customersToday} khách hôm nay`;

        return;
    }


    if (
        game.shopOpen &&
        [
            "waiting",
            "making",
            "order",
            "result"
        ].includes(game.phase)
    ) {

        dayDisplay.textContent =
            `Ngày ${game.day} · 🕒 ${getHeaderClockText()} · Còn ${getRemainingCustomersToday()} khách`;
    }
}


function updateHeader(title, status) {

    dayDisplay.textContent = title;
    statusDisplay.textContent = status;
    moneyDisplay.textContent = formatMoney(game.money);

    syncDayHeaderInfo();

    if (game.phase === "home") {

        settingsButton.innerHTML = UI_ICONS.settings;
        settingsButton.title = "Cài đặt";
        settingsButton.setAttribute(
            "aria-label",
            "Cài đặt"
        );

    } else {

        settingsButton.innerHTML = UI_ICONS.pause;
        settingsButton.title = "Tạm dừng";
        settingsButton.setAttribute(
            "aria-label",
            "Tạm dừng"
        );
    }

    updateShopMenuVisibility();
}


// Đồng hồ trên header tự cập nhật khi tiệm đang mở.
setInterval(
    () => {

        if (
            game.shopOpen &&
            [
                "waiting",
                "making",
                "order",
                "result"
            ].includes(game.phase)
        ) {
            syncDayHeaderInfo();
        }

    },
    1000
);

// ======================================================
// SHOP MANAGEMENT MENU
// ======================================================

const shopMenuBar =
    document.getElementById("shop-menu-bar");


const shopLevelBar =
    document.createElement("button");

shopLevelBar.type = "button";
shopLevelBar.id = "shop-level-bar";
shopLevelBar.className = "shop-level-bar";
shopLevelBar.setAttribute(
    "aria-label",
    "Xem thông tin level tiệm"
);

if (
    shopMenuBar &&
    shopMenuBar.parentNode
) {
    shopMenuBar.parentNode.insertBefore(
        shopLevelBar,
        shopMenuBar
    );
}

shopLevelBar.addEventListener(
    "click",
    showShopLevelPopup
);


const managementMenuButton =
    document.querySelector(
        '[data-shop-menu="revenue"]'
    );

if (managementMenuButton) {
    managementMenuButton.innerHTML = `
        <span class="shop-menu-icon">🗂️</span>
        <span>Quản lý</span>
    `;
}

const shopPanelOverlay =
    document.getElementById("shop-panel-overlay");

const shopPanelTitle =
    document.getElementById("shop-panel-title");

const shopPanelEyebrow =
    document.getElementById("shop-panel-eyebrow");

const shopPanelContent =
    document.getElementById("shop-panel-content");

const shopPanelClose =
    document.getElementById("shop-panel-close");


function updateShopMenuVisibility() {

    if (!shopMenuBar) return;

    const visiblePhases = [
        "prep",
        "waiting",
        "making",
        "result"
    ];

    shopMenuBar.hidden =
        !game.hasStarted ||
        !visiblePhases.includes(game.phase);

    shopLevelBar.hidden =
        shopMenuBar.hidden;

    if (!shopLevelBar.hidden) {
        refreshShopLevelBar();
    }
}



function getXpNeededForLevel(level) {
    return 220 + (level - 1) * 85;
}


function getShopLevelProgress() {
    let level = 1;
    let xpIntoLevel =
        Math.max(
            0,
            Number(game.shopXp) || 0
        );

    let needed =
        getXpNeededForLevel(level);

    while (
        xpIntoLevel >= needed &&
        level < 999
    ) {
        xpIntoLevel -= needed;
        level++;
        needed =
            getXpNeededForLevel(level);
    }

    return {
        level,
        xpIntoLevel,
        needed,
        percent:
            Math.min(
                100,
                xpIntoLevel / needed * 100
            )
    };
}


function getShopLevelTitle(level) {
    if (level >= 120) {
        return "Huyền thoại bánh mì";
    }

    if (level >= 80) {
        return "Điểm hẹn khu phố";
    }

    if (level >= 50) {
        return "Tiệm bánh mì nổi tiếng";
    }

    if (level >= 25) {
        return "Tiệm quen khu phố";
    }

    if (level >= 10) {
        return "Tiệm quen đầu ngõ";
    }

    return "Quán mới mở";
}


function getNextShopTitleInfo(level) {
    if (level < 10) {
        return {
            title: "Tiệm quen đầu ngõ",
            level: 10
        };
    }

    if (level < 25) {
        return {
            title: "Tiệm quen khu phố",
            level: 25
        };
    }

    if (level < 50) {
        return {
            title: "Tiệm bánh mì nổi tiếng",
            level: 50
        };
    }

    if (level < 80) {
        return {
            title: "Điểm hẹn khu phố",
            level: 80
        };
    }

    if (level < 120) {
        return {
            title: "Huyền thoại bánh mì",
            level: 120
        };
    }

    return {
        title: "Danh hiệu cao nhất",
        level: null
    };
}


function refreshShopLevelBar() {
    if (!shopLevelBar) return;

    const progress =
        getShopLevelProgress();

    const title =
        getShopLevelTitle(
            progress.level
        );

    shopLevelBar.innerHTML = `
        <div class="shop-level-topline">
            <strong>
                LV. ${progress.level}
            </strong>

            <span>${title}</span>

            <small>
                ${progress.xpIntoLevel}
                /
                ${progress.needed} EXP
            </small>
        </div>

        <div class="shop-level-track">
            <span
                style="
                    width:
                    ${progress.percent}%;
                "
            ></span>
        </div>
    `;
}


function addShopXp(amount) {
    const earned =
        Math.max(
            0,
            Math.round(Number(amount) || 0)
        );

    if (!earned) return;

    game.shopXp =
        Math.max(
            0,
            Number(game.shopXp) || 0
        ) + earned;

    refreshShopLevelBar();
}


function showShopLevelPopup() {
    document
        .getElementById(
            "shop-level-overlay"
        )
        ?.remove();

    const progress =
        getShopLevelProgress();

    const title =
        getShopLevelTitle(
            progress.level
        );

    const nextTitleInfo =
        getNextShopTitleInfo(
            progress.level
        );

    const overlay =
        document.createElement("div");

    overlay.id =
        "shop-level-overlay";

    overlay.className =
        "shop-level-overlay";

    overlay.innerHTML = `
        <section
            class="shop-level-popup"
            role="dialog"
            aria-modal="true"
            aria-label="Level tiệm"
        >
            <button
                class="shop-level-popup-close"
                type="button"
                aria-label="Đóng"
            >×</button>

            <div class="shop-level-popup-icon">
                🥖
            </div>

            <div class="shop-level-popup-eyebrow">
                LEVEL TIỆM
            </div>

            <h2>
                Level ${progress.level}
            </h2>

            <div class="shop-level-popup-title">
                ${title}
            </div>

            <div class="shop-level-popup-progress">
                <div>
                    <span>EXP hiện tại</span>
                    <strong>
                        ${progress.xpIntoLevel}
                        /
                        ${progress.needed}
                    </strong>
                </div>

                <div class="shop-level-popup-track">
                    <span
                        style="
                            width:
                            ${progress.percent}%;
                        "
                    ></span>
                </div>
            </div>

            <div class="shop-level-popup-info">
                <div>
                    <span>Tổng EXP</span>
                    <strong>
                        ${Math.round(game.shopXp || 0)}
                    </strong>
                </div>

                <div>
                    <span>Danh hiệu tiếp theo</span>

                    <strong>
                        ${nextTitleInfo.level
                            ? `Mở ở Lv.${nextTitleInfo.level}`
                            : "Đã đạt tối đa"}
                    </strong>

                    <small>
                        ${nextTitleInfo.title}
                    </small>
                </div>
            </div>

            <p class="shop-level-popup-note">
                Phục vụ đúng khách để nhận EXP.
                Đơn 4★ nhận 8 EXP,
                đơn 5★ nhận 9 EXP.
            </p>

            <button
                class="shop-level-popup-done"
                type="button"
            >
                Đóng
            </button>
        </section>
    `;

    const close = () =>
        overlay.remove();

    overlay
        .querySelector(
            ".shop-level-popup-close"
        )
        .addEventListener(
            "click",
            close
        );

    overlay
        .querySelector(
            ".shop-level-popup-done"
        )
        .addEventListener(
            "click",
            close
        );

    overlay.addEventListener(
        "click",
        event => {
            if (
                event.target === overlay
            ) {
                close();
            }
        }
    );

    document.body.appendChild(
        overlay
    );
}


function closeShopPanel() {

    shopPanelOverlay?.classList.add("hidden");
}


function openShopPanel(type) {

    if (
        !shopPanelOverlay ||
        !shopPanelContent
    ) {
        return;
    }

    shopPanelOverlay.classList.remove("hidden");

    if (type === "missions") {

        renderDailyMissions();

    } else if (type === "upgrade") {

        renderUpgradePanel();

    } else if (type === "decorate") {

        renderDecorationPanel();

    } else if (type === "revenue") {

        renderManagementPanel();
    }
}

document
    .querySelectorAll("[data-shop-menu]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openShopPanel(
                    button.dataset.shopMenu
                );

            }
        );

    });


shopPanelClose?.addEventListener(
    "click",
    closeShopPanel
);


shopPanelOverlay?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            shopPanelOverlay
        ) {
            closeShopPanel();
        }

    }
);

// ======================================================
// REAL DAILY MISSIONS
// Reset theo NGÀY THẬT, không theo game.day
// ======================================================

const REAL_DAILY_KEY =
    "mot-o-nha-real-daily-v1";


function getVietnamDateKey(
    offsetDays = 0
) {
    const date =
        new Date(
            Date.now() +
            offsetDays * 86400000
        );

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        )
        .formatToParts(date);

    const values = {};

    parts.forEach(part => {
        values[part.type] =
            part.value;
    });

    return (
        `${values.year}-` +
        `${values.month}-` +
        `${values.day}`
    );
}


function getRealDateKey() {
    return getVietnamDateKey();
}


function getVietnamServerTimeText() {

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    ).format(new Date());
}


function updateLiveServerTimes() {

    document
        .querySelectorAll(
            "[data-vietnam-server-time]"
        )
        .forEach(element => {

            element.textContent =
                getVietnamServerTimeText();
        });
}


setInterval(
    updateLiveServerTimes,
    1000
);

const LOGIN_STREAK_KEY =
    "mot-o-nha-login-streak-v1";


function loadLoginStreak() {
    try {
        return JSON.parse(
            localStorage.getItem(
                LOGIN_STREAK_KEY
            ) || "{}"
        );
    } catch {
        return {};
    }
}


function syncLoginStreak() {
    const today =
        getVietnamDateKey();

    const yesterday =
        getVietnamDateKey(-1);

    const saved =
        loadLoginStreak();

    let streak =
        Number(saved.streak) || 0;

    const lastLogin =
        saved.lastLogin || null;


    // Đã tính streak hôm nay rồi.
    if (lastLogin === today) {
        return {
            streak,
            lastLogin
        };
    }


    // Hôm qua có vào game -> nối streak.
    if (lastLogin === yesterday) {
        streak++;
    }

    // Lần đầu hoặc bỏ lỡ ít nhất 1 ngày.
    else {
        streak = 1;
    }


    const data = {
        streak,
        lastLogin: today
    };


    localStorage.setItem(
        LOGIN_STREAK_KEY,
        JSON.stringify(data)
    );


    return data;
}


let loginStreak =
    syncLoginStreak();


function createFreshRealDailyData() {

    return {
        date: getRealDateKey(),

        stats: {
            correctOrders: 0,
            revenue: 0,

            // Generic ingredient tracking.
            // Key = đúng tên nguyên liệu trong ingredients.
            ingredientSold: {},

            drinksSold: 0,
            drinkIngredientSold: {}
        },

        claimed: []
    };
}


function loadRealDailyData() {

    const today =
        getRealDateKey();

    let data = null;


    try {

        const raw =
            localStorage.getItem(
                REAL_DAILY_KEY
            );

        if (raw) {
            data = JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "Không đọc được nhiệm vụ ngày:",
            error
        );
    }


    // Sang ngày thật mới
    if (
        !data ||
        data.date !== today ||
        !data.stats ||
        !Array.isArray(data.claimed)
    ) {

        data =
            createFreshRealDailyData();

        saveRealDailyData(data);
    }


    // Migration từ hệ thống cũ chỉ track Pâté.
    // Không làm mất progress của ngày hiện tại.
    if (
        !data.stats.ingredientSold ||
        typeof data.stats.ingredientSold !== "object"
    ) {

        data.stats.ingredientSold = {};

        const oldPateProgress =
            Number(
                data.stats.pateSold
            ) || 0;

        if (oldPateProgress > 0) {
            data.stats.ingredientSold["Pâté"] =
                oldPateProgress;
        }

        delete data.stats.pateSold;

        saveRealDailyData(data);
    }

    if (!Number.isFinite(data.stats.drinksSold)) {
        data.stats.drinksSold = 0;
    }

    if (
        !data.stats.drinkIngredientSold ||
        typeof data.stats.drinkIngredientSold !== "object"
    ) {
        data.stats.drinkIngredientSold = {};
    }


    return data;
}


function saveRealDailyData(data) {

    try {

        localStorage.setItem(
            REAL_DAILY_KEY,
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "Không lưu được nhiệm vụ ngày:",
            error
        );
    }
}


let realDaily =
    loadRealDailyData();

const DAILY_MISSION_POOL = [

    {
        id: "serve-18",
        name: "Phục vụ đúng 18 khách",
        type: "orders",
        target: 18,
        reward: 25000
    },

    {
        id: "serve-24",
        name: "Phục vụ đúng 24 khách",
        type: "orders",
        target: 24,
        reward: 40000
    },

    {
        id: "ingredient-pate-10",
        name: "Bán 10 bánh mì có Pâté",
        type: "ingredient",
        ingredient: "Pâté",
        target: 10,
        reward: 25000
    },

    {
        id: "ingredient-trung-8",
        name: "Bán 8 bánh mì có Trứng",
        type: "ingredient",
        ingredient: "Trứng",
        target: 8,
        reward: 25000
    },

    {
        id: "ingredient-rau-16",
        name: "Bán 16 bánh mì có Rau",
        type: "ingredient",
        ingredient: "Rau",
        target: 16,
        reward: 25000
    },

    {
        id: "ingredient-dua-leo-12",
        name: "Bán 12 bánh mì có Dưa leo",
        type: "ingredient",
        ingredient: "Dưa leo",
        target: 12,
        reward: 25000
    },

    {
        id: "drinks-8",
        name: "Bán đúng 8 ly nước",
        type: "drinks",
        target: 10,
        reward: 25000
    },

    {
        id: "drink-tra-chanh-5",
        name: "Bán 5 ly có Trà chanh",
        type: "drinkIngredient",
        ingredient: "Trà chanh",
        target: 5,
        reward: 25000
    },

    {
        id: "drink-thach-ca-4",
        name: "Bán 4 ly có Thạch cá",
        type: "drinkIngredient",
        ingredient: "Thạch cá",
        target: 5,
        reward: 25000
    },

    {
        id: "revenue-180k",
        name: "Kiếm 180k doanh thu",
        type: "revenue",
        target: 180000,
        reward: 50000
    },

    {
        id: "revenue-250k",
        name: "Kiếm 250k doanh thu",
        type: "revenue",
        target: 250000,
        reward: 70000
    }

];


function dailySeedFromDate() {

    const text =
        getRealDateKey();

    let hash = 0;

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        hash =
            (
                hash * 31 +
                text.charCodeAt(i)
            ) >>> 0;
    }

    return hash;
}


function getTodaysMissions() {

    const pool =
        [...DAILY_MISSION_POOL];

    let seed =
        dailySeedFromDate();


    // Shuffle có thể tái tạo lại
    for (
        let i = pool.length - 1;
        i > 0;
        i--
    ) {

        seed =
            (seed * 9301 + 49297) %
            233280;

        const random =
            seed / 233280;

        const j =
            Math.floor(
                random * (i + 1)
            );

        [
            pool[i],
            pool[j]
        ] = [
            pool[j],
            pool[i]
        ];
    }


    return pool.slice(0, 3);
}

function getDailyMissionProgress(
    mission
) {

    realDaily =
        loadRealDailyData();


    if (
        mission.type === "orders"
    ) {

        return (
            realDaily.stats.correctOrders ||
            0
        );
    }


    if (
        mission.type === "revenue"
    ) {

        return (
            realDaily.stats.revenue ||
            0
        );
    }


    if (
        mission.type === "ingredient"
    ) {

        return (
            realDaily.stats
                .ingredientSold?.[
                    mission.ingredient
                ] ||
            0
        );
    }


    if (
        mission.type === "drinks"
    ) {
        return (
            realDaily.stats.drinksSold ||
            0
        );
    }


    if (
        mission.type === "drinkIngredient"
    ) {
        return (
            realDaily.stats
                .drinkIngredientSold?.[
                    mission.ingredient
                ] ||
            0
        );
    }


    return 0;
}


function dailyMissionComplete(
    mission
) {

    return (
        getDailyMissionProgress(mission)
        >=
        mission.target
    );
}

function claimDailyMission(
    missionId
) {

    realDaily =
        loadRealDailyData();


    const mission =
        getTodaysMissions()
            .find(
                item =>
                    item.id === missionId
            );


    if (!mission) {
        return;
    }


    if (
        realDaily.claimed.includes(
            mission.id
        )
    ) {

        return;
    }


    if (
        !dailyMissionComplete(
            mission
        )
    ) {

        return;
    }


    // Đánh dấu trước
    realDaily.claimed.push(
        mission.id
    );


    // Thưởng tiền
    game.money +=
        mission.reward;


    saveRealDailyData(
        realDaily
    );

    saveGame();


    moneyDisplay.textContent =
        formatMoney(game.money);


    renderDailyMissions();
}

let missionPanelSection =
    "daily";


function renderDailyMissions() {

    syncEventProgress();


    shopPanelEyebrow.textContent =
        "Mục tiêu & sự kiện";

    shopPanelTitle.textContent =
        "📋 Nhiệm vụ";


    shopPanelContent.innerHTML = `

        <div class="mission-tabs">

            <button
                class="
                    mission-tab
                    ${
                        missionPanelSection === "daily"
                            ? "active"
                            : ""
                    }
                "
                type="button"
                data-mission-tab="daily"
            >
                📅 Nhiệm vụ ngày
            </button>


            <button
                class="
                    mission-tab
                    ${
                        missionPanelSection === "event"
                            ? "active"
                            : ""
                    }
                "
                type="button"
                data-mission-tab="event"
            >
                🎉 Nhiệm vụ sự kiện
            </button>

        </div>


        <div id="mission-tab-content"></div>

    `;


    shopPanelContent
        .querySelectorAll(
            "[data-mission-tab]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    missionPanelSection =
                        button.dataset.missionTab;

                    renderDailyMissions();
                }
            );

        });


    if (
        missionPanelSection ===
        "event"
    ) {

        renderEventMissionContent();

    } else {

        renderDailyMissionContent();
    }
}

function renderDailyMissionContent() {

    realDaily =
        loadRealDailyData();

    const missions =
        getTodaysMissions();

    const container =
        document.getElementById(
            "mission-tab-content"
        );


    const cards =
        missions.map(mission => {

            const rawProgress =
                getDailyMissionProgress(
                    mission
                );

            const progress =
                Math.min(
                    rawProgress,
                    mission.target
                );

            const complete =
                rawProgress >=
                mission.target;

            const claimed =
                realDaily.claimed.includes(
                    mission.id
                );

            const percent =
                Math.min(
                    100,
                    progress /
                    mission.target *
                    100
                );

            const money =
                mission.type ===
                "revenue";


            return `

                <article
                    class="
                        daily-mission-card
                        ${
                            complete
                                ? "is-complete"
                                : ""
                        }
                    "
                >

                    <div class="
                        daily-mission-top
                    ">

                        <span class="
                            daily-mission-name
                        ">
                            ${
                                claimed
                                    ? "✅"
                                    : complete
                                        ? "🎁"
                                        : "📌"
                            }

                            ${mission.name}
                        </span>

                        <span class="
                            daily-mission-progress-text
                        ">
                            ${
                                money
                                    ? formatMoney(progress)
                                    : progress
                            }
                            /
                            ${
                                money
                                    ? formatMoney(
                                        mission.target
                                    )
                                    : mission.target
                            }
                        </span>

                    </div>


                    <div class="
                        daily-mission-track
                    ">
                        <span
                            style="
                                width:${percent}%;
                            "
                        ></span>
                    </div>


                    ${
                        claimed

                            ? `
                                <div class="
                                    daily-mission-status
                                ">
                                    ✓ Đã nhận thưởng
                                </div>
                            `

                            : complete

                                ? `
                                    <button
                                        class="
                                            daily-mission-claim
                                        "
                                        data-claim-mission="
                                            ${mission.id}
                                        "
                                        type="button"
                                    >
                                        Nhận
                                        +${formatMoney(
                                            mission.reward
                                        )}
                                    </button>
                                `

                                : `
                                    <div class="
                                        daily-mission-status
                                    ">
                                        Thưởng:
                                        ${formatMoney(
                                            mission.reward
                                        )}
                                    </div>
                                `
                    }

                </article>

            `;

        })
        .join("");


    container.innerHTML = `

        <div class="server-time-card">
            <strong>
                🕒 Giờ server:
                <span data-vietnam-server-time>
                    ${getVietnamServerTimeText()}
                </span>
            </strong>

            <small>
                🇻🇳 GMT+7 • Nhiệm vụ làm mới lúc 00:00
            </small>
        </div>

        <p class="
            daily-mission-intro
        ">
            Làm mới mỗi ngày thật.
        </p>

        <div class="
            daily-mission-list
        ">
            ${cards}
        </div>

    `;

    updateLiveServerTimes();


    container
        .querySelectorAll(
            "[data-claim-mission]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    claimDailyMission(
                        button.dataset
                            .claimMission
                            .trim()
                    );

                }
            );

        });
}

function renderEventMissionContent() {

    const container =
        document.getElementById(
            "mission-tab-content"
        );

    if (!container) {
        return;
    }


    // =========================
    // SAKURA - KHÔNG GIỚI HẠN
    // =========================

    syncEventProgress();

    const sakuraProgress =
        Math.min(
            20,
            eventProgress
                .highestDayCompleted
        );

    const sakuraCompleted =
        sakuraProgress >= 20;

    const sakuraPercent =
        sakuraProgress / 20 * 100;


    // =========================
    // TRUNG THU - GIỚI HẠN
    // =========================

    const midAutumnActive =
        isMidAutumnEventActive();

    const midAutumnUnlocked =
        midAutumnEventUnlocked();

    const midAutumnTotal =
        getMidAutumnTotalProgress();

    const midAutumnTarget =
        MID_AUTUMN_REQUIRED_SERVES *
        MID_AUTUMN_CUSTOMERS.length;

    const midAutumnPercent =
        Math.min(
            100,
            midAutumnTotal / midAutumnTarget * 100
        );


    const midAutumnCustomerCards =
        MID_AUTUMN_CUSTOMERS
            .map(customer => {

                const progress =
                    Math.min(
                        MID_AUTUMN_REQUIRED_SERVES,
                        midAutumnProgress
                            .counts[
                                customer.id
                            ] || 0
                    );

                const completed =
                    progress >= MID_AUTUMN_REQUIRED_SERVES;

                const percent =
                    progress / MID_AUTUMN_REQUIRED_SERVES * 100;


                return `
                    <article
                        class="
                            daily-mission-card
                            ${
                                completed
                                    ? "is-complete"
                                    : ""
                            }
                        "
                    >

                        <div class="
                            daily-mission-top
                        ">

                            <span class="
                                daily-mission-name
                            ">
                                ${
                                    completed
                                        ? "✅"
                                        : "🥮"
                                }

                                Phục vụ
                                ${customer.name}
                            </span>

                            <span class="
                                daily-mission-progress-text
                            ">
                                ${progress} / ${MID_AUTUMN_REQUIRED_SERVES}
                            </span>

                        </div>


                        <div class="
                            daily-mission-track
                        ">
                            <span
                                style="
                                    width:${percent}%;
                                "
                            ></span>
                        </div>

                    </article>
                `;

            })
            .join("");


    container.innerHTML = `

        <div class="
            event-mission-banner
            mid-autumn-banner
        ">

            <div class="
                event-mission-emoji
            ">
                🥮
            </div>

            <div>
                <strong>
                    Đêm Rằm Trung Thu
                </strong>

                <p>
                    Phục vụ Chị Hằng,
                    Chú Cuội và Thỏ Ngọc
                    đủ ${MID_AUTUMN_REQUIRED_SERVES} lần mỗi người
                    để mở quyền mua
                    bộ Đêm Rằm Trung Thu.
                </p>

                <div class="
                    event-countdown
                ">
                    ⏳
                    ${getMidAutumnCountdownText()}
                </div>
            </div>

        </div>


        <article
            class="
                daily-mission-card
                ${
                    midAutumnUnlocked
                        ? "is-complete"
                        : ""
                }
            "
        >

            <div class="
                daily-mission-top
            ">

                <span class="
                    daily-mission-name
                ">
                    ${
                        midAutumnUnlocked
                            ? "✅"
                            : "🌕"
                    }

                    Đêm Rằm Trung Thu
                </span>

                <span class="
                    daily-mission-progress-text
                ">
                    ${midAutumnTotal} / ${midAutumnTarget}
                </span>

            </div>


            <div class="
                daily-mission-track
            ">
                <span
                    style="
                        width:${midAutumnPercent}%;
                    "
                ></span>
            </div>


            <div class="
                event-reward-preview
            ">

                ${
                    midAutumnUnlocked

                        ? `
                            🔓 Đã mở quyền mua
                            bộ Đêm Rằm Trung Thu trong
                            Trang trí!
                        `

                        : midAutumnActive

                            ? `
                                🔒 Phần thưởng:
                                mở quyền mua
                                bộ Đêm Rằm Trung Thu
                            `

                            : `
                                ⏰ Sự kiện đã kết thúc.
                                Tiến độ được giữ lại,
                                nhưng không thể nhận
                                thêm lượt phục vụ.
                            `
                }

            </div>

        </article>


        <div class="
            mid-autumn-customer-list
        ">
            ${midAutumnCustomerCards}
        </div>


        <div class="
            event-section-divider
        ">
            🌸 Sự kiện thường trực
        </div>


        <div class="
            event-mission-banner
        ">

            <div class="
                event-mission-emoji
            ">
                🌸
            </div>

            <div>
                <strong>
                    Mùa Hoa Anh Đào
                </strong>

                <p>
                    Không giới hạn thời gian.
                    Hoàn thành 20 ngày trong
                    game để mở quyền mua
                    bộ Hoa Anh Đào.
                </p>
            </div>

        </div>


        <article
            class="
                daily-mission-card
                ${
                    sakuraCompleted
                        ? "is-complete"
                        : ""
                }
            "
        >

            <div class="
                daily-mission-top
            ">

                <span class="
                    daily-mission-name
                ">
                    ${
                        sakuraCompleted
                            ? "✅"
                            : "🌸"
                    }

                    Chơi 20 ngày
                </span>

                <span class="
                    daily-mission-progress-text
                ">
                    ${sakuraProgress} / 20
                </span>

            </div>


            <div class="
                daily-mission-track
            ">
                <span
                    style="
                        width:${sakuraPercent}%;
                    "
                ></span>
            </div>


            <div class="
                event-reward-preview
            ">

                ${
                    sakuraCompleted

                        ? `
                            🔓 Đã mở quyền mua
                            bộ Hoa Anh Đào trong
                            Trang trí!
                        `

                        : `
                            🔒 Phần thưởng:
                            mở quyền mua
                            bộ Hoa Anh Đào
                        `
                }

            </div>

        </article>

    `;
}


// ======================================================
// EVENT MISSIONS
// ======================================================

const EVENT_PROGRESS_KEY =
    "mot-o-nha-event-progress-v1";


function loadEventProgress() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    EVENT_PROGRESS_KEY
                ) || "{}"
            );


        return {
            highestDayCompleted:
                Number(
                    saved.highestDayCompleted
                ) || 0
        };

    } catch {

        return {
            highestDayCompleted: 0
        };
    }
}


let eventProgress =
    loadEventProgress();


function saveEventProgress() {

    localStorage.setItem(
        EVENT_PROGRESS_KEY,
        JSON.stringify(
            eventProgress
        )
    );
}


function syncEventProgress() {

    const completedByCurrentSave =
        Math.max(
            0,
            game.day - 1
        );


    if (
        completedByCurrentSave >
        eventProgress.highestDayCompleted
    ) {

        eventProgress.highestDayCompleted =
            completedByCurrentSave;

        saveEventProgress();
    }
}


function sakuraEventUnlocked() {

    syncEventProgress();

    return (
        eventProgress.highestDayCompleted
        >= 20
    );
}


// ======================================================
// MID-AUTUMN EVENT 2026
// Event chạy hết ngày 15/10/2026 theo giờ Việt Nam.
// Tự kết thúc lúc 00:00 ngày 16/10/2026 GMT+7.
// ======================================================

const MID_AUTUMN_EVENT_KEY =
    "mot-o-nha-mid-autumn-2026-v1";

const MID_AUTUMN_EVENT_END =
    new Date(
        "2026-10-16T00:00:00+07:00"
    ).getTime();


const MID_AUTUMN_CUSTOMERS = [
    {
        id: "HANG",
        name: "Chị Hằng",
        spritePrefix: "A",
        fallback: "🌙"
    },

    {
        id: "CUOI",
        name: "Chú Cuội",
        spritePrefix: "B",
        fallback: "🌳"
    },

    {
        id: "THO",
        name: "Thỏ Ngọc",
        spritePrefix: "C",
        fallback: "🐇"
    }
];

const MID_AUTUMN_SPRITE_DIR =
    "images/customer/special/trung-thu";


function isMidAutumnEventActive() {
    return (
        Date.now() <
        MID_AUTUMN_EVENT_END
    );
}


function loadMidAutumnProgress() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    MID_AUTUMN_EVENT_KEY
                ) || "{}"
            );


        return {
            counts: {
                HANG:
                    Number(
                        saved.counts?.HANG
                    ) || 0,

                CUOI:
                    Number(
                        saved.counts?.CUOI
                    ) || 0,

                THO:
                    Number(
                        saved.counts?.THO
                    ) || 0
            },

            unlocked:
                saved.unlocked === true,

            visitState: {
                day:
                    Number(
                        saved.visitState?.day
                    ) || 0,

                willVisit:
                    saved.visitState?.willVisit === true,

                targetCustomerNumber:
                    Number(
                        saved.visitState
                            ?.targetCustomerNumber
                    ) || 0,

                spawned:
                    saved.visitState?.spawned === true
            }
        };

    } catch {

        return {
            counts: {
                HANG: 0,
                CUOI: 0,
                THO: 0
            },

            unlocked: false,

            visitState: {
                day: 0,
                willVisit: false,
                targetCustomerNumber: 0,
                spawned: false
            }
        };
    }
}


let midAutumnProgress =
    loadMidAutumnProgress();


function saveMidAutumnProgress() {

    localStorage.setItem(
        MID_AUTUMN_EVENT_KEY,
        JSON.stringify(
            midAutumnProgress
        )
    );
}


function midAutumnCustomerById(id) {

    return (
        MID_AUTUMN_CUSTOMERS.find(
            customer =>
                customer.id === id
        ) || null
    );
}


function isMidAutumnCustomer(id) {

    return Boolean(
        midAutumnCustomerById(id)
    );
}


function isKnownCustomerId(id) {

    return (
        /^[A-F]$/.test(id) ||
        isMidAutumnCustomer(id)
    );
}


function getMidAutumnTotalProgress() {

    return (
        Math.min(
            MID_AUTUMN_REQUIRED_SERVES,
            midAutumnProgress
                .counts.HANG
        )
        +
        Math.min(
            MID_AUTUMN_REQUIRED_SERVES,
            midAutumnProgress
                .counts.CUOI
        )
        +
        Math.min(
            MID_AUTUMN_REQUIRED_SERVES,
            midAutumnProgress
                .counts.THO
        )
    );
}


function midAutumnEventUnlocked() {

    return (
        midAutumnProgress
            .unlocked === true
    );
}


function recordMidAutumnServe(
    customerId
) {

    if (
        !isMidAutumnEventActive() ||
        !isMidAutumnCustomer(
            customerId
        ) ||
        midAutumnProgress.unlocked
    ) {
        return;
    }


    const current =
        midAutumnProgress
            .counts[customerId] || 0;


    if (current < MID_AUTUMN_REQUIRED_SERVES) {

        midAutumnProgress
            .counts[customerId] =
                current + 1;
    }


    const completed =
        MID_AUTUMN_CUSTOMERS.every(
            customer =>
                (
                    midAutumnProgress
                        .counts[
                            customer.id
                        ] || 0
                ) >= MID_AUTUMN_REQUIRED_SERVES
        );


    if (completed) {

        midAutumnProgress.unlocked =
            true;
    }


    saveMidAutumnProgress();
}


function getMidAutumnCountdownText() {

    const remaining =
        MID_AUTUMN_EVENT_END -
        Date.now();


    if (remaining <= 0) {
        return "Sự kiện đã kết thúc";
    }


    const totalHours =
        Math.ceil(
            remaining /
            (1000 * 60 * 60)
        );


    const days =
        Math.floor(
            totalHours / 24
        );


    const hours =
        totalHours % 24;


    if (days > 0) {

        return (
            `Còn ${days} ngày ` +
            `${hours} giờ`
        );
    }


    return `Còn ${hours} giờ`;
}


const MID_AUTUMN_DAILY_VISIT_CHANCE = 0.42;
const MID_AUTUMN_REQUIRED_SERVES = 4;


function ensureMidAutumnVisitPlan() {

    if (
        !isMidAutumnEventActive() ||
        midAutumnProgress.unlocked
    ) {
        return null;
    }


    const previous =
        midAutumnProgress.visitState || {
            day: 0,
            willVisit: false,
            targetCustomerNumber: 0,
            spawned: false
        };


    if (previous.day === game.day) {
        return previous;
    }


    /*
        Mỗi ngày tối đa 1 khách Trung Thu.

        Bình thường:
        42% cơ hội ngày đó có 1 khách đặc biệt.

        Nếu ngày ngay trước đó không có khách đặc biệt:
        ngày hôm nay bắt buộc có 1 người.

        => May mắn: ngày nào cũng có thể gặp 1 người.
        => Xui nhất: trong 2 ngày liên tiếp chắc chắn
           gặp ít nhất 1 khách Trung Thu.
    */

    const yesterdayWasTracked =
        previous.day === game.day - 1;

    const forceToday =
        yesterdayWasTracked &&
        !previous.spawned;


    const willVisit =
        forceToday ||
        Math.random() <
            MID_AUTUMN_DAILY_VISIT_CHANCE;


    // Nếu có khách đặc biệt, cho xuất hiện trong 4 lượt đầu.
    const latestSlot =
        Math.max(
            1,
            Math.min(
                4,
                Number(game.customersToday) || 1
            )
        );


    const targetCustomerNumber =
        willVisit
            ? 1 +
              Math.floor(
                  Math.random() *
                  latestSlot
              )
            : 0;


    midAutumnProgress.visitState = {
        day: game.day,
        willVisit,
        targetCustomerNumber,
        spawned: false
    };


    saveMidAutumnProgress();

    return midAutumnProgress.visitState;
}


function getMidAutumnSpawnCandidates(
    atCounter = []
) {

    if (
        !isMidAutumnEventActive() ||
        midAutumnProgress.unlocked
    ) {
        return [];
    }


    return MID_AUTUMN_CUSTOMERS
        .filter(customer => {

            const progress =
                midAutumnProgress
                    .counts[
                        customer.id
                    ] || 0;


            return (
                progress < MID_AUTUMN_REQUIRED_SERVES &&
                !atCounter.includes(
                    customer.id
                )
            );
        })
        .map(
            customer =>
                customer.id
        );
}


function getPlannedMidAutumnCustomer(
    atCounter = []
) {

    const candidates =
        getMidAutumnSpawnCandidates(
            atCounter
        );


    if (!candidates.length) {
        return null;
    }


    const plan =
        ensureMidAutumnVisitPlan();


    if (
        !plan ||
        !plan.willVisit ||
        plan.spawned
    ) {
        return null;
    }


    const incomingCustomerNumber =
        game.customerNumber + 1;


    if (
        incomingCustomerNumber <
        plan.targetCustomerNumber
    ) {
        return null;
    }


    return randomItem(candidates);
}


function markMidAutumnVisitSpawned() {

    const plan =
        midAutumnProgress.visitState;


    if (
        !plan ||
        plan.day !== game.day
    ) {
        return;
    }


    plan.spawned = true;

    saveMidAutumnProgress();
}


// ======================================================
// DECORATION SKINS
// ======================================================

const SKIN_SAVE_KEY =
    "mot-o-nha-skins-v1";


const SKIN_CATALOG = {

    recipe: [

        {
            id: "mac-dinh",
            name: "Mặc định",
            image:
                "images/skins/recipe-skin/mac-dinh.png",
            price: 0
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image:
                "images/skins/recipe-skin/sakura.png",
            price: 200000,
            event: "sakura"
        },

        {
    id: "trung-thu",
    name: "Đêm Rằm Trung Thu",

    image:
        "images/skins/recipe-skin/trung-thu.png",

    price: 200000,

    event: "trung-thu"
},

{
    id: "halloween",
    name: "Halloween",

    image:
        "images/skins/recipe-skin/halloween.png",

    price: 200000,

    event: "halloween",

    unavailable: true
}

    ],


    background: [

        {
            id: "troi-xanh",
            name: "Trời xanh",
            image:
                "images/skins/background/troi-xanh.jpg",
            price: 0
        },

        {
            id: "thanh-thi",
            name: "Thành thị",
            image:
                "images/skins/background/thanh-thi.jpg",
            price: 80000
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image:
                "images/skins/background/sakura.jpg",
            price: 250000,
            event: "sakura"
        },

        {
    id: "trung-thu",
    name: "Đêm Rằm Trung Thu",

    image:
        "images/skins/background/trung-thu.jpg",

    price: 250000,

    event: "trung-thu"
},

{
    id: "halloween",
    name: "Halloween",

    image:
        "images/skins/background/halloween.jpg",

    price: 250000,

    event: "halloween",

    unavailable: true
}

    ],


    board: [

        {
            id: "mac-dinh",
            name: "Mặc định",
            image:
                "images/skins/board/mac-dinh.png",
            price: 0
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image:
                "images/skins/board/sakura.png",
            price: 220000,
            event: "sakura"
        },

        {
    id: "trung-thu",
    name: "Đêm Rằm Trung Thu",

    image:
        "images/skins/board/trung-thu.png",

    price: 220000,

    event: "trung-thu"
},

{
    id: "halloween",
    name: "Halloween",

    image:
        "images/skins/board/halloween.png",

    price: 220000,

    event: "halloween",

    unavailable: true
}

    ],

    ingredientTable: [

        {
            id: "mac-dinh",
            name: "Mặc định",
            image:
                "images/skins/ingredient-table/mac-dinh.png",
            price: 0
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image:
                "images/skins/ingredient-table/sakura.png",
            price: 180000,
            event: "sakura"
        },

        {
            id: "trung-thu",
            name: "Đêm Rằm Trung Thu",
            image:
                "images/skins/ingredient-table/trung-thu.png",
            price: 180000,
            event: "trung-thu"
        },

        {
            id: "halloween",
            name: "Halloween",
            image:
                "images/skins/ingredient-table/halloween.png",
            price: 180000,
            event: "halloween",
            unavailable: true
        }

    ],


    drinkTable: [

        {
            id: "mac-dinh",
            name: "Mặc định",
            image: "images/skins/drink-table/mac-dinh.png",
            price: 0
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image: "images/skins/drink-table/sakura.png",
            price: 180000,
            event: "sakura"
        },

        {
            id: "trung-thu",
            name: "Đêm Rằm Trung Thu",
            image: "images/skins/drink-table/trung-thu.png",
            price: 180000,
            event: "trung-thu"
        },

        {
            id: "halloween",
            name: "Halloween",
            image: "images/skins/drink-table/halloween.png",
            price: 180000,
            event: "halloween",
            unavailable: true
        }

    ],


    cupHolder: [

        {
            id: "mac-dinh",
            name: "Mặc định",
            image: "images/skins/cup-holder/mac-dinh.png",
            price: 0
        },

        {
            id: "sakura",
            name: "Hoa Anh Đào",
            image: "images/skins/cup-holder/sakura.png",
            price: 120000,
            event: "sakura"
        },

        {
            id: "trung-thu",
            name: "Đêm Rằm Trung Thu",
            image: "images/skins/cup-holder/trung-thu.png",
            price: 120000,
            event: "trung-thu"
        },

        {
            id: "halloween",
            name: "Halloween",
            image: "images/skins/cup-holder/halloween.png",
            price: 120000,
            event: "halloween",
            unavailable: true
        }

    ],


    counter: [

    {
        id: "mac-dinh",
        name: "Mặc định",
        price: 0
    },

    {
        id: "sakura",
        name: "Hoa Anh Đào",
        price: 120000,
        event: "sakura"
    },

    {
    id: "trung-thu",
    name: "Đêm Rằm Trung Thu",

    price: 120000,

    event: "trung-thu"
},

{
    id: "halloween",
    name: "Halloween",

    price: 120000,

    event: "halloween",

    unavailable: true
}

    ]
};


const DEFAULT_SKINS = {
    recipe: "mac-dinh",
    background: "troi-xanh",
    board: "mac-dinh",
    ingredientTable: "mac-dinh",
    drinkTable: "mac-dinh",
    cupHolder: "mac-dinh",
    counter: "mac-dinh"
};


function loadSelectedSkins() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    SKIN_SAVE_KEY
                ) || "{}"
            );


        return {
            ...DEFAULT_SKINS,
            ...saved
        };

    } catch {

        return {
            ...DEFAULT_SKINS
        };
    }
}


let selectedSkins =
    loadSelectedSkins();


function saveSelectedSkins() {

    localStorage.setItem(
        SKIN_SAVE_KEY,
        JSON.stringify(
            selectedSkins
        )
    );
}


function skinById(type, id) {

    return (
        SKIN_CATALOG[type]
            .find(
                skin => skin.id === id
            )
        ||
        SKIN_CATALOG[type][0]
    );
}

function ownsSkin(
    type,
    id
) {

    return (
        game.skinOwned?.[type] ||
        []
    ).includes(id);
}


function canAccessSkin(
    skin
) {

    if (skin.unavailable) {
        return false;
    }


    if (
        skin.event === "sakura"
    ) {

        return sakuraEventUnlocked();
    }


    if (
        skin.event === "trung-thu"
    ) {

        return midAutumnEventUnlocked();
    }


    return true;
}


function buySkin(
    type,
    id
) {

    const skin =
        skinById(type, id);

    if (!skin) return;


    if (
        skin.unavailable
    ) {

        showCutePopup({
            icon: "🔒",
            title: "Chưa mở",
            message:
                "Skin này thuộc một sự kiện sắp mở.",
            confirmText: "Okii"
        });

        return;
    }


    if (
        skin.event === "sakura" &&
        !sakuraEventUnlocked()
    ) {

        showCutePopup({
            icon: "🌸",
            title: "Bộ Hoa Anh Đào",
            message:
                "Hoàn thành 20 ngày trong game để mở quyền mua bộ Hoa Anh Đào.",
            confirmText: "Okii"
        });

        return;
    }


    if (
        skin.event === "trung-thu" &&
        !midAutumnEventUnlocked()
    ) {

        showCutePopup({
            icon: "🥮",
            title: "Bộ Đêm Rằm Trung Thu",
            message:
                isMidAutumnEventActive()
                    ? `Phục vụ Chị Hằng, Chú Cuội và Thỏ Ngọc đủ ${MID_AUTUMN_REQUIRED_SERVES} lần mỗi người trong sự kiện Đêm Rằm Trung Thu để mở quyền mua bộ này.`
                    : "Sự kiện Trung Thu đã kết thúc và set này chưa được mở khóa.",
            confirmText: "Okii"
        });

        return;
    }


    if (
        ownsSkin(type, id)
    ) {

        selectedSkins[type] =
            id;

        saveSelectedSkins();

        applySelectedSkins();

        renderDecorationPanel();

        return;
    }


    if (
        game.money <
        skin.price
    ) {

        showCutePopup({
            icon: "🥲",
            title: "Chưa đủ tiền",
            message:
                `Skin này có giá ${formatMoney(skin.price)}.`,
            confirmText: "Okii"
        });

        return;
    }


    showCutePopup({

        icon: "🎨",

        title:
            `Mua ${skin.name}?`,

        message:
            `Giá ${formatMoney(skin.price)}.`,

        cancelText: "Để sau",

        confirmText: "Mua",

        onConfirm: () => {

            game.money -=
                skin.price;

            if (
                !Array.isArray(
                    game.skinOwned[type]
                )
            ) {
                game.skinOwned[type] = [
                    DEFAULT_SKINS[type]
                ];
            }

            if (
                !game.skinOwned[type]
                    .includes(id)
            ) {

                game.skinOwned[type]
                    .push(id);
            }


            selectedSkins[type] =
                id;


            saveSelectedSkins();

            saveGame();

            moneyDisplay.textContent =
                formatMoney(game.money);

            applySelectedSkins();

            renderDecorationPanel();
        }

    });
}

function sanitizeSelectedSkins() {

    Object.keys(
        DEFAULT_SKINS
    ).forEach(type => {

        const selected =
            selectedSkins[type];


        if (
            !ownsSkin(
                type,
                selected
            )
        ) {

            selectedSkins[type] =
                DEFAULT_SKINS[type];
        }

    });


    saveSelectedSkins();
}

function applySelectedSkins() {

    const board =
        skinById(
            "board",
            selectedSkins.board
        );

    const background =
        skinById(
            "background",
            selectedSkins.background
        );

    const recipe =
        skinById(
            "recipe",
            selectedSkins.recipe
        );

    
    
    const ingredientTable =
        skinById(
            "ingredientTable",
            selectedSkins.ingredientTable
        );

    const drinkTable =
        skinById(
            "drinkTable",
            selectedSkins.drinkTable
        );

    const cupHolder =
        skinById(
            "cupHolder",
            selectedSkins.cupHolder
        );

document
    .querySelectorAll(
        ".banhmi-workspace"
    )
    .forEach(panel => {

        panel.classList.remove(
            "counter-mac-dinh",
            "counter-sakura",
            "counter-trung-thu",
            "counter-halloween"
        );

        panel.classList.add(
            `counter-${selectedSkins.counter}`
        );

    });

    document
        .querySelectorAll(
            ".cutting-board"
        )
        .forEach(image => {

            image.src =
                board.image;

        });


    document
        .querySelectorAll(
            ".customer-panel"
        )
        .forEach(panel => {

            panel.style.backgroundImage =
                `url("${background.image}")`;

            panel.style.backgroundSize =
                "cover";

            panel.style.backgroundPosition =
                "center";

            panel.style.backgroundRepeat =
                "no-repeat";

        });


    document
        .querySelectorAll(
            ".ingredient-table-image"
        )
        .forEach(image => {

            image.src =
                ingredientTable.image;

        });


    document
        .querySelectorAll(
            ".drink-table-image"
        )
        .forEach(image => {

            image.src =
                drinkTable.image;

        });


    document
        .querySelectorAll(
            ".cup-holder-image"
        )
        .forEach(image => {

            image.src =
                cupHolder.image;

        });


    document
        .querySelectorAll(
            ".recipe-book-fab img"
        )
        .forEach(image => {

            image.src =
                recipe.image;

        });
}

function renderSkinCards(type) {

    return SKIN_CATALOG[type]
        .map(skin => {

            const selected =
                selectedSkins[type] ===
                skin.id;

            const owned =
                ownsSkin(
                    type,
                    skin.id
                );

            const accessible =
                canAccessSkin(skin);


            let badge = "";


            if (selected && owned) {

                badge = `
                    <span class="
                        skin-selected-badge
                    ">
                        Đang dùng
                    </span>
                `;

            } else if (
                skin.unavailable
            ) {

                badge = `
                    <span class="
                        skin-lock-badge
                    ">
                        🔒 Sắp mở
                    </span>
                `;

            } else if (
                !accessible
            ) {

                badge = `
                    <span class="
                        skin-lock-badge
                    ">
                        🔒 Sự kiện
                    </span>
                `;

            } else if (!owned) {

                badge = `
                    <span class="
                        skin-price-badge
                    ">
                        ${formatMoney(
                            skin.price
                        )}
                    </span>
                `;
            }


            return `

                <button

                    class="
                        skin-card
                        ${
                            selected && owned
                                ? "is-selected"
                                : ""
                        }

                        ${
                            !accessible
                                ? "is-locked"
                                : ""
                        }
                    "

                    type="button"

                    data-skin-type="${type}"

                    data-skin-id="${skin.id}"

                >

                    ${badge}


<span
    class="
        skin-preview
        ${
            type === "background"
                ? "background-preview"
                : ""
        }
        ${
            type === "counter"
                ? `counter-preview counter-preview-${skin.id}`
                : ""
        }
        ${
            type === "ingredientTable"
                ? "ingredient-table-preview"
                : ""
        }
        ${
            type === "drinkTable"
                ? "drink-table-preview"
                : ""
        }
        ${
            type === "cupHolder"
                ? "cup-holder-preview"
                : ""
        }
    "
>

    ${
        type === "counter"

            ? `
                <span
                    class="counter-preview-board"
                ></span>
            `

            : `
                <img
                    src="${skin.image}"
                    alt="${skin.name}"
                    draggable="false"
                >
            `
    }


    ${
        !accessible
            ? `
                <span
                    class="skin-lock-overlay"
                >
                    🔒
                </span>
            `
            : ""
    }

</span>


<strong>
    ${skin.name}
</strong>


                    ${
                        accessible &&
                        !owned

                            ? `
                                <small
                                    class="
                                        skin-buy-text
                                    "
                                >
                                    Mua
                                    ${formatMoney(
                                        skin.price
                                    )}
                                </small>
                            `

                            : ""
                    }

                </button>
            `;

        })
        .join("");
}

function renderDecorationPanel() {

    shopPanelEyebrow.textContent =
        "Cá nhân hóa tiệm";

    shopPanelTitle.textContent =
        "🎨 Trang trí";


    shopPanelContent.innerHTML = `

        <h3 class="shop-section-title">
            📖 Sổ công thức
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("recipe")}
        </div>


        <h3 class="shop-section-title">
            🌤️ Khung cảnh
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("background")}
        </div>


        <h3 class="shop-section-title">
            🪵 Thớt
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("board")}
        </div>

        <h3 class="shop-section-title">
            🧺 Quầy nguyên liệu
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("ingredientTable")}
        </div>


        <h3 class="shop-section-title">
            🍹 Khay đặt cốc
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("cupHolder")}
        </div>


        <h3 class="shop-section-title">
            🥤 Quầy đồ uống
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("drinkTable")}
        </div>


    


        <h3 class="shop-section-title">
            🪵 Bàn bếp
        </h3>

        <div class="skin-grid">
            ${renderSkinCards("counter")}
        </div>

    `;


    shopPanelContent
        .querySelectorAll(
            "[data-skin-type]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.skinType;

                    const id =
                        button.dataset.skinId;


                    buySkin(
                        type,
                        id
                    );

                }
            );

        });
}

// ======================================================
// SHOP UPGRADES
// ======================================================

const UPGRADE_CONFIG = {

    advertising: {
        icon: "📣",

        name: "Quảng bá",

        description:
            "Thu hút thêm khách đến tiệm mỗi ngày.",

        levels: [
            {
                name: "Phát tờ rơi",
                price: 250000,
                effect: "+8% khách mỗi ngày"
            },
            {
                name: "Quảng cáo truyền hình",
                price: 650000,
                effect: "+16% khách mỗi ngày"
            },
            {
                name: "Billboard trung tâm",
                price: 1400000,
                effect: "+25% khách mỗi ngày"
            }
        ]
    },


    seating: {
        icon: "🪑",

        name: "Chỗ ngồi",

        description:
            "Khách thoải mái hơn và chịu chờ lâu hơn.",

        levels: [
            {
                name: "Ghế nhựa vỉa hè",
                price: 180000,
                effect: "+10% thời gian kiên nhẫn"
            },
            {
                name: "Ghế tựa êm ái",
                price: 480000,
                effect: "+20% thời gian kiên nhẫn"
            },
            {
                name: "Sofa phòng chờ",
                price: 1100000,
                effect: "+35% thời gian kiên nhẫn"
            }
        ]
    },


    aircon: {
        icon: "🌬️",

        name: "Làm mát",

        description:
            "Khách bớt khó chịu khi phải chờ lâu.",

        levels: [
            {
                name: "Quạt điện",
                price: 350000,
                effect: "Rating dễ hơn 5%"
            },
            {
                name: "Máy lạnh treo tường",
                price: 850000,
                effect: "Rating dễ hơn 10%"
            },
            {
                name: "Điều hòa cao cấp",
                price: 1800000,
                effect: "Rating dễ hơn 15%"
            }
        ]
    }

};

function customersForNewDay() {

    const base =
        randomCustomersToday(game.day);

    const level =
        getUpgradeLevel(
            "advertising"
        );

    const bonusByLevel = [
        0,
        0.08,
        0.16,
        0.25
    ];

    const bonus =
        bonusByLevel[level] || 0;


    return Math.max(
        base,
        Math.round(
            base * (1 + bonus)
        )
    );
}

function getUpgradeLevel(id) {

    return Number(
        game.upgrades?.[id] || 0
    );
}


function buyUpgrade(id) {

    const config =
        UPGRADE_CONFIG[id];

    if (!config) return;


    const currentLevel =
        getUpgradeLevel(id);

    if (
        currentLevel >=
        config.levels.length
    ) {
        return;
    }


    const nextLevel =
        config.levels[currentLevel];


    if (
        game.money <
        nextLevel.price
    ) {

        showCutePopup({
            icon: "🥲",
            title: "Chưa đủ tiền",
            message:
                `Cần ${formatMoney(nextLevel.price)} để nâng cấp.`,
            confirmText: "Okii"
        });

        return;
    }


    showCutePopup({

        icon: config.icon,

        title:
            `${config.name} Lv.${currentLevel + 1}`,

        message:
            `${nextLevel.effect}\nGiá: ${formatMoney(nextLevel.price)}`,

        cancelText: "Để sau",

        confirmText: "Nâng cấp",

        onConfirm: () => {

            game.money -=
                nextLevel.price;

            game.upgrades[id] =
                currentLevel + 1;

            saveGame();

            moneyDisplay.textContent =
                formatMoney(game.money);

            renderUpgradePanel();
        }

    });
}

function renderUpgradePanel() {

    shopPanelEyebrow.textContent =
        "Phát triển tiệm";

    shopPanelTitle.textContent =
        "⬆️ Nâng cấp";


    const cards =
        Object.entries(
            UPGRADE_CONFIG
        )
        .map(([id, config]) => {

            const level =
                getUpgradeLevel(id);

            const maxLevel =
                config.levels.length;

            const isMax =
                level >= maxLevel;

            const next =
                isMax
                    ? null
                    : config.levels[level];


            return `

                <article class="upgrade-card">

                    <div class="upgrade-card-icon">
                        ${config.icon}
                    </div>

                    <div class="upgrade-card-body">

                        <div class="upgrade-card-title">

                            <strong>
                                ${config.name}
                            </strong>

                            <span>
                                Lv.${level}/${maxLevel}
                            </span>

                        </div>

                        <p>
                            ${config.description}
                        </p>


                        ${
                            level > 0
                                ? `
                                    <div class="upgrade-current">
                                        Hiện tại:
                                        ${config.levels[level - 1].name}
                                        ·
                                        ${config.levels[level - 1].effect}
                                    </div>
                                `
                                : `
                                    <div class="upgrade-current">
                                        Chưa nâng cấp
                                    </div>
                                `
                        }


                        ${
                            isMax
                                ? `
                                    <div class="upgrade-max">
                                        ✓ Đã nâng tối đa
                                    </div>
                                `
                                : `
                                    <button
                                        class="upgrade-buy-button"
                                        type="button"
                                        data-upgrade-id="${id}"
                                    >
                                        ${next.name}
                                        · ${next.effect}
                                        · ${formatMoney(next.price)}
                                    </button>
                                `
                        }

                    </div>

                </article>

            `;

        })
        .join("");


    shopPanelContent.innerHTML = `

        <p class="upgrade-panel-note">
            Đầu tư tiền kiếm được để phát triển tiệm.
            Nâng cấp cao hơn sẽ ngày càng đắt.
        </p>

        <div class="upgrade-list">
            ${cards}
        </div>

    `;


    shopPanelContent
        .querySelectorAll(
            "[data-upgrade-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    buyUpgrade(
                        button.dataset.upgradeId
                    );

                }
            );

        });
}

let managementPanelSection =
    "revenue";


const COLLECTION_ACHIEVEMENTS = [

    {
        id: "hoa-anh-dao",
        name: "Bộ Hoa Anh Đào",
        description:
            "Sở hữu trọn bộ sưu tập Hoa Anh Đào.",
        event: "sakura",
        emoji: "🌸"
    },

    {
        id: "dem-ram-trung-thu",
        name: "Bộ Đêm Rằm Trung Thu",
        description:
            "Sở hữu trọn bộ sưu tập Đêm Rằm Trung Thu.",
        event: "trung-thu",
        emoji: "🌕"
    },

    {
        id: "ngay-50",
        name: "Khách Quen Của Tiệm",
        description:
            "Chơi đến ngày thứ 50.",
        kind: "day",
        target: 50,
        emoji: "📅"
    }

];


function getCollectionAchievementProgress(
    achievement
) {

    if (achievement.kind === "day") {
        const target = Math.max(
            1,
            Number(achievement.target) || 1
        );
        const collected = Math.min(
            target,
            Math.max(0, Number(game.day) || 0)
        );

        return {
            collected,
            total: target,
            complete: collected >= target
        };
    }

    const types = [
        "recipe",
        "background",
        "board",
        "ingredientTable",
        "drinkTable",
        "cupHolder",
        "counter"
    ];


    let collected = 0;
    let total = 0;


    types.forEach(type => {

        const eventSkin =
            SKIN_CATALOG[type]
                .find(
                    skin =>
                        skin.event ===
                        achievement.event
                );


        if (!eventSkin) {
            return;
        }


        total++;


        if (
            ownsSkin(
                type,
                eventSkin.id
            )
        ) {
            collected++;
        }

    });


    return {
        collected,
        total,
        complete:
            total > 0 &&
            collected >= total
    };
}


function renderManagementPanel() {

    shopPanelEyebrow.textContent =
        "Sổ sách & bộ sưu tập";

    shopPanelTitle.textContent =
        "🗂️ Quản lý";


    shopPanelContent.innerHTML = `

        <div class="mission-tabs management-tabs">

            <button
                class="
                    mission-tab
                    ${
                        managementPanelSection ===
                        "revenue"
                            ? "active"
                            : ""
                    }
                "
                type="button"
                data-management-tab="revenue"
            >
                📊 Doanh thu
            </button>


            <button
                class="
                    mission-tab
                    ${
                        managementPanelSection ===
                        "achievements"
                            ? "active"
                            : ""
                    }
                "
                type="button"
                data-management-tab="achievements"
            >
                🏆 Thành tựu
            </button>

        </div>


        <div id="management-tab-content"></div>

    `;


    shopPanelContent
        .querySelectorAll(
            "[data-management-tab]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    managementPanelSection =
                        button.dataset
                            .managementTab;

                    renderManagementPanel();
                }
            );

        });


    if (
        managementPanelSection ===
        "achievements"
    ) {

        renderAchievementContent();

    } else {

        renderRevenueContent();
    }
}


function renderRevenueContent() {

    const container =
        document.getElementById(
            "management-tab-content"
        );

    if (!container) return;


    const utilities =
        game.dailyRentPaid > 0
            ? game.dailyRentPaid
            : getDailyUtilityCost();


    const expenses =
        game.dailyIngredientSpend +
        utilities;


    const profit =
        game.dailyRevenue -
        expenses;


    container.innerHTML = `

        <div class="revenue-summary">

            <div class="revenue-card revenue-positive">
                <span>Doanh thu</span>

                <strong>
                    ${formatMoney(
                        game.dailyRevenue
                    )}
                </strong>
            </div>


            <div class="revenue-card">
                <span>Đơn hoàn thành</span>

                <strong>
                    ${game.completedOrders}
                </strong>
            </div>


            <div class="revenue-card revenue-negative">
                <span>Nhập hàng</span>

                <strong>
                    -${formatMoney(
                        game.dailyIngredientSpend
                    )}
                </strong>
            </div>


            <div class="revenue-card revenue-negative">
                <span>Điện nước</span>

                <strong>
                    -${formatMoney(
                        utilities
                    )}
                </strong>
            </div>


            <div
                class="
                    revenue-card
                    revenue-wide
                    ${
                        profit >= 0
                            ? "revenue-positive"
                            : "revenue-negative"
                    }
                "
            >

                <span>
                    Lợi nhuận hiện tại
                </span>

                <strong>
                    ${
                        profit >= 0
                            ? "+"
                            : "-"
                    }${formatMoney(
                        Math.abs(profit)
                    )}
                </strong>

            </div>

        </div>


        <p class="management-note">
            💡 Điện nước tăng theo cấp
            Chỗ ngồi và Làm mát.
        </p>
    `;
}


function renderAchievementContent() {

    const container =
        document.getElementById(
            "management-tab-content"
        );

    if (!container) return;


    const cards =
        COLLECTION_ACHIEVEMENTS
            .map(achievement => {

                const progress =
                    getCollectionAchievementProgress(
                        achievement
                    );


                const percent =
                    progress.total
                        ? (
                            progress.collected /
                            progress.total *
                            100
                        )
                        : 0;


                return `

                    <article
                        class="
                            achievement-card
                            ${
                                progress.complete
                                    ? "is-complete"
                                    : ""
                            }
                        "
                    >

                        <div class="
                            achievement-icon
                        ">
                            ${achievement.emoji}
                        </div>


                        <div class="
                            achievement-body
                        ">

                            <div class="
                                achievement-title-row
                            ">

                                <strong>
                                    ${achievement.name}
                                </strong>

                                <span>
                                    ${progress.collected}
                                    /
                                    ${progress.total}
                                </span>

                            </div>


                            <p>
                                ${achievement.description}
                            </p>


                            <div class="
                                daily-mission-track
                            ">
                                <span
                                    style="
                                        width:${percent}%;
                                    "
                                ></span>
                            </div>


                            <div class="
                                achievement-status
                            ">
                                ${
                                    progress.complete
                                        ? "🏆 Đã hoàn thành"
                                        : `Còn ${
                                            progress.total -
                                            progress.collected
                                        } món`
                                }
                            </div>

                        </div>

                    </article>

                `;

            })
            .join("");


    container.innerHTML = `

        <p class="management-note">
            Thu thập trọn bộ trang trí sự kiện
            để hoàn thành thành tựu.
        </p>


        <div class="achievement-list">
            ${cards}
        </div>

    `;
}


// Giữ alias để code cũ nếu có gọi trực tiếp vẫn hoạt động.
function renderRevenuePanel() {
    managementPanelSection = "revenue";
    renderManagementPanel();
}

// ======================================================
// WEIGHTED RANDOM
// ======================================================

function weightedRandomRecipe(list) {
    if (!list.length) {
        return null;
    }

    const totalWeight = list.reduce(
        (total, recipe) => total + (recipe.weight || 1),
        0
    );

    let roll = Math.random() * totalWeight;

    for (const recipe of list) {
        roll -= recipe.weight || 1;

        if (roll <= 0) {
            return recipe;
        }
    }

    return list[list.length - 1];
}


// ======================================================
// SAVE
// ======================================================

function saveGame() {
    const ingredientSave = {};

    Object.entries(ingredients).forEach(([name, data]) => {
        ingredientSave[name] = {
            unlocked: data.unlocked,
            stock: data.stock
        };
    });

    const saveData = {
        game: {
            day: game.day,
            money: game.money,

            phase: game.phase,
            pausedPhase: game.pausedPhase,

            hasStarted: game.hasStarted,
            shopOpen: game.shopOpen,

            customersToday: game.customersToday,
            customerNumber: game.customerNumber,
            completedOrders: game.completedOrders,
            dailyRevenue: game.dailyRevenue,

            dailyIngredientSpend:
                game.dailyIngredientSpend,

            dailyRentPaid:
                game.dailyRentPaid,

            waitingCustomers: game.waitingCustomers,
            activeTicketId: game.activeTicketId,
            nextTicketId: game.nextTicketId,
            dailyStarTotal: game.dailyStarTotal,
            dailyReviewCount: game.dailyReviewCount,
            reviewStarsTotal: game.reviewStarsTotal,
            reviewCount: game.reviewCount,
            ratingStreak: game.ratingStreak,
            ratingHistory: game.ratingHistory,
            shopXp: game.shopXp,
            
            upgrades: {
    ...game.upgrades
},

skinOwned: {
    recipe: [
        ...game.skinOwned.recipe
    ],
    background: [
        ...game.skinOwned.background
    ],
    board: [
        ...game.skinOwned.board
    ],
    ingredientTable: [
        ...game.skinOwned.ingredientTable
    ],
    drinkTable: [
        ...game.skinOwned.drinkTable
    ],
    cupHolder: [
        ...game.skinOwned.cupHolder
    ],
    counter: [
        ...game.skinOwned.counter
    ]
},

            currentRecipeName:
                game.currentRecipe
                    ? game.currentRecipe.name
                    : null,

            currentCustomer: game.currentCustomer,
            currentOrder: game.currentOrder,

            selectedIngredients: game.selectedIngredients,
            breadSelected: game.breadSelected,

            orderNote: game.orderNote
        },

        ingredients: ingredientSave
    };

    try {
        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(saveData)
        );
    } catch (error) {
        console.warn("Không save được game:", error);
    }
}


// ======================================================
// LOAD
// ======================================================

function loadGame() {
    let saveData;

    try {
        const raw = localStorage.getItem(SAVE_KEY);

        if (!raw) {
            return false;
        }

        saveData = JSON.parse(raw);

    } catch (error) {
        console.warn("Save bị lỗi:", error);
        return false;
    }


    if (!saveData || !saveData.game) {
        return false;
    }


    const saved = saveData.game;


    game.day =
        saved.day ?? 1;

    game.money =
        saved.money ?? 100000;

    game.phase =
        saved.phase ?? "home";

    game.pausedPhase =
        saved.pausedPhase ?? null;

    game.hasStarted =
        saved.hasStarted ?? false;

    game.shopOpen =
        saved.shopOpen ?? false;

    game.customersToday =
        saved.customersToday ?? 5;

    game.customerNumber =
        saved.customerNumber ?? 0;

    game.completedOrders =
        saved.completedOrders ?? 0;

    game.dailyRevenue =
        saved.dailyRevenue ?? 0;

    game.dailyIngredientSpend =
        saved.dailyIngredientSpend ?? 0;

    game.dailyRentPaid =
        saved.dailyRentPaid ?? 0;
    game.waitingCustomers = Array.isArray(saved.waitingCustomers)
        ? saved.waitingCustomers.filter(ticket =>
            ticket && isKnownCustomerId(ticket.customer) &&
            recipes.some(recipe => recipe.name === ticket.recipeName) &&
            Array.isArray(ticket.order) && Number.isFinite(ticket.remainingMs))
        : [];


    // Save cũ chưa có số thứ tự riêng cho từng ticket.
    // Suy ra số thứ tự từ vị trí hiện tại trong hàng chờ.
    const inferredFirstCustomerNumber =
        Math.max(
            1,
            game.customerNumber -
            game.waitingCustomers.length +
            1
        );

    game.waitingCustomers =
        game.waitingCustomers.map(
            (ticket, index) => ({
                ...ticket,
                customerNumber:
                    Number(ticket.customerNumber) ||
                    inferredFirstCustomerNumber +
                    index
            })
        );
    game.activeTicketId = saved.activeTicketId ?? null;
    game.nextTicketId = saved.nextTicketId ?? 1;
    game.dailyStarTotal = saved.dailyStarTotal ?? 0;
    game.dailyReviewCount = saved.dailyReviewCount ?? 0;
    game.reviewStarsTotal = saved.reviewStarsTotal ?? 0;
    game.reviewCount = saved.reviewCount ?? 0;
    game.ratingStreak = saved.ratingStreak ?? 0;
    game.ratingHistory = Array.isArray(saved.ratingHistory)
        ? saved.ratingHistory.slice(0, 10)
        : [];
    game.shopXp = Math.max(0, Number(saved.shopXp) || 0);
    
    game.upgrades = {
    advertising:
        saved.upgrades?.advertising || 0,

    seating:
        saved.upgrades?.seating || 0,

    aircon:
        saved.upgrades?.aircon || 0
};


game.skinOwned = {

    recipe:
        Array.isArray(
            saved.skinOwned?.recipe
        )
            ? saved.skinOwned.recipe
            : ["mac-dinh"],

    background:
        Array.isArray(
            saved.skinOwned?.background
        )
            ? saved.skinOwned.background
            : ["troi-xanh"],

    board:
        Array.isArray(
            saved.skinOwned?.board
        )
            ? saved.skinOwned.board
            : ["mac-dinh"],

    ingredientTable:
        Array.isArray(
            saved.skinOwned?.ingredientTable
        )
            ? saved.skinOwned.ingredientTable
            : ["mac-dinh"],

    drinkTable:
        Array.isArray(
            saved.skinOwned?.drinkTable
        )
            ? saved.skinOwned.drinkTable
            : ["mac-dinh"],

    cupHolder:
        Array.isArray(
            saved.skinOwned?.cupHolder
        )
            ? saved.skinOwned.cupHolder
            : ["mac-dinh"],

    counter:
        Array.isArray(
            saved.skinOwned?.counter
        )
            ? saved.skinOwned.counter
            : ["mac-dinh"]
};

    game.currentCustomer =
        saved.currentCustomer ?? null;

    game.currentOrder =
        Array.isArray(saved.currentOrder)
            ? saved.currentOrder
            : [];

    game.selectedIngredients =
        Array.isArray(saved.selectedIngredients)
            ? saved.selectedIngredients
            : [];

    game.breadSelected =
        saved.breadSelected ?? false;

    game.orderNote =
        saved.orderNote ||
        "Cho mình một ổ như bình thường nha!";


    game.currentRecipe =
        recipes.find(
            recipe =>
                recipe.name === saved.currentRecipeName
        ) || null;


    if (saveData.ingredients) {

        Object.entries(
            saveData.ingredients
        ).forEach(
            ([name, savedIngredient]) => {

                if (!ingredients[name]) {
                    return;
                }


                if (
                    typeof savedIngredient.unlocked
                    === "boolean"
                ) {
                    ingredients[name].unlocked =
                        savedIngredient.unlocked;
                }


                if (
                    Number.isFinite(
                        savedIngredient.stock
                    )
                ) {
                    ingredients[name].stock =
                        Math.max(
                            0,
                            savedIngredient.stock
                        );
                }
            }
        );
    }


    // Các nguyên liệu mặc định luôn được mở từ đầu
[
    "Pâté",
    "Trứng",
    "Dưa leo",
    "Rau",
    "Ketchup",
    "Bánh mì"
].forEach(name => {
    ingredients[name].unlocked = true;
});


    return true;
}

// ======================================================
// DAY START CHECKPOINT
// ======================================================

function saveDayStartCheckpoint() {
    const ingredientSnapshot = {};

    Object.entries(ingredients).forEach(([name, data]) => {
        ingredientSnapshot[name] = {
            unlocked: data.unlocked,
            stock: data.stock
        };
    });

    const drinkIngredientSnapshot = snapshotDrinkIngredients();

    const snapshot = {
        day: game.day,
        money: game.money,
        customersToday: game.customersToday,

        dailyIngredientSpend:
            game.dailyIngredientSpend,

        dailyRentPaid:
            game.dailyRentPaid,

        shopXp:
            game.shopXp,

        ratingStreak:
            game.ratingStreak,

        ratingHistory:
            JSON.parse(
                JSON.stringify(
                    game.ratingHistory || []
                )
            ),

        reviewStarsTotal:
            game.reviewStarsTotal,

        reviewCount:
            game.reviewCount,

        ingredients: ingredientSnapshot,
        drinkIngredients: drinkIngredientSnapshot,
        upgrades: {
    ...game.upgrades
},

skinOwned: {
    recipe: [
        ...game.skinOwned.recipe
    ],
    background: [
        ...game.skinOwned.background
    ],
    board: [
        ...game.skinOwned.board
    ],
    ingredientTable: [
        ...game.skinOwned.ingredientTable
    ],
    drinkTable: [
        ...game.skinOwned.drinkTable
    ],
    cupHolder: [
        ...game.skinOwned.cupHolder
    ],
    counter: [
        ...game.skinOwned.counter
    ]
},

selectedSkins: {
    ...selectedSkins
},

realDailySnapshot: JSON.parse(
    JSON.stringify(
        loadRealDailyData()
    )
),

midAutumnSnapshot: JSON.parse(
    JSON.stringify(
        midAutumnProgress
    )
),
    };

    try {
        localStorage.setItem(
            DAY_START_KEY,
            JSON.stringify(snapshot)
        );
    } catch (error) {
        console.warn("Không lưu được đầu ngày:", error);
    }
}


function snapshotDrinkIngredients() {
    return Object.fromEntries(
        Object.entries(drinkIngredients).map(([name, data]) => [
            name,
            { unlocked: data.unlocked, stock: data.stock }
        ])
    );
}


function loadDayStartCheckpoint() {
    try {
        const raw = localStorage.getItem(DAY_START_KEY);

        if (!raw) {
            return null;
        }

        const snapshot = JSON.parse(raw);

        if (!snapshot || snapshot.day !== game.day) {
            return null;
        }

        return snapshot;

    } catch (error) {
        console.warn("Checkpoint đầu ngày bị lỗi:", error);
        return null;
    }
}


function restartCurrentDay() {
    const snapshot = loadDayStartCheckpoint();

    if (!snapshot) {
        showCutePopup({
            icon: "🥺",
            title: "Chưa có dữ liệu đầu ngày",
            message: "Không tìm thấy checkpoint của ngày này.",
            confirmText: "Okii"
        });

        return;
    }

    showCutePopup({
        icon: "↻",
        title: `Chơi lại ngày ${game.day}?`,
        message: snapshot.drinkSnapshotMigrated
            ? "Tiền và kho bánh mì sẽ về đầu ngày. Save cũ không lưu kho nước đầu ngày, nên kho nước sẽ về lúc bạn cập nhật bản sửa này. Tiến độ sau đó sẽ bị bỏ."
            : "Tiền, kho hàng và nguyên liệu đã mở sẽ quay về đúng lúc bắt đầu ngày này. Mọi tiến độ trong ngày hiện tại sẽ bị bỏ.",
        cancelText: "Không",
        confirmText: "Chơi lại",

        onConfirm: () => {
            // Stop callbacks from the abandoned run before restoring its state.
            clearTimeout(customerWaitTimer);
            clearTimeout(nextArrivalTimer);
            clearInterval(patienceInterval);
            customerWaitTimer = null;
            nextArrivalTimer = null;
            patienceInterval = null;
            clearCustomerReactionTimers();
            localStorage.removeItem(CUSTOMER_WAIT_KEY);
            document.getElementById("shop-opening-overlay")?.remove();
            document.getElementById("shop-closing-overlay")?.remove();
            clearDay1TutorialUI();

            game.day = snapshot.day;
            game.money = snapshot.money;
            game.upgrades = {
    advertising:
        snapshot.upgrades?.advertising || 0,

    seating:
        snapshot.upgrades?.seating || 0,

    aircon:
        snapshot.upgrades?.aircon || 0
};


game.skinOwned = {

    recipe:
        snapshot.skinOwned?.recipe ||
        ["mac-dinh"],

    background:
        snapshot.skinOwned?.background ||
        ["troi-xanh"],

    board:
        snapshot.skinOwned?.board ||
        ["mac-dinh"],

    ingredientTable:
        snapshot.skinOwned?.ingredientTable ||
        ["mac-dinh"],

    drinkTable:
        snapshot.skinOwned?.drinkTable ||
        ["mac-dinh"],

    cupHolder:
        snapshot.skinOwned?.cupHolder ||
        ["mac-dinh"],

    counter:
        snapshot.skinOwned?.counter ||
        ["mac-dinh"]

};


selectedSkins = {
    ...DEFAULT_SKINS,
    ...(snapshot.selectedSkins || {})
};


saveSelectedSkins();

if (
    snapshot.realDailySnapshot &&
    snapshot.realDailySnapshot.date ===
        getRealDateKey()
) {

    realDaily =
        JSON.parse(
            JSON.stringify(
                snapshot.realDailySnapshot
            )
        );

    saveRealDailyData(
        realDaily
    );
}

if (
    snapshot.midAutumnSnapshot &&
    isMidAutumnEventActive()
) {

    midAutumnProgress =
        JSON.parse(
            JSON.stringify(
                snapshot.midAutumnSnapshot
            )
        );

    saveMidAutumnProgress();
}

            game.customersToday = snapshot.customersToday;

            if (snapshot.ingredients) {
                Object.entries(snapshot.ingredients).forEach(
                    ([name, savedIngredient]) => {
                        if (!ingredients[name]) {
                            return;
                        }

                        ingredients[name].unlocked =
                            savedIngredient.unlocked;

                        ingredients[name].stock =
                            savedIngredient.stock;
                    }
                );
            }

            if (snapshot.drinkIngredients) {
                Object.entries(snapshot.drinkIngredients).forEach(
                    ([name, savedIngredient]) => {
                        if (!drinkIngredients[name]) return;

                        drinkIngredients[name].unlocked =
                            savedIngredient.unlocked;
                        drinkIngredients[name].stock =
                            savedIngredient.stock;
                    }
                );
                resetDrinkBuild();
                saveDrinkFeatureState();
            }

            [
    "Pâté",
    "Trứng",
    "Dưa leo",
    "Rau",
    "Ketchup",
    "Bánh mì"
].forEach(name => {
    ingredients[name].unlocked = true;
});

            game.phase = "prep";
            game.pausedPhase = "prep";

            game.hasStarted = true;
            game.shopOpen = false;

            game.customerNumber = 0;
            game.completedOrders = 0;
            game.dailyRevenue = 0;

            game.dailyIngredientSpend =
                snapshot.dailyIngredientSpend ?? 0;

            game.dailyRentPaid =
                snapshot.dailyRentPaid ?? 0;
            // Restore long-term rating / level data to the
            // state it had at the START of this game day.
            //
            // Older checkpoints (before this fix) did not contain
            // these fields. In that case, preserve previous reviews
            // instead of accidentally wiping the entire shop rating.
            const checkpointHasRating =
                Number.isFinite(
                    Number(snapshot.reviewCount)
                ) &&
                Number.isFinite(
                    Number(snapshot.reviewStarsTotal)
                );

            if (checkpointHasRating) {
                game.reviewStarsTotal =
                    Math.max(
                        0,
                        Number(snapshot.reviewStarsTotal) || 0
                    );

                game.reviewCount =
                    Math.max(
                        0,
                        Number(snapshot.reviewCount) || 0
                    );

                game.ratingStreak =
                    Math.max(
                        0,
                        Number(snapshot.ratingStreak) || 0
                    );

                game.ratingHistory =
                    Array.isArray(snapshot.ratingHistory)
                        ? JSON.parse(
                            JSON.stringify(
                                snapshot.ratingHistory
                            )
                        ).slice(0, 10)
                        : [];
            } else {
                // Legacy checkpoint fallback:
                // remove only today's aggregate ratings.
                game.reviewStarsTotal =
                    Math.max(
                        0,
                        (Number(game.reviewStarsTotal) || 0) -
                        (Number(game.dailyStarTotal) || 0)
                    );

                game.reviewCount =
                    Math.max(
                        0,
                        (Number(game.reviewCount) || 0) -
                        (Number(game.dailyReviewCount) || 0)
                    );

                // Keep reviews from earlier days when possible.
                game.ratingHistory =
                    Array.isArray(game.ratingHistory)
                        ? game.ratingHistory
                            .filter(
                                review =>
                                    Number(review?.day) !==
                                    Number(game.day)
                            )
                            .slice(0, 10)
                        : [];
            }

            // XP is restored exactly when the new checkpoint has it.
            // For an old checkpoint, keep the current XP rather than
            // erasing the player's long-term level progress.
            if (
                snapshot.shopXp !== undefined &&
                snapshot.shopXp !== null
            ) {
                game.shopXp =
                    Math.max(
                        0,
                        Number(snapshot.shopXp) || 0
                    );
            }

            game.dailyStarTotal = 0;
            game.dailyReviewCount = 0;
            game.waitingCustomers = [];
            game.activeTicketId = null;
            game.nextTicketId = 1;

            game.currentRecipe = null;
            game.currentCustomer = null;
            game.currentOrder = [];

            game.selectedIngredients = [];
            game.breadSelected = false;

            // Chơi lại Day 1 = tutorial quay về bước đầu.
            if (game.day === 1) {
                localStorage.removeItem(
                    DAY1_TUTORIAL_STATE_KEY
                );
                day1TutorialStep = null;
                clearDay1TutorialUI();
            }

            game.orderNote =
                "Cho mình một ổ như bình thường nha!";

            // Chơi lại ngày luôn quay về briefing đầu ngày trước khi prep.
            game.phase = "newDayIntro";
            game.pausedPhase = "newDayIntro";

            saveGame();
            renderNewDayIntro();
            mainButton.disabled = false;
        }
    });
}
// ======================================================
// RESET SAVE
// ======================================================

function resetGameSave() {
    showCutePopup({
        icon: "🗑️",
        title: "Chơi lại từ đầu?",
        message:
            "Toàn bộ tiền, ngày chơi, kho hàng và nguyên liệu đã mở sẽ bị xóa. Game sẽ quay lại từ ngày 1.",
        cancelText: "Không",
        confirmText: "Chơi lại",

        onConfirm: () => {

            // =========================
            // DỪNG TIMER CỦA RUN CŨ
            // =========================

            clearTimeout(customerWaitTimer);
            clearTimeout(nextArrivalTimer);
            clearInterval(patienceInterval);

            customerWaitTimer = null;
            nextArrivalTimer = null;
            patienceInterval = null;

            clearCustomerReactionTimers();


            // =========================
            // XÓA SAVE + STATE PHỤ
            // =========================

            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(DAY_START_KEY);
            localStorage.removeItem("mot-o-nha-drinks-v1");
            localStorage.removeItem(
                WRONG_ORDER_RECIPE_HINT_KEY
            );

            // Reset game = tutorial Day 1 phải bắt đầu lại từ đầu.
            localStorage.removeItem(
                DAY1_TUTORIAL_DONE_KEY
            );
            localStorage.removeItem(
                DAY1_TUTORIAL_STATE_KEY
            );
            day1TutorialStep = null;
            clearDay1TutorialUI();

            localStorage.removeItem("mot-o-nha-last-reaction");
            localStorage.removeItem("mot-o-nha-wait-until");

            // Xóa queue khách của tất cả ngày
            Object.keys(localStorage).forEach(key => {
                if (
                    key.startsWith(
                        "mot-o-nha-customer-queue-"
                    )
                ) {
                    localStorage.removeItem(key);
                }
            });


            // =========================
            // RESET GAME STATE
            // =========================

            game.day = 1;
            game.money = 100000;

            game.phase = "home";
            game.pausedPhase = null;

            game.hasStarted = false;
            game.shopOpen = false;

            game.customersToday =
                randomCustomersToday(1);

            game.customerNumber = 0;
            game.completedOrders = 0;
            game.dailyRevenue = 0;

            game.dailyIngredientSpend = 0;
            game.dailyRentPaid = 0;

            game.waitingCustomers = [];
            game.activeTicketId = null;
            game.nextTicketId = 1;

            game.dailyStarTotal = 0;
            game.dailyReviewCount = 0;

            game.reviewStarsTotal = 0;
            game.reviewCount = 0;
            game.ratingStreak = 0;
            game.ratingHistory = [];
            game.shopXp = 0;

            game.upgrades = {
    advertising: 0,
    seating: 0,
    aircon: 0
};


game.skinOwned = {
    recipe: ["mac-dinh"],
    background: ["troi-xanh"],
    board: ["mac-dinh"],
    ingredientTable: ["mac-dinh"],
    drinkTable: ["mac-dinh"],
    cupHolder: ["mac-dinh"],
    counter: ["mac-dinh"]
};


selectedSkins = {
    ...DEFAULT_SKINS
};


saveSelectedSkins();

            game.currentRecipe = null;
            game.currentCustomer = null;
            game.currentOrder = [];

            game.selectedIngredients = [];
            game.breadSelected = false;

            game.orderNote =
                "Cho mình một ổ như bình thường nha!";


            // =========================
            // RESET INGREDIENTS
            // =========================

            Object.values(ingredients).forEach(data => {
                data.unlocked = false;
                data.stock = 0;
            });

            ingredients["Pâté"].unlocked = true;
            ingredients["Pâté"].stock = 10;

            ingredients["Trứng"].unlocked = true;
            ingredients["Trứng"].stock = 10;

            ingredients["Dưa leo"].unlocked = true;
            ingredients["Dưa leo"].stock = 12;

            ingredients["Rau"].unlocked = true;
            ingredients["Rau"].stock = 12;

            ingredients["Ketchup"].unlocked = true;
            ingredients["Ketchup"].stock = 10;

            ingredients["Bánh mì"].unlocked = true;
            ingredients["Bánh mì"].stock = 10;


            // =========================
            // TẠO SAVE DAY 1 MỚI
            // =========================

            saveDayStartCheckpoint();
            saveGame();

            showHome();
        }
    });
}


// ======================================================
// RECIPE SYSTEM
// ======================================================

function recipeUnlocked(recipe) {

    return recipe.ingredients.every(
        name =>
            ingredients[name] &&
            ingredients[name].unlocked
    );
}


function recipeHasStock(recipe) {

    // TẤT CẢ bánh mì đều cần một ổ bánh.
    if (ingredients["Bánh mì"].stock <= 0) {
        return false;
    }


    return recipe.ingredients.every(
        name =>
            ingredients[name] &&
            ingredients[name].unlocked &&
            ingredients[name].stock > 0
    );
}


function unlockedRecipes() {

    return recipes.filter(
        recipeUnlocked
    );
}


function availableRecipes() {

    return recipes.filter(
        recipe =>
            recipeUnlocked(recipe) &&
            recipeHasStock(recipe)
    );
}


function missingUnlocks(recipe) {

    return recipe.ingredients.filter(
        name =>
            !ingredients[name] ||
            !ingredients[name].unlocked
    );
}


// ======================================================
// RECIPE BUTTON
//
// CHỈ HIỆN HÌNH recipe.png
// KHÔNG CÒN CHỮ "Công thức"
// ======================================================

function recipeBookButton() {

    const recipeSkin =
        skinById(
            "recipe",
            selectedSkins.recipe
        );

    return `
        <button
            class="recipe-book-fab"
            onclick="openRecipeBook()"
            title="Sổ công thức"
            aria-label="Sổ công thức"
        >
            <img
                src="${recipeSkin.image}"
                alt="Sổ công thức"
                draggable="false"
            >
        </button>
    `;
}

const LATEST_VERSION = "0.4.1";

const LATEST_HIGHLIGHTS = [
    "Tăng giá cho các loại bánh và nước để cân bằng tài chính của tiệm, các món bánh sẽ bán được giá cao hơn một chút.",
    "Update thêm ảnh các món bánh vào sổ công thức.",
    "Nguyên liệu đồ uống giờ được mở khóa dần khi phát triển tiệm.",
    "Thêm skin cho Quầy đồ uống và Khay đặt cốc.",
    "Mở rộng bộ Hoa Anh Đào và Trung Thu với trang trí dành cho khu pha nước."
];

// ======================================================
// HOME
// ======================================================


function showHome() {

    switchMusic("lobby");

    if (game.phase !== "home") {
        game.pausedPhase = game.phase;
    }

    game.phase = "home";


    loginStreak =
        syncLoginStreak();

    syncEventProgress();


    const sakuraProgress =
        Math.min(
            20,
            eventProgress.highestDayCompleted
        );

    const sakuraPercent =
        Math.min(
            100,
            sakuraProgress / 20 * 100
        );

    const sakuraDone =
        sakuraProgress >= 20;


    const midAutumnProgressTotal =
        getMidAutumnTotalProgress();

    const midAutumnTarget =
        MID_AUTUMN_REQUIRED_SERVES *
        MID_AUTUMN_CUSTOMERS.length;

    const midAutumnPercent =
        Math.min(
            100,
            midAutumnProgressTotal / midAutumnTarget * 100
        );

    const midAutumnDone =
        midAutumnEventUnlocked();

    const midAutumnActive =
        isMidAutumnEventActive();


    updateHeader(
        "Một Ổ Nha! 🥖",

        game.hasStarted
            ? "Game đang tạm dừng"
            : "Tiệm bánh mì nhỏ"
    );


    screen.innerHTML = `
        <section class="home-dashboard">

            <div class="home-hero-card">
                <img
                    class="home-hero-banhmi"
                    src="images/banh-mi.png"
                    alt="Bánh mì"
                    draggable="false"
                >

                <h1 class="home-hero-title">
                    Một Ổ Nha!
                </h1>

                <p class="home-hero-subtitle">
                    Ngày ${game.day} • ${getPhaseStatusText()}
                </p>

            <div class="home-server-time">
                🕒 Giờ server:
                <span data-vietnam-server-time>
                    ${getVietnamServerTimeText()}
                </span>
                • GMT+7
            </div>
            </div>


            <div class="home-stats-grid">

                <div class="home-stat-card">
                    <span class="home-stat-label">
                        Ngày
                    </span>

                    <strong class="home-stat-value">
                        ${game.day}
                    </strong>
                </div>


                <div class="home-stat-card">
                    <span class="home-stat-label">
                        Tiền
                    </span>

                    <strong class="home-stat-value">
                        ${formatMoney(game.money)}
                    </strong>
                </div>


                <div class="home-stat-card">
                    <span class="home-stat-label">
                        Đăng nhập
                    </span>

                    <strong class="home-stat-value">
                        🔥 ${loginStreak.streak}
                    </strong>

                    <small class="home-stat-small">
                        ngày liên tiếp
                    </small>
                </div>

            </div>


            ${(() => {

                const levelProgress =
                    getShopLevelProgress();

                const levelTitle =
                    getShopLevelTitle(
                        levelProgress.level
                    );

                return `
                    <button
                        class="home-level-card"
                        type="button"
                        onclick="showShopLevelPopup()"
                    >
                        <div class="home-level-top">

                            <strong>
                                LV. ${levelProgress.level}
                            </strong>

                            <span>
                                ${levelTitle}
                            </span>

                            <small>
                                ${levelProgress.xpIntoLevel}
                                /
                                ${levelProgress.needed} EXP
                            </small>

                        </div>

                        <div class="home-level-track">
                            <span
                                style="
                                    width:
                                    ${levelProgress.percent}%;
                                "
                            ></span>
                        </div>

                    </button>
                `;
            })()}


            <div class="home-event-card">

                <div class="home-card-heading">

                    <div>
                        <span class="home-card-eyebrow">
                            🌸 Sự kiện
                        </span>

                        <strong>
                            Mùa Hoa Anh Đào
                        </strong>
                    </div>


                    <span class="${
                        sakuraDone
                            ? "home-event-complete"
                            : "home-event-count"
                    }">
                        ${
                            sakuraDone
                                ? "Đã mở 🔓"
                                : `${sakuraProgress}/20`
                        }
                    </span>

                </div>


                <p>
                    ${
                        sakuraDone
                            ? "Bạn đã mở quyền mua bộ Hoa Anh Đào!"
                            : `Hoàn thành thêm ${
                                20 - sakuraProgress
                            } ngày để mở quyền mua bộ Hoa Anh Đào.`
                    }
                </p>


                <div class="home-event-track">
                    <span
                        style="width:${sakuraPercent}%;"
                    ></span>
                </div>

            </div>


            <div
                class="
                    home-event-card
                    mid-autumn-home
                "
            >

                <div class="home-card-heading">

                    <div>
                        <span class="home-card-eyebrow">
                            🌕 Sự kiện giới hạn
                        </span>

                        <strong>
                            Đêm Rằm Trung Thu
                        </strong>
                    </div>


                    <span class="${
                        midAutumnDone
                            ? "home-event-complete"
                            : "home-event-count"
                    }">
                        ${
                            midAutumnDone
                                ? "Đã mở 🔓"
                                : midAutumnActive
                                    ? `${midAutumnProgressTotal}/${midAutumnTarget}`
                                    : "Đã hết"
                        }
                    </span>

                </div>


                <p>
                    ${
                        midAutumnDone
                            ? "Bạn đã mở quyền mua bộ Đêm Rằm Trung Thu!"
                            : midAutumnActive
                                ? `Phục vụ 3 vị khách đặc biệt đủ ${MID_AUTUMN_REQUIRED_SERVES} lần mỗi người. ${getMidAutumnCountdownText()}.`
                                : "Sự kiện Trung Thu đã kết thúc."
                    }
                </p>


                <div class="home-event-track">
                    <span
                        style="width:${midAutumnPercent}%;"
                    ></span>
                </div>

            </div>


            <div class="home-update-card">

                <div class="home-update-header">

                    <span class="home-update-badge">
                        ✨ Mới nhất
                    </span>

                    <strong>
                        v${LATEST_VERSION}
                    </strong>

                </div>


                <h3>
                    Cập nhật gần đây
                </h3>


                <ul>
                    ${
                        LATEST_HIGHLIGHTS
                            .map(
                                item =>
                                    `<li>${item}</li>`
                            )
                            .join("")
                    }
                </ul>


                <button
                    id="home-update-history"
                    class="home-update-button"
                    type="button"
                >
                    Xem lịch sử cập nhật ›
                </button>

            </div>


            <div class="home-save-actions">

                ${
                    game.hasStarted

                        ? `
                            <button
                                id="home-replay-day"
                                class="home-save-button home-restart-button"
                                type="button"
                            >
                                ↻ Chơi lại ngày này
                            </button>
                        `

                        : ""
                }


                <button
                    id="home-reset-save"
                    class="home-save-button home-reset-button"
                    type="button"
                >
                    🗑 Chơi lại từ đầu
                </button>

            </div>

        </section>
    `;


    document
        .getElementById(
            "home-update-history"
        )
        ?.addEventListener(
            "click",
            openUpdateHistory
        );


    document
        .getElementById(
            "home-replay-day"
        )
        ?.addEventListener(
            "click",
            restartCurrentDay
        );


    document
        .getElementById(
            "home-reset-save"
        )
        ?.addEventListener(
            "click",
            resetGameSave
        );


    mainButton.innerHTML =
        game.hasStarted
            ? `${UI_ICONS.play}<span>Tiếp tục</span>`
            : "Bắt đầu chơi →";


    saveGame();
}

function getPhaseStatusText() {
    if (game.phase === "prep") {
        return "Đang chuẩn bị mở cửa";
    }

    if (game.phase === "order" || game.phase === "making" || game.phase === "result" || game.phase === "waiting") {
        return "Game đang tạm dừng";
    }

    if (game.phase === "dayEnd") {
        return "Đã đóng cửa";
    }

    if (game.phase === "newDayIntro") {
        return "Sắp sang ngày mới";
    }

    return "Sẵn sàng vào tiệm";
}


// ======================================================
// RESUME
// ======================================================

function resumeGame() {

    if (!game.hasStarted) {

        game.hasStarted = true;
        game.shopOpen = false;

        // Mỗi lần bắt đầu một ngày đều phải xem briefing trước.
        game.phase = "newDayIntro";
        game.pausedPhase = "newDayIntro";
        renderNewDayIntro();

        return;
    }


    const phase = game.pausedPhase;


    if (phase === "prep") {

        showPrep();

    } else if (
        phase === "order" &&
        game.currentRecipe
    ) {

        renderCurrentOrder();

    } else if (
        phase === "making" &&
        game.currentRecipe
    ) {

        renderMakingScreen();

    } else if (
        phase === "result" &&
        game.currentRecipe
    ) {

        renderResultScreen();

    } else if (
        phase === "dayEnd"
    ) {

        renderDayEnd();

    } else if (
        phase === "newDayIntro"
    ) {

        renderNewDayIntro();

    } else {

        showPrep();
    }
}


// ======================================================
// PREP SCREEN
// ======================================================

function showPrep() {

    switchMusic(getKitchenMusicKey());

    game.phase = "prep";
    game.pausedPhase = "prep";

    game.hasStarted = true;
    game.shopOpen = false;


    updateHeader(
        `Ngày ${game.day}`,
        ""
    );


    screen.innerHTML = `
        <div class="making-screen prep-shopping-screen">
<section class="customer-panel prep-grab-panel">
    <div class="customer-portrait">
        <img src="images/grab.png"
             alt="Anh giao hàng"
             draggable="false"
             onerror="this.style.display='none'; this.nextElementSibling.hidden=false;">
        <span class="customer-fallback" hidden>🛵</span>
    </div>

    <div class="customer-bubble">
        <div class="customer-bubble-top">
            <span>Chuẩn bị nguyên liệu</span>
            ${recipeBookButton()}
        </div>
        <strong>Anh giao hàng</strong>
        <p id="prep-grab-message" role="status">
            Nhấn vào nguyên liệu để nhập hàng hoặc mở khóa, anh sẽ giao đến cho.
        </p>
    </div>
</section>

            <div class="banhmi-workspace">

                <div class="board-stage">

                    <img
                        class="cutting-board"
                        src="${skinById("board", selectedSkins.board).image}"
                        draggable="false"
                        alt="Thớt"
                    >

                </div>

            </div>


            <div class="ingredient-station">

                <div class="ingredient-table-wrap">

                    <img
                        class="ingredient-table-image"
                        src="${skinById("ingredientTable", selectedSkins.ingredientTable).image}"
                        draggable="false"
                        alt="Bàn nguyên liệu"
                    >

                    <div id="station-items"></div>

                </div>


            </div>

        </div>
    `;


    renderStationItems("prep");


    mainButton.textContent =
        `Mở cửa ngày ${game.day} 🥖`;


    saveGame();
}

function showPrepDeliveryMessage(message) {
    const bubble = document.getElementById("prep-grab-message");
    if (bubble) bubble.textContent = message;
}


// ======================================================
// OPEN SHOP
// ======================================================

function openShop() {

    switchMusic(getKitchenMusicKey());

    if (
        ingredients["Bánh mì"].stock <= 0
    ) {

        showCutePopup({
            icon: "🥖",

            title: "Hết bánh mì rồi!",

            message:
                "Phải nhập bánh mì trước khi mở cửa nha.",

            confirmText: "Okii"
        });

        return;
    }


    if (
        availableRecipes().length === 0
    ) {

        showCutePopup({
            icon: "📦",

            title: "Thiếu nguyên liệu rồi!",

            message:
                "Hiện tại không đủ nguyên liệu để làm món nào. Nhập thêm hàng trước khi mở cửa nha!",

            confirmText: "Nhập hàng"
        });

        return;
    }


    // Phòng trường hợp còn runtime state từ một ca trước bị gián đoạn.
    clearShopRuntimeState();

    game.shopOpen = true;

    game.customerNumber = 0;
    game.completedOrders = 0;
    game.dailyRevenue = 0;
    game.waitingCustomers = [];
    game.activeTicketId = null;
    game.dailyStarTotal = 0;
    game.dailyReviewCount = 0;

    game.selectedIngredients = [];
    game.breadSelected = false;


    saveGame();

    playOpenShopTransition();
}

function playOpenShopTransition() {
    if (document.getElementById("shop-opening-overlay")) return;

    mainButton.disabled = true;

    const overlay = document.createElement("div");
    overlay.id = "shop-opening-overlay";
    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "999999",
        display: "flex",
        overflow: "hidden",
        pointerEvents: "auto"
    });

    function makeDoor() {
        const door = document.createElement("div");
        Object.assign(door.style, {
            width: "50%",
            height: "100%",
            flex: "0 0 50%",
            background:
                "linear-gradient(#ed7390 0 15%, #fff5e7 15% 22%, #c28c60 22% 100%)",
            boxShadow: "inset 0 0 30px #69402966"
        });
        return door;
    }

    const left = makeDoor();
    const right = makeDoor();
    const sign = document.createElement("div");

    sign.textContent = "Tiệm mở cửa! 🥖";
    Object.assign(sign.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        opacity: "0",
        padding: "16px 22px",
        border: "3px solid #a66c47",
        borderRadius: "18px",
        background: "#fff9ed",
        color: "#65402c",
        fontSize: "22px",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        boxShadow: "0 7px 0 #83543c"
    });

    overlay.append(left, right, sign);
    document.body.appendChild(overlay);

    const sound = new Audio("audio/openstore.mp3");
    sound.volume = 0.65;
    sound.play().catch(() => {});

    requestAnimationFrame(() => {
        left.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(-101%)" }
            ],
            {
                duration: 900,
                delay: 1100,
                easing: "ease-in-out",
                fill: "forwards"
            }
        );

        right.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(101%)" }
            ],
            {
                duration: 900,
                delay: 1100,
                easing: "ease-in-out",
                fill: "forwards"
            }
        );

        sign.animate(
            [
                { opacity: 0 },
                { opacity: 1, offset: 0.2 },
                { opacity: 1, offset: 0.6 },
                { opacity: 0 }
            ],
            { duration: 2000, fill: "forwards" }
        );
    });

    // Đổi sang màn khách khi cửa vẫn đang che.
    setTimeout(() => nextCustomer(), 500);

    setTimeout(() => {
        overlay.remove();
        mainButton.disabled = game.phase === "waiting";
    }, 2600);
}

// ======================================================
// CREATE ORDER
// ======================================================

function createOrder() {

    const allPossibleRecipes =
        availableRecipes();


    const possibleRecipes =
        game.currentCustomer === "THO"

            ? allPossibleRecipes.filter(
                recipe =>
                    recipe.name === "Bánh mì chay" ||
                    recipe.name === "Bánh mì không"
            )

            : allPossibleRecipes;


    if (!possibleRecipes.length) {
        return false;
    }

    const speech =
    getCustomerSpeech();

    const self =
        speech.self;

    const you =
        speech.you;


    game.currentRecipe =
        weightedRandomRecipe(
            possibleRecipes
        );


    game.currentOrder =
        [...game.currentRecipe.ingredients];


    game.orderNote =
    randomItem([
        `Cho ${self} một ổ như bình thường nha!`,

        `Cho ${self} món này nha!`,

        you
            ? `Một ổ như thường giúp ${self} nhé ${you}!`
            : `Một ổ như thường giúp ${self} nhé!`
    ]);


    const modifiers = [];

function addModifier(id, text, apply) {
    modifiers.push({ id, text, apply });
}

if (game.currentOrder.includes("Rau")) {
    addModifier("no-herbs", "không cho rau", () => {
        game.currentOrder = game.currentOrder.filter(
            item => item !== "Rau"
        );
    });
}

if (game.currentOrder.includes("Ớt")) {
    addModifier("no-chili", "không cho ớt", () => {
        game.currentOrder = game.currentOrder.filter(
            item => item !== "Ớt"
        );
    });
}

if (game.currentOrder.some(item => sauceSlots.includes(item))) {
    addModifier("no-sauce", "không cho sốt", () => {
        game.currentOrder = game.currentOrder.filter(
            item => !sauceSlots.includes(item)
        );
    });
}

if (
    ingredients["Ớt"].unlocked &&
    ingredients["Ớt"].stock > 0 &&
    !game.currentOrder.includes("Ớt")
) {
    addModifier("extra-chili", "thêm ớt", () => {
        game.currentOrder.push("Ớt");
    });
}

[
    ["Ketchup", "extra-ketchup", "thêm ketchup"],
    ["Mayonnaise", "extra-mayo", "thêm mayonnaise"],
    ["Sriracha", "extra-sriracha", "thêm Sriracha"]
].forEach(([name, id, text]) => {
    if (
        ingredients[name].unlocked &&
        ingredients[name].stock > 0 &&
        !game.currentOrder.includes(name)
    ) {
        addModifier(id, text, () => {
            game.currentOrder.push(name);
        });
    }
});

if (
    game.currentRecipe.name !== "Bánh mì không" &&
    modifiers.length &&
    Math.random() < 0.58
) {
    const first = randomItem(modifiers);
    const chosen = [first];

    // Khoảng 30% đơn có yêu cầu riêng sẽ có thêm yêu cầu thứ hai.
    if (Math.random() < 0.30) {
        const compatible = modifiers.filter(modifier => {
            if (modifier.id === first.id) return false;

            const addingSauce = id => id.startsWith("extra-") &&
                ["extra-ketchup", "extra-mayo", "extra-sriracha"].includes(id);

            return !(
                (first.id === "no-sauce" && addingSauce(modifier.id)) ||
                (modifier.id === "no-sauce" && addingSauce(first.id)) ||
                (first.id === "no-chili" &&
    ["extra-chili", "extra-sriracha"].includes(modifier.id)) ||
(modifier.id === "no-chili" &&
    ["extra-chili", "extra-sriracha"].includes(first.id))
            );
        });

        if (compatible.length) {
            chosen.push(randomItem(compatible));
        }
    }

    chosen.forEach(modifier => modifier.apply());

    const singleRequestLines = {

    "no-herbs": [
        `À, ${self} không ăn rau nha!`,
        `Cho ${self} không có rau nhé!`,
        you
            ? `Một ổ nhưng đừng cho rau nha ${you}!`
            : `Một ổ nhưng đừng cho rau nha!`
    ],

    "no-sauce": [
        `Ôi, ${self} không ăn sốt nha!`,
        `Cho ${self} không sốt nhé!`,
        you
            ? `Một ổ nhưng không thêm sốt giúp ${self} nha ${you}!`
            : `Một ổ nhưng không thêm sốt giúp ${self} nha!`
    ],

    "no-chili": [
        `${self} không ăn được ớt nha!`,
        you
            ? `Đừng cho ớt giúp ${self} nhé ${you}!`
            : `Đừng cho ớt giúp ${self} nhé!`
    ],

    "extra-chili": [
        `Cho ${self} thêm ớt nha! 🌶️`,
        `${self} ăn cay, thêm ớt giúp ${self} nhé!`,
        `Ổ này cho ${self} có ớt nha!`
    ],

    "extra-ketchup": [
        `Cho ${self} thêm ketchup nha!`,
        you
            ? `Thêm chút sốt cà chua giúp ${self} nhé ${you}!`
            : `Thêm chút sốt cà chua giúp ${self} nhé!`
    ],

    "extra-mayo": [
        `Cho ${self} thêm mayonnaise nha!`,
        you
            ? `Thêm chút mayonnaise giúp ${self} nhé ${you}!`
            : `Thêm chút mayonnaise giúp ${self} nhé!`
    ],

    "extra-sriracha": [
        `Cho ${self} thêm Sriracha nha! 🌶️`,
        `Cho ${self} cay hơn một chút, thêm Sriracha nhé!`
    ]
};

game.orderNote =
    chosen.length === 1

        ? randomItem(
            singleRequestLines[
                chosen[0].id
            ]
        )

        : `Cho ${self} món này, ${
            chosen
                .map(
                    modifier =>
                        modifier.text
                )
                .join(" và ")
        } nha!`;
    }
    // BÁNH MÌ KHÔNG
    // Không có topping.

    if (
        game.currentRecipe.name ===
        "Bánh mì không"
    ) {

        game.orderNote =
    randomItem([

        `Cho ${self} một ổ bánh mì không thôi nha!`,

        `${self.charAt(0).toUpperCase() + self.slice(1)} chỉ lấy bánh mì thôi, không cần nhân nhé.`,

        you
            ? `Một ổ không thôi nha ${you}, cảm ơn!`
            : `Một ổ không thôi nha, cảm ơn!`

    ]);
    }


    saveGame();

    return true;
}


// ======================================================
// NEXT CUSTOMER
// ======================================================

function nextCustomer() {

    if (
        game.customerNumber >=
        game.customersToday
    ) {

        endDay();

        return;
    }


    // Không còn bánh mì.

    if (
        ingredients["Bánh mì"].stock <= 0
    ) {

        showCutePopup({
            icon: "🥖",

            title: "Hết bánh mì rồi!",

            message:
                "Không còn ổ bánh nào để bán. Tiệm phải đóng cửa sớm hôm nay.",

            confirmText: "Đóng cửa",

            onConfirm: endDay
        });

        return;
    }


    // Không còn recipe nào đủ stock.

    if (
        !availableRecipes().length
    ) {

        showCutePopup({
            icon: "😵",

            title: "Hết nguyên liệu rồi!",

            message:
                "Không còn đủ nguyên liệu để nhận thêm khách. Tiệm sẽ đóng cửa sớm hôm nay.",

            confirmText: "Đóng cửa",

            onConfirm: endDay
        });

        return;
    }


    game.customerNumber++;


const queueKey = `mot-o-nha-customer-queue-${game.day}`;

if (game.customerNumber === 1) {
    localStorage.removeItem(queueKey);
}

let queue = JSON.parse(localStorage.getItem(queueKey) || "[]");

if (!Array.isArray(queue) || queue.length === 0) {
    queue = [...customers];

    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    if (queue[0] === game.currentCustomer) {
        [queue[0], queue[1]] = [queue[1], queue[0]];
    }
}

game.currentCustomer = queue.shift();
localStorage.setItem(queueKey, JSON.stringify(queue));


    game.selectedIngredients = [];
    game.breadSelected = false;


    if (!createOrder()) {

        endDay();

        return;
    }


    renderCurrentOrder();
}


// ======================================================
// ORDER SCREEN
//
// KHÔNG HIỆN GỢI Ý INGREDIENT.
// ======================================================

function renderCurrentOrder() {

    game.phase = "order";
    game.pausedPhase = "order";


    updateHeader(
        `Ngày ${game.day}`,
        `Khách ${game.customerNumber}/${game.customersToday}`
    );


    screen.innerHTML = `
        <div class="customer-screen">

            <div class="customer-box">

                <div class="customer-face">
                    ${game.currentCustomer}
                </div>


                <div class="customer-label">
                    Khách gọi
                </div>


                <h2>
                    ${game.currentRecipe.name}
                </h2>


                <div class="customer-speech">
                    "${game.orderNote}"
                </div>

            </div>


            <div class="order-recipe-corner">
                ${recipeBookButton()}
            </div>

        </div>
    `;


    mainButton.textContent =
        "Bắt đầu làm bánh →";


    saveGame();
}


// ======================================================
// START MAKING
// ======================================================

function startMaking() {

    cancelActiveSauceHold();

    game.selectedIngredients = [];

    game.breadSelected = false;

    renderMakingScreen();
}


// ======================================================
// MAKING SCREEN
//
// Bánh mì KHÔNG tự xuất hiện.
// Phải click bread.png trên bàn.
// ======================================================

function renderMakingScreen() {

    game.phase = "making";
    game.pausedPhase = "making";


    updateHeader(
        `Ngày ${game.day}`,
        `Đang làm • ${game.customerNumber}/${game.customersToday}`
    );


    screen.innerHTML = `
        <div class="making-screen">

            <div class="order-strip">

                <div class="order-strip-top">

                    <div>

                        <strong>
                            ${game.currentCustomer}
                            ${game.currentRecipe.name}
                        </strong>


                        <div class="order-request">
                            "${game.orderNote}"
                        </div>

                    </div>


                    ${recipeBookButton()}

                </div>

            </div>


            <div class="banhmi-workspace">

                <div class="board-stage">

                    <img
                        class="cutting-board"
                        src="${skinById("board", selectedSkins.board).image}"
                        draggable="false"
                        alt="Thớt"
                    >


                    <div class="sandwich-stage">

                        <div
                            id="sandwich-bread-bottom"
                        ></div>


                        <div
                            id="sandwich-fillings"
                        ></div>


                        <div
                            id="sandwich-bread-top"
                        ></div>

                    </div>

                </div>

            </div>


            <div class="ingredient-station">

                <div class="ingredient-table-wrap">

                    <img
                        class="ingredient-table-image"
                        src="${skinById("ingredientTable", selectedSkins.ingredientTable).image}"
                        draggable="false"
                        alt="Bàn nguyên liệu"
                    >


                    <div id="station-items"></div>

                </div>


                <div
                    id="ingredient-feedback"
                    class="ingredient-feedback"
                >
                    Chọn bánh mì trước rồi thêm nguyên liệu 👆
                </div>

            </div>

        </div>
    `;


    renderStationItems("making");

    updateSandwich();


    mainButton.textContent =
        "Giao bánh 🥖";


    saveGame();
}


// ======================================================
// RENDER INGREDIENT STATION
// ======================================================

function renderStationItems(mode = null) {

    const station =
        document.getElementById(
            "station-items"
        );


    if (!station) {
        return;
    }


    if (!mode) {

        mode =
            game.phase === "prep"
                ? "prep"
                : "making";
    }


    // -------------------------------
    // 12 KHAY CHÍNH
    // -------------------------------

    const regularHTML =
        stationSlots.map(
            (name, index) => {

                const row =
                    Math.floor(index / 4) + 1;

                const column =
                    (index % 4) + 1;


                return createStationButton({
                    name: name,

                    data:
                        ingredients[name],

                    selected:
                        game.selectedIngredients.includes(
                            name
                        ),

                    mode: mode,

                    extraClass:
                        `station-r${row}c${column}`
                });
            }
        ).join("");


    // -------------------------------
    // 3 CHAI SỐT
    // -------------------------------

    const sauceHTML =
        sauceSlots.map(
            (name, index) => {

                return createStationButton({
                    name: name,

                    data:
                        ingredients[name],

                    selected:
                        game.selectedIngredients.includes(
                            name
                        ),

                    mode: mode,

                    extraClass:
                        `sauce-bottle sauce-${index + 1}`
                });
            }
        ).join("");


    // -------------------------------
    // NGĂN BÁNH MÌ
    // -------------------------------

    const breadHTML =
        createBreadStationButton(
            mode
        );


    station.innerHTML =
        regularHTML +
        sauceHTML +
        breadHTML;


    // Interaction handler

    station
        .querySelectorAll(
            ".station-item"
        )
        .forEach(button => {

            const ingredientName =
                button.dataset.ingredient;

            const isSauce =
                sauceSlots.includes(
                    ingredientName
                );


            // Trong màn làm bánh:
            // sốt phải NHẤN GIỮ đủ 5 giây.
            if (
                mode === "making" &&
                isSauce
            ) {

                bindSauceHoldButton(
                    button,
                    ingredientName
                );

                return;
            }


            // Các nguyên liệu khác vẫn click như cũ.
            button.addEventListener(
                "click",
                () => {

                    handleStationClick(
                        ingredientName,
                        mode
                    );
                }
            );
        });
}


// ======================================================
// NORMAL INGREDIENT BUTTON
// ======================================================

function createStationButton({
    name,
    data,
    selected,
    mode,
    extraClass
}) {

    const locked =
        !data.unlocked;


    const outOfStock =
        data.unlocked &&
        data.stock <= 0;


    // Khi đang bán:
    // locked / hết hàng = KHÔNG BẤM ĐƯỢC.

    const disabled =
        mode === "making" &&
        (
            locked ||
            outOfStock
        );


    let overlayHTML = "";


    // -------------------------------
    // LOCKED
    // -------------------------------

    if (locked) {

        overlayHTML = `
            <span class="lock-overlay">

                🔒

                ${
                    mode === "prep"

                        ? `
                            <small>
                                ${formatMoney(data.unlockPrice)}
                            </small>
                        `

                        : ""
                }

            </span>
        `;
    }


    // -------------------------------
    // UNLOCKED
    // -------------------------------

    else {

        overlayHTML +=
            stockBadgeHTML(
                data.stock
            );


        if (outOfStock) {

            overlayHTML += `
                <span class="sold-out-overlay">
                    HẾT
                </span>
            `;
        }
    }


    return `
        <button

            class="
                station-item
                ${extraClass}
                ${selected ? "selected" : ""}
                ${locked ? "locked" : ""}
                ${outOfStock ? "out-of-stock" : ""}
                ${disabled ? "station-disabled" : ""}
            "

            data-ingredient="${name}"

            ${disabled ? "disabled" : ""}

            title="${
                locked

                    ? (
                        mode === "prep"

                            ? `${name} • Mở khóa ${formatMoney(data.unlockPrice)}`

                            : `${name} • Chưa mở khóa`
                    )

                    : (
                        mode === "prep"

                            ? `${name} • Còn ${data.stock} • Nhập +${data.restock}`

                            : `${name} • Còn ${data.stock}`
                    )
            }"

        >

            <img
                src="${data.tableImage}"
                draggable="false"
                alt="${name}"
            >


            ${
                mode === "making" &&
                sauceSlots.includes(name)

                    ? `
                        <span
                            class="sauce-hold-ring"
                            aria-hidden="true"
                        >
                            <span class="sauce-hold-ring-inner">
                                GIỮ
                            </span>
                        </span>
                    `

                    : ""
            }


            ${overlayHTML}

        </button>
    `;
}


// ======================================================
// STOCK BADGE
// ======================================================

function stockBadgeHTML(stock) {

    return `
        <span
            class="
                stock-badge
                ${stock <= 2 ? "stock-low" : ""}
            "
        >
            ${stock}
        </span>
    `;
}


// ======================================================
// BREAD BUTTON
//
// CSS tiếp theo sẽ đặt button này
// đúng lên ngăn bánh ở góc dưới bên phải.
// ======================================================

function createBreadStationButton(mode) {

    const data =
        ingredients["Bánh mì"];


    const outOfStock =
        data.stock <= 0;


    const disabled =
        mode === "making" &&
        outOfStock;


    return `
        <button

            class="
                station-item
                bread-station-item
                ${game.breadSelected ? "selected" : ""}
                ${outOfStock ? "out-of-stock" : ""}
                ${disabled ? "station-disabled" : ""}
            "

            data-ingredient="Bánh mì"

            ${disabled ? "disabled" : ""}

            title="${
                mode === "prep"

                    ? `Bánh mì • Còn ${data.stock} • Nhập +${data.restock}`

                    : `Bánh mì • Còn ${data.stock}`
            }"

        >

            <img
                class="bread-stock-sprite"
                src="images/bread.png"
                draggable="false"
                alt="Bánh mì"
            >


            ${stockBadgeHTML(
                data.stock
            )}


            ${
                outOfStock

                    ? `
                        <span
                            class="
                                sold-out-overlay
                                bread-sold-out
                            "
                        >
                            HẾT
                        </span>
                    `

                    : ""
            }

        </button>
    `;
}


// ======================================================
// HOLD SAUCE
// ======================================================

function showHoldTapHint(button) {

    if (!button) return;


    button
        .querySelector(
            ".hold-tap-hint"
        )
        ?.remove();


    const hint =
        document.createElement(
            "span"
        );


    hint.className =
        "hold-tap-hint";


    hint.textContent =
        "Giữ";


    hint.setAttribute(
        "aria-hidden",
        "true"
    );


    button.appendChild(
        hint
    );


    setTimeout(
        () => {
            hint.remove();
        },
        850
    );
}


function bindSauceHoldButton(
    button,
    name
) {

    if (
        !button ||
        !sauceSlots.includes(name)
    ) {
        return;
    }


    // Đã có sốt trên bánh:
    // click bình thường để bỏ sốt ra.
    if (
        game.selectedIngredients.includes(
            name
        )
    ) {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                cancelActiveSauceHold();

                toggleIngredient(name);
            }
        );

        return;
    }


    button.addEventListener(
        "contextmenu",
        event =>
            event.preventDefault()
    );


    button.addEventListener(
        "pointerdown",
        event => {

            // Chỉ nhận nút chuột trái / touch / pen.
            if (
                event.pointerType === "mouse" &&
                event.button !== 0
            ) {
                return;
            }

            event.preventDefault();

            startSauceHold(
                button,
                name,
                event.pointerId
            );
        }
    );


    const stopHold =
        (
            event,
            allowTapHint = false
        ) => {

            if (
                activeSauceHold &&
                activeSauceHold.button === button &&
                (
                    event.pointerId === undefined ||
                    event.pointerId ===
                        activeSauceHold.pointerId
                )
            ) {

                const elapsed =
                    performance.now() -
                    activeSauceHold.startedAt;


                const quickTap =
                    allowTapHint &&
                    elapsed < 350;


                cancelActiveSauceHold();


                if (quickTap) {
                    showHoldTapHint(
                        button
                    );
                }
            }
        };


    button.addEventListener(
        "pointerup",
        event =>
            stopHold(
                event,
                true
            )
    );

    button.addEventListener(
        "pointercancel",
        event =>
            stopHold(
                event,
                false
            )
    );

    button.addEventListener(
        "lostpointercapture",
        event =>
            stopHold(
                event,
                false
            )
    );
}


function startSauceHold(
    button,
    name,
    pointerId
) {

    const data =
        ingredients[name];


    if (
        !data ||
        !data.unlocked ||
        data.stock <= 0 ||
        game.selectedIngredients.includes(
            name
        )
    ) {
        return;
    }


    // Có bánh thì animation sốt mới có chỗ để hiện.
    if (!game.breadSelected) {

        showIngredientFeedback(
            "🥖 Lấy bánh mì trước rồi mới bóp sốt nha!"
        );

        return;
    }


    cancelActiveSauceHold();


    try {
        button.setPointerCapture(
            pointerId
        );
    } catch {}


    button.classList.add(
        "is-holding-sauce"
    );

    button.style.setProperty(
        "--sauce-hold-angle",
        "0deg"
    );

    startSquirtSound();


    const previewLayer =
        createSauceHoldPreview(
            name
        );


    const startedAt =
        performance.now();


    activeSauceHold = {
        button,
        name,
        pointerId,
        previewLayer,
        startedAt,
        frameId: null,
        completed: false
    };


    showIngredientFeedback(
        `Giữ chai ${name} đủ 3 giây...`
    );


    const animate =
        now => {

            if (
                !activeSauceHold ||
                activeSauceHold.button !==
                    button ||
                activeSauceHold.completed
            ) {
                return;
            }


            const elapsed =
                now - startedAt;


            const progress =
                Math.max(
                    0,
                    Math.min(
                        1,
                        elapsed /
                            SAUCE_HOLD_MS
                    )
                );


            const angle =
                progress * 360;


            button.style.setProperty(
                "--sauce-hold-angle",
                `${angle}deg`
            );


            updateSauceHoldPreview(
                previewLayer,
                progress
            );


            if (progress >= 1) {

                completeSauceHold(
                    name
                );

                return;
            }


            activeSauceHold.frameId =
                requestAnimationFrame(
                    animate
                );
        };


    activeSauceHold.frameId =
        requestAnimationFrame(
            animate
        );
}


function createSauceHoldPreview(name) {

    const fillings =
        document.getElementById(
            "sandwich-fillings"
        );


    const data =
        ingredients[name];


    if (
        !fillings ||
        !data?.image ||
        !game.breadSelected
    ) {
        return null;
    }


    const layer =
        document.createElement("img");


    layer.className =
        [
            "sandwich-layer",
            `layer-${slugify(name)}`,
            "sauce-live-reveal"
        ].join(" ");


    layer.src =
        data.image;

    layer.alt =
        name;

    layer.title =
        name;

    layer.draggable =
        false;


    layer.style.zIndex =
        String(
            game.selectedIngredients.length +
            40
        );


    // Bắt đầu hoàn toàn ẩn.
    layer.style.clipPath =
        "inset(0 100% 0 0)";


    fillings.appendChild(
        layer
    );


    return layer;
}


function updateSauceHoldPreview(
    layer,
    progress
) {

    if (!layer) {
        return;
    }


    const hiddenRight =
        Math.max(
            0,
            100 - progress * 100
        );


    layer.style.clipPath =
        `inset(0 ${hiddenRight}% 0 0)`;
}


function completeSauceHold(name) {

    if (
        !activeSauceHold ||
        activeSauceHold.name !== name
    ) {
        return;
    }


    const hold =
        activeSauceHold;


    hold.completed =
        true;


    if (hold.frameId) {
        cancelAnimationFrame(
            hold.frameId
        );
    }


    hold.button.classList.remove(
        "is-holding-sauce"
    );

    hold.button.style.removeProperty(
        "--sauce-hold-angle"
    );

    stopSquirtSound();


    activeSauceHold =
        null;


    // Sau 5 giây mới thật sự thêm sốt vào order.
    if (
        !game.selectedIngredients.includes(
            name
        )
    ) {

        game.selectedIngredients.push(
            name
        );

        playIngredientSound(name);
    }


    // updateSandwich sẽ thay preview đang reveal
    // bằng sprite sốt đầy đủ.
    updateSandwich();

    renderStationItems(
        "making"
    );


    showIngredientFeedback(
        `✓ Đã bóp ${name}`
    );


    saveGame();
}


function cancelActiveSauceHold() {

    if (!activeSauceHold) {
        return;
    }


    const hold =
        activeSauceHold;


    activeSauceHold =
        null;


    if (hold.frameId) {

        cancelAnimationFrame(
            hold.frameId
        );
    }


    hold.button?.classList.remove(
        "is-holding-sauce"
    );

    hold.button?.style.removeProperty(
        "--sauce-hold-angle"
    );

    stopSquirtSound();


    if (
        hold.previewLayer &&
        hold.previewLayer.isConnected
    ) {

        hold.previewLayer.remove();
    }


    if (!hold.completed) {

        showIngredientFeedback(
            `Thả sớm rồi, ${hold.name} chưa được thêm.`
        );
    }
}


// ======================================================
// CLICK INGREDIENT
// ======================================================

function handleStationClick(
    name,
    mode
) {

    const data =
        ingredients[name];


    if (!data) {
        return;
    }


    // =================================
    // PREP
    // =================================

    if (mode === "prep") {

        // Locked -> mua unlock.

        if (!data.unlocked) {

            buyIngredient(name);

        }

        // Unlocked -> nhập thêm stock.

        else {

            buyStock(name);
        }


        return;
    }


    // =================================
    // MAKING
    // =================================

    // Locked / hết = không làm gì.

    if (
        !data.unlocked ||
        data.stock <= 0
    ) {
        return;
    }


    // BÁNH MÌ

    if (
        name === "Bánh mì"
    ) {

        toggleBread();

        return;
    }


    // TOPPING

    // Sauce khi đang làm bánh được xử lý bằng
    // press-and-hold trong bindSauceHoldButton().
    if (
        sauceSlots.includes(name) &&
        !game.selectedIngredients.includes(
            name
        )
    ) {
        return;
    }

    toggleIngredient(name);
}


// ======================================================
// BUY / UNLOCK INGREDIENT
// ======================================================

function buyIngredient(name) {

    const data =
        ingredients[name];


    if (
        !data ||
        data.unlocked
    ) {
        return;
    }


    // Không đủ tiền.

    if (
        game.money <
        data.unlockPrice
    ) {

        showCutePopup({
            icon: "🥺",

            title:
                "Chưa đủ tiền rồi!",

            message:
                `Bạn cần ${formatMoney(data.unlockPrice)} để mở khóa ${name}.`,

            confirmText:
                "Okii"
        });

        return;
    }


    // Confirm.

    showCutePopup({

        icon:
            data.emoji || "✨",

        title:
            `Mở khóa ${name}?`,

        message:
            `Mở nguyên liệu mới với giá ${formatMoney(data.unlockPrice)}? Bạn sẽ nhận sẵn ${data.restock} phần để bắt đầu.`,

        confirmText:
            "Mở khóa ✨",

        cancelText:
            "Để sau",


        onConfirm: () => {

            game.money -=
                data.unlockPrice;

            game.dailyIngredientSpend +=
                data.unlockPrice;


            data.unlocked = true;

            data.stock =
                data.restock;


            updateHeader(
                `Ngày ${game.day}`,
                "Nhập hàng trước khi mở cửa"
            );


            saveGame();

            renderStationItems(
                "prep"
            );


            showPrepDeliveryMessage(
    `Anh đã mở khóa ${name} và giao ${data.restock} phần rồi!`
);

            playOrderResultSound(true);
        }
    });
}


// ======================================================
// RESTOCK
// ======================================================

function buyStock(name) {

    const data =
        ingredients[name];


    if (
        !data ||
        !data.unlocked
    ) {
        return;
    }


    if (
        game.money <
        data.restockPrice
    ) {

        showCutePopup({

            icon: "🥺",

            title:
                "Không đủ tiền nhập hàng!",

            message:
                `${name} còn ${data.stock}. Một lô +${data.restock} có giá ${formatMoney(data.restockPrice)}.`,

            confirmText:
                "Okii"
        });

        return;
    }


    showCutePopup({

        icon:
            data.emoji,

        title:
            `Nhập thêm ${name}?`,

        message:
            `Hiện còn ${data.stock}. Nhập thêm ${data.restock} với giá ${formatMoney(data.restockPrice)}?`,

        confirmText:
            `Nhập +${data.restock}`,

        cancelText:
            "Để sau",


        onConfirm: () => {

            game.money -=
                data.restockPrice;

            game.dailyIngredientSpend +=
                data.restockPrice;


            data.stock +=
                data.restock;


            updateHeader(
                `Ngày ${game.day}`,
                "Nhập hàng trước khi mở cửa"
            );


            saveGame();


            renderStationItems(
                "prep"
            );


            showPrepDeliveryMessage(
    `Anh đã giao thêm ${data.restock} ${name}. Trong kho giờ có ${data.stock}!`
);

            playOrderResultSound(true);
        }
    });
}


// ======================================================
// BREAD CLICK
// ======================================================

function toggleBread() {

    const data =
        ingredients["Bánh mì"];


    if (
        data.stock <= 0
    ) {
        return;
    }


    game.breadSelected =
        !game.breadSelected;

    if (game.breadSelected) {
        playIngredientSound("Bánh mì");
}

    updateSandwich();

    renderStationItems(
        "making"
    );


    showIngredientFeedback(
        game.breadSelected

            ? "🥖 Đã lấy một ổ bánh mì"

            : "↩ Đã đặt bánh mì lại"
    );


    saveGame();
}


// ======================================================
// TOPPING CLICK
// ======================================================

function toggleIngredient(name) {

    const data =
        ingredients[name];


    if (
        !data ||
        !data.unlocked ||
        data.stock <= 0
    ) {
        return;
    }


    const exists =
        game.selectedIngredients.includes(
            name
        );


    if (exists) {

        game.selectedIngredients =
            game.selectedIngredients.filter(
                item =>
                    item !== name
            );

    } else {

        game.selectedIngredients.push(
            name
        );

        playIngredientSound(name);
    }


    updateSandwich();

    renderStationItems(
        "making"
    );


    showIngredientFeedback(
        exists

            ? `↩ Đã bỏ lại ${name}`

            : `✓ Đã thêm ${name}`
    );


    saveGame();
}


// ======================================================
// FEEDBACK
// ======================================================

function showIngredientFeedback(
    message
) {

    const feedback =
        document.getElementById(
            "ingredient-feedback"
        );


    if (feedback) {
        feedback.textContent =
            message;
    }
}


// ======================================================
// SANDWICH VISUAL
//
// KHÔNG CLICK BÁNH MÌ:
// thớt hoàn toàn trống.
//
// CLICK BÁNH MÌ:
// bread-bottom + bread-top xuất hiện.
// ======================================================

function updateSandwich() {

    const bottom =
        document.getElementById(
            "sandwich-bread-bottom"
        );


    const fillings =
        document.getElementById(
            "sandwich-fillings"
        );


    const top =
        document.getElementById(
            "sandwich-bread-top"
        );


    if (
        !bottom ||
        !fillings ||
        !top
    ) {
        return;
    }


    // Chưa lấy bánh mì.

    if (!game.breadSelected) {

        if (activeSauceHold) {
            cancelActiveSauceHold();
        }

        bottom.innerHTML = "";
        fillings.innerHTML = "";
        top.innerHTML = "";

        return;
    }


    // BREAD BOTTOM

    bottom.innerHTML = `
        <img
            class="
                bread-layer
                bread-bottom
            "
            src="images/ingredients/bread-bottom.png"
            draggable="false"
            alt=""
        >
    `;


    // TOPPINGS

    fillings.innerHTML =
        game.selectedIngredients.map(
            (name, index) => {

                const data =
                    ingredients[name];


                return `
                    <img

                        class="
                            sandwich-layer
                            layer-${slugify(name)}
                        "

                        src="${data.image}"

                        title="${name}"

                        alt="${name}"

                        draggable="false"

                        style="
                            z-index:${index + 2};
                        "
                    >
                `;
            }
        ).join("");


    // BREAD TOP

    top.innerHTML = `
        <img
            class="
                bread-layer
                bread-top
            "
            src="images/ingredients/bread-top.png"
            draggable="false"
            alt=""
        >
    `;
}


// ======================================================
// ONCE-PER-DAY WRONG ORDER RECIPE HINT
// ======================================================

const WRONG_ORDER_RECIPE_HINT_KEY =
    "mot-o-nha-wrong-order-recipe-hint-v1";

function clearWrongOrderRecipeHint() {
    document
        .getElementById("wrong-order-recipe-hint")
        ?.remove();

    document
        .querySelectorAll(".wrong-order-recipe-target")
        .forEach(element => {
            element.classList.remove(
                "wrong-order-recipe-target"
            );
        });
}

function showWrongOrderRecipeHint() {
    // Tối đa 1 lần mỗi ngày chơi. Sang ngày mới có thể gợi ý lại.
    if (
        localStorage.getItem(
            WRONG_ORDER_RECIPE_HINT_KEY
        ) === String(game.day)
    ) {
        return;
    }

    const recipeButton =
        document.querySelector(
            ".customer-bubble .recipe-book-fab, .recipe-book-fab"
        );

    if (!recipeButton) return;

    localStorage.setItem(
        WRONG_ORDER_RECIPE_HINT_KEY,
        String(game.day)
    );

    clearWrongOrderRecipeHint();
    recipeButton.classList.add(
        "wrong-order-recipe-target"
    );

    const hint = document.createElement("aside");
    hint.id = "wrong-order-recipe-hint";
    hint.setAttribute("aria-live", "polite");
    hint.innerHTML = `
        <div class="wrong-order-recipe-hint-label">💡 GỢI Ý</div>
        <strong>Quên công thức rồi hả?</strong>
        <p>Nhấn vào quyển sổ để xem lại công thức nha!</p>
    `;

    document.body.appendChild(hint);

    // Neo bubble ngay dưới quyển công thức, giống coach bubble tutorial.
    requestAnimationFrame(() => {
        const targetRect = recipeButton.getBoundingClientRect();
        const hintRect = hint.getBoundingClientRect();
        const gameRect = document.getElementById("game")?.getBoundingClientRect();
        const minLeft = Math.max(8, gameRect?.left ?? 8);
        const maxRight = Math.min(window.innerWidth - 8, gameRect?.right ?? window.innerWidth - 8);

        let left = targetRect.left + targetRect.width / 2 - hintRect.width / 2;
        left = Math.max(minLeft + 8, Math.min(left, maxRight - hintRect.width - 8));

        let top = targetRect.bottom + 12;
        top = Math.min(top, window.innerHeight - hintRect.height - 10);

        hint.style.left = `${left}px`;
        hint.style.top = `${top}px`;
    });

    recipeButton.addEventListener(
        "click",
        clearWrongOrderRecipeHint,
        { once: true }
    );

    // Chỉ là gợi ý nhanh, không pause và không force click.
    setTimeout(
        clearWrongOrderRecipeHint,
        3000
    );
}

// ======================================================
// CHECK ORDER
// ======================================================

function orderIsCorrect() {

    // Chưa lấy bánh mì = sai.

    if (!game.breadSelected) {
        return false;
    }


    const selected =
        [...game.selectedIngredients]
            .sort();


    const correct =
        [...game.currentOrder]
            .sort();


    return (
        JSON.stringify(selected) ===
        JSON.stringify(correct)
    );
}


// ======================================================
// SERVE
// ======================================================

function serveBread() {

    // Chưa lấy bánh mì.

    if (!game.breadSelected) {

        showCutePopup({

            icon: "🥖",

            title:
                "Thiếu bánh mì!",

            message:
                "Phải lấy một ổ bánh mì từ ngăn bánh trước đã 😭",

            confirmText:
                "Làm tiếp"
        });

        return;
    }


    // Bánh mì không:
    //
    // breadSelected = true
    // selectedIngredients = []
    // currentOrder = []
    //
    // => ĐÚNG.


    if (!orderIsCorrect()) {

        showCutePopup({

            icon: "😵‍💫",

            title:
                "Ối, sai món rồi!",

            message:
                "Bánh chưa đúng với món khách gọi hoặc yêu cầu riêng của khách. Mở sổ công thức nếu cần kiểm tra nha!",

            confirmText:
                "Sửa bánh ✨",

            onConfirm: () => {
                // Sau lần làm sai đầu tiên, hiện một bubble ngắn
                // chỉ vào sổ công thức để người chơi biết chỗ tra cứu.
                setTimeout(
                    showWrongOrderRecipeHint,
                    80
                );
            }
        });

        return;
    }


    completeOrder();
}


// ======================================================
// COMPLETE ORDER
// ======================================================

function completeOrder() {

    const earned =
        game.currentRecipe.price;


    // -------------------------------
    // TRỪ 1 Ổ BÁNH
    // -------------------------------

    ingredients["Bánh mì"].stock =
        Math.max(
            0,
            ingredients["Bánh mì"].stock - 1
        );


    // -------------------------------
    // TRỪ TOPPING THỰC SỰ ĐÃ DÙNG
    // -------------------------------

    game.selectedIngredients.forEach(
        name => {

            ingredients[name].stock =
                Math.max(
                    0,
                    ingredients[name].stock - 1
                );
        }
    );


    // -------------------------------
    // MONEY
    // -------------------------------

    game.money +=
        earned;


    game.dailyRevenue +=
        earned;


    game.completedOrders++;


    saveGame();

    renderResultScreen();
}


// ======================================================
// RESULT
// ======================================================

function renderResultScreen() {

    game.phase = "result";
    game.pausedPhase = "result";


    updateHeader(
        `Ngày ${game.day}`,
        `Khách ${game.customerNumber}/${game.customersToday}`
    );


    screen.innerHTML = `
        <div class="result-screen">

            <div class="result-emoji">
                😋
            </div>


            <h1>
                Chuẩn bài!
            </h1>


            <p>
                ${game.currentCustomer}
                nhận
                ${game.currentRecipe.name}
                rồi.
            </p>


            <div class="result-money">
                +${formatMoney(
                    game.currentRecipe.price
                )}
            </div>


            <div class="summary-card">

                Doanh thu hôm nay:

                <strong>
                    ${formatMoney(
                        game.dailyRevenue
                    )}
                </strong>

            </div>

        </div>
    `;


    mainButton.textContent =
        game.customerNumber <
        game.customersToday

            ? "Khách tiếp theo →"

            : "Đóng cửa →";


    saveGame();
}


// ======================================================
// END DAY
// ======================================================

function endDay() {
    if (document.getElementById("shop-closing-overlay")) return;

    // Ca bán hàng đã kết thúc, dọn mọi timer/hold còn sót lại
    // để ngày sau bắt đầu với runtime state hoàn toàn mới.
    clearShopRuntimeState();

    game.phase = "closing";
    mainButton.disabled = true;

    const overlay = document.createElement("div");
    overlay.id = "shop-closing-overlay";

    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "999999",
        display: "flex",
        overflow: "hidden",
        pointerEvents: "auto",
        opacity: "1"
    });

    function makeDoor(side) {
        const door = document.createElement("div");

        Object.assign(door.style, {
            width: "50%",
            height: "100%",
            flex: "0 0 50%",
            background:
                "linear-gradient(#ed7390 0 15%, #fff5e7 15% 22%, #c28c60 22% 100%)",
            boxShadow: "inset 0 0 30px #69402966",
            transform: side === "left"
                ? "translateX(-101%)"
                : "translateX(101%)"
        });

        return door;
    }

    const left = makeDoor("left");
    const right = makeDoor("right");
    const sign = document.createElement("div");

    sign.textContent = "Tiệm đóng cửa rồi! 🌙";

    Object.assign(sign.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        opacity: "0",
        padding: "16px 22px",
        border: "3px solid #a66c47",
        borderRadius: "18px",
        background: "#fff9ed",
        color: "#65402c",
        fontSize: "22px",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        boxShadow: "0 7px 0 #83543c"
    });

    overlay.append(left, right, sign);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        left.animate(
            [
                { transform: "translateX(-101%)" },
                { transform: "translateX(0)" }
            ],
            {
                duration: 900,
                easing: "ease-in-out",
                fill: "forwards"
            }
        );

        right.animate(
            [
                { transform: "translateX(101%)" },
                { transform: "translateX(0)" }
            ],
            {
                duration: 900,
                easing: "ease-in-out",
                fill: "forwards"
            }
        );

        sign.animate(
            [
                { opacity: 0, offset: 0 },
                { opacity: 1, offset: 0.35 },
                { opacity: 1, offset: 0.8 },
                { opacity: 0, offset: 1 }
            ],
            {
                duration: 1800,
                fill: "forwards"
            }
        );
    });

    // Chuyển sang hóa đơn khi hai cánh cửa đã che kín màn hình.
    setTimeout(() => {
        renderDayEnd();
    }, 1100);

    // Cho cửa mờ dần để lộ màn tổng kết.
    setTimeout(() => {
        overlay.style.transition = "opacity 450ms ease";
        overlay.style.opacity = "0";
    }, 1900);

    setTimeout(() => {
        overlay.remove();
        mainButton.disabled = false;
    }, 2400);
}


function renderDayEnd() {

    game.phase = "dayEnd";
    game.pausedPhase = "dayEnd";

    game.shopOpen = false;


    // Điện nước chỉ trừ đúng 1 lần mỗi ngày.
    // Chi phí tăng theo nâng cấp Chỗ ngồi và Làm mát.
    if (game.dailyRentPaid === 0) {

        game.dailyRentPaid =
            getDailyUtilityCost();

        game.money -=
            game.dailyRentPaid;
    }


    const netProfit =
        game.dailyRevenue -
        game.dailyIngredientSpend -
        game.dailyRentPaid;


    updateHeader(
        `Ngày ${game.day}`,
        "Đã đóng cửa"
    );


    screen.innerHTML = `
        <div class="result-screen day-end-screen">

            <div class="result-emoji">
                🧾
            </div>


            <h1>
                Tổng kết ngày ${game.day}
            </h1>


            <p class="day-end-subtitle">
                Chốt sổ trước khi nghỉ nha!
            </p>


            <div class="summary-card day-receipt">

                <div class="receipt-row">

                    <span>
                        🥖 Đơn đã bán
                    </span>

                    <strong>
                        ${game.completedOrders}
                    </strong>

                </div>


                <div class="receipt-row positive">

                    <span>
                        💰 Tiền bán bánh
                    </span>

                    <strong>
                        +${formatMoney(
                            game.dailyRevenue
                        )}
                    </strong>

                </div>


                <div class="receipt-row negative">

                    <span>
                        📦 Tiền nhập nguyên liệu
                    </span>

                    <strong>
                        -${formatMoney(
                            game.dailyIngredientSpend
                        )}
                    </strong>

                </div>


                <div class="receipt-row negative">

                    <span>
                        💡 Điện nước & vận hành
                    </span>

                    <strong>
                        -${formatMoney(
                            game.dailyRentPaid
                        )}
                    </strong>

                </div>


                <div class="receipt-divider"></div>


                <div
                    class="
                        receipt-row
                        receipt-total
                        ${
                            netProfit >= 0
                                ? "positive"
                                : "negative"
                        }
                    "
                >

                    <span>
                        ✨ Lãi ròng hôm nay
                    </span>

                    <strong>

                        ${
                            netProfit >= 0
                                ? "+"
                                : "-"
                        }

                        ${formatMoney(
                            Math.abs(netProfit)
                        )}

                    </strong>

                </div>


                <div class="receipt-row receipt-cash">

                    <span>
                        💵 Tiền đang có
                    </span>

                    <strong>
                        ${formatMoney(
                            game.money
                        )}
                    </strong>

                </div>


                <div class="receipt-row receipt-stock">

                    <span>
                        🥖 Bánh mì còn lại
                    </span>

                    <strong>
                        ${ingredients["Bánh mì"].stock}
                    </strong>

                </div>

            </div>

        </div>
    `;


    mainButton.textContent =
        "Sang ngày mới →";


    saveGame();
}

// ======================================================
// NEW DAY INTRO / FORECAST
// ======================================================

const DAY_WEATHER_OPTIONS = [
    { icon: "☀️", label: "Trời đẹp" },
    { icon: "🌧️", label: "Trời Mưa" },
    { icon: "⛈️", label: "Trời Giông" },
    { icon: "🥵", label: "Trời Nắng Nóng" },
    { icon: "🌤️", label: "Trời Quang" },
    { icon: "🌪️", label: "Trời bão to" }
];

function getCustomerForecastRange(day = game.day) {
    const currentDay = Math.max(1, Number(day) || 1);
    let minCustomers;
    let maxCustomers;

    if (currentDay <= 5) {
        minCustomers = 7;
        maxCustomers = 9;
    } else if (currentDay <= 15) {
        minCustomers = 8;
        maxCustomers = 11;
    } else if (currentDay <= 29) {
        minCustomers = 9;
        maxCustomers = 13;
    } else {
        minCustomers = 13;
        maxCustomers = 18;
    }

    const level = getUpgradeLevel("advertising");
    const bonusByLevel = [0, 0.08, 0.16, 0.25];
    const bonus = bonusByLevel[level] || 0;

    return {
        min: Math.max(minCustomers, Math.round(minCustomers * (1 + bonus))),
        max: Math.max(maxCustomers, Math.round(maxCustomers * (1 + bonus)))
    };
}

function getTodayWeatherForecast() {
    // Cosmetic forecast for now. Deterministic per day/customer count so
    // reloading this screen does not reroll the weather text.
    const index = Math.abs(
        (Number(game.day) || 1) * 7 +
        (Number(game.customersToday) || 0) * 3
    ) % DAY_WEATHER_OPTIONS.length;

    return DAY_WEATHER_OPTIONS[index];
}

function renderNewDayIntro() {
    game.phase = "newDayIntro";
    game.pausedPhase = "newDayIntro";
    game.shopOpen = false;
    // Restart can happen while waiting for a customer, when this button is disabled.
    mainButton.disabled = false;

    const forecast = getCustomerForecastRange(game.day);
    const weather = getTodayWeatherForecast();

    updateHeader(
        `Ngày ${game.day}`,
        "Chào ngày mới"
    );

    screen.innerHTML = `
        <div class="new-day-intro-screen">
            <div class="new-day-shop-icon">🏪</div>
            <h1>Một Ổ Nha!</h1>
            <div class="new-day-divider"></div>

            <p class="new-day-forecast-label">
                Lượng khách dự kiến hôm nay:
            </p>

            <div class="new-day-forecast-card">
                <strong>👥 ${forecast.min}–${forecast.max} khách</strong>
                <span>${weather.icon} ${weather.label}</span>
            </div>
        </div>
    `;

    mainButton.textContent =
        "Chuẩn bị nguyên liệu →";

    saveGame();
}

// ======================================================
// NEW DAY
// ======================================================

function newDay() {

    game.day++;

    syncEventProgress();

    game.customersToday =
        customersForNewDay();

    game.customerNumber = 0;
    game.completedOrders = 0;
    game.dailyRevenue = 0;
    game.dailyIngredientSpend = 0;
    game.dailyRentPaid = 0;

    game.waitingCustomers = [];
    game.activeTicketId = null;
    game.nextTicketId = 1;

    game.dailyStarTotal = 0;
    game.dailyReviewCount = 0;

    game.selectedIngredients = [];
    game.breadSelected = false;

    game.currentRecipe = null;
    game.currentCustomer = null;
    game.currentOrder = [];

    game.orderNote = "";

    game.shopOpen = false;

    // Lưu trạng thái ĐẦU NGÀY mới.
    // Restart ngày sẽ quay chính xác về đây.
    saveDayStartCheckpoint();

    game.phase = "newDayIntro";
    game.pausedPhase = "newDayIntro";

    saveGame();

    // Sau hóa đơn, sang thẳng màn chào ngày mới.
    renderNewDayIntro();
}


// ======================================================
// RECIPE BOOK
//
// Hiện TẤT CẢ recipe.
// Recipe locked nằm bên dưới.
//
// KHÔNG còn hình recipe.png thừa
// bên trong modal.
// ======================================================

const RECIPE_IMAGE_BY_NAME = {
    "Bánh mì bơ trứng": "images/BANH-MI/banh-mi-bo-trung.png",
    "Bánh mì chả": "images/BANH-MI/banh-mi-cha.png",
    "Bánh mì chay": "images/BANH-MI/banh-mi-chay.png",
    "Bánh mì đặc biệt": "images/BANH-MI/banh-mi-dac-biet.png",
    "Bánh mì jambon phô mai": "images/BANH-MI/banh-mi-jambon-pho-mai.png",
    "Bánh mì không": "images/BANH-MI/banh-mi-khong.png",
    "Bánh mì pâté": "images/BANH-MI/banh-mi-pate.png",
    "Bánh mì thịt nướng": "images/BANH-MI/banh-mi-thit-nuong.png",
    "Bánh mì thịt nướng cay": "images/BANH-MI/banh-mi-thit-nuong-cay.png",
    "Bánh mì thịt viên": "images/BANH-MI/banh-mi-thit-vien.png",
    "Bánh mì trứng": "images/BANH-MI/banh-mi-trung.png"
};

function recipeImagePath(recipe) {
    return RECIPE_IMAGE_BY_NAME[recipe.name] || "images/banh-mi.png";
}

function openRecipeBook() {

    // Unlocked lên trên.
    // Locked xuống dưới.

    const sortedRecipes =
        [...recipes].sort(
            (a, b) => {

                const aLocked =
                    recipeUnlocked(a)
                        ? 0
                        : 1;


                const bLocked =
                    recipeUnlocked(b)
                        ? 0
                        : 1;


                return (
                    aLocked -
                    bLocked
                );
            }
        );


    recipeList.innerHTML = `

        <div class="recipe-book-note">
            Công thức gốc.
            Nhớ nghe yêu cầu riêng của khách nha!
        </div>


        <div class="recipe-book-list">

            ${
                sortedRecipes.map(
                    recipe => {

                        const unlocked =
                            recipeUnlocked(
                                recipe
                            );


                        const missing =
                            missingUnlocks(
                                recipe
                            );


                        // -----------------------
                        // TOPPING LIST
                        // -----------------------

                        const toppingHTML =
                            recipe.ingredients.length

                                ? recipe.ingredients.map(
                                    name => {

                                        const data =
                                            ingredients[name];


                                        return `
                                            <span
                                                class="
                                                    recipe-mini-chip
                                                    ${
                                                        data.unlocked
                                                            ? ""
                                                            : "missing-chip"
                                                    }
                                                "
                                            >
                                                ${data.emoji}
                                                ${name}
                                            </span>
                                        `;
                                    }
                                ).join("")

                                : `
                                    <span
                                        class="
                                            recipe-mini-chip
                                            empty-recipe-chip
                                        "
                                    >
                                        Không có nhân
                                    </span>
                                `;


                        return `
                            <div
                                class="
                                    recipe-entry
                                    ${
                                        unlocked
                                            ? ""
                                            : "recipe-locked"
                                    }
                                "
                            >

                                <div
                                    class="
                                        recipe-entry-title
                                    "
                                >

                                    <strong>
                                        ${recipe.emoji}
                                        ${recipe.name}
                                    </strong>


                                    ${
                                        unlocked

                                            ? `
                                                <span
                                                    class="
                                                        recipe-status
                                                        unlocked-status
                                                    "
                                                >
                                                    Đã mở
                                                </span>
                                            `

                                            : `
                                                <span
                                                    class="
                                                        recipe-status
                                                        locked-status
                                                    "
                                                >
                                                    🔒
                                                </span>
                                            `
                                    }

                                </div>


                                <div class="recipe-entry-body">
                                    <div class="recipe-image-box">
                                        <img
                                            src="${recipeImagePath(recipe)}"
                                            alt="${recipe.name}"
                                            loading="lazy"
                                            draggable="false"
                                        >
                                    </div>

                                    <div class="recipe-entry-info">

                                <div
                                    class="
                                        recipe-ingredients
                                    "
                                >

                                    <span
                                        class="
                                            recipe-mini-chip
                                            bread-chip
                                        "
                                    >
                                        🥖 Bánh mì
                                    </span>


                                    ${toppingHTML}

                                </div>


                                ${
                                    unlocked

                                        ? `
                                            <div
                                                class="
                                                    recipe-price
                                                "
                                            >
                                                ${formatMoney(
                                                    recipe.price
                                                )}
                                            </div>
                                        `

                                        : `
                                            <div
                                                class="
                                                    recipe-missing
                                                "
                                            >
                                                Cần mở khóa:
                                                <strong>
                                                    ${missing.join(", ")}
                                                </strong>
                                            </div>
                                        `
                                }

                                    </div>
                                </div>

                            </div>
                        `;
                    }
                ).join("")
            }

        </div>
    `;


    recipeModal.classList.remove(
        "hidden"
    );
}


// ======================================================
// CLOSE RECIPE
// ======================================================

function closeRecipeBook() {

    recipeModal.classList.add(
        "hidden"
    );
}


// ======================================================
// CUTE POPUP
// ======================================================

function showCutePopup({
    icon = "🥖",
    title = "Một Ổ Nha!",
    message = "",

    confirmText = "Okii",
    cancelText = null,

    onConfirm = null,
    onCancel = null
}) {

    const oldPopup =
        document.getElementById(
            "cute-popup-overlay"
        );


    if (oldPopup) {
        oldPopup.remove();
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "cute-popup-overlay";


    overlay.innerHTML = `

        <style>

            #cute-popup-overlay {
                position: fixed;
                inset: 0;
                z-index: 200000;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 22px;

                background:
                    rgba(72, 45, 24, 0.38);

                backdrop-filter:
                    blur(3px);

                -webkit-backdrop-filter:
                    blur(3px);

                animation:
                    cuteOverlayIn
                    0.16s
                    ease-out;
            }


            #cute-popup-overlay,
            #cute-popup-overlay * {
                font-family:
                    "Segoe UI",
                    Arial,
                    sans-serif !important;
            }

            #cute-popup-overlay .cute-popup,
            #cute-popup-overlay .cute-popup * {
                font-family:
                    "Freude",
                    Arial,
                    sans-serif !important;
}


            #cute-popup-overlay
            .cute-popup {

                position: relative;

                width:
                    min(
                        390px,
                        calc(100vw - 44px)
                    );

                padding:
                    34px
                    24px
                    22px;

                box-sizing:
                    border-box;

                text-align:
                    center;

                color:
                    #57351f;

                background:
                    linear-gradient(
                        180deg,
                        #fff9e9 0%,
                        #fff0c9 100%
                    );

                border:
                    3px solid
                    #e6ad58;

                border-radius:
                    26px;

                box-shadow:
                    0 10px 0 #bd7638,
                    0 20px 38px
                    rgba(
                        72,
                        38,
                        16,
                        0.28
                    );

                animation:
                    cutePopupIn
                    0.22s
                    cubic-bezier(
                        .2,
                        .9,
                        .3,
                        1.18
                    );
            }


            #cute-popup-overlay
            .cute-popup-icon {

                width: 64px;
                height: 64px;

                position: absolute;

                top: -34px;
                left: 50%;

                transform:
                    translateX(-50%);

                display: flex;
                align-items: center;
                justify-content: center;

                font-size:
                    34px;

                background:
                    #fff6dc;

                border:
                    3px solid
                    #e6ad58;

                border-radius:
                    50%;

                box-shadow:
                    0 6px 0
                    #bd7638;
            }


            #cute-popup-overlay
            .cute-popup-title {

                margin:
                    8px 0;

                font-size:
                    23px;

                line-height:
                    1.3;

                font-weight:
                    700 !important;
            }


            #cute-popup-overlay
            .cute-popup-message {

                margin:
                    0 auto
                    22px;

                max-width:
                    310px;

                font-size:
                    16px;

                line-height:
                    1.5;

                color:
                    #805334;
            }


            #cute-popup-overlay
            .cute-popup-buttons {

                display: flex;

                gap: 10px;
            }


            #cute-popup-overlay
            .cute-popup-button {

                flex: 1;

                min-height:
                    48px;

                padding:
                    10px 14px;

                border: 0;

                border-radius:
                    15px;

                font-size:
                    15px;

                font-weight:
                    700 !important;

                cursor:
                    pointer;

                transition:
                    transform
                    0.12s ease,
                    filter
                    0.12s ease;
            }


            #cute-popup-overlay
            .cute-popup-button:hover {

                transform:
                    translateY(-2px);

                filter:
                    brightness(1.03);
            }


            #cute-popup-overlay
            .cute-popup-button:active {

                transform:
                    translateY(2px);
            }


            #cute-popup-overlay
            .cute-popup-confirm {

                color:
                    #fff !important;

                background:
                    #eb5878;

                box-shadow:
                    0 5px 0
                    #b83c59;
            }


            #cute-popup-overlay
            .cute-popup-cancel {

                color:
                    #70482c !important;

                background:
                    #f4dfb5;

                box-shadow:
                    0 5px 0
                    #d0a469;
            }


            @keyframes cuteOverlayIn {

                from {
                    opacity: 0;
                }

                to {
                    opacity: 1;
                }
            }


            @keyframes cutePopupIn {

                from {
                    opacity: 0;

                    transform:
                        translateY(16px)
                        scale(0.94);
                }

                to {
                    opacity: 1;

                    transform:
                        translateY(0)
                        scale(1);
                }
            }

        </style>


        <div
            class="cute-popup"
            role="dialog"
            aria-modal="true"
        >

            <div
                class="cute-popup-icon"
            >
                ${icon}
            </div>


            <div
                class="cute-popup-title"
            >
                ${title}
            </div>


            <div
                class="cute-popup-message"
            >
                ${message}
            </div>


            <div
                class="cute-popup-buttons"
            >

                ${
                    cancelText

                        ? `
                            <button
                                type="button"
                                class="
                                    cute-popup-button
                                    cute-popup-cancel
                                "
                            >
                                ${cancelText}
                            </button>
                        `

                        : ""
                }


                <button
                    type="button"
                    class="
                        cute-popup-button
                        cute-popup-confirm
                    "
                >
                    ${confirmText}
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    const closePopup = () => {
        overlay.remove();
    };


    // CONFIRM

    overlay
        .querySelector(
            ".cute-popup-confirm"
        )
        .addEventListener(
            "click",
            () => {

                closePopup();

                if (
                    typeof onConfirm ===
                    "function"
                ) {
                    onConfirm();
                }
            }
        );


    // CANCEL

    const cancelButton =
        overlay.querySelector(
            ".cute-popup-cancel"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            () => {

                closePopup();

                if (
                    typeof onCancel ===
                    "function"
                ) {
                    onCancel();
                }
            }
        );
    }


    // CLICK OUTSIDE

    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay &&
                cancelText
            ) {

                closePopup();

                if (
                    typeof onCancel ===
                    "function"
                ) {
                    onCancel();
                }
            }
        }
    );
}

function openSettings() {
    const oldSettings =
        document.getElementById("settings-overlay");

    if (oldSettings) {
        oldSettings.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "settings-overlay";

    overlay.innerHTML = `
        <div class="settings-panel">

            <div class="settings-icon">${UI_ICONS.settings}</div>

            <h2>${t("settings")}</h2>

            <div class="settings-menu">

                <button
                    id="settings-about"
                    class="settings-row"
                    type="button"
                >
                    <span>🌷 ${t("about")}</span>
                    <span class="settings-value">›</span>
                </button>

                <button
                    id="settings-guide"
                    class="settings-row"
                    type="button"
                >
                    <span>📖 ${t("howToPlay")}</span>
                    <span class="settings-value">›</span>
                </button>

                <button
                    id="settings-version"
                    class="settings-row"
                    type="button"
                >
                    <span>🎁 ${t("version")}</span>
                    <span class="settings-value">
                        v0.4.0 ›
                    </span>
                </button>

                <button
                    id="settings-credit"
                    class="settings-row"
                    type="button"
                >
                    <span>💛 ${t("credits")}</span>
                    <span class="settings-value">›</span>
                </button>

                <button
                    id="settings-music"
                    class="settings-row"
                    type="button"
                >
                    <span>🎵 ${t("music")}</span>

                    <span
                        id="settings-music-value"
                        class="settings-value"
                    >
                        ${
                            musicEnabled
                                ? t("musicOn")
                                : t("musicOff")
                        }
                    </span>
                </button>

                <button
                    id="settings-language"
                    class="settings-row"
                    type="button"
                >
                    <span>🌐 ${t("language")}</span>

                    <span
                        id="settings-language-value"
                        class="settings-value"
                    >
                        ${t("languageName")} ›
                    </span>
                </button>

            </div>

            <button
                class="settings-close"
                type="button"
            >
                ${t("close")}
            </button>

        </div>
    `;

    document.body.appendChild(overlay);


    // =========================
    // ABOUT
    // =========================

    const aboutButton =
    overlay.querySelector("#settings-about");

aboutButton.addEventListener("click", () => {
    overlay.remove();

    showCutePopup({
        icon: "🌷",
        title: t("aboutTitle"),
        message: t("aboutMessage"),
        confirmText: t("close")
    });
});

// =========================
// GUIDE
// =========================

const guideButton =
    overlay.querySelector("#settings-guide");

guideButton.addEventListener("click", () => {
    overlay.remove();
    openTutorial(0);
});


    // =========================
    // CREDIT
    // =========================

    const creditButton =
    overlay.querySelector("#settings-credit");

creditButton.addEventListener("click", () => {
    overlay.remove();

    showCutePopup({
        icon: "💛",
        title: t("creditTitle"),
        message: t("creditMessage"),
        confirmText: t("close")
    });
});


    // =========================
    // VERSION
    // =========================

    const versionButton =
        overlay.querySelector("#settings-version");

    versionButton.addEventListener("click", () => {
        overlay.remove();
        openUpdateHistory();
    });


    // =========================
    // MUSIC
    // =========================

    const musicButton =
        overlay.querySelector("#settings-music");

    const musicValue =
        overlay.querySelector("#settings-music-value");

    musicButton.addEventListener("click", () => {
        setMusicEnabled(!musicEnabled);

        musicValue.textContent =
            musicEnabled
                ? t("musicOn")
                : t("musicOff");
    });


    // =========================
    // LANGUAGE
    // =========================

    const languageButton =
        overlay.querySelector("#settings-language");

    languageButton.addEventListener("click", () => {
        const newLanguage =
            currentLanguage === "vi"
                ? "en"
                : "vi";

        setLanguage(newLanguage);

        overlay.remove();
        openSettings();
    });


    // =========================
    // CLOSE
    // =========================

    overlay
        .querySelector(".settings-close")
        .addEventListener("click", () => {
            overlay.remove();
        });


    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
}

function openUpdateHistory() {

    document
        .getElementById("update-history-overlay")
        ?.remove();


    const overlay =
        document.createElement("div");


    overlay.id =
        "update-history-overlay";


    overlay.innerHTML = `
        <div class="update-history-panel">

            <h2>
                📜 Lịch sử cập nhật
            </h2>

            <div class="update-history-list">


                <!-- =========================
                     VERSION 0.4.1
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.4.1
                        </strong>

                        <div class="update-entry-meta">

                            <span class="current-version-badge">
                                Hiện tại
                            </span>

                            <span class="update-date">
                                28/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Nguyên liệu đồ uống giờ được mở khóa dần
                            khi phát triển tiệm.
                        </li>

                        <li>
                            Thêm hệ thống skin cho Quầy đồ uống
                            và Khay đặt cốc.
                        </li>

                        <li>
                            Mở rộng bộ Hoa Anh Đào và Trung Thu
                            với trang trí dành cho khu pha nước.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.4.0
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.4.0
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                27/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Ra mắt hệ thống bán đồ uống
                            với quầy pha nước riêng.
                        </li>

                        <li>
                            Khách có thể gọi Trà chanh hoặc Trà tắc
                            kèm đá và topping.
                        </li>

                        <li>
                            Mở rộng sổ công thức, nhiệm vụ
                            và hướng dẫn chơi cho hệ thống đồ uống.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.3.1
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.3.1
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                27/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm màn hình tải game và tối ưu việc chuẩn bị
                            tài nguyên trước khi vào tiệm.
                        </li>

                        <li>
                            Thêm cơ chế nhấn giữ để sử dụng
                            Ketchup, Sriracha và Mayonnaise.
                        </li>

                        <li>
                            Mở rộng Hướng dẫn chơi cho thao tác sử dụng sốt.
                        </li>

                        <li>
                            Chuẩn bị bộ trang trí Halloween
                            cho thớt, sổ công thức và khung cảnh.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.3.0
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.3.0
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                27/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm hệ thống quản lý tiệm với
                            Nhiệm vụ, Nâng cấp, Trang trí và Doanh thu.
                        </li>

                        <li>
                            Thêm nhiệm vụ ngày và nhiệm vụ sự kiện
                            với phần thưởng, cùng các bộ trang trí giới hạn.
                        </li>

                        <li>
                            Thêm level, EXP, danh hiệu và hệ thống nâng cấp tiệm.
                        </li>

                        <li>
                            Thêm nhiều skin cho quầy, thớt,
                            sổ công thức và khung cảnh.
                        </li>

                        <li>
                            Thêm trang Thành tựu để theo dõi tiến độ bộ sưu tập.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.2.3
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.2.3
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                27/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm Hướng dẫn chơi minh họa cho người chơi mới,
                            có thể mở lại từ phần Cài đặt.
                        </li>

                        <li>
                            Làm rõ các yêu cầu đặc biệt của khách trong đơn hàng.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.2.2
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.2.2
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                26/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm nhịp mở cửa, khoảng thời gian vắng khách
                            và hiệu ứng đóng cửa cuối ngày.
                        </li>

                        <li>
                            Mỗi ngày có lượng khách khác nhau,
                            từ ngày vắng đến những ngày rất đông.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.2.1
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.2.1
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                25/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm hàng chờ 2–3 khách và khả năng chọn khách để làm đơn.
                        </li>

                        <li>
                            Thêm hệ thống kiên nhẫn:
                            khách có thể khó chịu hoặc rời tiệm nếu chờ quá lâu.
                        </li>

                        <li>
                            Thêm đánh giá sao cho từng đơn và điểm đánh giá của tiệm.
                        </li>

                        <li>
                            Thêm Bánh mì pâté cùng nhiều biến thể yêu cầu của khách.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.2.0
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.2.0
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                25/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Khách hàng xuất hiện trực tiếp tại quầy
                            với biểu cảm và hiệu ứng khi đến, rời tiệm.
                        </li>

                        <li>
                            Thêm Anh giao hàng trong màn chuẩn bị nguyên liệu.
                        </li>

                        <li>
                            Thêm hiệu ứng mở cửa và nhịp khách đến tiệm.
                        </li>

                    </ul>

                </div>


                <!-- =========================
                     VERSION 0.1.0
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.1.0
                        </strong>

                        <div class="update-entry-meta">

                            <span class="update-date">
                                24/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Ra mắt Một Ổ Nha! với vòng chơi
                            nhận đơn, làm bánh và phục vụ khách.
                        </li>

                        <li>
                            Thêm nhập hàng, kho nguyên liệu
                            và mở khóa nguyên liệu mới.
                        </li>

                        <li>
                            Thêm sổ công thức và hệ thống ngày,
                            doanh thu, chi phí và tiền thuê mặt bằng.
                        </li>

                        <li>
                            Thêm lưu tiến trình và chơi lại ngày hiện tại.
                        </li>

                    </ul>

                </div>


            </div>


            <button
                class="update-history-close"
                type="button"
            >
                Đã hiểu
            </button>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    overlay
        .querySelector(
            ".update-history-close"
        )
        .addEventListener(
            "click",
            () => overlay.remove()
        );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {
                overlay.remove();
            }

        }
    );
}

function openPauseMenu() {
    const oldPause =
        document.getElementById("pause-overlay");

    if (oldPause) {
        oldPause.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id = "pause-overlay";

    overlay.innerHTML = `
        <div class="pause-panel">

            <div class="pause-icon">${UI_ICONS.pause}</div>

            <h2>Tạm dừng</h2>

            <div class="pause-menu">

                <button
                    id="pause-restart-day"
                    class="pause-row"
                    type="button"
                >
                    <span>↻ Chơi lại ngày này</span>
                </button>

                <button
                    id="pause-home"
                    class="pause-row"
                    type="button"
                >
                    <span>🏠 Về sảnh</span>
                </button>

                <button
                    id="pause-reset"
                    class="pause-row pause-danger"
                    type="button"
                >
                    <span>🗑 Chơi lại từ đầu</span>
                </button>

            </div>

            <button
                class="pause-close"
                type="button"
            >
                Tiếp tục chơi
            </button>

        </div>
    `;

    document.body.appendChild(overlay);


    overlay
        .querySelector("#pause-restart-day")
        .addEventListener("click", () => {
            overlay.remove();
            restartCurrentDay();
        });


    overlay
        .querySelector("#pause-home")
        .addEventListener("click", () => {
            overlay.remove();
            showHome();
        });


    overlay
        .querySelector("#pause-reset")
        .addEventListener("click", () => {
            overlay.remove();
            resetGameSave();
        });


    overlay
        .querySelector(".pause-close")
        .addEventListener("click", () => {
            overlay.remove();
        });


    overlay.addEventListener(
        "click",
        event => {
            if (event.target === overlay) {
                overlay.remove();
            }
        }
    );
}

const uiClickSoundPool =
    createSfxPool(
        "audio/click.mp3",
        0.45,
        4
    );

let uiClickSoundCursor = 0;


function playUiClickSound() {
    // Ưu tiên Web Audio để click phản hồi ngay trên iPhone/PWA.
    if (
        playLowLatencySfx(
            "ui-click",
            0.45
        )
    ) {
        return;
    }

    // Fallback HTMLAudio nếu buffer chưa sẵn sàng.
    const sound =
        uiClickSoundPool[
            uiClickSoundCursor %
            uiClickSoundPool.length
        ];

    uiClickSoundCursor++;

    try {
        sound.pause();
        sound.currentTime = 0;
    } catch {}

    sound.play().catch(() => {});
}


// Phát tiếng click ngay khi ngón tay CHẠM xuống.
// Logic button vẫn chạy bằng click như cũ.
document.addEventListener(
    "pointerdown",
    event => {
        const button =
            event.target.closest("button");

        if (
            !button ||
            button.disabled
        ) {
            return;
        }

        // Khi đang làm bánh, nguyên liệu có tiếng riêng.
        if (
            (
                game.phase === "making" ||
                game.phase === "waiting"
            ) &&
            button.classList.contains(
                "station-item"
            )
        ) {
            return;
        }

        playUiClickSound();
    },
    {
        passive: true
    }
);


// Với topping/bánh mì, phát ingredient.mp3 ngay ở pointerdown.
// Logic chọn nguyên liệu vẫn chạy ở click như cũ.
document.addEventListener(
    "pointerdown",
    event => {
        const button =
            event.target.closest(
                ".station-item"
            );

        if (
            !button ||
            button.disabled ||
            (
                game.phase !== "making" &&
                game.phase !== "waiting"
            )
        ) {
            return;
        }

        const name =
            button.dataset.ingredient;

        const data =
            ingredients[name];

        if (
            !name ||
            !data ||
            !data.unlocked ||
            data.stock <= 0 ||
            sauceSlots.includes(name)
        ) {
            return;
        }

        // Tutorial Day 1: bấm nhầm nút bị khóa thì không phát tiếng.
        if (
            typeof day1TutorialActive ===
                "function" &&
            day1TutorialActive() &&
            !button.classList.contains(
                "day1-tutorial-target"
            )
        ) {
            return;
        }

        // Khi bỏ nguyên liệu ra thì code cũ vốn không phát ingredient SFX.
        if (
            (
                name === "Bánh mì" &&
                game.breadSelected
            ) ||
            (
                name !== "Bánh mì" &&
                game.selectedIngredients.includes(
                    name
                )
            )
        ) {
            return;
        }

        primeIngredientSound(name);
    },
    {
        passive: true
    }
);

// ======================================================
// EVENTS
// ======================================================

settingsButton.addEventListener(
    "click",
    () => {
        if (game.phase === "home") {
            openSettings();
        } else {
            openPauseMenu();
        }
    }
);


closeRecipeButton.addEventListener(
    "click",
    closeRecipeBook
);


recipeModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            recipeModal
        ) {

            closeRecipeBook();
        }
    }
);


mainButton.addEventListener(
    "click",
    () => {

        if (
            game.phase === "home"
        ) {

            resumeGame();
        }

        else if (
            game.phase === "prep"
        ) {

            openShop();
        }

        else if (
            game.phase === "order"
        ) {

            startMaking();
        }

        else if (
            game.phase === "making"
        ) {

            serveBread();
        }

        else if (
            game.phase === "result"
        ) {

            nextCustomer();
        }

        else if (
            game.phase === "dayEnd"
        ) {

            newDay();
        }

        else if (
            game.phase === "newDayIntro"
        ) {

            showPrep();
        }
    }
);


window.addEventListener(
    "beforeunload",
    saveGame
);


// ======================================================
// START GAME
// ======================================================

const didLoadSave =
    loadGame();

sanitizeSelectedSkins();
syncEventProgress();

if (
    didLoadSave &&
    game.phase !== "home"
) {

    game.pausedPhase =
        game.phase;
}

bindTutorialEvents();

const startScreen =
    document.getElementById("start-screen");

const startScreenStatus =
    document.getElementById("start-screen-status");

const loadingProgressWrap =
    document.getElementById("loading-progress-wrap");

const loadingProgressBar =
    document.getElementById("loading-progress-bar");

// ======================================================
// REAL STARTUP PRELOADER
// Tải + decode asset gameplay trước khi cho người chơi vào.
// Mỗi asset có timeout riêng để 1 file lỗi không khóa app mãi.
// ======================================================

const STARTUP_ASSET_TIMEOUT_MS = 12000;

const STARTUP_IMAGE_ASSETS = [
    // UI / prep
    "images/icon.png",
    "images/recipe.png",
    "images/banh-mi.png",
    "images/bread.png",
    "images/grab.png",

    // Ingredient table sprites
    ...[
        "pate", "grilled-pork", "egg", "cha", "cucumber",
        "pickles", "herbs", "chili", "meatballs", "jambon",
        "cheese", "butter", "ketchup", "sriracha", "mayonnaise"
    ].map(name => `images/${name}.png`),

    // Sandwich layers
    "images/ingredients/bread-bottom.png",
    "images/ingredients/bread-top.png",
    ...[
        "pate", "grilled-pork", "egg", "cha", "cucumber",
        "pickles", "herbs", "chili", "meatballs", "jambon",
        "cheese", "butter", "ketchup", "sriracha", "mayonnaise"
    ].map(name => `images/ingredients/${name}.png`),

    // Drinks
    "images/drinks/coc-back.png",
    "images/drinks/coc-front.png",
    "images/drinks/coc.png",
    "images/drinks/da.png",
    "images/drinks/tra-chanh.png",
    "images/drinks/tra-tac.png",
    "images/drinks/thach-ca.png",
    "images/drinks/thach-dua.png",
    "images/drinks/tc-trang.png",
    "images/drinks/tc-den.png",

    // Recipe book food images
    "images/BANH-MI/banh-mi-bo-trung.png",
    "images/BANH-MI/banh-mi-cha.png",
    "images/BANH-MI/banh-mi-chay.png",
    "images/BANH-MI/banh-mi-dac-biet.png",
    "images/BANH-MI/banh-mi-jambon-pho-mai.png",
    "images/BANH-MI/banh-mi-khong.png",
    "images/BANH-MI/banh-mi-pate.png",
    "images/BANH-MI/banh-mi-thit-nuong.png",
    "images/BANH-MI/banh-mi-thit-nuong-cay.png",
    "images/BANH-MI/banh-mi-thit-vien.png",
    "images/BANH-MI/banh-mi-trung.png",

    // Tutorial
    ...[1, 2, 3, 4, 5, 6, 7].map(id => `images/guide/g${id}.png`),

    // Regular customers
    ...["A", "B", "C", "D", "E", "F"].flatMap(id =>
        [1, 2, 3].map(mood => `images/customer/${id}/${id}${mood}.png`)
    ),

    // Mid-Autumn customers
    ...["A", "B", "C"].flatMap(id =>
        [1, 2, 3].map(mood =>
            `images/customer/special/trung-thu/${id}/${id}${mood}.png`
        )
    ),

    // All currently shipped skins
    ...[
        "troi-xanh", "thanh-thi", "sakura", "trung-thu", "halloween"
    ].map(id => `images/skins/background/${id}.jpg`),

    ...["mac-dinh", "sakura", "trung-thu", "halloween"].flatMap(id => [
        `images/skins/board/${id}.png`,
        `images/skins/ingredient-table/${id}.png`,
        `images/skins/drink-table/${id}.png`,
        `images/skins/cup-holder/${id}.png`,
        `images/skins/recipe-skin/${id}.png`
    ])
];

const STARTUP_AUDIO_ASSETS = [
    "audio/ingredient.mp3",
    "audio/click.mp3",
    "audio/lobby.mp3",
    "audio/kitchen1.mp3",
    "audio/kitchen2.mp3",
    "audio/openstore.mp3",
    "audio/correct.mp3",
    "audio/wrong.mp3",
    "audio/pour.mp3",
    "audio/squirt.mp3"
];

let startScreenReady = false;
let startScreenEntered = false;

function setStartupProgress(done, total) {
    const safeTotal = Math.max(1, total);
    const percent = Math.min(100, Math.round(done / safeTotal * 100));

    if (loadingProgressBar) {
        loadingProgressBar.style.width = `${percent}%`;
    }

    if (loadingProgressWrap) {
        loadingProgressWrap.setAttribute(
            "aria-valuenow",
            String(percent)
        );
    }

    if (startScreenStatus) {
        startScreenStatus.textContent =
            `Đang chuẩn bị tiệm... ${percent}%`;
    }
}

function startupWithTimeout(promise, ms = STARTUP_ASSET_TIMEOUT_MS) {
    return Promise.race([
        Promise.resolve(promise),
        new Promise(resolve => {
            setTimeout(() => resolve({ timeout: true }), ms);
        })
    ]);
}

function preloadStartupImage(src) {
    return startupWithTimeout(
        new Promise(resolve => {
            const image = new Image();
            image.decoding = "async";

            const finish = async (ok) => {
                if (ok) {
                    try {
                        await image.decode();
                    } catch {}
                }
                resolve({ src, ok });
            };

            image.addEventListener(
                "load",
                () => finish(true),
                { once: true }
            );

            image.addEventListener(
                "error",
                () => finish(false),
                { once: true }
            );

            image.src = src;
        })
    );
}

function preloadStartupAudio(src) {
    return startupWithTimeout(
        fetch(src, { cache: "force-cache" })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                // Đọc hết body để asset thực sự hoàn tất download/cache.
                return response.blob();
            })
            .then(() => ({ src, ok: true }))
            .catch(() => ({ src, ok: false }))
    );
}

async function preloadStartupAssets() {
    const imageAssets = [...new Set(STARTUP_IMAGE_ASSETS)];
    const audioAssets = [...new Set(STARTUP_AUDIO_ASSETS)];

    const tasks = [
        ...imageAssets.map(src => () => preloadStartupImage(src)),
        ...audioAssets.map(src => () => preloadStartupAudio(src)),
        () => startupWithTimeout(
            document.fonts?.ready || Promise.resolve()
        )
    ];

    let completed = 0;
    const total = tasks.length;

    setStartupProgress(0, total);

    // Chạy song song, nhưng progress phản ánh asset THỰC đã settle.
    await Promise.allSettled(
        tasks.map(task =>
            Promise.resolve()
                .then(task)
                .finally(() => {
                    completed++;
                    setStartupProgress(completed, total);
                })
        )
    );
}

function markStartScreenReady() {
    startScreenReady = true;

    startScreen?.classList.remove("is-loading");
    startScreen?.classList.add("is-ready");
    startScreen?.setAttribute("aria-busy", "false");

    if (startScreenStatus) {
        startScreenStatus.textContent =
            "Nhấn để vào tiệm 🥖";
    }
}

async function runRealLoadingScreen() {
    try {
        await preloadStartupAssets();
    } catch (error) {
        console.warn("Startup preload gặp lỗi:", error);
    } finally {
        setStartupProgress(1, 1);
        markStartScreenReady();
    }
}


startScreen?.addEventListener(
    "click",
    () => {

        if (
            !startScreenReady ||
            startScreenEntered
        ) {
            return;
        }

        startScreenEntered = true;

        unlockMusic();

        startScreen.classList.add("hide");

        setTimeout(() => {
            startScreen.remove();

            maybeShowTutorialOnFirstTime();
        }, 800);
    }
);


// Home được render phía sau splash để layout sẵn sàng.
// Splash chỉ cho vào sau khi asset gameplay đã tải + decode xong.
showHome();
runRealLoadingScreen();

// Dán cuối game.js, ngay sau showHome();
customers.splice(0, customers.length, "A", "B", "C", "D", "E", "F");

const CUSTOMER_SPEECH = {
    A: {
        self: "chị",
        you: "em"
    },

    B: {
        self: "bác",
        you: "con"
    },

    C: {
        self: "anh",
        you: "em"
    },

    D: {
        self: "bà",
        you: "con"
    },

    E: {
        self: "em",
        you: ""
    },

    F: {
        self: "em",
        you: ""
    },

    HANG: {
        self: "chị",
        you: "em"
    },

    CUOI: {
        self: "anh",
        you: "em"
    },

    THO: {
        self: "em",
        you: ""
    }
};


function getCustomerSpeech() {
    return (
        CUSTOMER_SPEECH[
            game.currentCustomer
        ] || {
            self: "mình",
            you: ""
        }
    );
}

function customerImage(
    id,
    mood = 1
) {

    const special =
        midAutumnCustomerById(id);

    if (special) {

        const safeMood =
            Math.max(
                1,
                Math.min(
                    3,
                    Number(mood) || 1
                )
            );

        return (
            `${MID_AUTUMN_SPRITE_DIR}/` +
            `${special.spritePrefix}/` +
            `${special.spritePrefix}` +
            `${safeMood}.png`
        );
    }


    const safeId =
        customers.includes(id)
            ? id
            : "A";

    return (
        `images/customer/` +
        `${safeId}/` +
        `${safeId}${mood}.png`
    );
}


function customerFallback(id) {

    return (
        midAutumnCustomerById(id)
            ?.fallback ||
        "🙂"
    );
}

const oldRenderMakingScreen = renderMakingScreen;
renderMakingScreen = function () {
    oldRenderMakingScreen();

    const strip = document.querySelector(".making-screen .order-strip");
    if (!strip) return;

    strip.outerHTML = `
        <section id="customer-panel" class="customer-panel">
            <div class="customer-portrait">
                <img id="customer-sprite"
                     src="${customerImage(game.currentCustomer, 1)}"
                     alt="Khách hàng"
                     draggable="false"
                     onerror="this.style.display='none'; this.nextElementSibling.hidden=false;">
                <span hidden class="customer-fallback">${customerFallback(game.currentCustomer)}</span>
            </div>
            <div class="customer-bubble">
                <div class="customer-bubble-top">
                    <span>Khách ${activeTicket()?.customerNumber || game.customerNumber}/${game.customersToday}</span>
                    ${recipeBookButton()}
                </div>
                <strong>${game.currentRecipe.name}</strong>
                <p id="customer-order-note">“${game.orderNote}”</p>
                <p id="customer-reaction" role="status"></p>
            </div>
        </section>`;
};

// Khách mới đi thẳng vào màn làm bánh.
renderCurrentOrder = function () {
    renderMakingScreen();
};

// Dán tiếp ngay sau Block 1 trong game.js
let customerReactionTimer = null;
let customerReactionFadeTimer = null;

function clearCustomerReactionTimers() {
    clearTimeout(customerReactionTimer);
    clearTimeout(customerReactionFadeTimer);
}

function showCustomerReaction(correct) {
    clearCustomerReactionTimers();
    game.phase = "result";
    game.pausedPhase = "result";
    game.lastOrderCorrect = correct;
    localStorage.setItem(
        "mot-o-nha-last-reaction",
        correct ? "happy" : "annoyed"
    );

    const panel = document.getElementById("customer-panel");
    const sprite = document.getElementById("customer-sprite");
    const reaction = document.getElementById("customer-reaction");
    if (!panel || !sprite || !reaction) return;

    document.querySelector(".making-screen").classList.add("customer-reacting");
    mainButton.disabled = true;
    sprite.src = customerImage(game.currentCustomer, correct ? 2 : 3);
    panel.classList.add(correct ? "is-happy" : "is-annoyed");
    const speech =
    getCustomerSpeech();

reaction.textContent =
    correct

        ? speech.you
            ? `Cảm ơn ${speech.you} nha! +${formatMoney(game.currentRecipe.price)} ✨`
            : `Cảm ơn nha! +${formatMoney(game.currentRecipe.price)} ✨`

        : `Ơ, không đúng món ${speech.self} gọi rồi...`;
    saveGame();

    customerReactionTimer = setTimeout(() => {
        if (game.phase !== "result") return;
        panel.classList.add("leaving");

        customerReactionFadeTimer = setTimeout(() => {
            if (game.phase === "result") {
                const shouldShowRecipeHint = !correct;
                mainButton.disabled = false;
                nextCustomer();

                // Sau khi reaction của khách sai món kết thúc và khách tiếp theo
                // đã xuất hiện, gợi ý nhẹ quyển công thức tối đa 1 lần trong ngày.
                // Không mở sổ, không pause và không ép người chơi làm gì.
                if (shouldShowRecipeHint) {
                    setTimeout(showWrongOrderRecipeHint, 180);
                }
            }
        }, 450);
    }, 1250);
}

function completeCustomerOrder(correct) {
    playOrderResultSound(correct);
    ingredients["Bánh mì"].stock = Math.max(
        0,
        ingredients["Bánh mì"].stock - 1
    );

    game.selectedIngredients.forEach(name => {
        ingredients[name].stock = Math.max(
            0,
            ingredients[name].stock - 1
        );
    });

    if (correct) {
        game.money += game.currentRecipe.price;
        game.dailyRevenue += game.currentRecipe.price;
        game.completedOrders++;
    }

    // Đơn sai vẫn dùng mất bánh và nguyên liệu, nhưng không thu tiền.
    showCustomerReaction(correct);
}

const oldServeBread = serveBread;
serveBread = function () {
    if (!game.breadSelected) return oldServeBread();
    completeCustomerOrder(orderIsCorrect());
};

// Khi tải lại trang giữa lúc khách đang phản ứng.
renderResultScreen = function () {
    renderMakingScreen();
    const wasHappy =
        localStorage.getItem("mot-o-nha-last-reaction") !== "annoyed";
    showCustomerReaction(wasHappy);
};

const oldOpenPauseMenu = openPauseMenu;
openPauseMenu = function () {
    if (game.phase === "result") clearCustomerReactionTimers();
    oldOpenPauseMenu();
};

const oldShowHome = showHome;
showHome = function () {
    clearCustomerReactionTimers();
    mainButton.disabled = false;
    oldShowHome();
};

const oldShowPrep = showPrep;
showPrep = function () {
    clearCustomerReactionTimers();
    mainButton.disabled = false;
    oldShowPrep();
};

document.addEventListener("click", event => {
    if (game.phase !== "result") return;

    if (
        event.target.closest(".pause-close") ||
        event.target.id === "pause-overlay"
    ) {
        setTimeout(() => {
            if (game.phase === "result") {
                showCustomerReaction(game.lastOrderCorrect);
            }
        }, 0);
    }
});

const arriveCustomerNow = nextCustomer;
const resumeBeforeWaiting = resumeGame;
const CUSTOMER_WAIT_KEY = "mot-o-nha-wait-until";
let customerWaitTimer;

function renderWaitingScreen() {
    clearTimeout(customerWaitTimer);

    const resumingWait = game.pausedPhase === "waiting" &&
        (game.phase === "home" || game.phase === "waiting");

    game.phase = "waiting";
    game.pausedPhase = "waiting";
    game.currentCustomer = null;
    game.currentRecipe = null;
    game.currentOrder = [];

    // Về sảnh rồi quay lại thì giữ chiếc bánh đang làm.
    if (!resumingWait) {
        game.selectedIngredients = [];
        game.breadSelected = false;
    }

    updateHeader(`Ngày ${game.day}`, "");

    screen.innerHTML = `
        <div class="making-screen waiting-screen">
            <div class="patience-queue">
                <span class="queue-label">Hàng chờ</span>
                <span class="queue-empty">Đang vắng ☕</span>
            </div>
            <section class="customer-panel waiting-panel">
                <div class="customer-portrait">☕</div>
                <div class="customer-bubble">
                    <div class="customer-bubble-top">
                        <span>Quầy bánh mì</span>
                        ${recipeBookButton()}
                    </div>
                    <strong>Đang chờ khách...</strong>
                    <p>Khách sẽ tới sau một lát. Có thể chuẩn bị bánh trước nhé!</p>
                </div>
            </section>

            <div class="banhmi-workspace">
                <div class="board-stage">
                    <img class="cutting-board"
                         src="${skinById("board", selectedSkins.board).image}"
                         draggable="false"
                         alt="Thớt">

                    <div class="sandwich-stage">
                        <div id="sandwich-bread-bottom"></div>
                        <div id="sandwich-fillings"></div>
                        <div id="sandwich-bread-top"></div>
                    </div>
                </div>
            </div>

            <div class="ingredient-station">
                <div class="ingredient-table-wrap">
                    <img class="ingredient-table-image"
                         src="${skinById("ingredientTable", selectedSkins.ingredientTable).image}"
                         draggable="false"
                         alt="Bàn nguyên liệu">
                    <div id="station-items"></div>
                </div>

                <div id="ingredient-feedback" class="ingredient-feedback">
                    Có thể chuẩn bị bánh trong lúc chờ ☕
                </div>
            </div>
        </div>`;

    renderStationItems("making");
    updateSandwich();

    mainButton.textContent = "Đang chờ khách...";
    mainButton.disabled = true;
    saveGame();

    const deadline = Number(localStorage.getItem(CUSTOMER_WAIT_KEY));
    const remaining = Number.isFinite(deadline) && deadline > 0
        ? Math.max(0, deadline - Date.now())
        : 0;

    function admitCustomer() {
        if (game.phase !== "waiting") return;

        if (document.getElementById("pause-overlay")) {
            customerWaitTimer = setTimeout(admitCustomer, 250);
            return;
        }

        localStorage.removeItem(CUSTOMER_WAIT_KEY);
        mainButton.disabled = false;

        // Giữ phần bánh đã chuẩn bị trước khi hàm cũ tạo đơn mới.
        const preparedBread = game.breadSelected;
        const preparedIngredients = [...game.selectedIngredients];

        nextCustomer();

        if (game.phase === "making") {
            game.breadSelected = preparedBread;
            game.selectedIngredients = preparedIngredients;
            updateSandwich();
            renderStationItems("making");
            saveGame();
        }
    }

    customerWaitTimer = setTimeout(admitCustomer, remaining);
}

nextCustomer = function () {
    // Đủ khách hoặc hết hàng thì xử lý ngay, không bắt đợi.
    if (
        game.customerNumber >= game.customersToday ||
        ingredients["Bánh mì"].stock <= 0 ||
        availableRecipes().length === 0
    ) {
        return arriveCustomerNow();
    }

    const delay = game.customerNumber === 0
        ? 8000
        : 4000 + Math.floor(Math.random() * 3500);

    localStorage.setItem(
        CUSTOMER_WAIT_KEY,
        String(Date.now() + delay)
    );

    renderWaitingScreen();
};

resumeGame = function () {
    if (game.pausedPhase === "waiting" && game.shopOpen) {
        renderWaitingScreen();
        return;
    }

    resumeBeforeWaiting();
};

// Thu toàn bộ thớt và các lớp bánh theo cùng một tỉ lệ.
function fitBoardToWorkspace() {
    document.querySelectorAll(".banhmi-workspace").forEach((workspace) => {
        const board = workspace.querySelector(".board-stage");
        if (!board) return;

        const scale = Math.min(
            1,
            (workspace.clientWidth - 12) / 520,
            (workspace.clientHeight - 12) / 280
        );

        board.style.transform = `scale(${Math.max(0, scale)})`;
    });
}

let boardFitQueued = false;

function queueBoardFit() {
    if (boardFitQueued) return;
    boardFitQueued = true;

    requestAnimationFrame(() => {
        boardFitQueued = false;
        fitBoardToWorkspace();
    });
}

// Game thay HTML của #screen khi chuyển màn, nên tính lại sau mỗi lần thay.
new MutationObserver(queueBoardFit).observe(screen, {
    childList: true,
    subtree: true
});

new ResizeObserver(queueBoardFit).observe(screen);
window.addEventListener("resize", queueBoardFit);

queueBoardFit();

let skinApplyQueued = false;

function queueSkinApply() {

    if (skinApplyQueued) {
        return;
    }

    skinApplyQueued = true;

    requestAnimationFrame(() => {

        skinApplyQueued = false;

        applySelectedSkins();

    });
}


new MutationObserver(
    queueSkinApply
).observe(
    screen,
    {
        childList: true,
        subtree: true
    }
);


queueSkinApply();

// ======================================================
// HÀNG CHỜ KHÁCH, KIÊN NHẪN VÀ ĐÁNH GIÁ
// ======================================================

const CUSTOMER_PATIENCE_MS = 90000;

function getCustomerPatienceMs() {

    const level =
        getUpgradeLevel(
            "seating"
        );

    const multiplier = [
        1,
        1.10,
        1.20,
        1.35
    ][level] || 1;


    return Math.round(
        CUSTOMER_PATIENCE_MS *
        multiplier
    );
}


function getTicketPatienceMs(
    ticket
) {

    return (
        ticket.totalPatienceMs ||
        getCustomerPatienceMs()
    );
}

const CUSTOMER_ANNOYED_FRACTION = 0.40;
let patienceClock = Date.now();
let patienceInterval = null;
let nextArrivalTimer = null;

// Dọn toàn bộ state tạm thời của một ca bán hàng.
// Hàm này không đụng tới save dài hạn, tiền, XP hay kho nguyên liệu.
function clearShopRuntimeState() {
    clearTimeout(customerWaitTimer);
    clearTimeout(nextArrivalTimer);
    clearInterval(patienceInterval);

    customerWaitTimer = null;
    nextArrivalTimer = null;
    patienceInterval = null;

    clearCustomerReactionTimers();
    customerReactionTimer = null;
    customerReactionFadeTimer = null;

    cancelActiveSauceHold();

    if (typeof cancelActiveDrinkTeaHold === "function") {
        cancelActiveDrinkTeaHold();
    }

    stopSquirtSound();
    localStorage.removeItem(CUSTOMER_WAIT_KEY);
}

function activeTicket() {
    return game.waitingCustomers.find(ticket => ticket.id === game.activeTicketId);
}

function setActiveTicket(ticket) {
    game.activeTicketId = ticket.id;
    game.currentCustomer = ticket.customer;
    game.currentRecipe = recipes.find(recipe => recipe.name === ticket.recipeName);
    game.currentOrder = [...ticket.order];
    game.orderNote = ticket.note;
}

function getShopRatingAverage() {
    return game.reviewCount
        ? game.reviewStarsTotal / game.reviewCount
        : 0;
}

function renderRatingStars(
    rating,
    extraClass = ""
) {
    const value =
        Math.max(
            0,
            Math.min(
                5,
                Number(rating) || 0
            )
        );

    let html = "";

    for (
        let index = 0;
        index < 5;
        index++
    ) {
        const fill =
            Math.max(
                0,
                Math.min(
                    100,
                    (value - index) * 100
                )
            );

        html += `
            <span
                class="
                    rating-meter-star
                    ${extraClass}
                "
                style="
                    --star-fill:
                    ${fill}%;
                "
            >★</span>
        `;
    }

    return html;
}

function pickReviewVariant(list) {
    return list[
        Math.floor(
            Math.random() * list.length
        )
    ];
}


function ratingSpeedLabel(ticket, stars, correct, reason) {
    if (reason === "left") {
        return pickReviewVariant([
            "Chờ lâu quá nên bỏ đi",
            "Khách mất kiên nhẫn",
            "Đợi mãi không được phục vụ",
            "Khách rời tiệm vì chờ quá lâu"
        ]);
    }

    if (reason === "stock") {
        return pickReviewVariant([
            "Tiệm hết nguyên liệu",
            "Không đủ nguyên liệu để làm món",
            "Món gọi không còn bán được",
            "Khách thất vọng vì hết hàng"
        ]);
    }

    if (!correct) {
        return pickReviewVariant([
            "Món làm chưa đúng yêu cầu",
            "Bị nhầm nguyên liệu",
            "Đơn hàng không đúng",
            "Khách nhận sai món"
        ]);
    }

    if (stars >= 5) {
        return pickReviewVariant([
            "Nhanh và chính xác",
            "Phục vụ cực nhanh",
            "Đúng món, làm rất gọn",
            "Nhanh tay, món chuẩn"
        ]);
    }

    if (stars >= 4) {
        return pickReviewVariant([
            "Đúng món, phục vụ ổn",
            "Khá nhanh và chính xác",
            "Món chuẩn, chờ không lâu",
            "Phục vụ tốt"
        ]);
    }

    if (stars >= 3) {
        return pickReviewVariant([
            "Đúng món nhưng hơi lâu",
            "Phải chờ một lúc",
            "Món ổn, tốc độ bình thường",
            "Chính xác nhưng chưa nhanh"
        ]);
    }

    return pickReviewVariant([
        "Phục vụ quá chậm",
        "Khách phải chờ rất lâu",
        "Tốc độ phục vụ chưa ổn",
        "Món đúng nhưng đợi quá lâu"
    ]);
}

function recordCustomerRating(
    stars,
    ticket = null,
    {
        correct = stars >= 3,
        reason = "served"
    } = {}
) {
    const safeStars = Math.max(1, Math.min(5, Math.round(stars)));

    game.dailyStarTotal += safeStars;
    game.dailyReviewCount++;
    game.reviewStarsTotal += safeStars;
    game.reviewCount++;

    if (safeStars >= 4) {
        game.ratingStreak = (game.ratingStreak || 0) + 1;
    } else {
        game.ratingStreak = 0;
    }

    if (
        correct &&
        reason === "served"
    ) {
        let earnedXp = 6;

        if (safeStars >= 5) {
            earnedXp += 3;
        } else if (safeStars >= 4) {
            earnedXp += 2;
        }

        addShopXp(earnedXp);
    }

    if (ticket) {
        game.ratingHistory = Array.isArray(game.ratingHistory)
            ? game.ratingHistory
            : [];

        game.ratingHistory.unshift({
            stars: safeStars,
            day: game.day,
            customerNumber:
                Number(ticket.customerNumber) ||
                Number(game.customerNumber) ||
                1,
            customer: ticket.customer || game.currentCustomer || "A",
            correct: Boolean(correct),
            reason,
            label: ratingSpeedLabel(ticket, safeStars, correct, reason)
        });

        game.ratingHistory = game.ratingHistory.slice(0, 10);
    }

    refreshShopRating();
}

function refreshShopRating() {
    const button = document.getElementById("shop-rating");
    if (!button) return;

    const average = getShopRatingAverage();

    button.innerHTML = game.reviewCount
        ? `
            <span class="shop-rating-stars">
                ${renderRatingStars(average)}
            </span>

            <strong class="shop-rating-number">
                ${average.toFixed(1)}
            </strong>

            <small class="shop-rating-streak">
                🔥 ${game.ratingStreak || 0} liên tiếp
            </small>
        `
        : `
            <span class="shop-rating-stars">
                ${renderRatingStars(0)}
            </span>

            <strong class="shop-rating-number">
                --
            </strong>

            <small class="shop-rating-streak">
                🔥 0 liên tiếp
            </small>
        `;
}

function showRatingHistoryPopup() {
    document.getElementById("rating-history-overlay")?.remove();

    const average = getShopRatingAverage();
    const history = Array.isArray(game.ratingHistory)
        ? game.ratingHistory.slice(0, 10)
        : [];

    const rows = history.length
        ? history.map(review => {
            const mood = review.stars >= 4 ? 2 : 3;
            const customer = review.customer || "A";

            return `
                <article class="rating-history-row">
                    <div class="rating-history-avatar">
                        <img
                            src="${customerImage(customer, mood)}"
                            alt="Khách hàng"
                            draggable="false"
                            onerror="
                                this.style.display='none';
                                this.nextElementSibling.hidden=false;
                            "
                        >
                        <span hidden>${customerFallback(customer)}</span>
                    </div>

                    <div class="rating-history-info">
                        <div class="rating-history-row-top">
                            <span class="rating-history-stars">
                                ${renderRatingStars(review.stars)}
                            </span>
                            <span class="rating-history-day">
                                Ngày ${review.day}
                            </span>
                        </div>

                        <strong>${review.label || "Đánh giá khách hàng"}</strong>

                        <small>
                            Khách ${review.customerNumber || "?"}
                        </small>
                    </div>
                </article>
            `;
        }).join("")
        : `
            <div class="rating-history-empty">
                Chưa có đánh giá gần đây.
            </div>
        `;

    const overlay = document.createElement("div");
    overlay.id = "rating-history-overlay";
    overlay.className = "rating-history-overlay";

    overlay.innerHTML = `
        <section
            class="rating-history-card"
            role="dialog"
            aria-modal="true"
            aria-label="Đánh giá tiệm"
        >
            <button
                class="rating-history-close"
                type="button"
                aria-label="Đóng"
            >×</button>

            <div class="rating-history-badge">⭐</div>

            <h2>Đánh giá tiệm</h2>

            <div class="rating-history-summary">
                <div class="rating-history-main-stars">
                    ${renderRatingStars(game.reviewCount ? average : 0)}
                </div>

                <strong>
                    ${game.reviewCount ? average.toFixed(1) : "--"}
                </strong>

                <small>
                    ${game.reviewCount} lượt đánh giá
                    · Hôm nay ${game.dailyReviewCount} lượt
                </small>

                <div class="rating-history-streak">
                    🔥 ${game.ratingStreak || 0}
                    khách hài lòng liên tiếp
                </div>
            </div>

            <div class="rating-history-heading">
                10 đánh giá gần nhất
            </div>

            <div class="rating-history-list">
                ${rows}
            </div>

            <button
                class="rating-history-done"
                type="button"
            >
                Đóng
            </button>
        </section>
    `;

    const close = () => overlay.remove();

    overlay
        .querySelector(".rating-history-close")
        .addEventListener("click", close);

    overlay
        .querySelector(".rating-history-done")
        .addEventListener("click", close);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
}

function syncShopRating() {
    const header = document.querySelector(".top-bar");
    const center = header?.querySelector(".top-center");
    if (!header || !center) return;

    const showShopHud =
        game.phase === "prep" ||
        (
            game.shopOpen &&
            [
                "waiting",
                "making",
                "order",
                "result"
            ].includes(game.phase)
        );

    let rating =
        document.getElementById("shop-rating");

    if (showShopHud) {
        header.classList.add("has-shop-rating");

        if (moneyDisplay.parentElement !== center) {
            center.appendChild(moneyDisplay);
        }

        if (!rating) {
            rating = document.createElement("button");
            rating.id = "shop-rating";
            rating.type = "button";
            rating.setAttribute("aria-label", "Xem đánh giá tiệm");
            rating.addEventListener("click", showRatingHistoryPopup);
            header.appendChild(rating);
        }

        refreshShopRating();

    } else {
        header.classList.remove("has-shop-rating");
        rating?.remove();

        if (moneyDisplay.parentElement !== header) {
            header.appendChild(moneyDisplay);
        }
    }
}

new MutationObserver(syncShopRating).observe(
    screen,
    {
        childList: true,
        subtree: true
    }
);

function customerStars(
    ticket,
    correct
) {

    if (!correct) {
        return 1;
    }


    const totalPatience =
        getTicketPatienceMs(ticket);

    const fraction =
        ticket.remainingMs /
        totalPatience;


    const airconLevel =
        getUpgradeLevel(
            "aircon"
        );


    const thresholdShift = [
        0,
        0.05,
        0.10,
        0.15
    ][airconLevel] || 0;


    const fiveStar =
        0.60 - thresholdShift;

    const fourStar =
        0.35 - thresholdShift;

    const threeStar =
        Math.max(
            0,
            0.15 - thresholdShift
        );


    return (
        fraction > fiveStar
            ? 5

            : fraction > fourStar
                ? 4

                : fraction > threeStar
                    ? 3

                    : 2
    );
}

function createWaitingTicket() {
    if (game.customerNumber >= game.customersToday ||
        ingredients["Bánh mì"].stock <= 0 || !availableRecipes().length) return null;
    if (game.waitingCustomers.length >= ingredients["Bánh mì"].stock) return null;

    const previous = {
        customer: game.currentCustomer, recipe: game.currentRecipe,
        order: game.currentOrder, note: game.orderNote
    };
    const atCounter =
        game.waitingCustomers
            .map(
                ticket =>
                    ticket.customer
            );

    const normalChoices =
        customers.filter(
            id =>
                !atCounter.includes(id)
        );

    const specialCustomer =
        getPlannedMidAutumnCustomer(
            atCounter
        );

    game.currentCustomer =
        specialCustomer ||
        randomItem(
            normalChoices.length
                ? normalChoices
                : customers
        );
    let feasible = false;
    for (let attempt = 0; attempt < 12; attempt++) {
        if (!createOrder()) break;
        const reserved = {};
        for (const ticket of game.waitingCustomers) {
            for (const name of ticket.order) reserved[name] = (reserved[name] || 0) + 1;
        }
        for (const name of game.currentOrder) reserved[name] = (reserved[name] || 0) + 1;
        feasible = Object.entries(reserved).every(([name, amount]) =>
            ingredients[name] && ingredients[name].stock >= amount);
        if (feasible) break;
    }
    if (!feasible) {
        game.currentCustomer = previous.customer;
        game.currentRecipe = previous.recipe;
        game.currentOrder = previous.order;
        game.orderNote = previous.note;
        return null;
    }

    const ticket = {
        id: game.nextTicketId++,
        customerNumber: game.customerNumber + 1,
        customer: game.currentCustomer,
        recipeName: game.currentRecipe.name,
        order: [...game.currentOrder],
        note: game.orderNote,
        remainingMs: getCustomerPatienceMs(),
        totalPatienceMs: getCustomerPatienceMs()
    };
    game.waitingCustomers.push(ticket);

    if (
        isMidAutumnCustomer(
            ticket.customer
        )
    ) {
        markMidAutumnVisitSpawned();
    }

    game.customerNumber++;

    if (previous.recipe && game.waitingCustomers.length > 1) {
        game.currentCustomer = previous.customer;
        game.currentRecipe = previous.recipe;
        game.currentOrder = previous.order;
        game.orderNote = previous.note;
    } else {
        setActiveTicket(ticket);
    }
    saveGame();
    return ticket;
}

function queueMayAdvance() {
    return game.shopOpen && game.phase === "making" && !document.hidden &&
        !document.getElementById("pause-overlay") &&
        !document.getElementById("cute-popup-overlay") &&
        recipeModal.classList.contains("hidden") &&
        !document.getElementById("shop-opening-overlay");
}

function refreshPatienceUI() {
    if (game.phase !== "making") return;

    for (const ticket of game.waitingCustomers) {
        // Giới hạn thời gian của khách đã lưu từ bản 90 giây.
        const totalPatience =
    getTicketPatienceMs(ticket);

ticket.totalPatienceMs =
    totalPatience;

ticket.remainingMs =
    Math.min(
        ticket.remainingMs,
        totalPatience
    );


const fraction =
    ticket.remainingMs /
    totalPatience;


const percent =
    Math.max(
        0,
        Math.min(
            100,
            Math.round(
                fraction * 100
            )
        )
    );


const mood =
    fraction <=
        CUSTOMER_ANNOYED_FRACTION
        ? 3
        : 1;
        document.querySelectorAll(`[data-patience-id="${ticket.id}"]`).forEach(bar => {
            bar.style.width = `${percent}%`;
            bar.parentElement.classList.toggle("is-urgent", mood === 3);
        });

        const portraits = [
            ...document.querySelectorAll(`.queue-customer[data-ticket-id="${ticket.id}"] img`)
        ];

        if (ticket.id === game.activeTicketId) {
            const portrait = document.getElementById("customer-sprite");
            if (portrait) portraits.push(portrait);

            const label = document.getElementById("customer-patience-label");
            if (label) label.textContent = `Kiên nhẫn ${Math.ceil(ticket.remainingMs / 1000)}s`;
        }

        for (const portrait of portraits) {
            if (portrait.dataset.mood === String(mood)) continue;
            portrait.dataset.mood = String(mood);
            portrait.style.display = "";
            portrait.src = customerImage(ticket.customer, mood);
        }
    }
}

function renderCustomerQueue() {
    const screenEl = document.querySelector(".making-screen");
    const panel = document.getElementById("customer-panel");
    if (!screenEl || !panel) return;
    screenEl.querySelector(".patience-queue")?.remove();
    panel.querySelector(".active-patience")?.remove();

    const queue = document.createElement("div");
    queue.className = "patience-queue";
    queue.setAttribute("aria-label", "Khách đang chờ");
    const queueLabel = document.createElement("span");
    queueLabel.className = "queue-label";
    queueLabel.textContent = "Hàng chờ";
    queue.appendChild(queueLabel);
    for (const ticket of game.waitingCustomers) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "queue-customer" +
            (ticket.id === game.activeTicketId ? " is-active" : "");
        button.dataset.ticketId = ticket.id;
        button.setAttribute("aria-label", `Chọn khách ${ticket.customer}, còn ${Math.ceil(ticket.remainingMs / 1000)} giây`);
        button.innerHTML = `
            <img src="${customerImage(ticket.customer, 1)}" alt=""
                 onerror="this.style.display='none'">
            <span class="queue-patience"><span data-patience-id="${ticket.id}"></span></span>`;
        button.addEventListener("click", () => {
            if (game.phase !== "making" || ticket.id === game.activeTicketId) return;
            setActiveTicket(ticket);
            renderMakingScreen();
        });
        queue.appendChild(button);
    }
    screenEl.insertBefore(queue, panel);
    syncShopRating();

    const bubble = panel.querySelector(".customer-bubble");
    if (bubble && activeTicket()) {
        const info = document.createElement("div");
        info.className = "active-patience";
        info.innerHTML = `<span id="customer-patience-label"></span>
            <span class="active-patience-track"><span data-patience-id="${game.activeTicketId}"></span></span>`;
        bubble.appendChild(info);
    }
    refreshPatienceUI();
}

function scheduleAnotherCustomer() {
    if (
        nextArrivalTimer ||
        game.customerNumber >= game.customersToday ||
        game.waitingCustomers.length >= 3 ||
        !game.shopOpen
    ) return;

    const roll = Math.random();

    // Có lúc khách ập tới, có lúc thong thả, thỉnh thoảng vắng lâu.
    const delay =
        roll < 0.25 ? 1000 + Math.floor(Math.random() * 1500) :
        roll < 0.82 ? 3000 + Math.floor(Math.random() * 2500) :
                      8000 + Math.floor(Math.random() * 4000);

    nextArrivalTimer = setTimeout(() => {
        nextArrivalTimer = null;

        if (!game.shopOpen ||
            game.customerNumber >= game.customersToday) return;

        // Đang pause/xem sổ thì hẹn lại, không làm mất lượt khách.
        if (!queueMayAdvance()) {
            scheduleAnotherCustomer();
            return;
        }

        const arrivingTogether = 1;
        const availableSlots = 3 - game.waitingCustomers.length;
        const remainingToday = game.customersToday - game.customerNumber;
        const arrivals = Math.min(
            arrivingTogether,
            availableSlots,
            remainingToday
        );

        let someoneArrived = false;

        for (let i = 0; i < arrivals; i++) {
            if (!createWaitingTicket()) break;
            someoneArrived = true;
        }

        if (someoneArrived) renderCustomerQueue();
        scheduleAnotherCustomer();
    }, delay);
} 

function runPatienceClock() {
    if (patienceInterval) return;
    patienceClock = Date.now();
    let saveTicks = 0;
    patienceInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.min(1250, Math.max(0, now - patienceClock));
        patienceClock = now;
        if (!queueMayAdvance()) return;

        for (const ticket of [...game.waitingCustomers]) {
            ticket.remainingMs = Math.max(0, ticket.remainingMs - elapsed);
            if (ticket.remainingMs > 0) continue;
            game.waitingCustomers = game.waitingCustomers.filter(other => other !== ticket);
            recordCustomerRating(
                1,
                ticket,
                {
                    correct: false,
                    reason: "left"
                }
            );
            if (ticket.id === game.activeTicketId) {
                showCustomerReaction(false);
                const reaction = document.getElementById("customer-reaction");
                if (reaction) reaction.textContent = "Khách đợi lâu quá nên đã rời đi. ★☆☆☆☆";
            } else {
                renderCustomerQueue();
            }
            saveGame();
        }
        refreshPatienceUI();
        if (++saveTicks % 5 === 0) saveGame();
    }, 1000);
}

const renderMakingWithQueue = renderMakingScreen;
renderMakingScreen = function () {
    renderMakingWithQueue();
    if (game.waitingCustomers.length) renderCustomerQueue();
    runPatienceClock();
};

nextCustomer = function () {
    clearTimeout(customerWaitTimer);
    localStorage.removeItem(CUSTOMER_WAIT_KEY);
    if (!game.shopOpen) return;
    if (
    ingredients["Bánh mì"].stock <= 0
) {

    for (
        const ticket of
        game.waitingCustomers
    ) {
        recordCustomerRating(
            1,
            ticket,
            {
                correct: false,
                reason: "stock"
            }
        );
    }

    game.waitingCustomers = [];
    game.activeTicketId = null;


    showCutePopup({

        icon: "🥖",

        title:
            "Bán hết sạch rồi! 🎉",

        message:
            "Hôm nay tiệm đã bán hết bánh mì. Không còn ổ nào để phục vụ khách tiếp theo, nên mình đóng cửa sớm nha!",

        confirmText:
            "Tổng kết ngày",

        onConfirm: () => {
            endDay();
        }

    });

    return;
}


if (
    !availableRecipes().length
) {

    for (
        const ticket of
        game.waitingCustomers
    ) {
        recordCustomerRating(
            1,
            ticket,
            {
                correct: false,
                reason: "stock"
            }
        );
    }

    game.waitingCustomers = [];
    game.activeTicketId = null;


    showCutePopup({

        icon: "📦",

        title:
            "Hết nguyên liệu rồi!",

        message:
            "Không còn đủ nguyên liệu để nhận thêm khách. Mình đóng cửa sớm và tổng kết ngày nha!",

        confirmText:
            "Tổng kết ngày",

        onConfirm: () => {
            endDay();
        }

    });

    return;
}
    if (!game.waitingCustomers.length) {
    if (game.customerNumber >= game.customersToday) {
        endDay();
        return;
    }

    // Mở cửa hoặc vừa phục vụ hết hàng chờ: để quầy vắng một lúc.
    if (game.phase !== "waiting") {
        clearTimeout(nextArrivalTimer);
        nextArrivalTimer = null;
        game.activeTicketId = null;

        const delay = game.customerNumber === 0
            ? 7000 + Math.floor(Math.random() * 3000)
            : 4000 + Math.floor(Math.random() * 4000);

        localStorage.setItem(
            CUSTOMER_WAIT_KEY,
            String(Date.now() + delay)
        );

        renderWaitingScreen();
        return;
    }

    // Hết thời gian chờ: khách mới bước vào, đôi khi đi cùng nhau.
    const arrivingTogether = 1;

    for (let i = 0; i < arrivingTogether; i++) {
        if (!createWaitingTicket()) break;
    }
}
    const ticket = game.waitingCustomers[0];
    if (!ticket) { endDay(); return; }
    setActiveTicket(ticket);
    game.selectedIngredients = [];
    game.breadSelected = false;
    renderMakingScreen();
    scheduleAnotherCustomer();
};

completeCustomerOrder = function (correct) {
    const ticket = activeTicket();
    if (!ticket) return;
    const stars = customerStars(ticket, correct);
    game.waitingCustomers = game.waitingCustomers.filter(other => other !== ticket);
    recordCustomerRating(
        stars,
        ticket,
        {
            correct,
            reason: "served"
        }
    );
    game.lastOrderStars = stars;

    syncDayHeaderInfo();

    playOrderResultSound(correct);
    ingredients["Bánh mì"].stock = Math.max(0, ingredients["Bánh mì"].stock - 1);
    game.selectedIngredients.forEach(name => {
        ingredients[name].stock = Math.max(0, ingredients[name].stock - 1);
    });
    if (correct) {

    game.money +=
        game.currentRecipe.price;

    game.dailyRevenue +=
        game.currentRecipe.price;

    game.completedOrders++;


    // =========================
    // REAL DAILY MISSIONS
    // =========================

    realDaily =
        loadRealDailyData();


    realDaily.stats.correctOrders++;


    realDaily.stats.revenue +=
        game.currentRecipe.price;


    if (
        !realDaily.stats.ingredientSold ||
        typeof realDaily.stats.ingredientSold !== "object"
    ) {
        realDaily.stats.ingredientSold = {};
    }


    // Track mọi nguyên liệu trong đơn đúng.
    // Dùng Set để mỗi nguyên liệu chỉ cộng 1 lần trên mỗi bánh.
    [
        ...new Set(
            ticket.order || []
        )
    ].forEach(
        ingredientName => {

            realDaily.stats
                .ingredientSold[
                    ingredientName
                ] =
                (
                    realDaily.stats
                        .ingredientSold[
                            ingredientName
                        ] || 0
                ) + 1;
        }
    );


    saveRealDailyData(
        realDaily
    );


    // =========================
    // MID-AUTUMN EVENT
    // =========================

    recordMidAutumnServe(
        ticket.customer
    );
}
    showCustomerReaction(correct);
    const reaction = document.getElementById("customer-reaction");
    if (reaction) reaction.textContent += ` ${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
    saveGame();
};

const receiptWithRatings = renderDayEnd;
renderDayEnd = function () {
    receiptWithRatings();
    const divider = document.querySelector(".day-receipt .receipt-divider");
    if (!divider) return;
    const row = document.createElement("div");
    row.className = "receipt-row";
    row.innerHTML = `<span>⭐ Đánh giá hôm nay</span><strong>${
        game.dailyReviewCount
            ? (game.dailyStarTotal / game.dailyReviewCount).toFixed(1) + "/5 · " + game.dailyReviewCount + " khách"
            : "Chưa có đánh giá"
    }</strong>`;
    divider.before(row);
    const overall = document.createElement("div");
    overall.className = "receipt-row";
    overall.innerHTML = `<span>⭐ Đánh giá tiệm</span><strong>${
        game.reviewCount
            ? (game.reviewStarsTotal / game.reviewCount).toFixed(1) + "/5 · " + game.reviewCount + " lượt"
            : "Chưa có đánh giá"
    }</strong>`;
    divider.before(overall);
};

const previousResumeWithQueue = resumeGame;
resumeGame = function () {
    // Save từ phiên bản một khách: giữ nguyên chiếc bánh đang làm.
    if (game.shopOpen && game.pausedPhase === "making" &&
        !game.waitingCustomers.length && game.currentRecipe) {
        const ticket = {
            id: game.nextTicketId++,
            customerNumber:
                Math.max(
                    1,
                    game.customerNumber || 1
                ),
            customer: game.currentCustomer,
            recipeName: game.currentRecipe.name,
            order: [...game.currentOrder],
            note: game.orderNote,
            remainingMs: getCustomerPatienceMs(),
            totalPatienceMs: getCustomerPatienceMs()
        };
        game.waitingCustomers.push(ticket);
        game.activeTicketId = ticket.id;
    }
    if (game.shopOpen && game.pausedPhase === "waiting") {
    renderWaitingScreen();
    } else {
        previousResumeWithQueue();
        if (game.shopOpen && game.phase === "making" && game.waitingCustomers.length) {
            if (!activeTicket()) setActiveTicket(game.waitingCustomers[0]);
            renderMakingScreen();
            scheduleAnotherCustomer();
        }
    }
    patienceClock = Date.now();
};

document.addEventListener("visibilitychange", () => {
    patienceClock = Date.now();
    if (document.hidden) saveGame();
});

// Style riêng cho hàng chờ; không ghi đè file style.css của người chơi.
(() => {
    const style = document.createElement("style");
    style.textContent = `
/* Hàng chờ nằm ngay dưới thanh trạng thái; kiên nhẫn nằm trong lời thoại. */
.patience-queue {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 49px;
    padding: 4px 9px;
    background: #fff0d5;
    border-bottom: 1px solid #ddb888;
    flex: 0 0 auto;
}
.queue-label { font-size: 10px; font-weight: bold; color: #78543c; margin-right: 3px; }
.queue-customer {
    width: 44px;
    height: 42px;
    border: 2px solid #c89469;
    border-radius: 14px;
    background: #fff9ed;
    overflow: hidden;
    padding: 0;
    cursor: pointer;
    box-shadow: 0 2px 0 #b77e55;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.queue-customer.is-active { border-color: #e95c78; background: #ffe9ee; }
.queue-customer img { width: 36px; height: 33px; object-fit: contain; object-position: bottom; }
.queue-patience, .active-patience-track {
    display: block;
    overflow: hidden;
    background: #e9d7c8;
    border-radius: 999px;
}
.queue-patience { width: 35px; height: 5px; }
.queue-patience > span, .active-patience-track > span {
    display: block;
    height: 100%;
    width: 100%;
    background: #67b46f;
    transition: width 0.35s linear;
}
.queue-patience.is-urgent > span,
.active-patience-track.is-urgent > span { background: #e4535f; }
.active-patience {
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    font-weight: bold;
    color: #76533d;
}
.active-patience-track { flex: 1; height: 6px; }
.top-bar.has-shop-rating {
    position: relative;
    grid-template-columns: 44px minmax(0, 1fr) 92px;
    gap: 3px;
}

.top-bar.has-shop-rating .top-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: min(300px, calc(100% - 210px));
    flex-direction: column;
    gap: 1px;
    line-height: 1.1;
}

.top-bar.has-shop-rating .top-center strong {
    font-size: 12px;
    white-space: nowrap;
}
.top-bar.has-shop-rating #status-display { display: none; }

.top-bar.has-shop-rating #money-display {
    width: 100%;
    font-size: 20px;
    line-height: 1.15;
    text-align: center;
}

#shop-rating {
    grid-column: 3;
    justify-self: end;
    width: 94px;
    padding: 3px 2px;
    border: 0;
    background: transparent;
    font-weight: bold;
    line-height: 1;
    cursor: pointer;
}
.making-screen:has(.patience-queue) .banhmi-workspace { height: 178px; }
@media (max-width: 560px) {
    .patience-queue { height: 45px; }
    .queue-customer { width: 40px; height: 38px; }
    .queue-customer img { width: 33px; height: 29px; }
    .making-screen:has(.patience-queue) .banhmi-workspace { height: 164px; }
}

`;
    document.head.appendChild(style);
})();

// ======================================================
// DAY 1 - INTERACTIVE TUTORIAL (V5)
// 3 khách tự đến, không có nút "khách tiếp theo".
// Fix recipe close, pause/reset cleanup, mobile coach.
// ======================================================

const DAY1_TUTORIAL_DONE_KEY =
    "mot-o-nha-day1-interactive-tutorial-v6";

const DAY1_TUTORIAL_STATE_KEY =
    "mot-o-nha-day1-interactive-state-v6";

const DAY1_TUTORIAL_CUSTOMERS = [
    {
        customer: "A",
        recipeName: "Bánh mì pâté",
        note: "Cho chị một ổ bánh mì pâté như bình thường nha!"
    },
    {
        customer: "C",
        recipeName: "Bánh mì trứng",
        note: "Cho anh một ổ bánh mì trứng như bình thường nha!"
    },
    {
        customer: "F",
        recipeName: "Bánh mì pâté",
        note: "Cho em một ổ bánh mì pâté, với một ly trà chanh đá với thạch cá nữa nha!",
        drinkOrder: {
            tea: "Trà chanh",
            ice: true,
            topping: "Thạch cá",
            price: 9000
        }
    },
    {
        customer: "E",
        recipeName: "Bánh mì không",
        note: "Cho em một ổ bánh mì không thôi nha, không cần nhân!"
    }
];

let day1TutorialStep = null;


// DEV MIGRATION:
// Dọn state tutorial test cũ để bản mới hiện bubble lại đúng từ đầu.
// Chỉ đụng các key tutorial V5 cũ, không đụng save game.
localStorage.removeItem(
    "mot-o-nha-day1-interactive-tutorial-v5"
);

localStorage.removeItem(
    "mot-o-nha-day1-interactive-state-v5"
);


function day1TutorialActive() {
    return (
        game.day === 1 &&
        (
            game.phase === "making" ||
            game.phase === "result" ||
            game.phase === "waiting"
        )
    );
}


function day1TutorialOverlayOpen() {
    return Boolean(
        document.getElementById("pause-overlay") ||
        document.getElementById("cute-popup-overlay")
    );
}


function saveDay1TutorialState() {
    if (!day1TutorialActive()) {
        localStorage.removeItem(
            DAY1_TUTORIAL_STATE_KEY
        );
        return;
    }

    localStorage.setItem(
        DAY1_TUTORIAL_STATE_KEY,
        JSON.stringify({
            customerNumber:
                Number(game.customerNumber) || 0,
            step:
                day1TutorialStep
        })
    );
}


function loadDay1TutorialState() {
    if (!day1TutorialActive()) {
        day1TutorialStep = null;
        return;
    }

    try {
        const saved =
            JSON.parse(
                localStorage.getItem(
                    DAY1_TUTORIAL_STATE_KEY
                ) || "{}"
            );

        if (
            Number(saved.customerNumber) ===
                Number(game.customerNumber) &&
            typeof saved.step === "string"
        ) {
            day1TutorialStep =
                saved.step;
        }
    } catch {}
}


function clearDay1TutorialUI() {
    document
        .querySelectorAll(
            ".day1-tutorial-target, .day1-tutorial-recipe-focus"
        )
        .forEach(element => {
            element.classList.remove(
                "day1-tutorial-target",
                "day1-tutorial-recipe-focus"
            );
        });

    document
        .getElementById(
            "day1-tutorial-coach"
        )
        ?.remove();

    document
        .querySelector(
            ".recipe-book-note"
        )
        ?.classList.remove(
            "day1-tutorial-note"
        );
}


function finishDay1Tutorial() {
    localStorage.removeItem(
        DAY1_TUTORIAL_STATE_KEY
    );

    day1TutorialStep = null;
    clearDay1TutorialUI();
}


function setDay1TutorialStep(step) {
    day1TutorialStep = step;
    saveDay1TutorialState();

    requestAnimationFrame(
        updateDay1TutorialCoach
    );
}


function getDay1TutorialInstruction() {
    if (
        !day1TutorialActive() ||
        day1TutorialOverlayOpen()
    ) {
        return null;
    }

    const number =
        Number(game.customerNumber) || 0;

    if (number === 1) {
        const map = {
            bread: {
                title: "Khách đầu tiên tới rồi! 👋",
                text:
                    "Đây là Bánh mì pâté. Trước tiên, nhấn vào ổ bánh mì ở bàn nguyên liệu.",
                target:
                    '.bread-station-item'
            },
            pate: {
                title: "Thêm Pâté",
                text:
                    "Giờ nhấn vào Pâté để thêm nhân vào bánh.",
                target:
                    '[data-ingredient="Pâté"]'
            },
            rau: {
                title: "Thêm Rau",
                text:
                    "Công thức Bánh mì pâté còn có Rau. Nhấn vào Rau nha!",
                target:
                    '[data-ingredient="Rau"]'
            },
            serve: {
                title: "Xong rồi! ✨",
                text:
                    "Bánh đã đúng công thức. Nhấn Giao bánh để phục vụ khách.",
                target:
                    '#main-button'
            }
        };

        return map[
            day1TutorialStep
        ] || map.bread;
    }

    if (number === 2) {
        const map = {
            recipe: {
                title: "Món này nhiều nguyên liệu hơn 📖",
                text:
                    "Nhấn vào Sổ công thức cạnh lời thoại của khách để xem món này cần những gì nhé!",
                target:
                    '.recipe-book-fab'
            },
            "recipe-read": {
                recipeMode: true
            },
            bread: {
                title: "Bắt đầu làm nào 🥖",
                text:
                    "Trước tiên, lấy một ổ bánh mì.",
                target:
                    '.bread-station-item'
            },
            pate: {
                title: "Pâté",
                text:
                    "Nhấn Pâté để thêm vào bánh.",
                target:
                    '[data-ingredient="Pâté"]'
            },
            egg: {
                title: "Trứng",
                text:
                    "Tiếp theo là Trứng.",
                target:
                    '[data-ingredient="Trứng"]'
            },
            cucumber: {
                title: "Dưa leo",
                text:
                    "Thêm Dưa leo theo công thức.",
                target:
                    '[data-ingredient="Dưa leo"]'
            },
            rau: {
                title: "Rau",
                text:
                    "Thêm Rau nữa nha.",
                target:
                    '[data-ingredient="Rau"]'
            },
            ketchup: {
                title: "Sốt phải nhấn giữ 🍅",
                text:
                    "Nhấn GIỮ chai Ketchup đủ 2.5 giây đến khi vòng tròn đầy. Thả sớm thì sốt chưa được thêm.",
                target:
                    '[data-ingredient="Ketchup"]'
            },
            serve: {
                title: "Đúng công thức rồi!",
                text:
                    "Giờ nhấn Giao bánh để đưa món cho khách.",
                target:
                    '#main-button'
            }
        };

        return map[
            day1TutorialStep
        ] || map.recipe;
    }

    if (number === 3) {
        const map = {
            bread: {
                title: "Khách gọi thêm nước rồi! 🥤",
                text:
                    "Làm phần bánh mì pâté trước nhé. Bắt đầu bằng một ổ bánh mì.",
                target:
                    '.bread-station-item'
            },
            pate: {
                title: "Thêm Pâté",
                text:
                    "Thêm Pâté vào bánh như lúc nãy.",
                target:
                    '[data-ingredient="Pâté"]'
            },
            rau: {
                title: "Thêm Rau",
                text:
                    "Thêm Rau để hoàn thành phần bánh mì.",
                target:
                    '[data-ingredient="Rau"]'
            },
            "switch-drink": {
                title: "Sang quầy nước 🥤",
                text:
                    "Đơn này còn một ly Trà chanh đá với Thạch cá. Nhấn Đồ uống để trượt sang quầy bên cạnh.",
                target:
                    '.station-side-toggle-next'
            },
            cup: {
                title: "Lấy cốc trước",
                text:
                    "Nhấn vào chồng cốc để lấy một chiếc cốc.",
                target:
                    '[data-drink-ingredient="Cốc"]'
            },
            ice: {
                title: "Cho đá vào trước 🧊",
                text:
                    "Trước khi rót trà, nhấn vào Đá để cho đá vào cốc trước nhé.",
                target:
                    '[data-drink-ingredient="Đá"]'
            },
            tea: {
                title: "Giờ mới rót trà 🫗",
                text:
                    "Nhấn GIỮ bình Trà chanh đủ 2 giây. Nước sẽ dâng từ dưới lên, thả tay sớm thì trà chưa được thêm.",
                target:
                    '[data-drink-ingredient="Trà chanh"]'
            },
            topping: {
                title: "Một topping thôi!",
                text:
                    "Mỗi ly chỉ có tối đa 1 topping. Ly này cần Thạch cá.",
                target:
                    '[data-drink-ingredient="Thạch cá"]'
            },
            serve: {
                title: "Combo hoàn thành! ✨",
                text:
                    "Bánh và nước đều đúng rồi. Nhấn Giao đơn để phục vụ khách.",
                target:
                    '#main-button'
            }
        };

        return map[
            day1TutorialStep
        ] || map.bread;
    }

    if (number === 4) {
        const map = {
            bread: {
                title: "Khách cuối của ngày đầu 👀",
                text:
                    "Khách này gọi Bánh mì không. Chỉ cần lấy một ổ bánh mì thôi.",
                target:
                    '.bread-station-item'
            },
            serve: {
                title: "Không cần thêm gì hết!",
                text:
                    "Bánh mì không chỉ có bánh mì. Đừng thêm topping, giao luôn nha!",
                target:
                    '#main-button'
            }
        };

        return map[
            day1TutorialStep
        ] || map.bread;
    }

    return null;
}


function ensureDay1TutorialCoach() {
    let coach =
        document.getElementById(
            "day1-tutorial-coach"
        );

    if (coach) {
        return coach;
    }

    coach =
        document.createElement(
            "aside"
        );

    coach.id =
        "day1-tutorial-coach";

    coach.setAttribute(
        "aria-live",
        "polite"
    );

    coach.innerHTML = `
        <div class="day1-tutorial-coach-label">
            💡 HƯỚNG DẪN
        </div>
        <strong
            id="day1-tutorial-coach-title"
        ></strong>
        <p
            id="day1-tutorial-coach-text"
        ></p>
    `;

    document.body.appendChild(
        coach
    );

    return coach;
}


function showDay1RecipeInstruction() {
    clearDay1TutorialUI();

    const note =
        recipeModal.querySelector(
            ".recipe-book-note"
        );

    if (note) {
        note.classList.add(
            "day1-tutorial-note"
        );

        note.textContent =
            "💡 Xem công thức Bánh mì trứng bên dưới, rồi nhấn ✕ để đóng sổ và bắt đầu làm.";
    }

    const entries =
        [
            ...recipeModal.querySelectorAll(
                ".recipe-entry"
            )
        ];

    const eggEntry =
        entries.find(
            entry =>
                entry
                    .querySelector(
                        ".recipe-entry-title strong"
                    )
                    ?.textContent
                    .includes(
                        "Bánh mì trứng"
                    )
        );

    eggEntry?.classList.add(
        "day1-tutorial-recipe-focus"
    );

    closeRecipeButton.classList.add(
        "day1-tutorial-target"
    );
}


function positionDay1TutorialCoach(
    coach,
    target
) {
    if (!coach || !target) {
        return;
    }

    const gameRect =
        document
            .getElementById("game")
            ?.getBoundingClientRect();

    const minLeft =
        Math.max(
            8,
            gameRect?.left ?? 8
        );

    const maxRight =
        Math.min(
            window.innerWidth - 8,
            gameRect?.right ??
                window.innerWidth - 8
        );

    const maxWidth =
        Math.max(
            250,
            maxRight -
                minLeft -
                16
        );

    coach.style.width =
        `${Math.min(
            360,
            maxWidth
        )}px`;

    const targetRect =
        target.getBoundingClientRect();

    const coachRect =
        coach.getBoundingClientRect();

    const gap = 12;

    let top =
        targetRect.top -
        coachRect.height -
        gap;

    if (top < 70) {
        top =
            targetRect.bottom +
            gap;
    }

    top =
        Math.max(
            70,
            Math.min(
                top,
                window.innerHeight -
                    coachRect.height -
                    10
            )
        );

    let left =
        targetRect.left +
        targetRect.width / 2 -
        coachRect.width / 2;

    left =
        Math.max(
            minLeft + 8,
            Math.min(
                left,
                maxRight -
                    coachRect.width -
                    8
            )
        );

    coach.style.left =
        `${left}px`;

    coach.style.top =
        `${top}px`;
}


function updateDay1TutorialCoach() {
    if (
        !day1TutorialActive() ||
        day1TutorialOverlayOpen()
    ) {
        clearDay1TutorialUI();
        return;
    }

    const instruction =
        getDay1TutorialInstruction();

    if (!instruction) {
        clearDay1TutorialUI();
        return;
    }

    if (instruction.recipeMode) {
        showDay1RecipeInstruction();
        return;
    }

    clearDay1TutorialUI();

    const coach =
        ensureDay1TutorialCoach();

    coach
        .querySelector(
            "#day1-tutorial-coach-title"
        )
        .textContent =
            instruction.title;

    coach
        .querySelector(
            "#day1-tutorial-coach-text"
        )
        .textContent =
            instruction.text;

    const target =
        document.querySelector(
            instruction.target
        );

    if (target) {
        target.classList.add(
            "day1-tutorial-target"
        );

        requestAnimationFrame(
            () =>
                positionDay1TutorialCoach(
                    coach,
                    target
                )
        );
    }
}


function remindDay1Tutorial() {
    updateDay1TutorialCoach();

    const coach =
        document.getElementById(
            "day1-tutorial-coach"
        );

    if (!coach) {
        return;
    }

    coach.classList.remove(
        "day1-tutorial-nudge"
    );

    void coach.offsetWidth;

    coach.classList.add(
        "day1-tutorial-nudge"
    );
}


// Hướng dẫn tĩnh được bật lại khi version tutorial thay đổi.
// Bản 0.3.2 bắt buộc đọc tới trang cuối một lần.


const day1OriginalGetCustomerPatienceMs =
    getCustomerPatienceMs;

getCustomerPatienceMs =
    function () {
        if (day1TutorialActive()) {
            return 10 * 60 * 1000;
        }

        return day1OriginalGetCustomerPatienceMs();
    };


const day1OriginalScheduleAnotherCustomer =
    scheduleAnotherCustomer;

scheduleAnotherCustomer =
    function () {
        if (day1TutorialActive()) {
            return;
        }

        return day1OriginalScheduleAnotherCustomer();
    };


const day1OriginalNextCustomer =
    nextCustomer;

nextCustomer =
    function () {
        if (!day1TutorialActive()) {
            return day1OriginalNextCustomer();
        }

        clearDay1TutorialUI();

        clearTimeout(
            customerWaitTimer
        );

        clearTimeout(
            nextArrivalTimer
        );

        customerWaitTimer = null;
        nextArrivalTimer = null;

        localStorage.removeItem(
            CUSTOMER_WAIT_KEY
        );

        game.customersToday = 4;

        // Sau khách thứ 3, flow gốc tự gọi nextCustomer().
        // Ta đóng ngày luôn, KHÔNG bắt người chơi bấm "khách tiếp theo".
        if (
            Number(game.customerNumber) >=
            DAY1_TUTORIAL_CUSTOMERS.length
        ) {
            finishDay1Tutorial();
            return endDay();
        }

        const setup =
            DAY1_TUTORIAL_CUSTOMERS[
                Number(game.customerNumber) || 0
            ];

        const recipe =
            recipes.find(
                item =>
                    item.name ===
                    setup.recipeName
            );

        if (!recipe) {
            return day1OriginalNextCustomer();
        }

        game.waitingCustomers = [];
        game.activeTicketId = null;

        game.currentCustomer =
            setup.customer;

        game.currentRecipe =
            recipe;

        game.currentOrder =
            [...recipe.ingredients];

        game.orderNote =
            setup.note;

        const patience =
            getCustomerPatienceMs() +
            (
                setup.drinkOrder
                    ? 10000
                    : 0
            );

        const ticket = {
            id:
                game.nextTicketId++,
            customerNumber:
                Number(game.customerNumber) + 1,
            customer:
                setup.customer,
            recipeName:
                recipe.name,
            order:
                [...recipe.ingredients],
            note:
                setup.note,
            remainingMs:
                patience,
            totalPatienceMs:
                patience,

            drinkOrder:
                setup.drinkOrder
                    ? {
                        ...setup.drinkOrder
                    }
                    : null,

            drinkPatienceBonusApplied:
                Boolean(setup.drinkOrder)
        };

        game.waitingCustomers.push(
            ticket
        );

        game.customerNumber++;

        setActiveTicket(
            ticket
        );

        game.selectedIngredients = [];
        game.breadSelected = false;

        day1TutorialStep =
            Number(game.customerNumber) === 2
                ? "recipe"
                : "bread";

        saveDay1TutorialState();

        renderMakingScreen();

        mainButton.disabled = false;

        saveGame();

        requestAnimationFrame(
            updateDay1TutorialCoach
        );
    };


const day1OriginalRenderMakingScreen =
    renderMakingScreen;

renderMakingScreen =
    function () {
        day1OriginalRenderMakingScreen();

        if (game.day === 1) {
            game.customersToday = 4;

            // Luôn dựng lại step hợp lệ nếu state bị mất / reset / đổi màn.
            if (
                !day1TutorialStep ||
                (
                    Number(game.customerNumber) === 2 &&
                    ![
                        "recipe",
                        "recipe-read",
                        "bread",
                        "pate",
                        "egg",
                        "cucumber",
                        "rau",
                        "ketchup",
                        "serve"
                    ].includes(day1TutorialStep)
                )
            ) {
                if (Number(game.customerNumber) === 2) {
                    day1TutorialStep = "recipe";
                } else if (
                    Number(game.customerNumber) === 1 ||
                    Number(game.customerNumber) === 3 ||
                    Number(game.customerNumber) === 4
                ) {
                    day1TutorialStep = "bread";
                }

                saveDay1TutorialState();
            }

            requestAnimationFrame(
                () => {
                    updateDay1TutorialCoach();

                    // Một frame nữa để chắc target đã có trong DOM.
                    requestAnimationFrame(
                        updateDay1TutorialCoach
                    );
                }
            );
        }
    };


const day1OriginalHandleStationClick =
    handleStationClick;

handleStationClick =
    function (
        name,
        mode
    ) {
        if (
            !day1TutorialActive() ||
            mode !== "making"
        ) {
            return day1OriginalHandleStationClick(
                name,
                mode
            );
        }

        const number =
            Number(game.customerNumber);

        const allowedByStep = {
            bread: "Bánh mì",
            pate: "Pâté",
            egg: "Trứng",
            cucumber: "Dưa leo",
            rau: "Rau"
        };

        const allowed =
            allowedByStep[
                day1TutorialStep
            ];

        if (
            !allowed ||
            name !== allowed
        ) {
            remindDay1Tutorial();
            return;
        }

        day1OriginalHandleStationClick(
            name,
            mode
        );

        if (
            allowed === "Bánh mì" &&
            game.breadSelected
        ) {
            setDay1TutorialStep(
                number === 4
                    ? "serve"
                    : "pate"
            );
            return;
        }

        if (
            allowed === "Pâté" &&
            game.selectedIngredients.includes(
                "Pâté"
            )
        ) {
            setDay1TutorialStep(
                number === 2
                    ? "egg"
                    : "rau"
            );
            return;
        }

        if (
            allowed === "Trứng" &&
            game.selectedIngredients.includes(
                "Trứng"
            )
        ) {
            setDay1TutorialStep(
                "cucumber"
            );
            return;
        }

        if (
            allowed === "Dưa leo" &&
            game.selectedIngredients.includes(
                "Dưa leo"
            )
        ) {
            setDay1TutorialStep(
                "rau"
            );
            return;
        }

        if (
            allowed === "Rau" &&
            game.selectedIngredients.includes(
                "Rau"
            )
        ) {
            setDay1TutorialStep(
                number === 1
                    ? "serve"
                    : number === 3
                        ? "switch-drink"
                        : "ketchup"
            );
        }
    };


const day1OriginalStartSauceHold =
    startSauceHold;

startSauceHold =
    function (
        button,
        name,
        pointerId
    ) {
        if (day1TutorialActive()) {
            if (
                Number(game.customerNumber) !== 2 ||
                day1TutorialStep !== "ketchup" ||
                name !== "Ketchup"
            ) {
                remindDay1Tutorial();
                return;
            }
        }

        return day1OriginalStartSauceHold(
            button,
            name,
            pointerId
        );
    };


const day1OriginalCompleteSauceHold =
    completeSauceHold;

completeSauceHold =
    function (name) {
        day1OriginalCompleteSauceHold(
            name
        );

        if (
            day1TutorialActive() &&
            Number(game.customerNumber) === 2 &&
            day1TutorialStep === "ketchup" &&
            name === "Ketchup" &&
            game.selectedIngredients.includes(
                "Ketchup"
            )
        ) {
            setDay1TutorialStep(
                "serve"
            );
        }
    };


const day1OriginalCancelActiveSauceHold =
    cancelActiveSauceHold;

cancelActiveSauceHold =
    function () {
        const wasTutorialKetchup =
            day1TutorialActive() &&
            Number(game.customerNumber) === 2 &&
            day1TutorialStep === "ketchup" &&
            activeSauceHold?.name === "Ketchup" &&
            !activeSauceHold?.completed;

        day1OriginalCancelActiveSauceHold();

        if (wasTutorialKetchup) {
            const feedback =
                document.getElementById(
                    "ingredient-feedback"
                );

            if (feedback) {
                feedback.textContent =
                    "Chưa đủ đâu 😭 Giữ chai Ketchup đến khi vòng tròn đầy nhé!";
            }

            remindDay1Tutorial();
        }
    };


const day1OriginalOpenRecipeBook =
    openRecipeBook;

openRecipeBook =
    function () {
        if (
            day1TutorialActive() &&
            (
                Number(game.customerNumber) !== 2 ||
                day1TutorialStep !== "recipe"
            )
        ) {
            remindDay1Tutorial();
            return;
        }

        day1OriginalOpenRecipeBook();

        if (
            day1TutorialActive() &&
            Number(game.customerNumber) === 2
        ) {
            setDay1TutorialStep(
                "recipe-read"
            );
        }
    };


// Nút đóng sổ đã bind hàm closeRecipeBook cũ từ trước,
// nên chuyển tutorial step trực tiếp ở chính button.
closeRecipeButton.addEventListener(
    "click",
    () => {
        if (
            day1TutorialActive() &&
            Number(game.customerNumber) === 2 &&
            day1TutorialStep === "recipe-read"
        ) {
            setDay1TutorialStep(
                "bread"
            );
        }
    }
);


// Click nền modal cũng đóng sổ.
recipeModal.addEventListener(
    "click",
    event => {
        if (
            event.target === recipeModal &&
            day1TutorialActive() &&
            Number(game.customerNumber) === 2 &&
            day1TutorialStep === "recipe-read"
        ) {
            setDay1TutorialStep(
                "bread"
            );
        }
    }
);


// Chỉ chặn Giao bánh trước khi tutorial tới bước serve.
// Khi giao đúng, flow reaction gốc sẽ TỰ đưa khách kế tiếp tới.
const day1OriginalServeBread =
    serveBread;

serveBread =
    function () {
        if (
            day1TutorialActive() &&
            day1TutorialStep !== "serve"
        ) {
            remindDay1Tutorial();
            return;
        }

        return day1OriginalServeBread();
    };


// Chặn click nguyên liệu sai bước.
document.addEventListener(
    "click",
    event => {
        if (
            !day1TutorialActive() ||
            day1TutorialOverlayOpen() ||
            game.phase !== "making"
        ) {
            return;
        }

        const stationButton =
            event.target.closest(
                ".station-item"
            );

        if (!stationButton) {
            return;
        }

        const breadName =
            stationButton.dataset
                .ingredient;

        const drinkName =
            stationButton.dataset
                .drinkIngredient;

        const expectedBread = {
            bread: "Bánh mì",
            pate: "Pâté",
            egg: "Trứng",
            cucumber: "Dưa leo",
            rau: "Rau"
        }[
            day1TutorialStep
        ];

        const expectedDrink = {
            cup: "Cốc",
            tea: "Trà tắc",
            ice: "Đá",
            topping: "Thạch cá"
        }[
            day1TutorialStep
        ];

        const correctTarget =
            (
                expectedBread &&
                breadName === expectedBread
            ) ||
            (
                expectedDrink &&
                drinkName === expectedDrink
            );

        if (!correctTarget) {
            event.preventDefault();
            event.stopImmediatePropagation();
            remindDay1Tutorial();
        }
    },
    true
);


// Chặn giữ nhầm chai sốt.
document.addEventListener(
    "pointerdown",
    event => {
        if (
            !day1TutorialActive() ||
            day1TutorialOverlayOpen() ||
            game.phase !== "making"
        ) {
            return;
        }

        const stationButton =
            event.target.closest(
                ".station-item"
            );

        if (!stationButton) {
            return;
        }

        const name =
            stationButton.dataset
                .ingredient;

        const drinkName =
            stationButton.dataset
                .drinkIngredient;

        const drinkData =
            drinkName
                ? drinkIngredients?.[
                    drinkName
                ]
                : null;

        const wrongSauceHold =
            sauceSlots.includes(name) &&
            (
                Number(game.customerNumber) !== 2 ||
                day1TutorialStep !== "ketchup" ||
                name !== "Ketchup"
            );

        const wrongTeaHold =
            drinkData?.type === "tea" &&
            (
                Number(game.customerNumber) !== 3 ||
                day1TutorialStep !== "tea" ||
                drinkName !== "Trà chanh"
            );

        if (
            wrongSauceHold ||
            wrongTeaHold
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            remindDay1Tutorial();
        }
    },
    true
);


// Pause / popup: bubble phải biến mất.
// Chỉ phản ứng khi trạng thái overlay THẬT SỰ đổi.
// Không phản ứng với việc chính tutorial coach được add/remove,
// nếu không sẽ tạo vòng lặp remove -> add -> observer -> remove...
let day1OverlayWasOpen =
    day1TutorialOverlayOpen();

const day1OverlayObserver =
    new MutationObserver(
        () => {
            const isOpen =
                day1TutorialOverlayOpen();

            if (
                isOpen ===
                day1OverlayWasOpen
            ) {
                return;
            }

            day1OverlayWasOpen =
                isOpen;

            if (isOpen) {
                clearDay1TutorialUI();
                return;
            }

            if (day1TutorialActive()) {
                requestAnimationFrame(
                    updateDay1TutorialCoach
                );
            }
        }
    );

day1OverlayObserver.observe(
    document.body,
    {
        childList: true,
        subtree: false
    }
);


// Về sảnh cũng không để bubble treo.
const day1OriginalShowHome =
    showHome;

showHome =
    function () {
        clearDay1TutorialUI();
        return day1OriginalShowHome();
    };


// Bất cứ khi nào rời màn làm bánh về Prep / Day End,
// không để bong bóng tutorial treo trên UI cũ.
const day1OriginalShowPrep =
    showPrep;

showPrep =
    function () {
        clearDay1TutorialUI();
        return day1OriginalShowPrep();
    };


const day1OriginalRenderDayEnd =
    renderDayEnd;

renderDayEnd =
    function () {
        clearDay1TutorialUI();
        return day1OriginalRenderDayEnd();
    };


window.addEventListener(
    "resize",
    () => {
        if (day1TutorialActive()) {
            updateDay1TutorialCoach();
        }
    }
);


loadDay1TutorialState();

if (game.day === 1) {
    game.customersToday = 4;

    if (
        game.shopOpen &&
        game.phase === "making" &&
        !day1TutorialStep
    ) {
        day1TutorialStep =
            Number(game.customerNumber) === 2
                ? "recipe"
                : "bread";

        saveDay1TutorialState();
    }

    requestAnimationFrame(
        updateDay1TutorialCoach
    );
}


// ======================================================
// DRINK STATION / BÁN NƯỚC
// Added 2026-09-27
//
// Mỗi customer ticket có thể gồm:
// - bánh mì hiện tại
// - 1 ly trà chanh hoặc trà tắc
// - luôn có đá
// - tối đa 1 topping
//
// Day 1 giữ nguyên tutorial bánh mì, bắt đầu có order nước từ Day 2.
// Toàn bộ counter + workspace + quầy nguyên liệu trượt ngang cùng nhau.
// ======================================================

const DRINK_FEATURE_SAVE_KEY =
    "mot-o-nha-drinks-v1";

const DRINK_ORDER_CHANCE = 0.58;
const DRINK_TOPPING_CHANCE = 0.72;

const drinkIngredients = {
    "Cốc": {
        key: "coc",
        tableImage: "images/coc.png",
        image: "images/drinks/coc.png",
        unlocked: true,
        unlockPrice: 0,
        salePrice: 0,
        stock: 12,
        restock: 6,
        restockPrice: 4000,
        type: "cup"
    },

    "Đá": {
        key: "da",
        tableImage: "images/da.png",
        image: "images/drinks/da.png",
        unlocked: true,
        unlockPrice: 0,
        salePrice: 0,
        stock: 18,
        restock: 10,
        restockPrice: 3000,
        type: "ice"
    },

    "Trà chanh": {
        key: "tra-chanh",
        tableImage: "images/tra-chanh.png",
        image: "images/drinks/tra-chanh.png",
        unlocked: true,
        unlockPrice: 0,
        salePrice: 6000,
        stock: 10,
        restock: 5,
        restockPrice: 5000,
        type: "tea"
    },

    "Trà tắc": {
        key: "tra-tac",
        tableImage: "images/tra-tac.png",
        image: "images/drinks/tra-tac.png",
        unlocked: false,
        unlockPrice: 30000,
        salePrice: 7000,
        stock: 0,
        restock: 5,
        restockPrice: 5000,
        type: "tea"
    },

    "Thạch cá": {
        key: "thach-ca",
        tableImage: "images/thach-ca.png",
        image: "images/drinks/thach-ca.png",
        unlocked: true,
        unlockPrice: 0,
        salePrice: 2000,
        stock: 8,
        restock: 5,
        restockPrice: 5000,
        type: "topping"
    },

    "Thạch dừa": {
        key: "thach-dua",
        tableImage: "images/thach-dua.png",
        image: "images/drinks/thach-dua.png",
        unlocked: false,
        unlockPrice: 20000,
        salePrice: 2500,
        stock: 0,
        restock: 5,
        restockPrice: 4500,
        type: "topping"
    },

    "Trân châu trắng": {
        key: "tc-trang",
        tableImage: "images/tc-trang.png",
        image: "images/drinks/tc-trang.png",
        unlocked: false,
        unlockPrice: 35000,
        salePrice: 3000,
        stock: 0,
        restock: 5,
        restockPrice: 5000,
        type: "topping"
    },

    "Trân châu đen": {
        key: "tc-den",
        tableImage: "images/tc-den.png",
        image: "images/drinks/tc-den.png",
        unlocked: false,
        unlockPrice: 45000,
        salePrice: 4000,
        stock: 0,
        restock: 5,
        restockPrice: 5000,
        type: "topping"
    }
};

const drinkTeaNames = [
    "Trà chanh",
    "Trà tắc"
];

const drinkToppingNames = [
    "Thạch cá",
    "Thạch dừa",
    "Trân châu trắng",
    "Trân châu đen"
];

const drinkStationLayout = [
    ["Thạch cá", "drink-r1c1"],
    ["Thạch dừa", "drink-r1c2"],
    ["Trân châu trắng", "drink-r1c3"],
    ["Trân châu đen", "drink-r1c4"],
    ["Trà tắc", "drink-tea-1"],
    ["Trà chanh", "drink-tea-2"],
    ["Đá", "drink-ice"],
    ["Cốc", "drink-cups"]
];

let drinkBuild = {
    cup: false,
    tea: null,
    ice: false,
    topping: null
};

let drinkStationView =
    "bread";


const DRINK_TEA_HOLD_MS = 2000;

const pourSound =
    new Audio(
        "audio/pour.mp3"
    );

pourSound.volume = 0.48;
pourSound.loop = true;
pourSound.preload = "auto";

try {
    pourSound.load();
} catch {}


let activeDrinkTeaHold = null;


function startPourSound() {
    try {
        pourSound.pause();
        pourSound.currentTime = 0;
    } catch {}

    pourSound
        .play()
        .catch(() => {});
}


function stopPourSound() {
    try {
        pourSound.pause();
        pourSound.currentTime = 0;
    } catch {}
}


function resetDrinkBuild() {
    drinkBuild = {
        cup: false,
        tea: null,
        ice: false,
        topping: null
    };
}


function loadDrinkFeatureState() {
    try {
        const saved =
            JSON.parse(
                localStorage.getItem(
                    DRINK_FEATURE_SAVE_KEY
                ) || "{}"
            );

        if (
            saved.stock &&
            typeof saved.stock === "object"
        ) {
            Object.entries(
                drinkIngredients
            ).forEach(
                ([name, data]) => {
                    const amount =
                        Number(
                            saved.stock[name]
                        );

                    if (
                        Number.isFinite(amount) &&
                        amount >= 0
                    ) {
                        data.stock =
                            Math.floor(amount);
                    }
                }
            );
        }

        if (
            saved.unlocked &&
            typeof saved.unlocked === "object"
        ) {
            Object.entries(
                drinkIngredients
            ).forEach(
                ([name, data]) => {
                    if (
                        name === "Cốc" ||
                        name === "Đá" ||
                        name === "Trà chanh" ||
                        name === "Thạch cá"
                    ) {
                        data.unlocked = true;
                        return;
                    }

                    if (
                        typeof saved.unlocked[name] ===
                            "boolean"
                    ) {
                        data.unlocked =
                            saved.unlocked[name];
                    }
                }
            );
        }

        if (
            saved.build &&
            typeof saved.build === "object"
        ) {
            drinkBuild = {
                cup:
                    saved.build.cup === true,

                tea:
                    drinkTeaNames.includes(
                        saved.build.tea
                    )
                        ? saved.build.tea
                        : null,

                ice:
                    saved.build.ice === true,

                topping:
                    drinkToppingNames.includes(
                        saved.build.topping
                    )
                        ? saved.build.topping
                        : null
            };
        }

    } catch (error) {
        console.warn(
            "Không đọc được save quầy nước:",
            error
        );
    }
}


function saveDrinkFeatureState() {
    try {
        const stock = {};
        const unlocked = {};

        Object.entries(
            drinkIngredients
        ).forEach(
            ([name, data]) => {
                stock[name] =
                    Math.max(
                        0,
                        Number(data.stock) || 0
                    );

                unlocked[name] =
                    data.unlocked !== false;
            }
        );

        localStorage.setItem(
            DRINK_FEATURE_SAVE_KEY,
            JSON.stringify({
                stock,
                unlocked,
                build: {
                    ...drinkBuild
                }
            })
        );

    } catch (error) {
        console.warn(
            "Không lưu được quầy nước:",
            error
        );
    }
}


loadDrinkFeatureState();

// Drink inventory must be loaded before the first day checkpoint is saved.
const existingDayCheckpoint = loadDayStartCheckpoint();
if (!existingDayCheckpoint) {
    saveDayStartCheckpoint();
} else if (!existingDayCheckpoint.drinkIngredients) {
    // Older day checkpoints contain bread stock only. Preserve their original
    // money/bread snapshot and establish a drink baseline at upgrade time.
    existingDayCheckpoint.drinkIngredients = snapshotDrinkIngredients();
    existingDayCheckpoint.drinkSnapshotMigrated = true;
    try {
        localStorage.setItem(
            DAY_START_KEY,
            JSON.stringify(existingDayCheckpoint)
        );
    } catch (error) {
        console.warn("Không bổ sung được kho nước vào checkpoint cũ:", error);
    }
}

const drinkFeatureOriginalSaveGame =
    saveGame;

saveGame = function () {
    drinkFeatureOriginalSaveGame();
    saveDrinkFeatureState();
};

window.addEventListener(
    "beforeunload",
    saveDrinkFeatureState
);


function drinkDisplayName(order) {
    if (!order) return "";

    return (
        `${order.tea}${order.ice ? " đá" : ""}` +
        (
            order.topping
                ? ` với ${order.topping}`
                : ""
        )
    );
}


function drinkRequiredItems(order) {
    if (!order) return [];

    const list = [
        "Cốc",
        "Đá",
        order.tea
    ];

    if (order.topping) {
        list.push(order.topping);
    }

    return list;
}


function drinkOrderPrice(order) {
    if (!order) return 0;

    const teaPrice =
        Math.max(
            0,
            Number(
                drinkIngredients[
                    order.tea
                ]?.salePrice
            ) || 0
        );

    const toppingPrice =
        order.topping
            ? Math.max(
                0,
                Number(
                    drinkIngredients[
                        order.topping
                    ]?.salePrice
                ) || 0
            )
            : 0;

    return (
        teaPrice +
        toppingPrice
    );
}


function reservedDrinkStock(
    ignoreTicketId = null
) {
    const reserved = {};

    for (
        const ticket of
        game.waitingCustomers || []
    ) {
        if (
            ignoreTicketId &&
            ticket.id === ignoreTicketId
        ) {
            continue;
        }

        for (
            const name of
            drinkRequiredItems(
                ticket.drinkOrder
            )
        ) {
            reserved[name] =
                (
                    reserved[name] || 0
                ) + 1;
        }
    }

    return reserved;
}


function canReserveDrinkOrder(
    order,
    ignoreTicketId = null
) {
    const reserved =
        reservedDrinkStock(
            ignoreTicketId
        );

    return drinkRequiredItems(order)
        .every(name => {
            const data =
                drinkIngredients[name];

            if (
                !data ||
                data.unlocked === false
            ) {
                return false;
            }

            return (
                data.stock -
                (
                    reserved[name] || 0
                )
            ) > 0;
        });
}


function createRandomDrinkOrder(
    ignoreTicketId = null
) {
    if (
        game.day <= 1 ||
        Math.random() >
            DRINK_ORDER_CHANCE
    ) {
        return null;
    }

    const availableTeas =
        drinkTeaNames.filter(
            tea =>
                canReserveDrinkOrder(
                    {
                        tea,
                        ice: true,
                        topping: null
                    },
                    ignoreTicketId
                )
        );

    if (!availableTeas.length) {
        return null;
    }

    const tea =
        randomItem(
            availableTeas
        );

    let topping = null;

    if (
        Math.random() <
            DRINK_TOPPING_CHANCE
    ) {
        const possibleToppings =
            drinkToppingNames.filter(
                name =>
                    canReserveDrinkOrder(
                        {
                            tea,
                            ice: true,
                            topping: name
                        },
                        ignoreTicketId
                    )
            );

        if (possibleToppings.length) {
            topping =
                randomItem(
                    possibleToppings
                );
        }
    }

    const order = {
        tea,
        ice: true,
        topping
    };

    order.price =
        drinkOrderPrice(order);

    return (
        canReserveDrinkOrder(
            order,
            ignoreTicketId
        )
            ? order
            : null
    );
}


function appendDrinkToTicketNote(
    ticket
) {
    if (!ticket?.drinkOrder) {
        return;
    }

    const speech =
        CUSTOMER_SPEECH[
            ticket.customer
        ] || {
            self: "mình",
            you: ""
        };

    const self =
        speech.self || "mình";

    const drinkText =
        drinkDisplayName(
            ticket.drinkOrder
        );

    ticket.note =
        `${ticket.note} Với lại cho ${self} một ly ${drinkText.toLowerCase()} nữa nha!`;
}


function syncDrinkOrderFromTicket(
    ticket
) {
    if (!ticket) return;

    game.currentDrinkOrder =
        ticket.drinkOrder || null;
}


const drinkFeatureOriginalCreateWaitingTicket =
    createWaitingTicket;

createWaitingTicket =
    function () {
        const ticket =
            drinkFeatureOriginalCreateWaitingTicket();

        if (!ticket) {
            return ticket;
        }

        if (
            !ticket.drinkOrder
        ) {
            ticket.drinkOrder =
                createRandomDrinkOrder(
                    ticket.id
                );

            if (ticket.drinkOrder) {
                appendDrinkToTicketNote(
                    ticket
                );

                ensureDrinkPatienceBonus(
                    ticket
                );
            }
        }

        if (
            ticket.id ===
            game.activeTicketId
        ) {
            game.orderNote =
                ticket.note;

            syncDrinkOrderFromTicket(
                ticket
            );
        }

        saveGame();

        return ticket;
    };


const drinkFeatureOriginalSetActiveTicket =
    setActiveTicket;

setActiveTicket =
    function (ticket) {
        drinkFeatureOriginalSetActiveTicket(
            ticket
        );

        ensureDrinkPatienceBonus(
            ticket
        );

        syncDrinkOrderFromTicket(
            ticket
        );
    };


function currentDrinkOrder() {
    return (
        activeTicket()
            ?.drinkOrder ||
        game.currentDrinkOrder ||
        null
    );
}


function ensureDrinkPatienceBonus(
    ticket
) {
    if (
        !ticket?.drinkOrder ||
        ticket.drinkPatienceBonusApplied
    ) {
        return;
    }

    const currentTotal =
        Math.max(
            1,
            Number(ticket.totalPatienceMs) ||
                getCustomerPatienceMs()
        );

    const currentRemaining =
        Math.max(
            0,
            Number(ticket.remainingMs) ||
                currentTotal
        );

    ticket.totalPatienceMs =
        currentTotal + 10000;

    ticket.remainingMs =
        Math.min(
            ticket.totalPatienceMs,
            currentRemaining + 10000
        );

    ticket.drinkPatienceBonusApplied =
        true;
}


function drinkOrderIsCorrect(
    order
) {
    if (!order) return true;

    return (
        drinkBuild.cup === true &&
        drinkBuild.tea ===
            order.tea &&
        drinkBuild.ice ===
            Boolean(order.ice) &&
        drinkBuild.topping ===
            (order.topping || null)
    );
}


function showDrinkFeedback(
    message
) {
    const element =
        document.getElementById(
            "drink-feedback"
        );

    if (element) {
        element.textContent =
            message;
    }
}


function renderDrinkCup() {
    const stage =
        document.getElementById(
            "drink-cup-stage"
        );

    if (!stage) return;

    if (!drinkBuild.cup) {
        stage.innerHTML = "";
        return;
    }

    const teaLayer =
        drinkBuild.tea
            ? `
                <img
                    class="drink-cup-layer drink-tea-layer"
                    src="${
                        drinkIngredients[
                            drinkBuild.tea
                        ].image
                    }"
                    draggable="false"
                    alt=""
                >
            `
            : "";

    const iceLayer =
        drinkBuild.ice
            ? `
                <img
                    class="drink-cup-layer drink-ice-layer"
                    src="${
                        drinkIngredients[
                            "Đá"
                        ].image
                    }"
                    draggable="false"
                    alt=""
                >
            `
            : "";

    const toppingLayer =
        drinkBuild.topping
            ? `
                <img
                    class="
                        drink-cup-layer
                        drink-topping-layer
                        drink-topping-${drinkIngredients[drinkBuild.topping].key}
                    "
                    src="${
                        drinkIngredients[
                            drinkBuild.topping
                        ].image
                    }"
                    draggable="false"
                    alt=""
                >
            `
            : "";

    stage.innerHTML = `
        <img
            class="drink-cup-layer drink-cup-back"
            src="images/drinks/coc-back.png"
            draggable="false"
            alt=""
        >

        ${iceLayer}
        ${teaLayer}
        ${toppingLayer}

        <img
            class="drink-cup-layer drink-cup-front"
            src="images/drinks/coc-front.png"
            draggable="false"
            alt="Cốc nước"
        >
    `;
}


function drinkStationButtonHTML(
    name,
    positionClass,
    mode
) {
    const data =
        drinkIngredients[name];

    const selected =
        (
            name === "Cốc" &&
            drinkBuild.cup
        ) ||
        (
            name === "Đá" &&
            drinkBuild.ice
        ) ||
        (
            data.type === "tea" &&
            drinkBuild.tea === name
        ) ||
        (
            data.type === "topping" &&
            drinkBuild.topping === name
        );

    const locked =
        data.unlocked === false;

    const outOfStock =
        !locked &&
        data.stock <= 0;

    const disabled =
        mode === "making" &&
        (
            locked ||
            outOfStock
        );

    return `
        <button
            class="
                station-item
                drink-station-item
                ${positionClass}
                ${selected ? "selected" : ""}
                ${locked ? "locked" : ""}
                ${outOfStock ? "out-of-stock" : ""}
                ${disabled ? "station-disabled" : ""}
            "
            type="button"
            data-drink-ingredient="${name}"
            ${disabled ? "disabled" : ""}
            title="${
                mode === "prep"
                    ? locked
                        ? `${name} • Mở khóa ${formatMoney(data.unlockPrice)}`
                        : `${name} • Còn ${data.stock} • Nhập +${data.restock}`
                    : locked
                        ? `${name} • Chưa mở khóa`
                        : `${name} • Còn ${data.stock}`
            }"
        >
            <img
                src="${data.tableImage}"
                draggable="false"
                alt="${name}"
            >

            ${
                locked
                    ? `
                        <span class="lock-overlay">
                            🔒
                            <small>
                                ${formatMoney(data.unlockPrice)}
                            </small>
                        </span>
                    `
                    : stockBadgeHTML(
                        data.stock
                    )
            }

            ${
                data.type === "tea"
                    ? `
                        <span class="drink-hold-ring">
                            <span class="drink-hold-ring-inner">
                                GIỮ
                            </span>
                        </span>
                    `
                    : ""
            }

            ${
                outOfStock
                    ? `
                        <span class="sold-out-overlay">
                            HẾT
                        </span>
                    `
                    : ""
            }
        </button>
    `;
}


function createDrinkPourPreview(
    name
) {
    const stage =
        document.getElementById(
            "drink-cup-stage"
        );

    const data =
        drinkIngredients[name];

    if (
        !stage ||
        !data
    ) {
        return null;
    }

    const preview =
        document.createElement(
            "img"
        );

    preview.className =
        "drink-cup-layer drink-tea-layer drink-pour-live-reveal";

    preview.src =
        data.image;

    preview.alt = "";
    preview.draggable = false;

    preview.style.clipPath =
        "inset(100% 0 0 0)";

    stage.appendChild(
        preview
    );

    return preview;
}


function updateDrinkPourPreview(
    preview,
    progress
) {
    if (!preview) return;

    const hiddenFromTop =
        Math.max(
            0,
            Math.min(
                100,
                (1 - progress) * 100
            )
        );

    preview.style.clipPath =
        `inset(${hiddenFromTop}% 0 0 0)`;
}


function cancelActiveDrinkTeaHold() {
    if (!activeDrinkTeaHold) {
        stopPourSound();
        return;
    }

    if (
        activeDrinkTeaHold.frameId
    ) {
        cancelAnimationFrame(
            activeDrinkTeaHold.frameId
        );
    }

    activeDrinkTeaHold
        .previewLayer
        ?.remove();

    const button =
        activeDrinkTeaHold.button;

    button?.classList.remove(
        "is-holding-drink"
    );

    button?.style.setProperty(
        "--drink-hold-angle",
        "0deg"
    );

    stopPourSound();

    activeDrinkTeaHold = null;
}


function completeDrinkTeaHold(
    name
) {
    if (
        !activeDrinkTeaHold ||
        activeDrinkTeaHold.completed
    ) {
        return;
    }

    const hold =
        activeDrinkTeaHold;

    hold.completed = true;

    if (hold.frameId) {
        cancelAnimationFrame(
            hold.frameId
        );
    }

    stopPourSound();

    hold.previewLayer?.remove();

    hold.button.classList.remove(
        "is-holding-drink"
    );

    hold.button.style.setProperty(
        "--drink-hold-angle",
        "360deg"
    );

    activeDrinkTeaHold = null;

    drinkBuild.tea =
        name;

    renderDrinkCup();

    renderDrinkStationItems(
        "making"
    );

    showDrinkFeedback(
        `✓ Đã rót ${name}`
    );

    if (
        day1TutorialActive() &&
        Number(game.customerNumber) === 3 &&
        day1TutorialStep === "tea" &&
        name === "Trà chanh"
    ) {
        setDay1TutorialStep(
            "topping"
        );
    }

    saveGame();
}


function startDrinkTeaHold(
    button,
    name,
    pointerId
) {
    const data =
        drinkIngredients[name];

    if (
        !data ||
        data.unlocked === false ||
        data.type !== "tea" ||
        data.stock <= 0
    ) {
        return;
    }

    if (!drinkBuild.cup) {
        showCutePopup({
            icon: "🥤",
            title: "Lấy cốc trước nha!",
            message:
                "Phải lấy một chiếc cốc rồi mới rót trà được.",
            confirmText: "Okii"
        });

        return;
    }

    if (
        drinkBuild.tea === name
    ) {
        showDrinkFeedback(
            `✓ Trong cốc đã có ${name}`
        );
        return;
    }

    cancelActiveDrinkTeaHold();

    try {
        button.setPointerCapture(
            pointerId
        );
    } catch {}

    button.classList.add(
        "is-holding-drink"
    );

    button.style.setProperty(
        "--drink-hold-angle",
        "0deg"
    );

    const previewLayer =
        createDrinkPourPreview(
            name
        );

    const startedAt =
        performance.now();

    activeDrinkTeaHold = {
        button,
        name,
        pointerId,
        previewLayer,
        startedAt,
        frameId: null,
        completed: false
    };

    startPourSound();

    showDrinkFeedback(
        `Giữ ${name} đủ 2 giây để rót...`
    );

    const animate =
        now => {
            if (
                !activeDrinkTeaHold ||
                activeDrinkTeaHold.button !==
                    button ||
                activeDrinkTeaHold.completed
            ) {
                return;
            }

            const progress =
                Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            now -
                            startedAt
                        ) /
                        DRINK_TEA_HOLD_MS
                    )
                );

            button.style.setProperty(
                "--drink-hold-angle",
                `${progress * 360}deg`
            );

            updateDrinkPourPreview(
                previewLayer,
                progress
            );

            if (progress >= 1) {
                completeDrinkTeaHold(
                    name
                );
                return;
            }

            activeDrinkTeaHold.frameId =
                requestAnimationFrame(
                    animate
                );
        };

    activeDrinkTeaHold.frameId =
        requestAnimationFrame(
            animate
        );
}


function bindDrinkTeaHold(
    button,
    name
) {
    button.addEventListener(
        "contextmenu",
        event =>
            event.preventDefault()
    );

    button.addEventListener(
        "pointerdown",
        event => {
            if (
                event.pointerType ===
                    "mouse" &&
                event.button !== 0
            ) {
                return;
            }

            event.preventDefault();

            startDrinkTeaHold(
                button,
                name,
                event.pointerId
            );
        }
    );

    const stopHold =
        (
            event,
            allowTapHint = false
        ) => {
            if (
                activeDrinkTeaHold &&
                activeDrinkTeaHold.button ===
                    button &&
                (
                    event.pointerId ===
                        undefined ||
                    event.pointerId ===
                        activeDrinkTeaHold
                            .pointerId
                )
            ) {

                const elapsed =
                    performance.now() -
                    activeDrinkTeaHold
                        .startedAt;


                const quickTap =
                    allowTapHint &&
                    elapsed < 350;


                cancelActiveDrinkTeaHold();


                if (quickTap) {
                    showHoldTapHint(
                        button
                    );
                }
            }
        };

    button.addEventListener(
        "pointerup",
        event =>
            stopHold(
                event,
                true
            )
    );

    button.addEventListener(
        "pointercancel",
        event =>
            stopHold(
                event,
                false
            )
    );

    button.addEventListener(
        "lostpointercapture",
        event =>
            stopHold(
                event,
                false
            )
    );
}


function renderDrinkStationItems(
    mode
) {
    const station =
        document.getElementById(
            "drink-station-items"
        );

    if (!station) return;

    station.innerHTML =
        drinkStationLayout
            .map(
                ([name, position]) =>
                    drinkStationButtonHTML(
                        name,
                        position,
                        mode
                    )
            )
            .join("");

    station
        .querySelectorAll(
            ".drink-station-item"
        )
        .forEach(button => {
            // Giữ số lượng stock luôn nằm trên sprite,
            // kể cả sprite bình trà có vùng ảnh lớn/transparent.
            const badge =
                button.querySelector(
                    ".stock-badge"
                );

            const sprite =
                button.querySelector(
                    "img"
                );

            if (sprite) {
                sprite.style.position =
                    "relative";
                sprite.style.zIndex =
                    "1";
            }

            if (badge) {
                badge.style.position =
                    "absolute";
                badge.style.zIndex =
                    "999";
                badge.style.pointerEvents =
                    "none";
            }

            const name =
                button.dataset
                    .drinkIngredient;

            const data =
                drinkIngredients[name];

            if (
                mode === "making" &&
                data?.type === "tea" &&
                !button.disabled
            ) {
                bindDrinkTeaHold(
                    button,
                    name
                );
            } else {
                button.addEventListener(
                    "pointerdown",
                    () => {
                        if (
                            mode === "making" &&
                            !button.disabled
                        ) {
                            primeIngredientSound(
                                `drink:${name}`
                            );
                        }
                    },
                    {
                        passive: true
                    }
                );
            }

            button.addEventListener(
                "click",
                event => {
                    if (mode === "prep") {
                        buyDrinkStock(name);
                        return;
                    }

                    // Trà chỉ được thêm bằng thao tác nhấn giữ 2 giây.
                    if (
                        data?.type === "tea"
                    ) {
                        event.preventDefault();
                        return;
                    }

                    handleDrinkStationClick(
                        name
                    );
                }
            );
        });
}


function buyDrinkIngredient(
    name
) {
    const data =
        drinkIngredients[name];

    if (
        !data ||
        data.unlocked !== false
    ) {
        return;
    }

    if (
        game.money <
        data.unlockPrice
    ) {
        showCutePopup({
            icon: "🔒",
            title:
                "Chưa đủ tiền rồi!",
            message:
                `Bạn cần ${formatMoney(data.unlockPrice)} để mở khóa ${name}.`,
            confirmText:
                "Okii"
        });

        return;
    }

    showCutePopup({
        icon: "🥤",
        title:
            `Mở khóa ${name}?`,
        message:
            `Mở nguyên liệu đồ uống mới với giá ${formatMoney(data.unlockPrice)}? Bạn sẽ nhận sẵn ${data.restock} phần để bắt đầu.`,
        confirmText:
            "Mở khóa ✨",
        cancelText:
            "Để sau",

        onConfirm: () => {
            game.money -=
                data.unlockPrice;

            game.dailyIngredientSpend +=
                data.unlockPrice;

            data.unlocked = true;
            data.stock =
                data.restock;

            moneyDisplay.textContent =
                formatMoney(
                    game.money
                );

            renderDrinkStationItems(
                "prep"
            );

            showPrepDeliveryMessage(
                `Anh đã mở khóa ${name} và giao ${data.restock} phần rồi!`
            );

            playOrderResultSound(
                true
            );

            saveGame();
        }
    });
}


function buyDrinkStock(name) {
    const data =
        drinkIngredients[name];

    if (!data) return;

    if (data.unlocked === false) {
        buyDrinkIngredient(
            name
        );
        return;
    }

    if (
        game.money <
        data.restockPrice
    ) {
        showCutePopup({
            icon: "🥤",
            title:
                "Chưa đủ tiền rồi!",
            message:
                `Bạn cần ${formatMoney(data.restockPrice)} để nhập thêm ${name}.`,
            confirmText:
                "Okii"
        });

        return;
    }

    showCutePopup({
        icon: "🥤",
        title:
            `Nhập thêm ${name}?`,
        message:
            `Hiện còn ${data.stock}. Nhập thêm ${data.restock} với giá ${formatMoney(data.restockPrice)}?`,
        confirmText:
            `Nhập +${data.restock}`,
        cancelText:
            "Để sau",

        onConfirm: () => {
            game.money -=
                data.restockPrice;

            game.dailyIngredientSpend +=
                data.restockPrice;

            data.stock +=
                data.restock;

            moneyDisplay.textContent =
                formatMoney(
                    game.money
                );

            renderDrinkStationItems(
                "prep"
            );

            showPrepDeliveryMessage(
                `Anh đã giao thêm ${data.restock} ${name}. Trong kho giờ có ${data.stock}!`
            );

            playOrderResultSound(
                true
            );

            saveGame();
        }
    });
}


function handleDrinkStationClick(
    name
) {
    const order =
        currentDrinkOrder();

    const data =
        drinkIngredients[name];

    if (
        !data ||
        data.unlocked === false ||
        data.stock <= 0
    ) {
        return;
    }

    if (name === "Cốc") {
        const wasSelected =
            drinkBuild.cup;

        if (wasSelected) {
            resetDrinkBuild();

            showDrinkFeedback(
                "↩ Đã đặt cốc lại"
            );
        } else {
            drinkBuild.cup = true;

            playIngredientSound(
                `drink:${name}`
            );

            showDrinkFeedback(
                "🥤 Đã lấy một cốc"
            );
        }

        renderDrinkCup();
        renderDrinkStationItems(
            "making"
        );
        saveGame();

        if (
            day1TutorialActive() &&
            Number(game.customerNumber) === 3 &&
            day1TutorialStep === "cup" &&
            drinkBuild.cup
        ) {
            setDay1TutorialStep(
                "ice"
            );
        }

        return;
    }

    if (!drinkBuild.cup) {
        showCutePopup({
            icon: "🥤",
            title: "Lấy cốc trước nha!",
            message:
                "Phải lấy một chiếc cốc rồi mới thêm trà, đá và topping được.",
            confirmText: "Okii"
        });

        return;
    }

    if (
        data.type === "tea"
    ) {
        // Trà được xử lý riêng bằng press-and-hold 2 giây.
        return;

    } else if (
        data.type === "ice"
    ) {
        drinkBuild.ice =
            !drinkBuild.ice;

        if (drinkBuild.ice) {
            playIngredientSound(
                `drink:${name}`
            );
        }

        showDrinkFeedback(
            drinkBuild.ice
                ? "🧊 Đã thêm đá"
                : "↩ Đã bỏ đá"
        );

    } else if (
        data.type === "topping"
    ) {
        const removing =
            drinkBuild.topping === name;

        drinkBuild.topping =
            removing
                ? null
                : name;

        if (!removing) {
            playIngredientSound(
                `drink:${name}`
            );
        }

        showDrinkFeedback(
            removing
                ? `↩ Đã bỏ ${name}`
                : `✓ Đã thêm ${name}`
        );
    }

    renderDrinkCup();

    renderDrinkStationItems(
        "making"
    );

    if (
        day1TutorialActive() &&
        Number(game.customerNumber) === 3
    ) {
        if (
            day1TutorialStep === "ice" &&
            name === "Đá" &&
            drinkBuild.ice
        ) {
            setDay1TutorialStep(
                "tea"
            );

        } else if (
            day1TutorialStep === "topping" &&
            name === "Thạch cá" &&
            drinkBuild.topping === "Thạch cá"
        ) {
            setDay1TutorialStep(
                "serve"
            );
        }
    }

    saveGame();
}


function setDrinkStationView(
    target,
    {
        animate = true
    } = {}
) {
    const shell =
        document.querySelector(
            ".work-slider-shell"
        );

    const track =
        shell?.querySelector(
            ".work-slider-track"
        );

    if (!shell || !track) {
        return;
    }

    drinkStationView =
        target === "drink"
            ? "drink"
            : "bread";

    shell.classList.toggle(
        "show-drinks",
        drinkStationView ===
            "drink"
    );

    if (!animate) {
        track.classList.add(
            "no-transition"
        );

        requestAnimationFrame(
            () => {
                requestAnimationFrame(
                    () => {
                        track.classList
                            .remove(
                                "no-transition"
                            );
                    }
                );
            }
        );
    }
}


function enhanceWorkAreaWithDrinks(
    mode
) {
    const makingScreen =
        document.querySelector(
            ".making-screen"
        );

    if (
        !makingScreen ||
        makingScreen.querySelector(
            ".work-slider-shell"
        )
    ) {
        return;
    }

    const workspace =
        makingScreen.querySelector(
            ".banhmi-workspace"
        );

    const station =
        makingScreen.querySelector(
            ".ingredient-station"
        );

    if (
        !workspace ||
        !station
    ) {
        return;
    }

    const shell =
        document.createElement(
            "div"
        );

    shell.className =
        "work-slider-shell";

    const track =
        document.createElement(
            "div"
        );

    track.className =
        "work-slider-track";

    const breadSide =
        document.createElement(
            "section"
        );

    breadSide.className =
        "work-slider-side work-slider-bread";

    const drinkSide =
        document.createElement(
            "section"
        );

    drinkSide.className =
        "work-slider-side work-slider-drink";

    workspace.parentNode.insertBefore(
        shell,
        workspace
    );

    shell.appendChild(track);
    track.append(
        breadSide,
        drinkSide
    );

    breadSide.append(
        workspace,
        station
    );

    const breadTableWrap =
        station.querySelector(
            ".ingredient-table-wrap"
        );

    if (breadTableWrap) {
        const nextButton =
            document.createElement(
                "button"
            );

        nextButton.type =
            "button";

        nextButton.className =
            "station-side-toggle station-side-toggle-next";

        nextButton.innerHTML =
            `<span>Đồ uống</span><strong>›</strong>`;

        nextButton.setAttribute(
            "aria-label",
            "Sang quầy đồ uống"
        );

        const lockDrinkSwitchForEarlyTutorial =
            mode === "making" &&
            typeof day1TutorialActive ===
                "function" &&
            day1TutorialActive() &&
            Number(game.customerNumber) < 3;

        if (
            lockDrinkSwitchForEarlyTutorial
        ) {
            nextButton.classList.add(
                "tutorial-blocked"
            );

            nextButton.setAttribute(
                "aria-disabled",
                "true"
            );
        }

        nextButton.addEventListener(
            "click",
            () => {
                if (
                    lockDrinkSwitchForEarlyTutorial
                ) {
                    if (
                        typeof remindDay1Tutorial ===
                            "function"
                    ) {
                        remindDay1Tutorial();
                    }

                    return;
                }

                setDrinkStationView(
                    "drink"
                );

                if (
                    typeof day1TutorialActive ===
                        "function" &&
                    day1TutorialActive() &&
                    Number(game.customerNumber) === 3 &&
                    day1TutorialStep ===
                        "switch-drink"
                ) {
                    setDay1TutorialStep(
                        "cup"
                    );
                }
            }
        );

        breadTableWrap.appendChild(
            nextButton
        );
    }

    drinkSide.innerHTML = `
        <div class="banhmi-workspace drink-workspace">
            <div class="drink-counter-stage">

                <img
                    class="cup-holder-image"
                    src="${skinById("cupHolder", selectedSkins.cupHolder).image}"
                    draggable="false"
                    alt="Khay đặt cốc"
                    onerror="this.style.display='none'"
                >

                <div
                    id="drink-cup-stage"
                    class="drink-cup-stage"
                ></div>

            </div>
        </div>

        <div class="ingredient-station drink-ingredient-station">

            <div class="drink-table-wrap">

                <img
                    class="drink-table-image"
                    src="${skinById("drinkTable", selectedSkins.drinkTable).image}"
                    draggable="false"
                    alt="Quầy nước"
                >

                <div
                    id="drink-station-items"
                ></div>

                <button
                    class="station-side-toggle station-side-toggle-prev"
                    type="button"
                    aria-label="Quay lại quầy bánh mì"
                >
                    <strong>‹</strong>
                    <span>Bánh mì</span>
                </button>

            </div>

            <div
                id="drink-feedback"
                class="ingredient-feedback drink-feedback"
            >
                ${
                    mode === "prep"
                        ? "Nhấn nguyên liệu nước để nhập hàng 🥤"
                        : currentDrinkOrder()
                            ? "Lấy cốc trước rồi pha đúng nước khách gọi 👆"
                            : "Có thể pha sẵn nước trong lúc chờ khách 🥤"
                }
            </div>

        </div>
    `;

    drinkSide
        .querySelector(
            ".station-side-toggle-prev"
        )
        ?.addEventListener(
            "click",
            () =>
                setDrinkStationView(
                    "bread"
                )
        );

    renderDrinkStationItems(
        mode
    );

    renderDrinkCup();

    setDrinkStationView(
        drinkStationView,
        {
            animate: false
        }
    );

    queueBoardFit();
}


function refreshOrderBubbleForDrink() {
    const order =
        currentDrinkOrder();

    const panel =
        document.getElementById(
            "customer-panel"
        );

    if (!panel || !order) {
        return;
    }

    const title =
        panel.querySelector(
            ".customer-bubble strong"
        );

    if (title) {
        title.textContent =
            `${game.currentRecipe.name} + ${drinkDisplayName(order)}`;
    }

    const note =
        document.getElementById(
            "customer-order-note"
        );

    const ticket =
        activeTicket();

    if (
        note &&
        ticket?.note
    ) {
        note.textContent =
            `“${ticket.note}”`;
    }
}


function refreshMainServeButtonForDrink() {
    if (
        game.phase !== "making"
    ) {
        return;
    }

    mainButton.textContent =
        currentDrinkOrder()
            ? "Giao đơn 🥖🥤"
            : "Giao bánh 🥖";
}


const drinkFeatureOriginalRenderMakingScreen =
    renderMakingScreen;

renderMakingScreen =
    function () {
        drinkFeatureOriginalRenderMakingScreen();

        refreshOrderBubbleForDrink();

        enhanceWorkAreaWithDrinks(
            "making"
        );

        refreshMainServeButtonForDrink();
    };


const drinkFeatureOriginalShowPrep =
    showPrep;

showPrep =
    function () {
        drinkStationView =
            "bread";

        resetDrinkBuild();

        drinkFeatureOriginalShowPrep();

        enhanceWorkAreaWithDrinks(
            "prep"
        );

        saveDrinkFeatureState();
    };


const drinkFeatureOriginalRenderWaitingScreen =
    renderWaitingScreen;

renderWaitingScreen =
    function () {
        drinkFeatureOriginalRenderWaitingScreen();

        enhanceWorkAreaWithDrinks(
            "making"
        );

        saveDrinkFeatureState();
    };


const drinkFeatureOriginalOpenShop =
    openShop;

openShop =
    function () {
        resetDrinkBuild();

        // Riêng ngày 1, lúc bắt đầu ngày phải luôn vào quầy bánh mì
        // dù người chơi vừa đứng ở quầy nước trong màn nhập hàng.
        if (game.day === 1) {
            drinkStationView =
                "bread";
        }

        saveDrinkFeatureState();

        return drinkFeatureOriginalOpenShop();
    };


function consumeDrinkBuildStock() {
    if (!drinkBuild.cup) {
        return;
    }

    const used = [
        "Cốc"
    ];

    if (drinkBuild.tea) {
        used.push(
            drinkBuild.tea
        );
    }

    if (drinkBuild.ice) {
        used.push(
            "Đá"
        );
    }

    if (drinkBuild.topping) {
        used.push(
            drinkBuild.topping
        );
    }

    used.forEach(name => {
        const data =
            drinkIngredients[name];

        if (!data) return;

        data.stock =
            Math.max(
                0,
                data.stock - 1
            );
    });
}


const drinkFeatureOriginalCompleteCustomerOrder =
    completeCustomerOrder;

completeCustomerOrder =
    function (correct) {
        const ticket =
            activeTicket();

        const drinkOrder =
            ticket?.drinkOrder || null;

        const totalPrice =
            game.currentRecipe
                ? game.currentRecipe.price +
                    (
                        drinkOrder
                            ? drinkOrder.price || 0
                            : 0
                    )
                : 0;

        if (drinkOrder) {
            consumeDrinkBuildStock();
        }

        drinkFeatureOriginalCompleteCustomerOrder(
            correct
        );

        if (
            correct &&
            drinkOrder
        ) {
            const drinkRevenue =
                drinkOrder.price || 0;

            game.money +=
                drinkRevenue;

            game.dailyRevenue +=
                drinkRevenue;

            realDaily =
                loadRealDailyData();

            realDaily.stats.revenue +=
                drinkRevenue;

            realDaily.stats.drinksSold =
                (
                    Number(
                        realDaily.stats
                            .drinksSold
                    ) || 0
                ) + 1;

            if (
                !realDaily.stats
                    .drinkIngredientSold ||
                typeof realDaily.stats
                    .drinkIngredientSold !==
                        "object"
            ) {
                realDaily.stats
                    .drinkIngredientSold = {};
            }

            [
                drinkOrder.tea,
                drinkOrder.topping
            ]
                .filter(Boolean)
                .forEach(name => {
                    realDaily.stats
                        .drinkIngredientSold[
                            name
                        ] =
                        (
                            realDaily.stats
                                .drinkIngredientSold[
                                    name
                                ] || 0
                        ) + 1;
                });

            saveRealDailyData(
                realDaily
            );

            const reaction =
                document.getElementById(
                    "customer-reaction"
                );

            if (reaction) {
                const speech =
                    getCustomerSpeech();

                reaction.textContent =
                    speech.you
                        ? `Cảm ơn ${speech.you} nha! +${formatMoney(totalPrice)} ✨`
                        : `Cảm ơn nha! +${formatMoney(totalPrice)} ✨`;

                const stars =
                    Number(
                        game.lastOrderStars
                    ) || 0;

                if (stars) {
                    reaction.textContent +=
                        ` ${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
                }
            }
        }

        if (drinkOrder) {
            resetDrinkBuild();
        }

        saveGame();
    };


const drinkFeatureOriginalServeBread =
    serveBread;

serveBread =
    function () {
        const order =
            currentDrinkOrder();

        if (!order) {
            return drinkFeatureOriginalServeBread();
        }

        if (!game.breadSelected) {
            return drinkFeatureOriginalServeBread();
        }

        if (!drinkBuild.cup) {
            showCutePopup({
                icon: "🥤",
                title:
                    "Thiếu nước rồi!",
                message:
                    `Khách còn gọi ${drinkDisplayName(order)} nữa. Sang quầy đồ uống và lấy cốc trước nha!`,
                confirmText:
                    "Pha nước"
            });

            setDrinkStationView(
                "drink"
            );

            return;
        }

        const correct =
            orderIsCorrect() &&
            drinkOrderIsCorrect(
                order
            );

        return completeCustomerOrder(
            correct
        );
    };


const drinkFeatureOriginalNextCustomer =
    nextCustomer;

nextCustomer =
    function () {
        game.currentDrinkOrder = null;
        saveDrinkFeatureState();

        const result =
            drinkFeatureOriginalNextCustomer();

        // Riêng tutorial ngày 1:
        // khách #3 kết thúc ở quầy nước,
        // nên khi khách #4 vừa xuất hiện thì trượt về quầy bánh mì.
        // Ngoài đúng transition này, vẫn giữ nguyên lựa chọn quầy của người chơi.
        if (
            game.day === 1 &&
            Number(game.customerNumber) === 4 &&
            typeof day1TutorialActive ===
                "function" &&
            day1TutorialActive()
        ) {
            requestAnimationFrame(
                () => {
                    setDrinkStationView(
                        "bread"
                    );
                }
            );
        }

        return result;
    };


const drinkFeatureOriginalRestartCurrentDay =
    restartCurrentDay;

restartCurrentDay =
    function () {
        resetDrinkBuild();
        saveDrinkFeatureState();

        return drinkFeatureOriginalRestartCurrentDay();
    };


const drinkFeatureOriginalResetGameSave =
    resetGameSave;

resetGameSave =
    function () {
        resetDrinkBuild();

        Object.assign(
            drinkIngredients["Cốc"],
            { stock: 12 }
        );

        Object.assign(
            drinkIngredients["Đá"],
            { stock: 18 }
        );

        Object.assign(
            drinkIngredients["Trà chanh"],
            { stock: 10 }
        );

        Object.assign(
            drinkIngredients["Trà tắc"],
            { stock: 10 }
        );

        drinkToppingNames.forEach(
            name => {
                drinkIngredients[name]
                    .stock = 8;
            }
        );

        saveDrinkFeatureState();

        return drinkFeatureOriginalResetGameSave();
    };


// Nếu đang resume một ticket có order nước,
// đồng bộ lại sau khi module được khởi tạo.
if (activeTicket()) {
    syncDrinkOrderFromTicket(
        activeTicket()
    );
}


// Đảm bảo ticket cũ đang chờ vẫn hợp lệ.
// Chỉ ticket mới từ Day 2 trở đi mới được roll order nước.
(game.waitingCustomers || [])
    .forEach(ticket => {
        if (
            ticket.drinkOrder &&
            !drinkTeaNames.includes(
                ticket.drinkOrder.tea
            )
        ) {
            ticket.drinkOrder = null;
        }
    });

saveDrinkFeatureState();


// Scale khay đặt cốc giống hệt cách thớt được fit vào workspace.
function fitDrinkCounterToWorkspace() {
    document
        .querySelectorAll(
            ".drink-workspace"
        )
        .forEach(workspace => {
            const stage =
                workspace.querySelector(
                    ".drink-counter-stage"
                );

            if (!stage) return;

            const scale =
                Math.min(
                    1,
                    (
                        workspace.clientWidth -
                        12
                    ) / 520,
                    (
                        workspace.clientHeight -
                        12
                    ) / 280
                );

            stage.style.transform =
                `scale(${Math.max(0, scale)})`;
        });
}

new MutationObserver(
    () =>
        requestAnimationFrame(
            fitDrinkCounterToWorkspace
        )
).observe(
    screen,
    {
        childList: true,
        subtree: true
    }
);

window.addEventListener(
    "resize",
    fitDrinkCounterToWorkspace
);

requestAnimationFrame(
    fitDrinkCounterToWorkspace
);


// ======================================================
// RECIPE BOOK - TAB ĐỒ UỐNG
// ======================================================

function enhanceRecipeBookWithDrinkTab() {
    if (
        recipeModal.classList.contains(
            "hidden"
        ) ||
        recipeList.querySelector(
            ".recipe-book-tabs"
        )
    ) {
        return;
    }

    const originalContent =
        recipeList.innerHTML;

    const drinkCards =
        Object.entries(
            drinkIngredients
        )
            .map(
                ([name, data]) => {
                    const locked =
                        data.unlocked === false;

                    const priceText =
                        data.type === "tea"
                            ? `Giá bán: ${formatMoney(data.salePrice)} / ly`
                            : data.type === "topping"
                                ? `Cộng thêm: +${formatMoney(data.salePrice)}`
                                : "Không tính thêm vào giá ly";

                    return `
                        <article
                            class="
                                drink-guide-card
                                ${locked ? "is-locked" : ""}
                            "
                        >
                            <div class="drink-guide-image-wrap">
                                <img
                                    src="${data.tableImage}"
                                    alt="${name}"
                                    draggable="false"
                                >

                                ${
                                    locked
                                        ? `
                                            <span class="drink-guide-lock">
                                                🔒
                                            </span>
                                        `
                                        : ""
                                }
                            </div>

                            <strong>${name}</strong>

                            <span class="drink-guide-price">
                                ${priceText}
                            </span>

                            ${
                                locked
                                    ? `
                                        <span class="drink-guide-unlock">
                                            Mở khóa ${formatMoney(data.unlockPrice)}
                                        </span>
                                    `
                                    : `
                                        <span class="drink-guide-owned">
                                            ✓ Đã mở khóa
                                        </span>
                                    `
                            }
                        </article>
                    `;
                }
            )
            .join("");

    recipeList.innerHTML = `
        <div class="recipe-book-tabs">
            <button
                class="recipe-book-tab active"
                type="button"
                data-recipe-tab="bread"
            >
                🥖 Bánh mì
            </button>

            <button
                class="recipe-book-tab"
                type="button"
                data-recipe-tab="drinks"
            >
                🥤 Đồ uống
            </button>
        </div>

        <div
            class="recipe-book-tab-panel"
            data-recipe-panel="bread"
        >
            ${originalContent}
        </div>

        <div
            class="recipe-book-tab-panel hidden"
            data-recipe-panel="drinks"
        >
            <div class="recipe-book-note">
                Giá một ly = giá trà + giá topping.
                Cốc và đá không tính thêm vào giá bán.
                Nguyên liệu đồ uống mới có thể mở khóa dần trong màn nhập hàng.
            </div>

            <div class="drink-guide-grid">
                ${drinkCards}
            </div>
        </div>
    `;

    const tabs =
        recipeList.querySelectorAll(
            "[data-recipe-tab]"
        );

    tabs.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const target =
                    button.dataset.recipeTab;

                tabs.forEach(tab =>
                    tab.classList.toggle(
                        "active",
                        tab === button
                    )
                );

                recipeList
                    .querySelectorAll(
                        "[data-recipe-panel]"
                    )
                    .forEach(panel => {
                        panel.classList.toggle(
                            "hidden",
                            panel.dataset
                                .recipePanel !==
                                target
                        );
                    });
            }
        );
    });
}


const drinkGuideOriginalOpenRecipeBook =
    openRecipeBook;

openRecipeBook =
    function () {
        drinkGuideOriginalOpenRecipeBook();

        if (
            !recipeModal.classList.contains(
                "hidden"
            )
        ) {
            enhanceRecipeBookWithDrinkTab();
        }
    };

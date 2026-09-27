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

const ingredientSound = new Audio("audio/ingredient.mp3");
ingredientSound.volume = 0.45;

function playIngredientSound() {
    ingredientSound.currentTime = 0;
    ingredientSound.play().catch(() => {});
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
const TUTORIAL_VERSION = "0.3.0";

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
        title: "Phục vụ thật nhanh!",
        caption:
            "Khách càng chờ lâu càng mất kiên nhẫn và đánh giá thấp hơn.\nPhục vụ chính xác, kiếm tiền và phát triển tiệm qua từng ngày!"
    }
];

let tutorialIndex = 0;

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
}

function openTutorial(startIndex = 0) {
    const refs = getTutorialRefs();
    if (!refs.modal) return;

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

    refs.modal.classList.add("hidden");
    document.body.classList.remove("tutorial-open");

    if (markSeen) {
    localStorage.setItem(
        TUTORIAL_SEEN_KEY,
        TUTORIAL_VERSION
    );
}
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
        openTutorial(0);
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
            closeTutorial(true);
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
// Giữ chai sốt đủ 3 giây để bóp sốt.
// Trong lúc giữ, sprite sốt được reveal từ trái sang phải.
// ======================================================

const SAUCE_HOLD_MS = 3000;

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
        price: 12000,
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
        price: 11000,
        weight: 16,
        ingredients: [
            "Pâté",
            "Rau"
        ]
    },

    {
        name: "Bánh mì bơ trứng",
        emoji: "🧈",
        price: 13000,
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
        price: 10000,
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
        price: 20000,
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
        price: 17000,
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
        price: 22000,
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
        price: 22000,
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
        price: 21000,
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
        price: 28000,
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
        price: 5000,
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
            ingredientSold: {}
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
        reward: 16000
    },

    {
        id: "serve-24",
        name: "Phục vụ đúng 24 khách",
        type: "orders",
        target: 24,
        reward: 22000
    },

    {
        id: "ingredient-pate-10",
        name: "Bán 10 bánh mì có Pâté",
        type: "ingredient",
        ingredient: "Pâté",
        target: 10,
        reward: 17000
    },

    {
        id: "ingredient-trung-8",
        name: "Bán 8 bánh mì có Trứng",
        type: "ingredient",
        ingredient: "Trứng",
        target: 8,
        reward: 16000
    },

    {
        id: "ingredient-rau-16",
        name: "Bán 16 bánh mì có Rau",
        type: "ingredient",
        ingredient: "Rau",
        target: 16,
        reward: 18000
    },

    {
        id: "ingredient-dua-leo-12",
        name: "Bán 12 bánh mì có Dưa leo",
        type: "ingredient",
        ingredient: "Dưa leo",
        target: 12,
        reward: 17000
    },

    {
        id: "revenue-180k",
        name: "Kiếm 180k doanh thu",
        type: "revenue",
        target: 180000,
        reward: 18000
    },

    {
        id: "revenue-250k",
        name: "Kiếm 250k doanh thu",
        type: "revenue",
        target: 250000,
        reward: 24000
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
    }

];


function getCollectionAchievementProgress(
    achievement
) {

    const types = [
        "recipe",
        "background",
        "board",
        "ingredientTable",
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
        message:
            "Tiền, kho hàng và nguyên liệu đã mở sẽ quay về đúng lúc bắt đầu ngày này. Mọi tiến độ trong ngày hiện tại sẽ bị bỏ.",
        cancelText: "Không",
        confirmText: "Chơi lại",

        onConfirm: () => {
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

            game.orderNote =
                "Cho mình một ổ như bình thường nha!";

            saveGame();
            showPrep();
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

const LATEST_VERSION = "0.3.1";

const LATEST_HIGHLIGHTS = [
    "Thêm nhiệm vụ ngày, Hoa Anh Đào thường trực và sự kiện Đêm Rằm Trung Thu.",
    "Tối ưu mạnh dung lượng hình ảnh, tốc độ tải game và hiệu năng trên điện thoại.",
    "Thêm cơ chế bóp sốt mới với nhấn giữ, thanh tiến trình, hiệu ứng và âm thanh riêng.",
    "Cập nhật hướng dẫn, cân bằng lượng khách.",
    "Cải thiện cân bằng lượng khách, hiệu năng và nhiều chi tiết giao diện.",
    "Thêm menu trang trí và hệ thống skin.",
    "Thêm menu nâng cấp và cải thiện giao diện khu chuẩn bị."
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

    return "Sẵn sàng vào tiệm";
}


// ======================================================
// RESUME
// ======================================================

function resumeGame() {

    if (!game.hasStarted) {

        game.hasStarted = true;
        game.shopOpen = false;
        showPrep();

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
        <img src="images/grab.png?v=2"
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
        event => {

            if (
                activeSauceHold &&
                activeSauceHold.button === button &&
                (
                    event.pointerId === undefined ||
                    event.pointerId ===
                        activeSauceHold.pointerId
                )
            ) {

                cancelActiveSauceHold();
            }
        };


    button.addEventListener(
        "pointerup",
        stopHold
    );

    button.addEventListener(
        "pointercancel",
        stopHold
    );

    button.addEventListener(
        "lostpointercapture",
        stopHold
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

        playIngredientSound();
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
        playIngredientSound();
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

        playIngredientSound();
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
                "Sửa bánh ✨"
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

    // Dừng đồng hồ kiên nhẫn trong lúc chuyển cảnh.
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
        `Chuẩn bị ngày ${game.day + 1} →`;


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

    saveGame();

    showPrep();
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
                        v0.3.0 ›
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
                     VERSION 0.3.1
                     ========================= -->

                <div class="update-entry">

                    <div class="update-entry-header">

                        <strong>
                            Phiên bản 0.3.1
                        </strong>

                        <div class="update-entry-meta">

                            <span class="current-version-badge">
                                Hiện tại
                            </span>

                            <span class="update-date">
                                27/09/2026
                            </span>

                        </div>

                    </div>

                    <ul>

                        <li>
                            Thêm màn hình tải game với thanh tiến trình,
                            giúp chuẩn bị trước các tài nguyên quan trọng
                            trước khi người chơi vào tiệm.
                        </li>

                        <li>
                            Tối ưu hệ thống tải tài nguyên để ưu tiên
                            nguyên liệu, khách hàng, âm thanh và bộ trang trí
                            đang sử dụng, giúp giảm tình trạng giật khi
                            tài nguyên xuất hiện lần đầu.
                        </li>

                        <li>
                            Tối ưu dung lượng hình ảnh trên toàn bộ game,
                            giúp giảm đáng kể kích thước tài nguyên và
                            cải thiện thời gian tải trên thiết bị di động.
                        </li>

                        <li>
                            Thêm cơ chế bóp sốt mới:
                            Ketchup, Sriracha và Mayonnaise giờ cần được
                            nhấn giữ để thêm vào bánh.
                        </li>

                        <li>
                            Trong lúc bóp sốt, vòng tiến trình sẽ hiển thị
                            trực tiếp trên chai và lớp sốt dần xuất hiện
                            trên ổ bánh.
                        </li>

                        <li>
                            Nếu thả tay quá sớm khi bóp sốt,
                            thao tác sẽ bị hủy và phần sốt chưa hoàn thành
                            sẽ biến mất.
                        </li>

                        <li>
                            Thêm âm thanh riêng cho thao tác bóp sốt,
                            phát liên tục trong thời gian giữ chai và
                            dừng ngay khi hoàn thành hoặc hủy thao tác.
                        </li>

                        <li>
                            Thời gian bóp sốt được điều chỉnh còn 3 giây
                            để thao tác có cảm giác rõ ràng nhưng
                            không làm chậm nhịp phục vụ khách.
                        </li>

                        <li>
                            Hướng dẫn chơi được mở rộng từ 5 lên 6 trang,
                            bổ sung một trang riêng giải thích cách
                            nhấn giữ để sử dụng các loại sốt.
                        </li>

                        <li>
                            Cập nhật hệ thống trang trí để thớt,
                            sổ công thức, khung cảnh và quầy nguyên liệu
                            sử dụng chính xác skin mà người chơi đang chọn.
                        </li>

                        <li>
                            Chuẩn bị thêm bộ trang trí Halloween với
                            thớt, sổ công thức, khung cảnh và các tài nguyên
                            theo chủ đề Halloween.
                        </li>

                        <li>
                            Cải thiện hệ thống khách mỗi ngày:
                            số lượng khách tăng dần theo tiến độ ngày chơi
                            thay vì dao động quá thấp ở những ngày sau.
                        </li>

                        <li>
                            Điều chỉnh nhịp khách đến để tiệm bớt khoảng
                            trống quá lâu nhưng vẫn giữ thời gian đủ để
                            người chơi chuẩn bị giữa các lượt phục vụ.
                        </li>

                        <li>
                            Cải thiện cách tải sprite khách hàng để
                            giảm hiện tượng khách xuất hiện chậm hoặc
                            hình bị tải muộn trong lúc chơi.
                        </li>

                        <li>
                            Cải thiện hệ thống level của tiệm,
                            tiếp tục tích EXP khi phục vụ đúng và
                            hiển thị danh hiệu theo từng cột mốc level.
                        </li>

                        <li>
                            Cải thiện tính ổn định của hệ thống đánh giá,
                            tiến trình ngày và dữ liệu khi chơi lại ngày.
                        </li>

                        <li>
                            Sửa một số trường hợp dữ liệu cũ có thể
                            giữ số khách không còn phù hợp với hệ thống
                            cân bằng mới.
                        </li>

                        <li>
                            Cải thiện hiệu năng tổng thể trên điện thoại,
                            đặc biệt khi chuyển giữa màn chuẩn bị,
                            chờ khách và làm bánh.
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
                            Nhiệm vụ, Nâng cấp, Trang trí
                            và theo dõi Doanh thu.
                        </li>

                        <li>
                            Thêm nhiệm vụ ngày với các mục tiêu
                            thay đổi theo ngày thật và phần thưởng
                            tiền khi hoàn thành.
                        </li>

                        <li>
                            Thêm nhiệm vụ sự kiện Mùa Hoa Anh Đào,
                            hoàn thành 20 ngày để mở quyền mua
                            bộ Hoa Anh Đào.
                        </li>

                        <li>
                            Thêm sự kiện giới hạn Đêm Rằm Trung Thu
                            với Chị Hằng, Chú Cuội và Thỏ Ngọc.
                        </li>

                        <li>
                            Phục vụ đủ các vị khách Trung Thu
                            để mở quyền mua bộ trang trí
                            Đêm Rằm Trung Thu.
                        </li>

                        <li>
                            Thêm hệ thống nâng cấp tiệm gồm
                            Quảng bá, Chỗ ngồi và Làm mát,
                            giúp tăng lượng khách, thời gian kiên nhẫn
                            và khả năng nhận đánh giá cao.
                        </li>

                        <li>
                            Thêm hệ thống level cho tiệm,
                            nhận EXP khi phục vụ đúng và
                            mở các danh hiệu mới khi tăng level.
                        </li>

                        <li>
                            Thêm hệ thống trang trí với skin cho
                            sổ công thức, khung cảnh, thớt,
                            quầy nguyên liệu và bàn bếp.
                        </li>

                        <li>
                            Thêm các bộ Hoa Anh Đào và Trung Thu,
                            cùng khung cảnh Thành thị mới.
                        </li>

                        <li>
                            Thêm trang Thành tựu trong phần Quản lý
                            để theo dõi tiến độ hoàn thành
                            các bộ sưu tập trang trí.
                        </li>

                        <li>
                            Khách hàng giờ có cách xưng hô riêng
                            phù hợp với từng nhân vật thay vì
                            tất cả đều xưng “mình”.
                        </li>

                        <li>
                            Cải thiện hệ thống lưu tiến trình để lưu
                            các nâng cấp, level, skin đã sở hữu
                            và trang trí đang sử dụng.
                        </li>

                        <li>
                            Cải thiện khả năng cài Một Ổ Nha!
                            lên màn hình chính như một ứng dụng web.
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
                            Thêm hướng dẫn chơi gồm 5 trang minh họa
                            cho người chơi mới.
                        </li>

                        <li>
                            Có thể mở lại hướng dẫn bất cứ lúc nào
                            trong phần Cài đặt.
                        </li>

                        <li>
                            Phóng to và điều chỉnh vị trí sổ công thức
                            để dễ nhìn và dễ bấm hơn.
                        </li>

                        <li>
                            Làm rõ một số yêu cầu của khách như
                            “không cho rau”, “không cho ớt”
                            và “không cho sốt”.
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
                            Thêm hiệu ứng đóng cửa tiệm trước khi
                            hiện tổng kết cuối ngày.
                        </li>

                        <li>
                            Tiệm có khoảng thời gian vắng khách
                            sau khi mở cửa và sau khi
                            phục vụ hết hàng chờ.
                        </li>

                        <li>
                            Điều chỉnh số khách mỗi ngày:
                            có ngày vắng, ngày vừa và
                            thỉnh thoảng có ngày rất đông.
                        </li>

                        <li>
                            Điều chỉnh giá nhập một số nguyên liệu
                            để cân bằng tốc độ kiếm tiền
                            khi lượng khách tăng.
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
                            Thêm hàng chờ 2 đến 3 khách cùng lúc,
                            có thể chọn khách để xem và làm đơn.
                        </li>

                        <li>
                            Thêm thanh kiên nhẫn trong lời thoại
                            và hàng chờ.
                        </li>

                        <li>
                            Khách đổi sang biểu cảm khó chịu
                            khi sắp hết kiên nhẫn và có thể
                            rời tiệm nếu đợi quá lâu.
                        </li>

                        <li>
                            Thêm đánh giá sao sau mỗi đơn,
                            điểm đánh giá của tiệm trên thanh trạng thái
                            và thống kê đánh giá cuối ngày.
                        </li>

                        <li>
                            Thêm bánh mì pâté cùng nhiều biến thể
                            theo yêu cầu của khách.
                        </li>

                        <li>
                            Khách có thể yêu cầu thêm sốt,
                            không cho rau, không cho ớt,
                            không cho sốt hoặc kết hợp
                            nhiều yêu cầu trong một đơn.
                        </li>

                        <li>
                            Sửa lỗi nhạc nền bị mất sau khi
                            rời ứng dụng rồi quay lại
                            hoặc khi chơi lại ngày.
                        </li>

                        <li>
                            Cải thiện chuyển nhạc giữa các màn
                            và âm thanh khi chọn nguyên liệu.
                        </li>

                        <li>
                            Làm mới giao diện sổ công thức,
                            hàng chờ và thanh trạng thái.
                        </li>

                        <li>
                            Điều chỉnh kích thước nút điều khiển
                            và độ trong suốt của các loại sốt.
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
                            Khách hàng xuất hiện trực tiếp tại quầy,
                            với biểu cảm thay đổi theo món
                            được phục vụ.
                        </li>

                        <li>
                            Thêm khách hàng mới cùng hiệu ứng
                            khi khách đến và rời tiệm.
                        </li>

                        <li>
                            Anh giao hàng xuất hiện khi chuẩn bị
                            nguyên liệu và thông báo sau khi giao hàng.
                        </li>

                        <li>
                            Thêm hiệu ứng mở cửa tiệm.
                        </li>

                        <li>
                            Điều chỉnh thời gian chờ giữa các khách.
                        </li>

                        <li>
                            Thêm âm thanh tương tác và cải thiện
                            nhạc nền, giao diện trên điện thoại.
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
                            Ra mắt phiên bản đầu tiên của
                            Một Ổ Nha!
                        </li>

                        <li>
                            Thêm hệ thống khách hàng và
                            làm bánh theo yêu cầu.
                        </li>

                        <li>
                            Thêm nhập hàng, kho nguyên liệu
                            và mở khóa nguyên liệu mới.
                        </li>

                        <li>
                            Thêm sổ công thức.
                        </li>

                        <li>
                            Thêm hệ thống ngày, doanh thu,
                            chi phí và tiền thuê mặt bằng.
                        </li>

                        <li>
                            Thêm lưu tiến trình
                            và chơi lại ngày hiện tại.
                        </li>

                        <li>
                            Thêm nhạc nền cho tiệm
                            và khu vực bếp.
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

const uiClickSound = new Audio("audio/click.mp3");
uiClickSound.volume = 0.45;

document.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button || button.disabled) return;

    // Khi đang làm bánh, nguyên liệu đã có tiếng riêng.
    if (
        (game.phase === "making" || game.phase === "waiting") &&
        button.classList.contains("station-item")
    ) {
        return;
    }

    uiClickSound.currentTime = 0;
    uiClickSound.play().catch(() => {});
});

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

// Tạo checkpoint cho Day 1 hoặc bổ sung checkpoint
// cho save cũ chưa có hệ thống restart ngày.
if (!loadDayStartCheckpoint()) {
    saveDayStartCheckpoint();
}

bindTutorialEvents();

const startScreen =
    document.getElementById("start-screen");

const startScreenStatus =
    document.getElementById(
        "start-screen-status"
    );

const loadingProgressWrap =
    document.getElementById(
        "loading-progress-wrap"
    );

const loadingProgressBar =
    document.getElementById(
        "loading-progress-bar"
    );

let startScreenReady = false;
let startScreenEntered = false;


// ======================================================
// STARTUP PRELOADER
//
// Chỉ tải những asset cần cho gameplay chính.
// Event skin chưa equip / asset phụ sẽ được browser tải khi cần.
// ======================================================

function getStartupPreloadAssets() {

    const assetSet = new Set();


    // Ảnh lobby / gameplay cơ bản.
    [
        "images/banh-mi.png",
        "images/bread.png"
    ].forEach(
        src => assetSet.add(src)
    );


    // Toàn bộ sprite nguyên liệu đang có trong game:
    // - ảnh trên bàn
    // - ảnh nằm trong bánh
    Object.values(ingredients)
        .forEach(ingredient => {

            if (ingredient.tableImage) {
                assetSet.add(
                    ingredient.tableImage
                );
            }

            if (ingredient.image) {
                assetSet.add(
                    ingredient.image
                );
            }
        });


    // Chỉ preload bộ skin ĐANG EQUIP.
    [
        ["board", selectedSkins.board],
        ["background", selectedSkins.background],
        ["recipe", selectedSkins.recipe],
        [
            "ingredientTable",
            selectedSkins.ingredientTable
        ]
    ].forEach(([type, id]) => {

        const skin =
            skinById(type, id);

        if (skin?.image) {
            assetSet.add(skin.image);
        }
    });


    // Customer thường A-F, đủ 3 trạng thái.
    // Những customer event đặc biệt được lazy-load khi thực sự xuất hiện.
    [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
    ].forEach(id => {

        [1, 2, 3].forEach(mood => {
            assetSet.add(
                `images/customer/${id}/${id}${mood}.png`
            );
        });
    });


    // Nếu người chơi chưa xem tutorial 0.3.0,
    // preload luôn 6 ảnh để tutorial mở ra không khựng.
    const seenTutorialVersion =
        localStorage.getItem(
            TUTORIAL_SEEN_KEY
        );

    if (
        seenTutorialVersion !==
        TUTORIAL_VERSION
    ) {

        tutorialSlides.forEach(slide => {
            if (slide.image) {
                assetSet.add(slide.image);
            }
        });
    }


    // SFX gameplay. Nhạc nền vẫn được browser quản lý riêng,
    // vì mobile cần cú chạm của người chơi mới được play().
    [
        "audio/click.mp3",
        "audio/ingredient.mp3",
        "audio/correct.mp3",
        "audio/wrong.mp3",
        "audio/openstore.mp3",
        "audio/squirt.mp3"
    ].forEach(
        src => assetSet.add(src)
    );


    return [...assetSet];
}


function preloadStartupImage(src) {

    return new Promise(resolve => {

        const image =
            new Image();

        let finished = false;

        const finish =
            ok => {

                if (finished) return;

                finished = true;

                resolve({
                    src,
                    ok
                });
            };


        image.onload =
            () => finish(true);

        image.onerror =
            () => finish(false);

        image.src = src;


        if (
            image.complete &&
            image.naturalWidth > 0
        ) {
            finish(true);
        }
    });
}


function preloadStartupAudio(src) {

    return new Promise(resolve => {

        const audio =
            new Audio();

        let finished = false;

        let timeoutId = null;

        const finish =
            ok => {

                if (finished) return;

                finished = true;

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                audio.removeEventListener(
                    "canplaythrough",
                    onReady
                );

                audio.removeEventListener(
                    "loadeddata",
                    onReady
                );

                audio.removeEventListener(
                    "error",
                    onError
                );

                resolve({
                    src,
                    ok
                });
            };

        const onReady =
            () => finish(true);

        const onError =
            () => finish(false);


        audio.preload = "auto";

        audio.addEventListener(
            "canplaythrough",
            onReady,
            { once: true }
        );

        // loadeddata giúp tránh bị treo progress
        // trên browser mobile không bắn canplaythrough sớm.
        audio.addEventListener(
            "loadeddata",
            onReady,
            { once: true }
        );

        audio.addEventListener(
            "error",
            onError,
            { once: true }
        );

        audio.src = src;
        audio.load();


        // Không cho một file audio lỗi làm kẹt game mãi.
        timeoutId =
            setTimeout(
                () => finish(false),
                12000
            );
    });
}


function updateStartupLoadingUI(
    loaded,
    total
) {

    const percent =
        total > 0
            ? Math.round(
                loaded / total * 100
            )
            : 100;


    if (loadingProgressBar) {
        loadingProgressBar.style.width =
            `${percent}%`;
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


function markStartScreenReady() {

    startScreenReady = true;

    startScreen?.classList.remove(
        "is-loading"
    );

    startScreen?.classList.add(
        "is-ready"
    );

    startScreen?.setAttribute(
        "aria-busy",
        "false"
    );


    if (loadingProgressBar) {
        loadingProgressBar.style.width =
            "100%";
    }


    if (loadingProgressWrap) {
        loadingProgressWrap.setAttribute(
            "aria-valuenow",
            "100"
        );
    }


    if (startScreenStatus) {
        startScreenStatus.textContent =
            "Nhấn để vào tiệm 🥖";
    }
}


const MIN_LOADING_MS = 1800;


async function preloadStartupAssets() {

    const loadingStartedAt = Date.now();

    const assets =
        getStartupPreloadAssets();

    const total =
        assets.length;

    let loaded = 0;

    const failed = [];


    updateStartupLoadingUI(
        0,
        total
    );


    await Promise.all(
        assets.map(async src => {

            const isAudio =
                /\.(mp3|wav|ogg|m4a)(?:[?#].*)?$/i
                    .test(src);

            const result =
                isAudio
                    ? await preloadStartupAudio(src)
                    : await preloadStartupImage(src);


            if (!result.ok) {
                failed.push(src);
            }


            loaded++;

            updateStartupLoadingUI(
                loaded,
                total
            );
        })
    );


    if (failed.length) {
        console.warn(
            "Một số asset preload không thành công:",
            failed
        );
    }


    const elapsed =
        Date.now() - loadingStartedAt;

    const remaining =
        Math.max(
            0,
            MIN_LOADING_MS - elapsed
        );

    if (remaining > 0) {
        await new Promise(resolve =>
            setTimeout(resolve, remaining)
        );
    }


    markStartScreenReady();
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


// Render home ở phía sau splash screen,
// rồi bắt đầu preload ngay.
showHome();

preloadStartupAssets()
    .catch(error => {

        // Loading UI tuyệt đối không được làm người chơi kẹt.
        console.warn(
            "Startup preload gặp lỗi:",
            error
        );

        markStartScreenReady();
    });

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
                mainButton.disabled = false;
                nextCustomer();
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

const CUSTOMER_PATIENCE_MS = 70000;

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

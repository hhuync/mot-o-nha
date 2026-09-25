// ======================================================
// MỘT Ổ NHA! - game.js
// Bread stock + expanded recipes + recipe book
// ======================================================

const SAVE_KEY = "mot-o-nha-save-v3";
const DAILY_RENT = 15000;
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
const MUSIC_FADE_TIME = 1200;

const musicTracks = {
    lobby: "audio/lobby.mp3",
    kitchen1: "audio/kitchen1.mp3",
    kitchen2: "audio/kitchen2.mp3"
};

const musicA = new Audio();
const musicB = new Audio();

musicA.loop = true;
musicB.loop = true;

musicA.volume = 0;
musicB.volume = 0;

let activeMusic = musicA;
let inactiveMusic = musicB;

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
    "Thiết kế & phát triển game: Johnny Nguyen<br><br>🎵 Âm nhạc: Andrii Hroza - andriih trên Pixabay"
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
    "Game design & development: Johnny Nguyen<br><br>🎵 Music: Andrii Hroza - andriih on Pixabay"
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

function getKitchenMusicKey() {
    return game.day % 2 === 0
        ? "kitchen2"
        : "kitchen1";
}

let musicFadeFrame = null;
let musicSwitchToken = 0;
let musicStarting = false;

function stopMusicFade() {
    musicSwitchToken++;

    if (musicFadeFrame !== null) {
        cancelAnimationFrame(musicFadeFrame);
        musicFadeFrame = null;
    }

    musicStarting = false;
}

function switchMusic(key) {
    desiredMusicKey = key;

    if (!musicUnlocked || !musicEnabled || !musicTracks[key]) {
        return;
    }

    // Đúng bài rồi nhưng lần phát trước bị lỗi: thử phát lại.
    if (currentMusicKey === key) {
        if (activeMusic.paused && !musicStarting) {
            activeMusic.volume = MUSIC_VOLUME;

            activeMusic.play().catch((error) => {
                console.warn("Không phát được nhạc:", error);
                currentMusicKey = null;
            });
        }

        return;
    }

    stopMusicFade();
    const token = musicSwitchToken;

    const oldMusic = activeMusic;
    const newMusic = inactiveMusic;
    const oldKey = currentMusicKey;

    newMusic.pause();
    newMusic.src = musicTracks[key];
    newMusic.currentTime = 0;
    newMusic.volume = 0;
    newMusic.loop = true;

    activeMusic = newMusic;
    inactiveMusic = oldMusic;
    currentMusicKey = key;
    musicStarting = true;

    // Gọi play() ngay, không đợi animation chuyển màn hình.
    newMusic.play().then(() => {
        if (token !== musicSwitchToken) return;

        musicStarting = false;

        const startTime = performance.now();
        const oldVolume = oldMusic.paused ? 0 : oldMusic.volume;

        function step(now) {
            if (token !== musicSwitchToken) return;

            const progress = Math.min(
                (now - startTime) / MUSIC_FADE_TIME,
                1
            );

            newMusic.volume = MUSIC_VOLUME * progress;

            if (!oldMusic.paused) {
                oldMusic.volume = oldVolume * (1 - progress);
            }

            if (progress < 1) {
                musicFadeFrame = requestAnimationFrame(step);
            } else {
                musicFadeFrame = null;
                newMusic.volume = MUSIC_VOLUME;
                oldMusic.pause();
                oldMusic.currentTime = 0;
            }
        }

        musicFadeFrame = requestAnimationFrame(step);
    }).catch((error) => {
        if (token !== musicSwitchToken) return;

        console.warn("Không phát được nhạc:", error);
        musicStarting = false;

        newMusic.pause();
        activeMusic = oldMusic;
        inactiveMusic = newMusic;
        currentMusicKey = oldMusic.paused ? null : oldKey;

        if (!oldMusic.paused) {
            oldMusic.volume = MUSIC_VOLUME;
        }
    });
}

function unlockMusic() {
    musicUnlocked = true;
    switchMusic(desiredMusicKey);
}

function setMusicEnabled(enabled) {
    musicEnabled = enabled;

    if (!enabled) {
        stopMusicFade();

        [musicA, musicB].forEach((audio) => {
            audio.pause();
            audio.volume = 0;
        });

        currentMusicKey = null;
        return;
    }

    unlockMusic();
}

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
        restockPrice: 8000
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
        restockPrice: 6000
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
        restockPrice: 4000,
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

const game = {
    day: 1,
    money: 100000,

    phase: "home",
    pausedPhase: null,

    hasStarted: false,
    shopOpen: false,

    customersToday: Math.floor(Math.random() * 5) + 4,
    customerNumber: 0,
    completedOrders: 0,
    dailyRevenue: 0,

    dailyIngredientSpend: 0,
    dailyRentPaid: 0,

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
             fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round"
             aria-hidden="true">
            <path d="M8 5v14M16 5v14"/>
        </svg>`,

    play: `
        <svg class="ui-icon" viewBox="0 0 24 24"
             fill="currentColor" aria-hidden="true">
            <path d="M7 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 7 19.5Z"/>
        </svg>`
};

function updateHeader(title, status) {
    dayDisplay.textContent = title;
    statusDisplay.textContent = status;
    moneyDisplay.textContent = formatMoney(game.money);

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


    // Hai nguyên liệu này luôn được mở từ đầu.
    ingredients["Ketchup"].unlocked = true;
    ingredients["Bánh mì"].unlocked = true;


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

        ingredients: ingredientSnapshot
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

            ingredients["Ketchup"].unlocked = true;
            ingredients["Bánh mì"].unlocked = true;

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
            window.removeEventListener(
                "beforeunload",
                saveGame
            );

            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(DAY_START_KEY);

            location.reload();
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

    return `
        <button
            class="recipe-book-fab"
            onclick="openRecipeBook()"
            title="Sổ công thức"
            aria-label="Sổ công thức"
        >
            <img
                src="images/recipe.png"
                alt="Sổ công thức"
                draggable="false"
            >
        </button>
    `;
}


// ======================================================
// HOME
// ======================================================

function showHome() {

    switchMusic("lobby");

    if (game.phase !== "home") {
        game.pausedPhase = game.phase;
    }

    game.phase = "home";

    updateHeader(
        "Một Ổ Nha! 🥖",

        game.hasStarted
            ? "Game đang tạm dừng"
            : "Tiệm bánh mì nhỏ"
    );

    screen.innerHTML = `
        <div class="home-screen">

            <div class="home-art-wrap">

                <img
                    class="home-banhmi-art"
                    src="images/banh-mi.png"
                    alt="Bánh mì"
                    draggable="false"

                    onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='block';
                    "
                >

                <div
                    class="home-fallback"
                    style="display:none;"
                >
                    🥖
                </div>

            </div>


            <h1 class="game-title">Một Ổ Nha!</h1>


            <p>
                ${
                    game.hasStarted

                        ? (
                            game.shopOpen

                                ? `Ngày ${game.day} • Khách ${game.customerNumber}/${game.customersToday}`

                                : `Ngày ${game.day} • Đang chuẩn bị mở cửa`
                        )

                        : "Bánh nóng, nhân đầy, khách vui."
                }
            </p>


            <div class="home-stats">

                <div class="stat-card">
                    Ngày
                    <strong>${game.day}</strong>
                </div>

                <div class="stat-card">
                    Tiền
                    <strong>${formatMoney(game.money)}</strong>
                </div>

            </div>


            <div
                class="home-save-actions"
                style="
                    display:flex;
                    justify-content:center;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:18px;
                "
            >

                ${
                    game.hasStarted

                        ? `
                            <button
                                type="button"
                                onclick="restartCurrentDay()"
                                style="
                                    border:0;
                                    border-radius:14px;
                                    padding:10px 14px;
                                    cursor:pointer;
                                    background:#f4dfb5;
                                    color:#70482c;
                                    box-shadow:0 4px 0 #d0a469;
                                    font-family:inherit;
                                "
                            >
                                ↻ Chơi lại ngày này
                            </button>
                        `

                        : ""
                }


                <button
                    type="button"
                    onclick="resetGameSave()"
                    style="
                        border:0;
                        border-radius:14px;
                        padding:10px 14px;
                        cursor:pointer;
                        background:#f7c9d2;
                        color:#7a3042;
                        box-shadow:0 4px 0 #d98a9c;
                        font-family:inherit;
                    "
                >
                    🗑 Chơi lại từ đầu
                </button>

            </div>

        </div>
    `;


    mainButton.innerHTML =
        game.hasStarted
            ? `${UI_ICONS.play}<span>Tiếp tục</span>`
            : "Bắt đầu chơi →";


    saveGame();
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
        "Nhập hàng trước khi mở cửa"
    );


    screen.innerHTML = `
        <div class="making-screen prep-shopping-screen">
<section class="customer-panel prep-grab-panel">
    <div class="customer-portrait">
        <img src="images/grab.png"
             alt="Anh Grab"
             draggable="false"
             onerror="this.style.display='none'; this.nextElementSibling.hidden=false;">
        <span class="customer-fallback" hidden>🛵</span>
    </div>

    <div class="customer-bubble">
        <div class="customer-bubble-top">
            <span>Chuẩn bị nguyên liệu</span>
            ${recipeBookButton()}
        </div>
        <strong>Anh Grab</strong>
        <p id="prep-grab-message" role="status">
            Nhấn vào nguyên liệu để nhập hàng hoặc mở khóa, anh sẽ giao đến cho.
        </p>
    </div>
</section>

            <div class="banhmi-workspace">

                <div class="board-stage">

                    <img
                        class="cutting-board"
                        src="images/board.png"
                        draggable="false"
                        alt="Thớt"
                    >

                </div>

            </div>


            <div class="ingredient-station">

                <div class="ingredient-table-wrap">

                    <img
                        class="ingredient-table-image"
                        src="images/ingredient-table.png"
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

    const possibleRecipes =
        availableRecipes();


    if (!possibleRecipes.length) {
        return false;
    }


    game.currentRecipe =
        weightedRandomRecipe(
            possibleRecipes
        );


    game.currentOrder =
        [...game.currentRecipe.ingredients];


    game.orderNote =
        randomItem([
            "Cho mình một ổ như bình thường nha!",
            "Cho mình món này nha!",
            "Một ổ như thường giúp mình nhé!"
        ]);


    const modifiers = [];


    // Chỉ cho yêu cầu "không rau"
    // nếu recipe GỐC thực sự có rau.

    if (
        game.currentOrder.includes("Rau")
    ) {
        modifiers.push("no-herbs");
    }


    // Chỉ cho yêu cầu không ớt
    // nếu recipe GỐC có ớt.

    if (
        game.currentOrder.includes("Ớt")
    ) {
        modifiers.push("no-chili");
    }


    // Nếu recipe có bất kỳ loại sauce nào,
    // khách có thể yêu cầu không sốt.

    const saucesInOrder =
        game.currentOrder.filter(
            name =>
                sauceSlots.includes(name)
        );


    if (saucesInOrder.length) {
        modifiers.push("no-sauce");
    }


    // Nếu đã unlock ớt thì khách có thể
    // yêu cầu thêm ớt.

    if (
        ingredients["Ớt"].unlocked &&
        ingredients["Ớt"].stock > 0 &&
        !game.currentOrder.includes("Ớt")
    ) {
        modifiers.push("extra-chili");
    }


    // Mayo extra.

    if (
        ingredients["Mayonnaise"].unlocked &&
        ingredients["Mayonnaise"].stock > 0 &&
        !game.currentOrder.includes("Mayonnaise")
    ) {
        modifiers.push("extra-mayo");
    }


    // Sriracha extra.

    if (
        ingredients["Sriracha"].unlocked &&
        ingredients["Sriracha"].stock > 0 &&
        !game.currentOrder.includes("Sriracha")
    ) {
        modifiers.push("extra-sriracha");
    }


    // Bánh mì không thì đừng làm khách
    // tự nhiên đòi topping nữa =)))

    if (
        game.currentRecipe.name !== "Bánh mì không" &&
        modifiers.length &&
        Math.random() < 0.58
    ) {

        const modifier =
            randomItem(modifiers);


        // -------------------------------
        // KHÔNG RAU
        // -------------------------------

        if (
            modifier === "no-herbs"
        ) {

            game.currentOrder =
                game.currentOrder.filter(
                    item =>
                        item !== "Rau"
                );


            game.orderNote =
                randomItem([
                    "À, mình không ăn rau nha!",
                    "Cho mình bỏ rau nhé!",
                    "Một ổ nhưng đừng cho rau nha!"
                ]);
        }


        // -------------------------------
        // KHÔNG SỐT
        // -------------------------------

        else if (
            modifier === "no-sauce"
        ) {

            game.currentOrder =
                game.currentOrder.filter(
                    item =>
                        !sauceSlots.includes(item)
                );


            game.orderNote =
                randomItem([
                    "Ôi, mình không ăn sốt nha!",
                    "Cho mình không sốt nhé!",
                    "Một ổ nhưng bỏ hết sốt giúp mình nha!"
                ]);
        }


        // -------------------------------
        // KHÔNG ỚT
        // -------------------------------

        else if (
            modifier === "no-chili"
        ) {

            game.currentOrder =
                game.currentOrder.filter(
                    item =>
                        item !== "Ớt"
                );


            game.orderNote =
                randomItem([
                    "Mình không ăn được ớt nha!",
                    "Đừng cho ớt giúp mình nhé!"
                ]);
        }


        // -------------------------------
        // THÊM ỚT
        // -------------------------------

        else if (
            modifier === "extra-chili"
        ) {

            game.currentOrder.push("Ớt");


            game.orderNote =
                randomItem([
                    "Cho mình thêm ớt nha! 🌶️",
                    "Mình ăn cay, thêm ớt giúp mình nhé!",
                    "Ổ này cho mình có ớt nha!"
                ]);
        }


        // -------------------------------
        // THÊM MAYO
        // -------------------------------

        else if (
            modifier === "extra-mayo"
        ) {

            game.currentOrder.push(
                "Mayonnaise"
            );


            game.orderNote =
                randomItem([
                    "Cho mình thêm mayonnaise nha!",
                    "Thêm chút mayonnaise giúp mình nhé!"
                ]);
        }


        // -------------------------------
        // THÊM SRIRACHA
        // -------------------------------

        else if (
            modifier === "extra-sriracha"
        ) {

            game.currentOrder.push(
                "Sriracha"
            );


            game.orderNote =
                randomItem([
                    "Cho mình thêm Sriracha nha! 🌶️",
                    "Cho mình cay hơn một chút, thêm Sriracha nhé!"
                ]);
        }
    }


    // BÁNH MÌ KHÔNG
    // Không có topping.

    if (
        game.currentRecipe.name ===
        "Bánh mì không"
    ) {

        game.orderNote =
            randomItem([
                "Cho mình một ổ bánh mì không thôi nha!",
                "Mình chỉ lấy bánh mì thôi, không cần nhân nhé.",
                "Một ổ không thôi nha, cảm ơn!"
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
                        src="images/board.png"
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
                        src="images/ingredient-table.png"
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


    // Click handler

    station
        .querySelectorAll(
            ".station-item"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    handleStationClick(
                        button.dataset.ingredient,
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

            ? `↩ Đã bỏ ${name}`

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
    renderDayEnd();
}


function renderDayEnd() {

    game.phase = "dayEnd";
    game.pausedPhase = "dayEnd";

    game.shopOpen = false;


    // Rent chỉ trừ đúng 1 lần mỗi ngày.
    if (game.dailyRentPaid === 0) {

        game.dailyRentPaid =
            DAILY_RENT;

        game.money -=
            DAILY_RENT;
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
                        🏠 Tiền thuê mặt bằng
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


    game.customersToday =
        Math.floor(Math.random() * 5) + 4;


    game.customerNumber = 0;

    game.completedOrders = 0;

    game.dailyRevenue = 0;

    game.dailyIngredientSpend = 0;
    game.dailyRentPaid = 0;


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
                z-index: 99999;

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
                    class="settings-row"
                    type="button"
                >
                    <span>📖 ${t("howToPlay")}</span>
                    <span class="settings-value">
                        ${t("comingSoon")}
                    </span>
                </button>

                <button
                    id="settings-version"
                    class="settings-row"
                    type="button"
                >
                    <span>🎁 ${t("version")}</span>
                    <span class="settings-value">
                        v0.2.0 ›
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
    const oldHistory =
        document.getElementById("update-history-overlay");

    if (oldHistory) {
        oldHistory.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "update-history-overlay";

    overlay.innerHTML = `
        <div class="update-history-panel">

            <h2>📜 Lịch sử cập nhật</h2>

            <div class="update-history-list">

    <div class="update-entry">
        <div class="update-entry-header">
            <strong>Phiên bản 0.2.0</strong>

            <div class="update-entry-meta">
                <span class="current-version-badge">Hiện tại</span>
                <span class="update-date">25/09/2026</span>
            </div>
        </div>

        <ul>
            <li>Khách hàng xuất hiện trực tiếp tại quầy, với biểu cảm thay đổi theo món được phục vụ.</li>
            <li>Thêm khách hàng mới cùng hiệu ứng khi khách đến và rời tiệm.</li>
            <li>Anh giao hàng xuất hiện khi chuẩn bị nguyên liệu và thông báo sau khi giao hàng.</li>
            <li>Thêm hiệu ứng mở cửa tiệm, điều chỉnh thời gian chờ giữa các khách.</li>
            <li>Thêm âm thanh tương tác và cải thiện nhạc nền, giao diện trên điện thoại.</li>
        </ul>
    </div>

    <div class="update-entry">
        <div class="update-entry-header">
            <strong>Phiên bản 0.1.0</strong>

            <div class="update-entry-meta">
                <span class="update-date">24/09/2026</span>
            </div>
        </div>

        <ul>
            <li>Ra mắt phiên bản đầu tiên của Một Ổ Nha!</li>
            <li>Thêm hệ thống khách hàng và làm bánh theo yêu cầu.</li>
            <li>Thêm nhập hàng, kho nguyên liệu và mở khóa nguyên liệu mới.</li>
            <li>Thêm sổ công thức.</li>
            <li>Thêm hệ thống ngày, doanh thu, chi phí và tiền thuê mặt bằng.</li>
            <li>Thêm lưu tiến trình và chơi lại ngày hiện tại.</li>
            <li>Thêm nhạc nền cho tiệm và khu vực bếp.</li>
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

    document.body.appendChild(overlay);

    overlay
        .querySelector(".update-history-close")
        .addEventListener("click", () => {
            overlay.remove();
        });

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
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

const startScreen =
    document.getElementById("start-screen");

startScreen.addEventListener(
    "click",
    () => {
        // Đây là tương tác thật của người dùng,
        // browser sẽ cho phép audio chạy.
        unlockMusic();

        // Fade màn hình mở đầu ra.
        startScreen.classList.add("hide");

        // Xóa hẳn khỏi DOM sau khi fade xong.
        setTimeout(() => {
            startScreen.remove();
        }, 800);
    },
    { once: true }
);

showHome();

// Dán cuối game.js, ngay sau showHome();
customers.splice(0, customers.length, "A", "B", "C", "D", "E", "F");

function customerImage(id, mood = 1) {
    const safeId = customers.includes(id) ? id : "A";
    return `images/customer/${safeId}/${safeId}${mood}.png`;
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
                <span hidden class="customer-fallback">🙂</span>
            </div>
            <div class="customer-bubble">
                <div class="customer-bubble-top">
                    <span>Khách ${game.customerNumber}/${game.customersToday}</span>
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
    reaction.textContent = correct
        ? `Cảm ơn nha! +${formatMoney(game.currentRecipe.price)} ✨`
        : "Ơ, không đúng món mình gọi rồi...";
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

    updateHeader(`Ngày ${game.day}`, "Đang chờ khách...");

    screen.innerHTML = `
        <div class="making-screen waiting-screen">
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
                         src="images/board.png"
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
                         src="images/ingredient-table.png"
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

        arriveCustomerNow();

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
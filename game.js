// ======================================================
// MỘT Ổ NHA! - game.js
// Bread stock + expanded recipes + recipe book
// ======================================================

const SAVE_KEY = "mot-o-nha-save-v3";
const DAY_START_KEY = "mot-o-nha-day-start-v1";

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
const homeButton = document.getElementById("home-button");

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


function updateHeader(title, status) {
    dayDisplay.textContent = title;
    statusDisplay.textContent = status;
    moneyDisplay.textContent = formatMoney(game.money);
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


    mainButton.textContent =
        game.hasStarted
            ? "▶️ Tiếp tục"
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

            <div class="order-strip prep-order-strip">

                <div class="order-strip-top">

                    <div>
                        <strong>
                            🛒 Chuẩn bị nguyên liệu
                        </strong>

                        <div class="prep-help">
                            Nhấn vào nguyên liệu để nhập hàng hoặc mở khóa.
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
                    🛒 Nhấn nguyên liệu để nhập hàng
                </div>

            </div>

        </div>
    `;


    renderStationItems("prep");


    mainButton.textContent =
        `Mở cửa ngày ${game.day} 🥖`;


    saveGame();
}


// ======================================================
// OPEN SHOP
// ======================================================

function openShop() {

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

    nextCustomer();
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


    game.currentCustomer =
        randomItem(customers);


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


            showIngredientFeedback(
                `🎉 Đã mở khóa ${name}! +${data.restock} phần`
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


            showIngredientFeedback(
                `📦 ${name}: ${data.stock}`
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


    updateHeader(
        `Ngày ${game.day}`,
        "Đã đóng cửa"
    );


    screen.innerHTML = `
        <div class="result-screen">

            <div class="result-emoji">
                🌙
            </div>


            <h1>
                Hết ngày ${game.day}!
            </h1>


            <div class="summary-card">

                <p>
                    🥖 Đơn hoàn thành:
                    <strong>
                        ${game.completedOrders}
                    </strong>
                </p>


                <p>
                    💰 Doanh thu:
                    <strong>
                        ${formatMoney(
                            game.dailyRevenue
                        )}
                    </strong>
                </p>


                <p>
                    💵 Tổng tiền:
                    <strong>
                        ${formatMoney(
                            game.money
                        )}
                    </strong>
                </p>


                <p>
                    🥖 Bánh mì còn:
                    <strong>
                        ${ingredients["Bánh mì"].stock}
                    </strong>
                </p>

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


// ======================================================
// EVENTS
// ======================================================

homeButton.addEventListener(
    "click",
    () => {

        if (
            game.phase === "home"
        ) {
            return;
        }


        game.pausedPhase =
            game.phase;


        saveGame();

        showHome();
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

showHome();
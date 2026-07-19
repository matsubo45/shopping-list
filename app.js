// ==============================
// 買い物リスト本体のロジック
// アイテム／カテゴリの表示、追加、削除を担当する
// Firestoreとのやり取り（addItemToFirestoreなど）はindex.html内で定義され、
// window経由でこのファイルから呼び出している
// ==============================

let items = [];      // 買い物アイテムの一覧（Firestoreの内容をそのまま保持）
let categories = [];  // カテゴリの一覧（Firestoreの内容をそのまま保持）

// ---------- ログイン・ログアウトボタン ----------
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

loginButton.addEventListener("click", function () {
    window.login();
});

logoutButton.addEventListener("click", function () {
    window.logout();
});

// ---------- DOM要素の取得 ----------
const addButton = document.getElementById("addButton");
const input = document.getElementById("itemInput");
const categorySelect = document.getElementById("categorySelect");
const itemListContainer = document.getElementById("itemListContainer");

const categoryManageList = document.getElementById("categoryManageList");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryButton = document.getElementById("addCategoryButton");

// ==============================
// カテゴリまわり
// ==============================

// カテゴリ管理エリア（一覧＋削除ボタン）と、追加フォームの選択肢を描画する
function renderCategories() {

    // --- カテゴリ選択肢（プルダウン）の描画 ---
    // 選択中の値をなるべく保持するため、一度現在値を控えておく
    const currentSelected = categorySelect.value;

    categorySelect.innerHTML = "";

    for (const category of categories) {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    }

    // 直前まで選ばれていたカテゴリがまだ存在するなら、それを再度選択状態にする
    if (categories.some((c) => c.name === currentSelected)) {
        categorySelect.value = currentSelected;
    }

    // --- カテゴリ管理リスト（削除ボタン付き）の描画 ---
    categoryManageList.innerHTML = "";

    for (const category of categories) {

        const li = document.createElement("li");
        li.className = "category-manage-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = category.name;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";
        deleteButton.className = "btn btn-delete btn-small";
        deleteButton.addEventListener("click", async function () {
            const confirmed = confirm(
                `カテゴリ「${category.name}」を削除しますか？\n（このカテゴリの商品は残りますが、選択肢からは消えます）`
            );
            if (!confirmed) return;

            await window.deleteCategoryFromFirestore(category.id);
        });

        li.appendChild(nameSpan);
        li.appendChild(deleteButton);
        categoryManageList.appendChild(li);
    }
}

// 「カテゴリ追加」ボタンが押された時の処理
async function addCategory() {

    const name = newCategoryInput.value.trim();

    if (name === "") {
        return;
    }

    // 同じ名前のカテゴリがすでにある場合は追加しない
    if (categories.some((c) => c.name === name)) {
        alert("同じ名前のカテゴリが既にあります");
        return;
    }

    await window.addCategoryToFirestore(name);

    newCategoryInput.value = "";
    newCategoryInput.focus();
}

addCategoryButton.addEventListener("click", addCategory);

newCategoryInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addCategory();
    }
});

// index.html側のonSnapshotから呼ばれる（カテゴリ一覧が更新される度に実行）
window.setCategories = function (data) {
    categories = data;
    renderCategories();
};

// ==============================
// アイテム（商品）まわり
// ==============================

// アイテムをカテゴリごとにグループ分けして表示する
function renderItems() {

    itemListContainer.innerHTML = "";

    // カテゴリごとにアイテムをまとめる
    const groups = {};

    for (const item of items) {
        const categoryName = item.category || "未分類";
        if (!groups[categoryName]) {
            groups[categoryName] = [];
        }
        groups[categoryName].push(item);
    }

    // カテゴリの表示順は「カテゴリ管理」で登録されている順番を優先し、
    // その後にカテゴリ一覧に無いもの（未分類など）を続ける
    const orderedNames = categories.map((c) => c.name);
    for (const name of Object.keys(groups)) {
        if (!orderedNames.includes(name)) {
            orderedNames.push(name);
        }
    }

    for (const categoryName of orderedNames) {

        const groupItems = groups[categoryName];
        if (!groupItems || groupItems.length === 0) {
            continue; // アイテムが無いカテゴリは表示しない
        }

        // カテゴリごとのセクションを作成
        const section = document.createElement("section");
        section.className = "category-group";

        const heading = document.createElement("h2");
        heading.className = "category-heading";
        heading.textContent = categoryName;
        section.appendChild(heading);

        const ul = document.createElement("ul");
        ul.className = "item-list";

        // ⭐が付いているアイテムを上に表示する（安定ソートなので、それ以外は元の順番を保つ）
        const sortedItems = [...groupItems].sort(function (a, b) {
            return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
        });

        for (const item of sortedItems) {
            ul.appendChild(createItemElement(item));
        }

        section.appendChild(ul);
        itemListContainer.appendChild(section);
    }
}

// 1件分のアイテム（チェックボックス＋テキスト＋削除ボタン）のDOM要素を作る
function createItemElement(item) {

    const li = document.createElement("li");
    li.className = "item-row";
    if (item.checked) {
        li.classList.add("item-checked");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;
    checkbox.addEventListener("change", async function () {
        item.checked = checkbox.checked;
        await window.updateItemChecked(item.id, checkbox.checked);
        renderItems();
    });

    // 「すぐ買う」用の⭐ボタン。押すたびON/OFFが切り替わる
    const starButton = document.createElement("button");
    starButton.className = "star-button";
    starButton.textContent = item.starred ? "★" : "☆";
    starButton.title = "すぐ買うものに⭐を付ける";
    if (item.starred) {
        starButton.classList.add("star-active");
    }
    starButton.addEventListener("click", async function () {
        const newStarred = !item.starred;
        item.starred = newStarred;
        await window.updateItemStarred(item.id, newStarred);
        renderItems();
    });

    const textSpan = document.createElement("span");
    textSpan.className = "item-text";
    textSpan.textContent = item.text;
    textSpan.title = "タップして編集";
    textSpan.addEventListener("click", function () {
        startEditingItem(item, textSpan);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";
    deleteButton.className = "btn btn-delete btn-small";
    deleteButton.addEventListener("click", async function () {
        await window.deleteItemFromFirestore(item.id);
    });

    li.appendChild(checkbox);
    li.appendChild(starButton);
    li.appendChild(textSpan);
    li.appendChild(deleteButton);

    return li;
}

// アイテムのテキスト部分を、その場で編集できる入力欄に切り替える
function startEditingItem(item, textSpan) {

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "item-edit-input";
    editInput.value = item.text;

    // テキストの表示部分を、入力欄に差し替える
    textSpan.replaceWith(editInput);
    editInput.focus();
    editInput.select();

    let finished = false; // Enterとblurが両方発火して二重保存されるのを防ぐフラグ

    async function finishEditing(shouldSave) {

        if (finished) return;
        finished = true;

        const newText = editInput.value.trim();

        if (shouldSave && newText !== "" && newText !== item.text) {
            item.text = newText;
            await window.updateItemText(item.id, newText);
        }

        renderItems(); // 元のカテゴリ別リスト表示に戻す
    }

    editInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            finishEditing(true);
        } else if (event.key === "Escape") {
            finishEditing(false);
        }
    });

    editInput.addEventListener("blur", function () {
        finishEditing(true);
    });
}

// index.html側のonSnapshotから呼ばれる（アイテム一覧が更新される度に実行）
window.setItems = function (data) {
    items = data;
    renderItems();
};

// 「追加」ボタンが押された時の処理
async function addItem() {

    const text = input.value.trim();

    if (text === "") {
        return;
    }

    await window.addItemToFirestore(text, categorySelect.value);

    input.value = "";
    input.focus();
}

addButton.addEventListener("click", addItem);

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addItem();
    }
});

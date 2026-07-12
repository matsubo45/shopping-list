let items = [];

const addButton =
    document.getElementById("addButton");

const input =
    document.getElementById("itemInput");

const list =
    document.getElementById("itemList");

function saveItems() {

    localStorage.setItem(
        "shoppingItems",
        JSON.stringify(items)
    );

}
function loadItems() {

    const saved =
        localStorage.getItem(
            "shoppingItems"
        );

    if (saved) {
        items =
            JSON.parse(saved);
    }
}

function renderItems() {

    list.innerHTML = "";

//    for (const item of items) {
    for (const [index, item] of items.entries()) {
    
        const li = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.checked;
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";
        deleteButton.addEventListener(
           "click",
           async function() {

             await window.deleteItemFromFirestore(
               item.id
             );

        items.splice(index, 1);

        saveItems();

        renderItems();

    }
);

checkbox.addEventListener(
    "change",
    async function () {

        item.checked =
            checkbox.checked;

        await window.updateItemChecked(
            item.id,
            checkbox.checked
        );

        saveItems();

    }
);
if (item.checked) {
    li.style.color = "gray";
}        
        li.appendChild(checkbox);
        li.appendChild(document.createTextNode(" " + item.text + " "));
        li.appendChild(deleteButton);
        list.appendChild(li);

    }

}

// 起動時
loadItems();
renderItems();

async function addItem() {

    const text = input.value.trim();

if (text === "") {
    return;
}
    

//    items.push({
//        text: text,
//        checked: false
//    });
await window.addItemToFirestore(text);
//    saveItems();

//    renderItems();

    input.value = "";
    input.focus();
}

addButton.addEventListener(
    "click",
    addItem
);

input.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            addItem();
        }

    }
);

console.log("app.js開始");

console.log(window.loadItemsFromFirestore);

console.log(items);

window.setItems = function(data) {

    items = data;

    renderItems();

};

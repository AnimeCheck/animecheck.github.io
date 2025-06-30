/*
    For Modals
*/
// Modal for voice actors
document.addEventListener('click', function (e) {
    if (e.target.closest('.va-link')) {
        const link = e.target.closest('.va-link');
        const name = link.dataset.name;
        const vaMalId = link.dataset.vamalid;
        const image = link.dataset.image;
        const lang = link.dataset.lang;

        // Update modal info
        document.getElementById('vaModalLabel').textContent = `${name} (${vaMalId})`;
        document.getElementById('vaModalName').textContent = name;
        document.getElementById('vaModalImage').src = image;
        document.getElementById("vaModalImageLink").href = image;
        document.getElementById('vaModalLang').textContent = `Dub: ${lang}`;
        document.getElementById('vaModalCharacters').innerHTML = ""; // Clear any old content

        // Show the button
        const topCharButton = document.getElementById('triggerTopCharacters');
        topCharButton.style.display = "inline-block";
        topCharButton.onclick = function () {
            topCharButton.style.display = "none"; // hide it after click
            checkTopCharacters(vaMalId); // Call your function
        };

    }
});

// HTML for the row of every characters. 
function createCharacterListHTML(charList) {
    return charList.map((char, index) => `
        <li class="d-flex align-items-center mb-2 custom-top-char-row">
            <div class="me-2 text-center" style="width: 40px; flex-shrink: 0;">
                <span class="fs-5">${index + 1}</span>
            </div>
            <img src="${char.image}" alt="${char.name}" class="me-2 rounded"
                style="width: 50px; height: 50px; object-fit: cover; flex-shrink: 0;" loading="lazy">

            <div class="flex-grow-1 text-start" style="min-width: 0;">
                <div><strong class="fs-6 text-break me-1">${char.name}</strong><span class="text-secondary small">(#${char.id})</span></div>
                <div class="text-info text-break"><em>${char.animeTitle}</em></div>
                <div class="text-warning small">❤ ${char.favorites.toLocaleString()} favorites</div>
            </div>
        </li>
    `).join('');
}

const vaModal = document.getElementById('vaModal');
// Fix accessibility warning by blurring the focused element before hiding
vaModal.addEventListener('hide.bs.modal', () => {
    // Move focus to body or blur the currently focused element
    if (document.activeElement && vaModal.contains(document.activeElement)) {
        document.activeElement.blur();
    }
});

// When the bootstrap modal is closed, making sure nothing in the background is running.
vaModal.addEventListener('hidden.bs.modal', () => {
    activeModalSession = null;
    document.getElementById('vaModalCharacters').innerHTML = ""; // clear old content
});

const topAnimeModal = document.getElementById('topAnimeCharactersModal');
// Fix accessibility warning by blurring the focused element before hiding
topAnimeModal.addEventListener('hide.bs.modal', () => {
    // Blur the focused element if it's inside the modal
    if (document.activeElement && topAnimeModal.contains(document.activeElement)) {
        document.activeElement.blur();
    }
});

// When the top 50 anime characters modal closes, making sure nothing in the background is running
topAnimeModal.addEventListener("hidden.bs.modal", () => {
    isTop50AnimeCharModalSession = false; // cancel the loop
    document.getElementById("topAnimeCharactersList").innerHTML = ""; // clear old content
});

// Clear Local Storage button
document.getElementById("clearCacheBtn").addEventListener("click", () => {
    // Clear top favorites VA main role characters
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(FAV_OF_CHARACTER_KEY_PREFIX)) {
            localStorage.removeItem(key);
        }
    });

    // Clear top anime character list and timestamp
    localStorage.removeItem(TOP50_STORAGE_KEY);
    localStorage.removeItem(TOP50_UPDATED_AT_KEY);

    // Toast for the button Clear Local Storage
    const toastEl = document.getElementById("clearToast");
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
});

// Check Local Storage Size button
document.getElementById("checkStorageBtn").addEventListener("click", () => {
    let totalBytes = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const item = localStorage.getItem(key);
            totalBytes += key.length + item.length;
        }
    }
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);

    const body = document.getElementById("storageToastBody");
    body.innerHTML = `
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <i class="bi bi-hdd"></i>
            <div>Local Storage usage: </div><div>${mb} MB / 5.00 MB</div>
        </div>
    `;

    // Toast for the button Check Local Storage Size
    const toast = new bootstrap.Toast(document.getElementById("storageToast"));
    toast.show();
});

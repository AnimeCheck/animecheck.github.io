/*
    Handling hide.bs.modal / hidden.bs.modal events
    Cleaning up activeModalSession or isTop50AnimeCharModalSession
    "Clear Local Storage" and "Check Storage Size" buttons
*/

// VA modal accessibility + cleanup
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

// Top 50 Anime modal accessibility + cleanup
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

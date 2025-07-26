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

// Settings modal accessibility + cleanup
const settingsModal = document.getElementById('settingsModal');
// Fix accessibility warning by blurring the focused element before hiding
settingsModal.addEventListener('hide.bs.modal', () => {
    document.body.focus(); // move focus away from modal before it hides
});

// Show favorite counter and every storage size pill in the settings modal
document.getElementById('settingsModal').addEventListener('show.bs.modal', () => {
    favoriteCounterSettings();
    updateStorageSizePills();
});

// Favorite option
document.getElementById("viewFavoritesBtn").addEventListener("click", () => {
    document.getElementById("animeDetailsWrapper").classList.add("d-none");
    document.getElementById("animeCharacters").classList.add("d-none");
    document.getElementById("viewFavoriteCharacters").classList.remove("d-none");
    renderFavoriteCharacters();
});

// Privacy option
let isBlurEnabled = document.getElementById('privacyBlurToggle').checked;

function toggleImageBlur(enabled) {
    // Select anime posters and character images only
    const images = document.querySelectorAll('.anime-poster, .character-image');

    images.forEach(img => {
        img.classList.toggle('blur-images', enabled);
    });
}

document.getElementById('privacyBlurToggle').addEventListener('change', (event) => {
    // Listen for Privacy toggle changes
    isBlurEnabled = event.target.checked;
    sessionStorage.setItem('privacyBlur', isBlurEnabled);
    toggleImageBlur(isBlurEnabled);
});

// Clear Local Storage button
document.getElementById("clearCacheBtn").addEventListener("click", () => {
    const clearTop50 = document.getElementById("toggleClearTop50").checked;
    const clearVAChars = document.getElementById("toggleClearVAChars").checked;
    const clearFavChars = document.getElementById("toggleClearFavChars").checked;

    // Clear favorite characters. Order is important.
    if (clearFavChars) {
        StorageHelper.remove(FAVORITES_KEY);

        // If list is visible, update the list and show it empty
        renderFavoriteCharacters();

        // Update all star icons on UI after clearing favorites
        document.querySelectorAll('[data-charid]').forEach(icon => {
            icon.classList.remove('bi-star-fill');
            icon.classList.add('bi-star');
        });
    }

    // Clear VA main role characters except favorite characters
    if (clearVAChars) {
        const favoriteCharIds = StorageHelper.get(FAVORITES_KEY) || [];
        const idsOnly = favoriteCharIds.map(char => char.id);

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(FAV_OF_CHARACTER_KEY_PREFIX)) {
                // Remove prefix and keep the id number
                const charIdStr = key.slice(FAV_OF_CHARACTER_KEY_PREFIX.length);
                const charId = Number(charIdStr);

                // Exclude your favorite characters key from removal
                if (!idsOnly.includes(charId)) {
                    StorageHelper.remove(key);
                }
            }
        });
    }

    // Clear top anime character list and timestamp
    if (clearTop50) {
        StorageHelper.remove(TOP50_STORAGE_KEY);
        StorageHelper.remove(TOP50_UPDATED_AT_KEY);
    }

    favoriteCounterSettings();
    updateStorageSizePills();

    // Check if all toggles are off
    if (!clearTop50 && !clearVAChars && !clearFavChars) {
        showToast({
            message: "Nothing is cleared.",
            type: "warning"
        });
    } else {
        showToast({
            message: "Local storage cleared successfully.",
            type: "success"
        });
    }
});

// Check Local Storage Size button
document.getElementById("checkStorageBtn").addEventListener("click", () => {
    const mb = StorageHelper.size(); // Centralized size calculation

    showToast({
        message: `
            <div class="d-flex flex-wrap gap-2 align-items-center">
                <i class="bi bi-hdd"></i>
                <div>Storage size: </div>
                <div>${mb} MB / 5.00 MB</div>
            </div>
        `,
        type: "dark"
    });
});

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Privacy Blur toggle. Load setting from sessionStorage on page load
    isBlurEnabled = sessionStorage.getItem('privacyBlur') === 'true'; // to convert it to Boolean
    document.getElementById('privacyBlurToggle').checked = isBlurEnabled;
    toggleImageBlur(isBlurEnabled);

    // Tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach(el => new bootstrap.Tooltip(el));
});

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

// Show saved characters counter and every storage size pill in the settings modal
settingsModal.addEventListener('show.bs.modal', () => {
    savedCharCounterSettings();
    updateStorageSizePills();
});

// Save list button
document.getElementById("viewSavedCharListBtn").addEventListener("click", () => {
    // Show saved characters list
    document.getElementById("viewSavedCharacters").classList.remove("d-none");
    // Hide other: Anime details
    document.getElementById("mainContent").classList.add("d-none");
    document.getElementById("animeDetailsWrapper").classList.add("d-none");
    document.getElementById("animeCharacters").classList.add("d-none");
    renderSavedCharacters();
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
    toggleImageBlur(isBlurEnabled);
});

// Clear Local Storage button
document.getElementById("clearCacheBtn").addEventListener("click", () => {
    const clearTop50 = document.getElementById("toggleClearTop50").checked;
    const clearVAChars = document.getElementById("toggleClearVAChars").checked;
    const clearSavedChars = document.getElementById("toggleClearSavedChars").checked;

    // Check if all toggles are off
    if (!clearTop50 && !clearVAChars && !clearSavedChars) {
        showToast({
            message: "No options selected. Nothing cleared.",
            type: "warning"
        });
        return;
    }

    // Clear saved characters. Order is important.
    if (clearSavedChars) {
        StorageHelper.remove(SAVED_CHAR_KEY);
        StorageHelper.remove("favoriteCharacters"); // OLD key. To remove one day

        // If list is visible, update the list and show it empty
        renderSavedCharacters();

        // Update all star icons on UI after clearing saved characters
        document.querySelectorAll('[data-charid]').forEach(icon => {
            icon.classList.remove('bi-star-fill');
            icon.classList.add('bi-star');
        });
    }

    // Clear VA main role characters except saved characters
    if (clearVAChars) {
        const savedCharIds = StorageHelper.get(SAVED_CHAR_KEY) || [];
        const idsOnly = new Set(savedCharIds.map(char => char.id));
        const keysToRemove = []; // To gather the keys first

        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(FAV_OF_CHARACTER_KEY_PREFIX)) {
                // Remove prefix and keep the id number
                const charIdStr = key.slice(FAV_OF_CHARACTER_KEY_PREFIX.length);
                const charId = Number(charIdStr);

                // Exclude your saved characters key from removal
                if (!idsOnly.has(charId)) {
                    keysToRemove.push(key);
                }
            }
        }

        // Remove them all in one go
        for (const key of keysToRemove) {
            StorageHelper.remove(key);
        }
    }

    // Clear top anime character list and timestamp
    if (clearTop50) {
        StorageHelper.remove(TOP50_STORAGE_KEY);
        StorageHelper.remove(TOP50_UPDATED_AT_KEY);
    }

    // Update counters
    savedCharCounterSettings();
    updateStorageSizePills();

    showToast({
        message: "Selected data cleared successfully.",
        type: "success"
    });
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

// Settings configuration saving and loading
function saveConfig() {
    const config = {
        privacyBlurToggle: document.getElementById('privacyBlurToggle').checked,
        toggleEnglish: document.getElementById('toggleEnglish').checked,
        toggleJapanese: document.getElementById('toggleJapanese').checked,
        toggleOther: document.getElementById('toggleOther').checked,
        toggleClearTop50: document.getElementById('toggleClearTop50').checked,
        toggleClearVAChars: document.getElementById('toggleClearVAChars').checked,
        toggleClearSavedChars: document.getElementById('toggleClearSavedChars').checked,
        isPrettify: document.getElementById('prettifyRadio').checked,
        toggleSFW: document.getElementById("toggleSFW").checked
    };
    localStorage.setItem('userConfig', JSON.stringify(config));
}

function loadConfig() {
    const saved = localStorage.getItem('userConfig');
    if (!saved) return;

    const config = JSON.parse(saved);

    if (config.privacyBlurToggle !== undefined) {
        document.getElementById('privacyBlurToggle').checked = config.privacyBlurToggle;
        toggleImageBlur(config.privacyBlurToggle);
    }
    if (config.toggleEnglish !== undefined) {
        document.getElementById('toggleEnglish').checked = config.toggleEnglish;
    }
    if (config.toggleJapanese !== undefined) {
        document.getElementById('toggleJapanese').checked = config.toggleJapanese;
    }
    if (config.toggleOther !== undefined) {
        document.getElementById('toggleOther').checked = config.toggleOther;
    }
    if (config.isPrettify !== undefined) {
        document.getElementById('prettifyRadio').checked = config.isPrettify;
        document.getElementById('minifyRadio').checked = !config.isPrettify;
    }
    if (config.toggleClearTop50 !== undefined) {
        document.getElementById('toggleClearTop50').checked = config.toggleClearTop50;
    }
    if (config.toggleClearVAChars !== undefined) {
        document.getElementById('toggleClearVAChars').checked = config.toggleClearVAChars;
    }
    if (config.toggleClearSavedChars !== undefined) {
        document.getElementById('toggleClearSavedChars').checked = config.toggleClearSavedChars;
    }
    if (config.toggleSFW !== undefined) {
        document.getElementById('toggleSFW').checked = config.toggleSFW;
    }
}

// Reset Config
const toggleResetConfig = document.getElementById('toggleResetConfig');
const resetConfigBtn = document.getElementById('resetConfigBtn');

toggleResetConfig.addEventListener('change', () => {
    resetConfigBtn.disabled = !toggleResetConfig.checked;
});

resetConfigBtn.addEventListener('click', () => {
    localStorage.removeItem('userConfig');
    location.reload(); // Reload page
});

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();

    // Save config whenever any toggle changes
    const checkboxes = [
        'privacyBlurToggle', 
        'toggleEnglish', 
        'toggleJapanese', 
        'toggleOther', 
        'toggleClearTop50', 
        'toggleClearVAChars', 
        'toggleClearSavedChars',
        'toggleSFW'
    ];
    const radios = ['prettifyRadio', 'minifyRadio'];

    [...checkboxes, ...radios].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            saveConfig();
        });
    });

    // Toggling a Voice Actors language option will show a toast
    ["toggleEnglish", "toggleJapanese", "toggleOther"].forEach(id => {
        document.getElementById(id).addEventListener("change", () => {
            showToast({
                message: "Your choice will apply the next time characters are fetched.",
                type: "dark",
                icon: "bi-info-circle",
                delay: 5000
            });
        });
    });

    // Privacy Blur toggle. Load setting from sessionStorage on page load
    const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
    isBlurEnabled = userConfig.privacyBlurToggle === true; // to convert it to Boolean
    document.getElementById('privacyBlurToggle').checked = isBlurEnabled;
    toggleImageBlur(isBlurEnabled);

    // Tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach(el => new bootstrap.Tooltip(el));
});

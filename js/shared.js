// HTML for the row of every characters. 
function createCharacterListHTML(charList) {
    return charList.map((char, index) => {
        const name = escapeHTML(char.name);
        const animeTitle = escapeHTML(char.animeTitle);
        const id = Number(char.id);

        const isSavedChar = isSavedCharacter(id);
        const starClass = isSavedChar ? "bi-star-fill text-light" : "bi-star text-light";
        
        return `
            <li class="d-flex align-items-center mb-2 custom-top-char-row">
                <div class="me-2 text-center" style="width: 40px; flex-shrink: 0;">
                    <span class="fs-5">${index + 1}</span>
                </div>
                <img src="${char.image}" alt="${name}" class="me-2 rounded"
                    style="width: 50px; height: 50px; object-fit: cover; flex-shrink: 0;" loading="lazy">

                <div class="flex-grow-1 text-start" style="min-width: 0;">
                    <div>
                        <strong class="fs-6 text-break me-1">${firstLastNameFormat(name)}</strong>
                        <i class="bi ${starClass}" data-charid="${id}" data-charname="${name}"></i>
                        <span class="text-secondary small">(#${id})</span>
                    </div>
                    <div class="text-info text-break">
                        <em class="anime-title-clickable">${animeTitle}</em>
                    </div>
                    <div class="text-warning small">❤ ${char.favorites.toLocaleString()} favorites</div>
                </div>
            </li>
        `;
    }).join('');
}

let lastClickTime = 0;

function clickableAnimeTitleToSearchInput() {
    document.querySelectorAll('.anime-title-clickable').forEach(el => {
        el.addEventListener('click', () => {
            // To prevent several spammy clicks on different titles
            const now = Date.now();
            if (now - lastClickTime < 1000) {
                showToast({
                    message: "Please slow down...",
                    type: "warning",
                    icon: "bi bi-exclamation-triangle-fill",
                    delay: 2000,
                });
                return; // Ignore fast clicks
            }
            lastClickTime = now;

            const title = el.textContent.trim();
            const input = document.getElementById('search');
            input.value = title;
            input.dispatchEvent(new Event('input'));
            //console.log("opening suggestion list");

            const suggestions = document.getElementById('suggestions');
            if (!suggestions) return; // Avoid observing if suggestions container doesn't exist

            // MutationObserver to replace the setTimeout and it looks better
            const observer = new MutationObserver(() => {
                const firstSuggestion = suggestions.querySelector('.suggestion-item');

                if (firstSuggestion) {
                    //console.log("highlighting first choice");
                    // Add active class to highlight it
                    firstSuggestion.classList.add('active');

                    // Update your selectedIndex variable if you use it globally
                    if (typeof selectedIndex !== 'undefined') {
                        selectedIndex = 0;
                    }
                    observer.disconnect(); // Stop watching for changes. We only need to react once, not every time the list changes
                    firstSuggestion.click();
                }
            });
            // Start observing the suggestions container
            observer.observe(suggestions, { childList: true });
        });
    });
}

function firstLastNameFormat(name) {
    if (!name.includes(',')) return name; // No comma, return as-is

    const [last, first] = name.split(',').map(part => part.trim());
    return `${first} ${last}`; // First name Last name format
}

function seasonIcon(season) {
    const icons = {
        Spring: '<i class="bi bi-flower2"></i>',
        Summer: '<i class="bi bi-sun-fill"></i>',
        Fall: '<i class="bi bi-leaf-fill"></i>',
        Winter: '<i class="bi bi-snow"></i>',
    };

    const icon = icons[season];
    return icon ? `${icon} ${season}` : "";
}

// Global Toast
let toastInstance = null;
let toastIsShowing = false;

function showToast({ message = "", type = "dark", icon = "", delay = 4000 }) {
    const toastEl = document.getElementById("globalToast");
    const toastBody = document.getElementById("globalToastBody");
    const closeBtn = toastEl.querySelector(".btn-close");

    // Initialize toast instance once
    if (!toastInstance) {
        toastInstance = new bootstrap.Toast(toastEl, { delay });
    } else {
        toastInstance._config.delay = delay; // update delay if needed
    }

    const updateAndShow = () => {
        // Update classes
        toastEl.className = `toast text-bg-${type} border-0`;

        // Update message + icon
        toastBody.innerHTML = icon ? `<i class="${icon} me-2"></i>${message}` : message;

        // Update close button color
        if (type === "warning") {
            closeBtn.classList.remove("btn-close-white");
        } else {
            closeBtn.classList.add("btn-close-white");
        }

        toastInstance.show();
        toastIsShowing = true;
    };

    // Always ensure we reset `toastIsShowing` when the toast hides
    toastEl.addEventListener("hidden.bs.toast", () => {
        toastIsShowing = false;
    });

    // Show immediately or wait for current to hide
    if (toastIsShowing) {
        toastInstance.hide(); // triggers "hidden.bs.toast" which will call updateAndShow later
        toastEl.addEventListener("hidden.bs.toast", function handler() {
            toastEl.removeEventListener("hidden.bs.toast", handler);
            updateAndShow();
        });
    } else {
        updateAndShow();
    }
}

// Sync all <i data-charid> star icons with current saved state.
function syncSavedCharStarIcons() {
    document.querySelectorAll('i[data-charid]').forEach(icon => {
        const charId = Number(icon.dataset.charid);
        const isSaved = isSavedCharacter(charId);

        icon.classList.toggle('bi-star-fill', isSaved);
        icon.classList.toggle('bi-star', !isSaved);
    });
}

// localStorage helper
const StorageHelper = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            return JSON.parse(item);
        } catch (e) {
            console.warn(`Error parsing localStorage for key "${key}"`, e);
            return null;
        }
    },

    set(key, value) {
        try {
            const json = JSON.stringify(value);
            localStorage.setItem(key, json);
        } catch (e) {
            console.error(`Error storing localStorage key "${key}"`, e);
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    has(key) {
        return localStorage.getItem(key) !== null;
    },

    clear() {
        localStorage.clear();
    },

    keys() {
        return Object.keys(localStorage);
    },

    size() {
        let totalBytes = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const item = localStorage.getItem(key);
                // Always account for key + value, even if value is empty string
                const value = item ?? '';
                totalBytes += new TextEncoder().encode(key + value).length;
            }
        }
        const mb = (totalBytes / 1000000).toFixed(2);
        return `${mb}`;
    }
};

function updateStorageSizePills() {
    // Saved Characters
    const savedChars = StorageHelper.get('savedCharacters') || [];
    const savedCharSize = new Blob(['savedCharacters' + JSON.stringify(savedChars)]).size;
    document.getElementById('savedCharSize').innerText = Math.round(savedCharSize / 1000) + ' KB';

    // Top 50 + Timestamp
    const top50Cache = StorageHelper.get('top50AnimeCharCache') || [];
    const top50UpdatedAt = StorageHelper.get('top50AnimeCharUpdatedAt') || null;
    const cacheSize = new Blob(['top50AnimeCharCache' + JSON.stringify(top50Cache)]).size;
    const updatedAtSize = new Blob(['top50AnimeCharUpdatedAt' + JSON.stringify(top50UpdatedAt)]).size;
    const top50Size = cacheSize + updatedAtSize;
    document.getElementById('top50Size').innerText = Math.round(top50Size / 1000) + ' KB';

    // Voice Actor character caches
    let vaTotalSize = 0;
    for (const key in localStorage) {
        if (key.startsWith('fav_of_character_')) {
            const item = localStorage.getItem(key);
            // Size of all VAs' characters. Blob will slowdown, so we use TextEncoder... instead
            if (item) vaTotalSize += new TextEncoder().encode(key + item).length;
        }
    }
    document.getElementById('vaCharSize').innerText = Math.round(vaTotalSize / 1000) + ' KB';
}

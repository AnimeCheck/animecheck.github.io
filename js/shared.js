// HTML for the row of every characters. 
function createCharacterListHTML(charList) {
    return charList.map((char, index) => {
        const name = escapeHTML(char.name);
        const animeTitle = escapeHTML(char.animeTitle);
        const id = Number(char.id);

        const isFavorite = isFavoriteCharacter(id);
        const starClass = isFavorite ? "bi-star-fill text-light" : "bi-star text-light";
        
        return `
            <li class="d-flex align-items-center mb-2 custom-top-char-row">
                <div class="me-2 text-center" style="width: 40px; flex-shrink: 0;">
                    <span class="fs-5">${index + 1}</span>
                </div>
                <img src="${char.image}" alt="${name}" class="me-2 rounded"
                    style="width: 50px; height: 50px; object-fit: cover; flex-shrink: 0;" loading="lazy">

                <div class="flex-grow-1 text-start" style="min-width: 0;">
                    <div>
                        <strong class="fs-6 text-break me-1">${name}</strong>
                        <i class="bi ${starClass}" data-charid="${id}" data-charname="${name}"></i>
                        <span class="text-secondary small">(#${id})</span>
                    </div>
                    <div class="text-info text-break"><em>${animeTitle}</em></div>
                    <div class="text-warning small">❤ ${char.favorites.toLocaleString()} favorites</div>
                </div>
            </li>
        `;
    }).join('');
}

function firstLastNameFormat(name) {
    if (!name.includes(',')) return name; // No comma, return as-is

    const [last, first] = name.split(',').map(part => part.trim());
    return `${first} ${last}`; // First name Last name format
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

// To sanitize string data.
function escapeHTML(str) {
    return String(str).replace(/[&<>"'`=\/]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#x60;',
        '=': '&#x3D;',
        '/': '&#x2F;'
    })[char]);
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
                totalBytes += key.length + (item?.length || 0);
            }
        }
        const mb = (totalBytes / (1024 * 1024)).toFixed(2);
        return `${mb}`;
    }
};
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

function firstLastNameFormat(name) {
    if (!name.includes(',')) return name; // No comma, return as-is

    const [last, first] = name.split(',').map(part => part.trim());
    return `${first} ${last}`; // First name Last name format
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
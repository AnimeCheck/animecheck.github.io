// Import Export Download Upload
const importBtn = document.getElementById('importDataBtn');
const importInput = document.getElementById('importDataInput');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max file size
const EXPORT_SOURCE = 'animeCheck-client-source';

// Export favorites as JSON file
document.getElementById('exportDataBtn').addEventListener('click', async () => {
    const isPrettify = document.getElementById('prettifyRadio')?.checked;
    // Gather all export data (Favorites, Top 50, fav_of_character_)
    const favoriteCharacters = StorageHelper.get('favoriteCharacters') || [];
    const top50AnimeCharCache = StorageHelper.get('top50AnimeCharCache') || [];
    const top50AnimeCharUpdatedAt = StorageHelper.get('top50AnimeCharUpdatedAt') || null;
    const favOfCharacter = {};
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fav_of_character_')) {
            favOfCharacter[key] = StorageHelper.get(key);
        }
    });

    // Build export object WITHOUT signature
    const exportData = {
        favoriteCharacters,
        top50AnimeCharCache,
        top50AnimeCharUpdatedAt,
        favOfCharacter
    };

    // Serialize WITHOUT signature
    const unsignedStr = JSON.stringify(exportData);
    // Calculate signature with secret
    const signature = await sha256(unsignedStr + EXPORT_SOURCE);
    // Add _signature to export object
    exportData._signature = signature;

    // Export as JSON including signature with pretty print format
    const dataStr = JSON.stringify(exportData, null, isPrettify ? 2 : 0);

    // Check export size limit
    const dataSize = new Blob([dataStr]).size;
    if (dataSize > MAX_FILE_SIZE) {
        showToast({
            message: "Export file too large to save (max 5 MB).",
            type: "danger",
            icon: "bi bi-x-circle"
        });
        return; // Stop export
    }

    // Create Blob and download file
    const blob = new Blob([dataStr], { type: "application/json" });
    const fileName = isPrettify ? 'animeCheckData.json' : 'animeCheckData.min.json';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast({
        message: "Anime Check data exported with signature!",
        type: "success",
        icon: "bi bi-download"
    });
});

// Trigger file selector for import
importBtn.addEventListener('click', () => {
    importInput.click();
});

// Import favorites from selected JSON file (skip existing)
importInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    importBtn.disabled = true; // Disable import button during processing

    // Check import size limit
    if (file.size > MAX_FILE_SIZE) {
        showToast({
            message: "Import file too large (max 5 MB).",
            type: "danger",
            icon: "bi bi-x-circle"
        });
        event.target.value = ''; // reset input
        importBtn.disabled = false;
        return;
    }

    const reader = new FileReader();
    let added = 0, skipped = 0;

    reader.onload = async function (e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Extract signature and remove it from object
            const receivedSig = imported._signature;
            delete imported._signature;

            // Compute expected signature
            const unsignedStr = JSON.stringify(imported);
            const expectedSig = await sha256(unsignedStr + EXPORT_SOURCE);

            if (receivedSig !== expectedSig) {
                showToast({
                    message: "Import rejected: invalid or tampered file.",
                    type: "danger",
                    icon: "bi bi-shield-x"
                });
                importBtn.disabled = false;
                event.target.value = '';
                return;
            }

            // Strict whitelist for top-level keys
            const allowedKeys = ['favoriteCharacters', 'top50AnimeCharCache', 'top50AnimeCharUpdatedAt', 'favOfCharacter'];
            const unknownKeys = Object.keys(imported).filter(key => !allowedKeys.includes(key));
            if (unknownKeys.length > 0) {
                consoleWarn("Unknown keys in import:", unknownKeys);
                skipped += unknownKeys.length; // optional: count them
            }

            // favoriteCharacters: merge, skip existing
            if (Array.isArray(imported.favoriteCharacters)) {
                const existing = StorageHelper.get('favoriteCharacters') || [];
                const existingIds = new Set(existing.map(char => char.id));

                imported.favoriteCharacters.forEach(char => {
                    if (isValidFavoriteCharacter(char) && !existingIds.has(char.id) && existing.length < 1000) {
                        existing.push(sanitizeFavCharacter(char));
                        existingIds.add(char.id);
                        added++;
                    } else {
                        skipped++;
                    }
                });
                StorageHelper.set('favoriteCharacters', existing);
            }

            // top50AnimeCharCache: overwrite
            if (Array.isArray(imported.top50AnimeCharCache)) {
                const truncated = imported.top50AnimeCharCache.slice(0, 50);

                if (isValidTop50Cache(truncated)) {
                    // Sanitize all entries before saving
                    const sanitized = truncated.map(sanitizeTop50Entry);
                    // Counter
                    if (StorageHelper.get('top50AnimeCharCache')) {
                        skipped++;
                    } else {
                        added++;
                    }

                    StorageHelper.set('top50AnimeCharCache', sanitized);
                } else {
                    consoleWarn('Invalid top50AnimeCharCache format in import, skipping.');
                    skipped++;
                }
            }

            // top50AnimeCharUpdatedAt: overwrite
            if (imported.top50AnimeCharUpdatedAt) {
                if (isValidTimestamp(imported.top50AnimeCharUpdatedAt)) {
                    // Counter
                    if (StorageHelper.get('top50AnimeCharUpdatedAt')) {
                        skipped++;
                    } else {
                        added++;
                    }
                    StorageHelper.set('top50AnimeCharUpdatedAt', imported.top50AnimeCharUpdatedAt);
                } else {
                    consoleWarn('Invalid top50AnimeCharUpdatedAt timestamp in import, skipping.');
                    skipped++;
                }
            }

            // fav_of_character_: merge, skip existing
            if (imported.favOfCharacter && typeof imported.favOfCharacter === 'object') {
                Object.entries(imported.favOfCharacter).forEach(([key, value]) => {
                    if (!key.startsWith('fav_of_character_')) {
                        skipped++;
                        return;
                    }

                    // Validate each favOfCharacter[key] has expected object structure
                    if (!localStorage.getItem(key) && isValidFavOfCharacter(value)) {
                        try {
                            const sanitizedValue = sanitizeFavOfCharacter(value);
                            StorageHelper.set(key, sanitizedValue);
                            added++;
                        } catch (e) {
                            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                                showToast({
                                    message: "Storage limit reached. Import aborted.",
                                    type: "danger"
                                });
                                throw e; // or handle gracefully to stop further writes
                            }
                        }
                    } else {
                        skipped++;
                    }
                    // If you want to always overwrite, replace this with StorageHelper.set(key, value);
                });
            }

            renderFavoriteCharacters();

            // Sync all star icons with current favorite state ---
            syncFavoriteStarIcons();
            favoriteCounterSettings();
            updateStorageSizePills();

            showToast({
                message: `${added} imported, ${skipped} skipped.`,
                type: added ? "success" : "warning",
                icon: "bi bi-upload"
            });
        } catch (err) {
            showToast({
                message: "Import failed. Invalid JSON file.",
                type: "danger",
                icon: "bi bi-x-circle"
            });
        } finally {
            importBtn.disabled = false;  // Re-enable import button
            event.target.value = '';     // Allow re-importing the same file
        }
    };
    reader.readAsText(file);
});

function sanitizeFavCharacter(char) {
    return {
        id: Number(char.id),
        name: String(char.name).trim(),
        image: String(char.image)
    };
}

function sanitizeTop50Entry(entry) {
    return {
        id: Number(entry.id),
        name: String(entry.name).trim(),
        image: String(entry.image).trim(),
        animeTitle: String(entry.animeTitle).trim(),
        favorites: Number(entry.favorites)
    };
}

function sanitizeFavOfCharacter(valueObj) {
    return {
        value: Number(valueObj.value),
        timestamp: Number(valueObj.timestamp)
    };
}

// Validate a single favorite character object
function isValidFavoriteCharacter(char) {
    // Inside favoriteCharacters[] array, we have objects
    if (!char || typeof char !== 'object' || Array.isArray(char)) {
        return false;
    }

    // Ensure no unexpected keys
    const allowedKeys = ['id', 'name', 'image'];
    const keys = Object.keys(char);

    if (keys.length !== allowedKeys.length || !keys.every(key => allowedKeys.includes(key))) {
        consoleWarn('Rejected: unexpected keys in favoriteCharacter entry:', keys);
        return false;
    }

    return char &&
        typeof char.id === 'number' &&
        typeof char.name === 'string' &&
        char.name.trim().length > 0 &&
        typeof char.image === 'string' &&
        /^https:\/\/cdn\.myanimelist\.net\/images\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(char.image);
}

// Validate top50AnimeCharCache is an array of valid entries
function isValidTop50Cache(cache) {
    if (!Array.isArray(cache)) return false;

    return cache.every(entry => {
        // If entry is missing, not an object, or is an array — return false.
        // Inside top50AnimeCharCache[] array, we have objects
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return false;
        }

        // Ensure no unexpected keys
        const allowedKeys = ['id', 'name', 'image', 'animeTitle', 'favorites'];
        const entryKeys = Object.keys(entry);

        if (entryKeys.length !== allowedKeys.length || !entryKeys.every(key => allowedKeys.includes(key))) {
            consoleWarn('Rejected: invalid keys in top50AnimeCharCache entry:', entryKeys);
            return false;
        }

        return entry &&
            typeof entry.id === 'number' &&
            typeof entry.name === 'string' && entry.name.trim().length > 0 &&
            typeof entry.image === 'string' &&
            /^https:\/\/cdn\.myanimelist\.net\/images\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(entry.image) &&
            typeof entry.animeTitle === 'string' && entry.animeTitle.trim().length > 0 &&
            typeof entry.favorites === 'number' && entry.favorites >= 0;
    });
}

// Validate top50AnimeCharUpdatedAt is a valid timestamp (milliseconds since epoch)
function isValidTimestamp(ts) {
    if (typeof ts !== 'number') return false;
    if (ts <= 0) return false;
    // Allow some leeway (e.g., up to 1 day in the future)
    const now = Date.now();
    if (ts > now + 24 * 60 * 60 * 1000) return false;
    return true;
}

// Validate that the favOfCharacter value object has sane numeric fields
function isValidFavOfCharacter(valueObj) {
    // Basic object and non-null check
    if (typeof valueObj !== 'object' || valueObj === null) {
        consoleWarn('Rejected: not a valid object.', valueObj);
        return false;
    }

    // Only allow "value" and "timestamp" keys
    const allowedKeys = ['value', 'timestamp'];
    const keys = Object.keys(valueObj);

    if (keys.length !== allowedKeys.length || !keys.every(key => allowedKeys.includes(key))) {
        consoleWarn('Rejected: unexpected keys.', keys);
        return false;
    }

    // Validate `value`: finite number, >= 0, <= 10 million (adjust max if needed)
    if (!Number.isFinite(valueObj.value) || valueObj.value < 0 || valueObj.value > 1e7) {
        consoleWarn('Rejected: invalid "value"', valueObj.value);
        return false;
    }

    // Validate `timestamp`: finite number and passes your isValidTimestamp() function
    if (!Number.isFinite(valueObj.timestamp) || !isValidTimestamp(valueObj.timestamp)) {
        consoleWarn('Rejected: invalid "timestamp"', valueObj.timestamp);
        return false;
    }

    return true;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
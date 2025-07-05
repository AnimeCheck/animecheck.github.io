// Handling the Top 10 main-role characters per voice actor

const FAV_OF_CHARACTER_KEY_PREFIX = "fav_of_character_";
let activeModalSession = null;

async function checkTopCharacters(vaMalId) {
    // For closing and opening another modal.
    activeModalSession = Date.now(); // create a new session token
    const session = activeModalSession; // capture it locally

    try {
        const mainCharacters = await getMainCharactersVoicedBy(vaMalId);
        // Fetch favorites in parallel
        const charactersWithFavorites = [];

        renderTopCharactersProgress(
            "vaModalCharacters",
            "Compiling top 10 main role characters...",
            mainCharacters.length
        );

        const progressCount = document.getElementById("progressCount");

        for (const char of mainCharacters) {
            // modal was changed/closed when loading
            if (session !== activeModalSession) {
                console.log("modal was changed/closed when loading");
                return;
            }

            // getCharacterFavorites will handle the delay to avoid hitting API limit rate.
            const favorites = await getCharacterFavorites(char.id);

            // You plug "favorites" to the char object.
            // With "...char", "favorites" is merged at the same level as name, id, etc. from char object.
            charactersWithFavorites.push({ ...char, favorites });

            // Progress UI update
            if (session === activeModalSession) {
                progressCount.textContent = `
                    Compiling top 10 main role characters... (${charactersWithFavorites.length}/${mainCharacters.length})
                `;
            }
        }

        // final render after all fetched
        if (session === activeModalSession) {
            // Sort by favorites descending and take top 10
            const top10char = charactersWithFavorites
                .sort((a, b) => b.favorites - a.favorites)
                .slice(0, 10);

            // Find the most recent character cache timestamp from localStorage
            let latestUpdate = 0;

            for (const char of top10char) {
                const cached = localStorage.getItem(`${FAV_OF_CHARACTER_KEY_PREFIX}${char.id}`);
                if (cached) {
                    const { timestamp } = JSON.parse(cached);
                    if (timestamp > latestUpdate) latestUpdate = timestamp;
                }
            }

            // If character list is already cached, get latestUpdate date instead of current date
            // To show a message like "Updated 4 minutes ago"
            const updatedAt = latestUpdate || Date.now();
            
            // Generate Top Main Char row HTML
            renderTopVoiceActorCharacters(top10char, mainCharacters.length, vaMalId, updatedAt);
        }
        
    } catch (err) {
        console.error("checkTopCharacters failed:", err);
        document.getElementById('vaModalCharacters').innerHTML = `
            <div class="text-danger">An error occurred while loading character data.</div>
        `;
    }
}

async function getMainCharactersVoicedBy(vaId) {
    console.log("Voiced Characters from VA: ", `https://api.jikan.moe/v4/people/${vaId}/voices`);
    try {
        const response = await throttledFetch(`https://api.jikan.moe/v4/people/${vaId}/voices`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataJSON = await response.json();
        const allVoices = dataJSON.data || []; // At "data": [{...},{...}]

        // Use a Set to store unique character names
        const seen = new Set(); // Because we want to avoid duplicates
        const mainCharacters = [];

        allVoices.forEach(entry => {
            // Getting characters where the role is Main and the anime is popular
            if (entry.role === "Main") {
                const char = {
                    id: entry.character.mal_id,
                    name: entry.character.name,
                    animeTitle: entry.anime.title,
                    image: entry.character.images?.jpg?.image_url || ""
                };

                // If the character is not a duplicate, add it.
                if (!seen.has(char.id)) {
                    seen.add(char.id);
                    mainCharacters.push(char); // adds the character in mainCharacters
                }
            }
        });

        //console.log("Main characters:", mainCharacters);
        return mainCharacters;
    } catch (error) {
        console.error("Failed to fetch voice roles:", error.message);
        return [];
    }
}

// Gotta avoid 429 error and try not making too many requests
const favoritesCache = {};
async function getCharacterFavorites(charMalId, retry = 2) {
    // Use in-memory cache first
    if (favoritesCache[charMalId] !== undefined) {
        return favoritesCache[charMalId]; // Return cached result if available
    }

    // Check localStorage
    try {
        const stored = localStorage.getItem(`${FAV_OF_CHARACTER_KEY_PREFIX}${charMalId}`);
        if (stored) {
            const { value } = JSON.parse(stored);
            favoritesCache[charMalId] = value;
            return value;
        }
    } catch {
        console.warn(`Invalid cache for character #${charMalId}, clearing.`, e);
        localStorage.removeItem(`${FAV_OF_CHARACTER_KEY_PREFIX}${charMalId}`);
    }

    //console.log("Characters Info URL: ", `https://api.jikan.moe/v4/characters/${charMalId}`);
    //console.log("Getting Character with favorites...");
    try {
        const response = await throttledFetch(`https://api.jikan.moe/v4/characters/${charMalId}`);
        // Check for 429 Too Many Requests
        if (response.status === 429) {
            showRateLimitToast();
            await delay(1000);
            if (retry > 0) return getCharacterFavorites(charMalId, retry - 1);
            return 0;
        }
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataJSON = await response.json();
        const fav = dataJSON.data.favorites || 0;
        // Store in cache
        favoritesCache[charMalId] = fav;
        // Store in localStorage
        const now = activeModalSession || Date.now();
        localStorage.setItem(`${FAV_OF_CHARACTER_KEY_PREFIX}${charMalId}`,
            JSON.stringify({ value: fav, timestamp: now })
        );
        return fav;
    } catch (error) {
        console.error("Error fetching favorites:", error.message);
        if (retry > 0) {
            return getCharacterFavorites(charMalId, retry - 1);
        }
        return 0; // fallback if error occurs
    }
}

async function updateTopVoiceActorCharacters(vaMalId) {
    activeModalSession = Date.now(); // new session to avoid overlap
    const session = activeModalSession;
    const mainCharacters = await getMainCharactersVoicedBy(vaMalId);
    const updatedCharacters = [];
    
    renderTopCharactersProgress(
        "vaModalCharacters",
        "Compiling top 10 main role characters...",
        mainCharacters.length
    );

    const updateProgress = document.getElementById("progressCount");

    for (const char of mainCharacters) {
        if (session !== activeModalSession) {
            console.log("modal was changed/closed when updating");
            return;
        }

        const key = `${FAV_OF_CHARACTER_KEY_PREFIX}${char.id}`;
        localStorage.removeItem(key);       // remove from localStorage
        delete favoritesCache[char.id];     // clear in-memory

        const favorites = await getCharacterFavorites(char.id);  // getCharacterFavorites setItem in localStorage
        updatedCharacters.push({ ...char, favorites });

        updateProgress.textContent = `Compiling top 10 main role characters.. (${updatedCharacters.length}/${mainCharacters.length})`;
    }

    // Final sorting and render
    if (session === activeModalSession) {
        const sorted = updatedCharacters
            .sort((a, b) => b.favorites - a.favorites)
            .slice(0, 10);
            
        renderTopVoiceActorCharacters(sorted, mainCharacters.length, vaMalId, session);
    }
}

function renderTopVoiceActorCharacters(charList, totalCount, vaMalId, updatedAt = Date.now()) {
    const updatedText = timeAgoText(updatedAt);
    const listHTML = createCharacterListHTML(charList);
    const container = document.getElementById("vaModalCharacters");

    container.innerHTML = `
        <div class="fs-5 fs-md-4 fs-lg-3 mb-2 text-center text-warning">
            Top 10 main role characters<br>out of ${totalCount}
        </div>
        <ul class="list-unstyled small">${listHTML}</ul>
        <button type="button" id="updateTopVoiceActorCharactersBtn" class="btn btn-sm btn-outline-info">
            <i class="bi bi-arrow-clockwise me-1"></i> Update Top 10 again?
        </button>
        <div class="text-muted small text-center mt-2" title="${new Date(updatedAt).toLocaleString()}">
            Updated ${updatedText}
        </div>
    `;

    // Setting up the "Update" button
    const updateBtn = document.getElementById('updateTopVoiceActorCharactersBtn');
    if (updateBtn) {
        updateBtn.onclick = () => {
            updateTopVoiceActorCharacters(vaMalId);
        };
    }
}

function renderTopCharactersProgress(containerId, message, totalCount) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span id="progressCount">${message} (0/${totalCount})</span>
        </div>
    `;
}

document.addEventListener('click', function (e) {
    if (e.target.closest('.va-link')) {
        const link = e.target.closest('.va-link');
        const name = link.dataset.name;
        const vaMalId = link.dataset.vamalid;
        const image = link.dataset.image;
        const lang = link.dataset.lang;

        // Update modal info
        document.getElementById('vaModalLabel').textContent = `${firstLastNameFormat(name)} (${vaMalId})`;
        document.getElementById('vaModalName').textContent = firstLastNameFormat(name);
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

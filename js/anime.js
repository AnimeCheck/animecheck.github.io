let activeModalSession = null;

async function getAnimeById(animeId) {
    console.log("Anime by id URL: ", `https://api.jikan.moe/v4/anime/${animeId}`);
    try {
        const response = await throttledFetch(`https://api.jikan.moe/v4/anime/${animeId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataJSON = await response.json();
        const titles = dataJSON.data?.titles || [];
        const studios = dataJSON.data?.studios || [];
        const genres = dataJSON.data?.genres || [];
        const themes = dataJSON.data?.themes || [];
        const airedDates = dataJSON.data?.aired.string || ["N/A"];
        const imageURL = dataJSON.data?.images.jpg.large_image_url;
        //console.log("imageURL: ", imageURL);
        const MALscore = dataJSON.data?.score || ["N/A"];
        const MALscoreUsers = dataJSON.data?.scored_by || ["N/A"];
        const MALrank = dataJSON.data?.rank || [""];
        const MALpopularity = dataJSON.data?.popularity || ["N/A"];
        /*console.log("MALscore: ", MALscore);
        console.log("MALscoreUsers: ", MALscoreUsers);
        console.log("MALrank: ", MALrank);
        console.log("MALpopularity: ", MALpopularity);*/

        // In the JSON, get every item of "titles": [...]. We want to get each title.
        const getTitle = (type) =>
            titles.find((item) => item.type === type)?.title || "N/A";
        
        const defaultTitle = getTitle("Default");
        const synonymTitle = getTitle("Synonym");
        const foreignTitle = getTitle("Japanese");
        const englishTitle = getTitle("English");
        // To show all studios of "studios": [..., ...]
        const studioNames = studios.map(item => 
            `<span class="badge bg-light text-dark me-2 rounded-pill">${item.name}</span>`
        ).join("");
        // To show all genres of "genres": [..., ...]
        const genreNames = genres.map(item => 
            `<span class="badge bg-success me-2 rounded-pill">${item.name}</span>`
        ).join("");
        // To show all themes of "themes": [..., ...]
        const themeNames = themes.map(item => 
            `<span class="badge bg-warning text-dark me-2 rounded-pill">${item.name}</span>`
        ).join("");
        /*console.log("Default:", defaultTitle);
        console.log("Synonym:", synonymTitle);
        console.log("Foreign:", foreignTitle);
        console.log("English:", englishTitle);
        console.log("studioName:", studioName);*/
        const animeDetailsHTML = `
            <div class="row mb-3 align-items-center">
                <div class="col-md-2">
                    <a href="${imageURL}" target="_blank" rel="noopener noreferrer">
                        <img src="${imageURL}" class="img-fluid rounded">
                    </a>
                </div>
                <div class="col-md-10 d-flex align-items-center">
                    <div class="w-100">
                        <div class="fs-3 fs-md-2 fs-lg-1">
                            ${foreignTitle} <span class="fs-5 fs-md-5 fs-lg-4 text-secondary">(${defaultTitle})</span>
                        </div>
                        <div class="fs-3 fs-md-2 fs-lg-1">
                            ${englishTitle} <span class="fs-5 fs-md-5 fs-lg-4 text-secondary">(${synonymTitle})</span>
                        </div>
                        <div class="mt-2">Studio: ${studioNames}</div>
                        <div>Genres: ${genreNames}</div>
                        <div>Themes: ${themeNames}</div>
                        <div>Aired: ${airedDates}</div>
                        <div class="bg-dark text-light my-2 p-2 d-flex flex-wrap gap-2 rounded">
                            <div>
                                MAL Score: <span class="badge bg-primary fs-6 rounded-pill">${MALscore}</span> 
                                <i>by ${MALscoreUsers} users</i> | 
                            </div>
                            <div>
                                Rank <span class="badge bg-secondary fs-6 rounded-pill">#${MALrank}</span> | 
                            </div>
                            <div>
                                Popularity: <span class="badge bg-secondary fs-6 rounded-pill">#${MALpopularity}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("animeDetailsWrapper").innerHTML = animeDetailsHTML;
    } catch (error) {
        console.error("Error fetching anime data:", error.message);
    }
}

const vaInfoCache = {};
async function getAnimeCharacters(animeId) {
    console.log("Anime Characters URL: ", `https://api.jikan.moe/v4/anime/${animeId}/characters`);
    try {
        const response = await throttledFetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataJSON = await response.json();
        const animeCharacters = dataJSON.data;
        const totalCharacters = animeCharacters.length;
        //console.log("Total Characters: ", totalCharacters);

        const container = document.getElementById("animeCharacters");

        // Add title header
        container.innerHTML = `<div class="fs-3 fs-md-2 fs-lg-1"><i class="bi bi-file-person me-1"></i>List of ${totalCharacters} characters</div>`;

        animeCharacters.forEach(entry => {
            const characterName = entry.character.name;
            const characterImage = entry.character.images.jpg.image_url;
            const voiceActors = entry.voice_actors;

            /*console.log("Name:", characterName);
            console.log("Image:", characterImage);
            console.log("-------------");*/

            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-3";

            // Build voice actors HTML
            let vaListHTML = "";
            // To get every item of "voice_actors": [...]
            voiceActors.forEach(va => {
                const vaMalId = va.person.mal_id;

                // Cache VA info per VA ID
                if (!vaInfoCache[vaMalId]) {
                    vaInfoCache[vaMalId] = {
                        name: va.person.name,
                        image: va.person.images.jpg.image_url,
                        lang: va.language
                    };
                } 
                //else {console.log(`Using cached VA info for: ${vaMalId} - ${vaInfoCache[vaMalId].name} (${vaInfoCache[vaMalId].lang})`);}

                const { name, image, lang } = vaInfoCache[vaMalId]; // reuses the saved object from the cache.

                vaListHTML += `
                    <div class="d-flex align-items-center mt-2">
                        <img src="${image}" alt="${name}" class="me-2 rounded" style="width: 40px; height: 40px; object-fit: cover;" loading="lazy">
                        <div>
                            <div>
                                <a href="#" class="va-link text-decoration-none" data-bs-toggle="modal" data-bs-target="#vaModal" 
                                    data-name="${name}" data-image="${image}" data-lang="${lang}" data-vamalid="${vaMalId}">
                                    <strong>${name}</strong>
                                </a>
                            </div>
                            <div class="small">${lang}</div>
                        </div>
                    </div>
                `;
            });

            // Final character card
            col.innerHTML = `
                <div class="card fade-in bg-dark text-light h-100">
                    <img src="${characterImage}" class="card-img-top" alt="${characterName}" loading="lazy">
                    <div class="card-body">
                        <h5 class="card-title custom-card-charname">${characterName}</h5>
                        <div>${vaListHTML}</div>
                    </div>
                </div>
            `;
            container.appendChild(col);

            // fade in when scrolling into view for that div card .fade-in
            const card = col.querySelector('.fade-in');
            if (card) observer.observe(card);
        });
    } catch (error) {
        console.error("Failed to fetch characters:", error);
    }
}

/*
    Fade-in animations when elements scroll into view
*/
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // optional: only once
        }
    });
});

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

// Modal for top anime characters
let isTop50AnimeCharModalSession = false;
let top50AnimeCharCache = null;
const TOP50_STORAGE_KEY = "top50AnimeCharCache";
const TOP50_UPDATED_AT_KEY = "top50AnimeCharUpdatedAt";
const TOP50_COMPLETE_COUNT = 50; // You expect exactly 50 characters

async function loadTopAnimeCharacters(forceRefresh = false) {
    isTop50AnimeCharModalSession = true;

    const topAnimeCharListEl = document.getElementById("topAnimeCharactersList");
    const storedUpdatedAt = parseInt(localStorage.getItem(TOP50_UPDATED_AT_KEY)) || Date.now();

    // If Update Top 50 button was clicked, delete cache and localStorage
    if (forceRefresh) {
        localStorage.removeItem(TOP50_STORAGE_KEY);
        top50AnimeCharCache = null;
    }

    // Load from localStorage
    const stored = localStorage.getItem(TOP50_STORAGE_KEY);
    if (!top50AnimeCharCache && stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) top50AnimeCharCache = parsed;
        } catch (e) {
            console.warn("Failed to parse Top 50 from localStorage:", e);
        }
    }

    // Use full cache immediately
    if (top50AnimeCharCache?.length === TOP50_COMPLETE_COUNT) {
        console.log("Using full Top 50 from localStorage");
        renderTopAnimeCharacters(top50AnimeCharCache, storedUpdatedAt);
        return;
    }
 
    // Show loading UI
    let index = Array.isArray(top50AnimeCharCache) ? top50AnimeCharCache.length : 0;
    topAnimeCharListEl.innerHTML = `
        <div class="d-flex justify-content-center align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span id="top50Count">Showing top 50 anime characters... (${index}/50)</span>
        </div>
    `;

    try {
        // Fetch page 1 (1–25)
        const res1 = await throttledFetch("https://api.jikan.moe/v4/characters?order_by=favorites&sort=desc&page=1");
        const data1 = await res1.json();
        // Fetch page 2 (26–50)
        const res2 = await throttledFetch("https://api.jikan.moe/v4/characters?order_by=favorites&sort=desc&page=2");
        const data2 = await res2.json();
        // Combine data1 and data2 together
        const charactersData = [...data1.data, ...data2.data].slice(0, TOP50_COMPLETE_COUNT); // .slice part for debugging

        // Reshape the data to use createCharacterListHTML
        const processedData = charactersData.map(char => ({
            id: char.mal_id,
            name: char.name,
            image: char.images.jpg.image_url,
            animeTitle: "", // this endpoint doesn't include it
            favorites: char.favorites ?? 0
        }));

        const top50Count = document.getElementById("top50Count");
        const enriched = top50AnimeCharCache ? [...top50AnimeCharCache] : []; // Pre-fill with cached results
        const remainingData = processedData.slice(enriched.length); // Skip already-fetched ones

        // Only reset cache if it wasn't loaded
        if (top50AnimeCharCache == null) {
            top50AnimeCharCache = [];
        }

        for (const char of remainingData) {
            if (!isTop50AnimeCharModalSession) break;

            //console.log(`Fetching anime title for: ${char.name} (#${char.id})`);
            top50Count.textContent = `Showing top 50 anime characters... (${index + 1}/50)`;
            
            //await smartDelayForTop50();
            await smartDelay();
            const updatedChar = await getAnimeTitleOfCharacter(char);
            
            enriched.push(updatedChar);
            // Save to in-memory cache
            top50AnimeCharCache.push(updatedChar);
            // Save partial cache to localStorage
            localStorage.setItem(TOP50_STORAGE_KEY, JSON.stringify(top50AnimeCharCache));

            index++;
        }

        // Create the HTML of top 50 anime char list with refresh button
        renderTopAnimeCharacters(enriched);

        // Only cache if user didn't cancel
        if (isTop50AnimeCharModalSession && enriched.length === TOP50_COMPLETE_COUNT) {
            top50AnimeCharCache = enriched;
            localStorage.setItem(TOP50_STORAGE_KEY, JSON.stringify(enriched));
            const now = Date.now();
            localStorage.setItem(TOP50_UPDATED_AT_KEY, now);
            console.log("Saved Top 50 to localStorage");
        }
    } catch (err) {
        console.error("Failed to fetch top characters:", err);
        topAnimeCharListEl.innerHTML = "<div class='text-danger'>Failed to load top characters.</div>";
    }
}

document.getElementById("loadTopAnimeCharacters").addEventListener("click", () => {
    loadTopAnimeCharacters();
});

async function getAnimeTitleOfCharacter(char, retry = 1) {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/characters/${char.id}/anime`);
        if (res.status === 429) {
            showRateLimitToast(); // Inform the user
            await smartDelay();    // Wait and retry

            if (retry > 0) {
                return getAnimeTitleOfCharacter(char, retry - 1);
            }
            return char; // Fallback with no anime title
        }
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const dataJSON = await res.json();
        const animeEntry = dataJSON.data[0];
        char.animeTitle = animeEntry?.anime?.title || "-";
    } catch {
        char.animeTitle = "-";
    }
    return char;
}

const FAV_OF_CHARACTER_KEY_PREFIX = "fav_of_character_";

async function checkTopCharacters(vaMalId) {
    // For closing and opening another modal.
    activeModalSession = Date.now(); // create a new session token
    const session = activeModalSession; // capture it locally

    try {
        const mainCharacters = await getMainCharactersVoicedBy(vaMalId);
        // Fetch favorites in parallel
        const charactersWithFavorites = [];
        const vaModalCharactersProgress = document.getElementById("vaModalCharacters");
        vaModalCharactersProgress.innerHTML = `
            <div class="d-flex justify-content-center align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span id="progressCount">Compiling top 10 main role characters... (0/${mainCharacters.length})</span>
            </div>
        `;
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

    const vaModalCharactersProgress = document.getElementById("vaModalCharacters");
    vaModalCharactersProgress.innerHTML = `
        <div class="d-flex justify-content-center align-items-center text-info py-3">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span id="updateProgress">Updating for Top 10... (0/${mainCharacters.length})</span>
        </div>
    `;

    const updateProgress = document.getElementById("updateProgress");

    for (const char of mainCharacters) {
        if (session !== activeModalSession) {
            console.log("modal was changed/closed when updating");
            return;
        }

        const key = `${FAV_OF_CHARACTER_KEY_PREFIX}${char.id}`;
        localStorage.removeItem(key);       // remove from localStorage
        delete favoritesCache[char.id];     // clear in-memory

        const favorites = await getCharacterFavorites(char.id);
        updatedCharacters.push({ ...char, favorites });

        updateProgress.textContent = `Updating for Top 10... (${updatedCharacters.length}/${mainCharacters.length})`;
    }

    // Final sorting and render
    if (session === activeModalSession) {
        const sorted = updatedCharacters
            .sort((a, b) => b.favorites - a.favorites)
            .slice(0, 10);
            
        renderTopVoiceActorCharacters(sorted, mainCharacters.length, vaMalId, session);
    }
}

// HTML for the char list in VA modal
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

// HTML for the top 50 anime characters
function renderTopAnimeCharacters(charList, updatedAt = Date.now()) {
    const listHTML = createCharacterListHTML(charList);
    const updatedText = timeAgoText(updatedAt);
    const topAnimeCharListEl = document.getElementById("topAnimeCharactersList");

    topAnimeCharListEl.innerHTML = `
        <ul class="list-unstyled small">${listHTML}</ul>
        <button type="button" id="refreshTopAnimeCharacters" class="btn btn-sm btn-outline-info mt-2">
            <i class="bi bi-arrow-clockwise me-1"></i> Update Top 50 again?
        </button>
        <div class="text-muted small text-center mt-2" title="${new Date(updatedAt).toLocaleString()}">
            Updated ${updatedText}
        </div>
    `;

    // Attach refresh button listener
    document.getElementById("refreshTopAnimeCharacters")?.addEventListener("click", () => {
        loadTopAnimeCharacters(true); // force refresh
    });
}

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

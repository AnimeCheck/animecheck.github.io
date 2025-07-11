// Top 50 Anime Characters logic fetching, caching, rendering, and refreshing.

let isTop50AnimeCharModalSession = false;
let top50AnimeCharCache = null;

const TOP50_STORAGE_KEY = "top50AnimeCharCache";
const TOP50_UPDATED_AT_KEY = "top50AnimeCharUpdatedAt";
const TOP50_COMPLETE_COUNT = 50; // You expect exactly 50 characters

async function loadTopAnimeCharacters(forceRefresh = false) {
    isTop50AnimeCharModalSession = true;

    // Get Modal for top anime characters
    const topAnimeCharListEl = document.getElementById("topAnimeCharactersList");
    const storedUpdatedAt = StorageHelper.get(TOP50_UPDATED_AT_KEY) || Date.now();

    // Clicking on Update button will refresh
    if (forceRefresh) {
        StorageHelper.remove(TOP50_STORAGE_KEY);
        top50AnimeCharCache = null;
    }
    
    // localStorage
    const stored = StorageHelper.get(TOP50_STORAGE_KEY);
    if (!top50AnimeCharCache && Array.isArray(stored)) {
        top50AnimeCharCache = stored;
    }

    if (top50AnimeCharCache?.length === TOP50_COMPLETE_COUNT) {
        console.log("Using full Top 50 from localStorage");
        renderTopAnimeCharacters(top50AnimeCharCache, storedUpdatedAt);
        return;
    }

    let index = Array.isArray(top50AnimeCharCache) ? top50AnimeCharCache.length : 0;
    topAnimeCharListEl.innerHTML = `
        <div class="d-flex justify-content-center align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span id="top50Count">Showing top 50 anime characters... (${index}/50)</span>
        </div>
    `;

    try {
        const res1 = await throttledFetch("https://api.jikan.moe/v4/characters?order_by=favorites&sort=desc&page=1");
        const data1 = await res1.json();
        const res2 = await throttledFetch("https://api.jikan.moe/v4/characters?order_by=favorites&sort=desc&page=2");
        const data2 = await res2.json();

        const charactersData = [...data1.data, ...data2.data].slice(0, TOP50_COMPLETE_COUNT);
        const processedData = charactersData.map(char => ({
            id: char.mal_id,
            name: char.name,
            image: char.images.jpg.image_url,
            animeTitle: "-",
            favorites: char.favorites ?? 0
        }));

        const top50Count = document.getElementById("top50Count");
        const enriched = top50AnimeCharCache ? [...top50AnimeCharCache] : [];
        const remainingData = processedData.slice(enriched.length);

        if (top50AnimeCharCache == null) top50AnimeCharCache = [];

        for (const char of remainingData) {
            if (!isTop50AnimeCharModalSession) break;

            top50Count.textContent = `Showing top 50 anime characters... (${index + 1}/50)`;
            await smartDelay();
            const updatedChar = await getAnimeTitleOfCharacter(char);

            enriched.push(updatedChar);
            top50AnimeCharCache.push(updatedChar);
            StorageHelper.set(TOP50_STORAGE_KEY, top50AnimeCharCache);

            index++;
        }

        renderTopAnimeCharacters(enriched);

        if (isTop50AnimeCharModalSession && enriched.length === TOP50_COMPLETE_COUNT) {
            top50AnimeCharCache = enriched;
            StorageHelper.set(TOP50_STORAGE_KEY, enriched);
            StorageHelper.set(TOP50_UPDATED_AT_KEY, Date.now());
            console.log("Saved Top 50 to localStorage");
        }

    } catch (err) {
        console.error("Failed to fetch top characters:", err);
        topAnimeCharListEl.innerHTML = "<div class='text-danger'>Failed to load top characters.</div>";
    }
}

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

// Attach listener to menu item
document.getElementById("loadTopAnimeCharacters").addEventListener("click", () => {
    loadTopAnimeCharacters();
});

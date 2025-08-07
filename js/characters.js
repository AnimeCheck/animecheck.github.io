/*
    Character cards for an anime
    Voice actor rendering inside each card
    IntersectionObserver for fade-in
*/
const SAVED_CHAR_KEY = 'savedCharacters';
characterLoadToken = null;

// Show More Characters variables
let currentCharacterList = [];
let charactersRenderedCount = 0;
const batchSize = 100;  // or whatever number you want per batch

const vaInfoCache = {};
async function getAnimeCharacters(animeId) {
    const myToken = Date.now();
    characterLoadToken = myToken;

    // Sanitizing
    animeId = Number(animeId);

    if (!Number.isInteger(animeId) || animeId <= 0) {
        console.error("Invalid anime ID:", animeId);
        return;
    }

    const url = `https://api.jikan.moe/v4/anime/${animeId}/characters`;
    console.log("Anime Characters URL: ", url);
    try {
        const response = await throttledFetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataJSON = await response.json();
        const animeCharacters = dataJSON.data;
        const totalCharacters = animeCharacters.length;
        //console.log("Total Characters: ", totalCharacters);

        if (totalCharacters === 0) return;

        currentCharacterList = animeCharacters; // save globally
        charactersRenderedCount = 0;

        const container = document.getElementById("animeCharacters");
        container.innerHTML = ''; // Clear for Show More Characters

        // Exit if this is no longer the latest load request
        if (characterLoadToken !== myToken) return;

        // Add title header
        container.innerHTML = `
            <h5 class="mx-1 mb-3 d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
                <i class="bi bi-person-circle"></i>List of ${totalCharacters} characters
            </h5>
        `;

        renderCharacterBatch(); // render first batch
        renderShowMoreButton();

    } catch (error) {
        // still check token before showing error
        if (characterLoadToken !== myToken) return;
        console.error("Failed to fetch characters:", error);
    }
}

function renderCharacterBatch() {
    const container = document.getElementById("animeCharacters");
    const nextBatch = currentCharacterList.slice(charactersRenderedCount, charactersRenderedCount + batchSize);
    const showEnglish = document.getElementById("toggleEnglish").checked;
    const showJapanese = document.getElementById("toggleJapanese").checked;
    const showOtherLanguages = document.getElementById("toggleOther").checked;

    for (const entry of nextBatch) {
        const characterName = escapeHTML(entry.character.name);
        const characterImage = entry.character.images.jpg.image_url;
        const characterId = Number(entry.character.mal_id);
        const voiceActors = entry.voice_actors;

        /*console.log("Name:", characterName);
        console.log("Image:", characterImage);
        console.log("-------------");*/

        const col = document.createElement("div");
        col.className = "col-6 col-md-4 col-lg-3 mb-3";

        // Build voice actors HTML
        let vaListHTML = "";
        // To get every item of "voice_actors": [...]
        for (const va of voiceActors) {
            const vaMalId = va.person.mal_id;

            // Cache VA info per VA ID
            if (!vaInfoCache[vaMalId]) {
                vaInfoCache[vaMalId] = {
                    name: escapeHTML(va.person.name),
                    image: va.person.images.jpg.image_url,
                    lang: escapeHTML(va.language)
                };
            } 
            //else {console.log(`Using cached VA info for: ${vaMalId} - ${vaInfoCache[vaMalId].name} (${vaInfoCache[vaMalId].lang})`);}

            const { name, image, lang } = vaInfoCache[vaMalId]; // reuses the saved object from the cache.

            // Language filtering logic
            const isEnglish = lang.toLowerCase() === "english";
            const isJapanese = lang.toLowerCase() === "japanese";
            const isOther = !isEnglish && !isJapanese;

            if ((isEnglish && showEnglish) || (isJapanese && showJapanese) || (isOther && showOtherLanguages)) {
                vaListHTML += `
                    <div class="d-flex align-items-center mt-2">
                        <img src="${image}" alt="${name}" class="me-2 rounded" style="width: 40px; height: 40px; object-fit: cover; flex-shrink: 0;" loading="lazy">
                        <div>
                            <div>
                                <a href="#" class="va-link text-decoration-none" data-bs-toggle="modal" data-bs-target="#vaModal" 
                                    data-name="${name}" data-image="${image}" data-lang="${lang}" data-vamalid="${vaMalId}">
                                    <strong>${firstLastNameFormat(name)}</strong>
                                </a>
                            </div>
                            <div class="va-language small">${lang}</div>
                        </div>
                    </div>
                `;
            }
        }

        // Final character card
        col.innerHTML = `
            <div class="card fade-in bg-dark text-light h-100">
                <img src="${characterImage}" class="character-image card-img-top" alt="${characterName}" loading="lazy">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title d-flex justify-content-between align-items-start custom-card-charname">
                        <span class="me-2 flex-grow-1">${firstLastNameFormat(characterName)}</span>
                        <i class="bi bi-star text-warning toggle-saved-character-star" data-charid="${characterId}" role="button"></i>
                    </h5>
                    <div class="pb-2 custom-card-valist">${vaListHTML}</div>
                    <div class="mt-auto text-end custom-card-charid">
                        <span class="anime-char-id user-select-none text-secondary">Char ID: </span><b>${characterId}</b>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);

        // Saved Character Star icon toggle
        const starIcon = col.querySelector(`[data-charid="${characterId}"]`);

        if (isSavedCharacter(characterId)) {
            starIcon.classList.replace('bi-star', 'bi-star-fill');
        }

        starIcon.addEventListener('click', () => {
            toggleSavedCharacter(characterId, characterName, characterImage);

            // Toggle icon class
            if (isSavedCharacter(characterId)) {
                starIcon.classList.replace('bi-star', 'bi-star-fill');
            } else {
                starIcon.classList.replace('bi-star-fill', 'bi-star');
            }
        });
        
        // Privacy option
        toggleImageBlur(isBlurEnabled);

        // fade in when scrolling into view for that div card .fade-in
        const card = col.querySelector('.fade-in');
        if (card) observer.observe(card);
    }

    charactersRenderedCount += nextBatch.length;
}

function renderShowMoreButton() {
    const container = document.getElementById("animeCharacters");
    const totalCharacters = currentCharacterList.length;

    // Remove existing button if any
    const existingBtn = document.getElementById("showMoreCharactersBtn");
    if (existingBtn) existingBtn.remove();
    // If all characters rendered, no button needed
    if (charactersRenderedCount >= totalCharacters) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
        <div class="col-12 text-center">
            <button id="showMoreCharactersBtn" class="btn btn-primary bg-dark my-3">
                Show More Characters
            </button>
        </div>
    `;
    container.appendChild(wrapper.firstElementChild);

    // Add event listener for Show More Characters
    document.getElementById("showMoreCharactersBtn").addEventListener("click", () => {
        renderCharacterBatch();
        renderShowMoreButton();

        showToast({
            message: `${charactersRenderedCount}/${totalCharacters} characters`,
            type: "dark",
            icon: "bi bi-person-circle"
        });
    });
}

/*
    To add Saved Characters
*/
function isSavedCharacter(characterId) {
    const savedChars = StorageHelper.get(SAVED_CHAR_KEY) || [];
    return savedChars.some(char => char.id === characterId);
}

function toggleSavedCharacter(characterId, characterName, characterImageUrl) {
    let savedChars = StorageHelper.get(SAVED_CHAR_KEY) || [];
    const index = savedChars.findIndex(char => char.id === characterId);
    const formattedCharName = firstLastNameFormat(characterName);

    // if character is already a save
    if (index !== -1) {
        savedChars.splice(index, 1); // Remove from save list if exists

        showToast({
            message: `<b>${formattedCharName}</b> removed from your save list.`,
            type: "secondary",
            icon: "bi bi-star"
        });
    } else {
        if (savedChars.length >= 1000) {
            showToast({
                message: "You have reached the maximum of 1000 saved characters.",
                type: "danger",
                icon: "bi bi-exclamation-triangle"
            });
            return;
        }
        // Add to save list
        //savedChars.push({ id: characterId, name: characterName });
        savedChars.push({
            id: characterId,
            name: characterName,
            image: characterImageUrl
        });

        showToast({
            message: `<b>${formattedCharName}</b> added to your save list!`,
            type: "success",
            icon: "bi bi-star-fill"
        });
    }

    StorageHelper.set(SAVED_CHAR_KEY, savedChars);
}

function renderSavedCharacters() {
    const container = document.getElementById("viewSavedCharacters");
    const savedChars = StorageHelper.get(SAVED_CHAR_KEY) || [];
    
    container.innerHTML = "";

    let html = `
        <h5 class="mx-1 mb-3 text-warning d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
            <i class="bi bi-star-fill"></i>
            Saved Characters 
            <span class="text-secondary small">(${savedChars.length})</span>
            <i class="bi bi-eye-slash ms-auto text-secondary hover-pointer hide-saved-characters-icon" role="button" title="Hide saved characters"></i>
        </h5>
    `;

    if (savedChars.length === 0) {
        container.innerHTML = html;
        hideSavedCharList();
        return;
    }

    // Sorting save list in alphabetical order
    savedChars.sort((a, b) => {
        const nameA = firstLastNameFormat(a.name);
        const nameB = firstLastNameFormat(b.name);
        return nameA.localeCompare(nameB);
    });

    savedChars.forEach((char, index) => {
        // Sanitizing the variables
        const name = escapeHTML(char.name);
        const image = escapeHTML(char.image);
        const id = Number(char.id);
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-dark text-light saved-char-row" 
                data-charid="${id}" data-charname="${name}" data-charimage="${image}">
                <div class="d-flex align-items-center flex-grow-1">
                    <a href="${image}" target="_blank">
                        <img src="${image}" alt="${name}" loading="lazy" class="character-image"
                            style="width: 50px; height: 50px; object-fit: cover; border-radius: 0.25rem; margin-right: 0.75rem; flex-shrink: 0;">
                    </a>
                    <span class="badge bg-secondary me-2 user-select-none">${index + 1}</span>
                    <a href="https://myanimelist.net/character/${id}" class="text-decoration-none" target="_blank"><b>${firstLastNameFormat(name)}</b></a>
                </div>
                <button class="btn btn-sm btn-outline-danger toggle-saved-character-btn" title="Remove from save list">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add event listeners for Remove buttons
    container.querySelectorAll('.toggle-saved-character-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('.saved-char-row');
            const charId = Number(row.dataset.charid);
            const charName = row.dataset.charname;
            const charImage = row.dataset.charimage;

            // Remove from save list
            toggleSavedCharacter(charId, charName, charImage);

            renderSavedCharacters(); // Refresh UI
        });
    });

    // Saved Characters list close icon
    hideSavedCharList();

    // Privacy option
    toggleImageBlur(isBlurEnabled);
}

function hideSavedCharList() {
    // Saved Characters list close icon
    document.querySelector(".hide-saved-characters-icon")?.addEventListener("click", () => {
        // Hide saved characters list
        document.getElementById("viewSavedCharacters").classList.add("d-none");
        // Show back the main content or the Anime details
        const animeDetailsWrapper = document.getElementById("animeDetailsWrapper");
        const animeCharacters = document.getElementById("animeCharacters");
        const mainContent = document.getElementById("mainContent");

        // Only show mainContent if anime details are cleared
        const shouldShowMainContent =
            animeDetailsWrapper.innerHTML.trim() === "" &&
            animeCharacters.innerHTML.trim() === "";

        // Show main content instead if anime details was empty or cleared
        if (shouldShowMainContent) {
            mainContent.classList.remove("d-none");
        }

        // Restore these two whenever they are cleared or not
        animeDetailsWrapper.classList.remove("d-none");
        animeCharacters.classList.remove("d-none");

        // Sync all star icons with current saved char state
        syncSavedCharStarIcons();
    });
}
function savedCharCounterSettings() {
    const savedCharCountSettings = (StorageHelper.get(SAVED_CHAR_KEY) || []).length;
    document.getElementById('favCountSettings').innerText = savedCharCountSettings;
}
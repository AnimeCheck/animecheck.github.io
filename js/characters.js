/*
    Character cards for an anime
    Voice actor rendering inside each card
    IntersectionObserver for fade-in
*/
const SAVED_CHAR_KEY = 'savedCharacters';

const vaInfoCache = {};
async function getAnimeCharacters(animeId) {
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

        const container = document.getElementById("animeCharacters");

        // Add title header
        container.innerHTML = `<div class="fs-3 fs-md-2 fs-lg-1"><i class="bi bi-file-person me-1"></i>List of ${totalCharacters} characters</div>`;

        animeCharacters.forEach(entry => {
            const characterName = escapeHTML(entry.character.name);
            const characterImage = entry.character.images.jpg.image_url;
            const characterId = Number(entry.character.mal_id);
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
                        name: escapeHTML(va.person.name),
                        image: va.person.images.jpg.image_url,
                        lang: escapeHTML(va.language)
                    };
                } 
                //else {console.log(`Using cached VA info for: ${vaMalId} - ${vaInfoCache[vaMalId].name} (${vaInfoCache[vaMalId].lang})`);}

                const { name, image, lang } = vaInfoCache[vaMalId]; // reuses the saved object from the cache.

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
                            <div class="small">${lang}</div>
                        </div>
                    </div>
                `;
            });

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
                            <span class="user-select-none text-secondary">Char ID: </span><b>${characterId}</b>
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
    To add Saved Characters
*/
function isSavedCharacter(characterId) {
    const savedChars = StorageHelper.get(SAVED_CHAR_KEY) || [];
    return savedChars.some(char => char.id === characterId);
}

function toggleSavedCharacter(characterId, characterName, characterImageUrl) {
    let savedChars = StorageHelper.get(SAVED_CHAR_KEY) || [];
    const index = savedChars.findIndex(char => char.id === characterId);

    // if character is already a save
    if (index !== -1) {
        savedChars.splice(index, 1); // Remove from save list if exists

        showToast({
            message: `<b>${characterName}</b> removed from your save list.`,
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
            message: `<b>${characterName}</b> added to your save list!`,
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
            <i class="bi bi-x-circle ms-auto text-secondary hide-saved-characters-icon" role="button" title="Hide saved characters"></i>
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
        document.getElementById("animeDetailsWrapper").classList.remove("d-none");
        document.getElementById("animeCharacters").classList.remove("d-none");
        document.getElementById("viewSavedCharacters").classList.add("d-none");

        // Sync all star icons with current saved char state
        syncSavedCharStarIcons();
    });
}
function savedCharCounterSettings() {
    const savedCharCountSettings = (StorageHelper.get(SAVED_CHAR_KEY) || []).length;
    document.getElementById('favCountSettings').innerText = savedCharCountSettings;
}
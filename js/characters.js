/*
    Character cards for an anime
    Voice actor rendering inside each card
    IntersectionObserver for fade-in
*/
const FAVORITES_KEY = 'favoriteCharacters';

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
            const characterId = entry.character.mal_id;
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
                            <span class="me-2 flex-grow-1">${characterName}</span>
                            <i class="bi bi-star text-warning toggle-favorite-star" data-charid="${characterId}" role="button"></i>
                        </h5>
                        <div class="pb-2 custom-card-valist">${vaListHTML}</div>
                        <div class="mt-auto text-end custom-card-charid">
                            <span class="user-select-none text-secondary">Char ID: </span><b>${characterId}</b>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);

            // Favorite Character Star icon toggle
            const starIcon = col.querySelector(`[data-charid="${characterId}"]`);

            if (isFavoriteCharacter(characterId)) {
                starIcon.classList.replace('bi-star', 'bi-star-fill');
            }

            starIcon.addEventListener('click', () => {
                toggleFavoriteCharacter(characterId, characterName, characterImage);

                // Toggle icon class
                if (isFavoriteCharacter(characterId)) {
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
    To add favorite Characters
*/
function isFavoriteCharacter(characterId) {
    const favorites = StorageHelper.get(FAVORITES_KEY) || [];
    return favorites.some(char => char.id === characterId);
}

function toggleFavoriteCharacter(characterId, characterName, characterImageUrl) {
    let favorites = StorageHelper.get(FAVORITES_KEY) || [];
    const index = favorites.findIndex(char => char.id === characterId);

    // if character is already a favorite
    if (index !== -1) {
        favorites.splice(index, 1); // Remove from favorites if exists

        showToast({
            message: `<b>${characterName}</b> removed from your favorites.`,
            type: "secondary",
            icon: "bi bi-star"
        });
    } else {
        if (favorites.length >= 1000) {
            alert("You have reached the maximum of 1000 favorite characters.");
            return;
        }
        // Add to favorites
        //favorites.push({ id: characterId, name: characterName });
        favorites.push({
            id: characterId,
            name: characterName,
            image: characterImageUrl
        });

        showToast({
            message: `<b>${characterName}</b> added to your favorites!`,
            type: "success",
            icon: "bi bi-star-fill"
        });
    }

    StorageHelper.set(FAVORITES_KEY, favorites);
}

function renderFavoriteCharacters() {
    const container = document.getElementById("viewFavoriteCharacters");
    const favorites = StorageHelper.get(FAVORITES_KEY) || [];
    
    container.innerHTML = "";

    let html = `
        <h5 class="mb-3 text-warning d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
            <i class="bi bi-star-fill"></i>
            Saved Favorite Characters 
            <span class="text-secondary small">(${favorites.length})</span>
            <i class="bi bi-x-circle ms-auto text-secondary hide-favorites-icon" role="button" title="Hide favorite characters"></i>
        </h5>
    `;

    if (favorites.length === 0) {
        container.innerHTML = html;
        return;
    }

    // Sorting favorites in alphabetical order
    favorites.sort((a, b) => a.name.localeCompare(b.name));

    favorites.forEach((char, index) => {
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-dark text-light favorite-char-row" 
            data-charid="${char.id}" data-charname="${char.name}" data-charimage="${char.image}">
                <div class="d-flex align-items-center flex-grow-1">
                    <a href="${char.image}" target="_blank">
                        <img src="${char.image}" alt="${char.name}" loading="lazy"
                            style="width: 50px; height: 50px; object-fit: cover; border-radius: 0.25rem; margin-right: 0.75rem; flex-shrink: 0;">
                    </a>
                    <span class="badge bg-secondary me-2 user-select-none">${index + 1}</span>
                    <a href="https://myanimelist.net/character/${char.id}" class="text-decoration-none" target="_blank"><b>${char.name}</b></a>
                </div>
                <button class="btn btn-sm btn-outline-danger toggle-favorite-btn" title="Remove from favorites">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add event listeners for Remove buttons
    container.querySelectorAll('.toggle-favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('.favorite-char-row');
            const charId = Number(row.dataset.charid);
            const charName = row.dataset.charname;
            const charImage = row.dataset.charimage;

            // Remove from favorites
            toggleFavoriteCharacter(charId, charName, charImage);

            renderFavoriteCharacters(); // Refresh UI
        });
    });

    // Favorite Characters list close icon
    document.querySelector(".hide-favorites-icon")?.addEventListener("click", () => {
        document.getElementById("animeDetailsWrapper").classList.remove("d-none");
        document.getElementById("animeCharacters").classList.remove("d-none");
        document.getElementById("viewFavoriteCharacters").classList.add("d-none");

        // Sync all star icons with current favorite state
        document.querySelectorAll('[data-charid]').forEach(icon => {
            const charId = Number(icon.dataset.charid);
            const isFavorite = isFavoriteCharacter(charId);

            icon.classList.toggle('bi-star-fill', isFavorite);
            icon.classList.toggle('bi-star', !isFavorite);
        });
    });
}

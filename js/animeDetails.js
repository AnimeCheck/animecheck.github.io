// Logic for fetching and displaying anime info (title, studio, genre, score, etc.).
let characterLoadToken = null;

async function getAnimeById(animeId) {
    console.log(`Anime by id URL: https://api.jikan.moe/v4/anime/${animeId}`);
    // Show Anime Details
    document.getElementById("animeDetailsWrapper").classList.remove("d-none");
    document.getElementById("animeCharacters").classList.remove("d-none");
    // Hide other: saved characters
    document.getElementById("mainContent").classList.add("d-none");
    document.getElementById("viewSavedCharacters").classList.add("d-none");

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
        const season = dataJSON.data?.season || "";
        const airedDates = dataJSON.data?.aired.string || ["N/A"];
        const episodes = dataJSON.data?.episodes || 0;
        const imageURL = dataJSON.data?.images.jpg.large_image_url;
        //console.log("imageURL: ", imageURL);
        const MALscore = dataJSON.data?.score || ["N/A"];
        const MALscoreUsers = dataJSON.data?.scored_by || ["N/A"];
        const MALrank = dataJSON.data?.rank || [""];
        const MALpopularity = dataJSON.data?.popularity || [""];
        const synopsis = dataJSON.data?.synopsis || "";
        /*console.log("MALscore: ", MALscore);
        console.log("MALscoreUsers: ", MALscoreUsers);
        console.log("MALrank: ", MALrank);
        console.log("MALpopularity: ", MALpopularity);*/

        // In the JSON, get every item of "titles": [...]. We want to get each title.
        const getTitle = (type) =>
                escapeHTML(titles.find((item) => item.type === type)?.title || "");
        
        const defaultTitle = getTitle("Default");
        const synonymTitle = getTitle("Synonym");
        const foreignTitle = getTitle("Japanese");
        const englishTitle = getTitle("English");
        // To show all studios of "studios": [..., ...]
        const studioNames = studios.map(item => 
            `<span class="badge bg-light text-dark me-2 rounded-pill">${escapeHTML(item.name)}</span>`
        ).join("");
        // To show all genres of "genres": [..., ...]
        const genreNames = genres.map(item => 
            `<span class="badge bg-success me-2 rounded-pill">${escapeHTML(item.name)}</span>`
        ).join("");
        // To show all themes of "themes": [..., ...]
        const themeNames = themes.map(item => 
            `<span class="badge bg-warning text-dark me-2 rounded-pill">${escapeHTML(item.name)}</span>`
        ).join("");
        /*console.log("Default:", defaultTitle);
        console.log("Synonym:", synonymTitle);
        console.log("Foreign:", foreignTitle);
        console.log("English:", englishTitle);
        console.log("studioName:", studioName);*/
        const animeDetailsHTML = `
            <h5 class="mx-1 mb-3 d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
                <i class="bi bi-info-circle"></i>
                Anime Details
                <i class="bi bi-x-circle ms-auto text-secondary hover-pointer hide-anime-details-icon" role="button" title="Clear anime details"></i>
            </h5>
            <div class="row mb-3 align-items-center">
                <div class="col-md-2 text-center my-2">
                    <a href="${imageURL}" target="_blank" rel="noopener noreferrer">
                        <img src="${imageURL}" class="anime-poster img-fluid rounded">
                    </a>
                </div>
                <div class="col-md-10 d-flex align-items-center">
                    <div class="w-100">
                        <div>
                            <div class="fs-4 fs-md-2 fs-lg-1 animetitle">${foreignTitle}</div>
                            <div class="text-secondary fw-bold">${defaultTitle}</div>
                        </div>
                        <div>
                            <div class="fs-4 fs-md-2 fs-lg-1 animetitle">${englishTitle}</div>
                            <div class="text-secondary fw-bold">${synonymTitle}</div>
                        </div>
                        <div class="mt-2">Studio: ${studioNames}</div>
                        <div>Genres: ${genreNames}</div>
                        <div>Themes: ${themeNames}</div>
                        <div>Seasonal: <span class="badge bg-info me-2 rounded-pill">${seasonIcon(escapeHTML(uppercaseFirstChar(season)))}</span></div>
                        <div class="mt-2">Aired: ${escapeHTML(airedDates)}</div>
                        <div class="">Episodes: ${Number(episodes)}</div>
                    </div>
                </div>
            </div>
            <div class="bg-dark text-light my-2 p-2 d-flex flex-wrap gap-2 rounded justify-content-between align-items-center">
                <div class="d-flex flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-semibold">MAL Score:</span>
                        <span class="badge bg-primary fs-6 rounded-pill">${escapeHTML(MALscore)}</span> 
                        <small>by ${escapeHTML(MALscoreUsers)} users</small>
                        <span class="text-secondary">|</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-semibold">Rank:</span>
                        <span class="badge bg-secondary fs-6 rounded-pill">#${escapeHTML(MALrank)}</span>
                        <span class="text-secondary">|</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-semibold">Popularity:</span>
                        <span class="badge bg-secondary fs-6 rounded-pill">#${escapeHTML(MALpopularity)}</span>
                    </div>
                </div>

                <div class="extraContainer d-flex gap-2">
                    <button id="statisticsBtn" class="btn btn-outline-light btn-sm w-100" title="Extra Statistics" aria-expanded="false" aria-controls="StatisticsModal">
                        <i class="bi bi-bar-chart-steps"></i>
                    </button>
                    <button id="toggleSynopsisBtn" class="btn btn-outline-light btn-sm w-100" title="Toggle Synopsis" aria-expanded="false" aria-controls="synopsisSection">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
            <div id="synopsisSection" class="card bg-dark bg-opacity-50 text-light p-2 lh-lg fade d-none"></div>
        `;
        document.getElementById("animeDetailsWrapper").innerHTML = animeDetailsHTML;

        // Extra
        openExtraStatistics(animeId);
        toggleSynopsisSection(synopsis);

        // Hide Anime details
        clearAnimeDetails();

        // Privacy option
        toggleImageBlur(isBlurEnabled);
    } catch (error) {
        console.error("Error fetching anime data:", error.message);
    }
}

const cachedStatsCache = {};
function openExtraStatistics(animeId) {
    const btn = document.getElementById('statisticsBtn');
    if (!btn) return;

    btn.onclick = async () => {
        if (cachedStatsCache[animeId]) {
            generalModal('Extra Statistics', cachedStatsCache[animeId]);
            return;
        }

        // Show modal immediately with loading state
        generalModal('Extra Statistics', `<div id="loadingStatsModal" class="text-center text-secondary">Loading...</div>`);

        try {
            //console.log("openExtraStatistics fetching...");
            const response = await throttledFetch(`https://api.jikan.moe/v4/anime/${animeId}/statistics`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            const stats = data.data;
            const scores = stats.scores;
            let scoresHTML = "";

            if (!scores || scores.length === 0) {
                scoresHTML = `<span class="text-secondary">Score Distribution not available.</span>`;
            } else {
                scoresHTML = scores
                    .sort((a, b) => b.score - a.score) // sort descending: 10 to 1
                    .map(({ score, votes, percentage }) => {
                        const percent = parseFloat(percentage);
                        return `
                            <div class="mb-2">
                                <div class="d-flex justify-content-between">
                                    <span class="font-monospace small">Score ${score}</span>
                                    <span class="font-monospace small text-end">${votes.toLocaleString()} votes</span>
                                </div>
                                <div class="progress position-relative bg-secondary-subtle">
                                    <div class="progress-bar bg-info" role="progressbar" style="width: ${percent}%" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                                        <span class="position-absolute top-50 start-50 translate-middle text-white fw-bold small">
                                            ${percent}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
            }

            const statsHTML = `
                <h6 class="text-warning mb-2">Score Distribution</h6>
                <div class="mb-4">${scoresHTML}</div>
                <h6 class="text-warning mb-2">Stats</h6>
                <ul class="list-group list-group-flush text-start">
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>Watching:</span>
                        <b class="font-monospace text-success">${stats.watching.toLocaleString()}</b>
                    </li>
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>Completed:</span>
                        <b class="font-monospace text-primary">${stats.completed.toLocaleString()}</b>
                    </li>
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>On-Hold:</span>
                        <b class="font-monospace text-warning">${stats.on_hold.toLocaleString()}</b>
                    </li>
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>Dropped:</span>
                        <b class="font-monospace text-danger">${stats.dropped.toLocaleString()}</b>
                    </li>
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>Plan to Watch:</span>
                        <b class="font-monospace text-secondary">${stats.plan_to_watch.toLocaleString()}</b>
                    </li>
                    <li class="list-group-item bg-dark text-light d-flex justify-content-between">
                        <span>Total:</span>
                        <b class="font-monospace">${stats.total.toLocaleString()}</b>
                    </li>
                </ul>
            `;

            // Update modal
            const loadingStatsModal = document.getElementById('loadingStatsModal');
            loadingStatsModal.className = "";
            loadingStatsModal.innerHTML = statsHTML;
            cachedStatsCache[animeId] = statsHTML; // Save to cache
        } catch (error) {
            console.error("Error fetching anime data:", error.message);
            generalModal('Error', `<span class="text-danger">Could not load statistics.</span>`);
        }
    };
}

function toggleSynopsisSection(synopsis) {
    // Toggle Synopsis Section if it exists
    const toggleSynopsisBtn = document.getElementById('toggleSynopsisBtn');
    if (!toggleSynopsisBtn) return;

    if (synopsis.trim() !== "") {
        const section = document.getElementById('synopsisSection');
        const icon = toggleSynopsisBtn.querySelector('i');

        toggleSynopsisBtn.onclick = () => {
            const isVisible = section.classList.contains('show'); // if using .fade

            if (isVisible) {
                section.classList.remove('show'); // Fade effect
                setTimeout(() => section.classList.add('d-none'), 150); // Fade effect
                icon.classList.replace('bi-eye-slash', 'bi-eye');
                toggleSynopsisBtn.setAttribute('aria-expanded', 'false');
            } else {
                if (section.innerHTML === "") {
                    section.innerHTML = escapeHTML(synopsis).replace(/\n/g, "<br>"); // Add snopsis text once
                }

                section.classList.remove('d-none');
                setTimeout(() => section.classList.add('show'), 10); // Fade effect
                icon.classList.replace('bi-eye', 'bi-eye-slash');
                toggleSynopsisBtn.setAttribute('aria-expanded', 'true');
            }
        };
    } else {
        toggleSynopsisBtn.classList.add('d-none');
    }
}

function clearAnimeDetails() {
    document.querySelector(".hide-anime-details-icon")?.addEventListener("click", () => {
        // Clear Anime details with its anime characters info
        document.getElementById('animeDetailsWrapper').innerHTML = "";
        characterLoadToken = null;
        document.getElementById('animeCharacters').innerHTML = "";
        // Show back the main content
        document.getElementById("mainContent").classList.remove("d-none");
    });
}
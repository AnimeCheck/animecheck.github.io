const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SCHEDULE_API_BASE = "https://api.jikan.moe/v4/schedules/";
const scheduleCache = {};

// Render tab UI into #mainContent
function renderAiringScheduleTabs() {
    const container = document.getElementById("mainContent");
    if (!container) return;

    const today = getTodayDayString();

    container.innerHTML = `
        <h5 class="mx-1 mb-3 d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
            <i class="bi bi-broadcast"></i>
            Airing Schedule
        </h5>

        <div id="airingDayButtons" class="d-flex flex-wrap gap-2 mb-3">
            ${DAYS_OF_WEEK.map(day => `
            <button class="btn btn-outline-primary btn-sm${day === today ? ' active' : ''}"
                    data-day="${day}" type="button">
                ${uppercaseFirstChar(day)}
            </button>`).join("")}
        </div>

        <div id="airingScheduleContent">
            <div id="schedule-${today}" class="schedule-day-content"></div>
        </div>
    `;

    // Load today day
    loadScheduleForDay(today);

    // Handle button clicks
    document.querySelectorAll("#airingDayButtons button").forEach(btn => {
        btn.addEventListener("click", () => {
            const day = btn.dataset.day;

            // Update active button styling
            document.querySelectorAll("#airingDayButtons button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Swap visible content
            const contentWrapper = document.getElementById("airingScheduleContent");
            contentWrapper.innerHTML = `<div id="schedule-${day}" class="schedule-day-content"></div>`;

            // Load content if not cached
            if (!scheduleCache[day]) loadScheduleForDay(day);
            else renderScheduleHTMLInto(day, scheduleCache[day]);
        });
    });
}

// Fetch and render schedule for a given day
async function loadScheduleForDay(day) {
    const container = document.getElementById(`schedule-${day}`);
    if (!container) return;

    container.innerHTML = `<div class="text-muted">Loading ${uppercaseFirstChar(day)}...</div>`;

    try {
        const res = await throttledFetch(`${SCHEDULE_API_BASE}${day}`);
        const data = await res.json();

        let animeList = data?.data || [];

        // Deduplicate by mal_id
        const seen = new Set();
        animeList = animeList.filter(anime => {
            if (seen.has(anime.mal_id)) return false; // If id already exists, skip
            seen.add(anime.mal_id); // Add new id
            return true;
        });

        if (animeList.length > 0) {
            scheduleCache[day] = animeList;
            container.innerHTML = renderScheduleHTML(animeList);

            // Make the anime title clickable
            clickableAnimeTitleToSearchInput();

            // Privacy option
            toggleImageBlur(isBlurEnabled);
        } else {
            container.innerHTML = `<div class="text-muted">No anime airing on ${uppercaseFirstChar(day)}.</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="text-danger">Failed to load schedule for ${uppercaseFirstChar(day)}.</div>`;
    }
}

// Convert anime list to HTML
function renderScheduleHTML(animeList) {
    // Sort descending by favorites count (handle missing or zero)
    animeList.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));

    return `
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-3">
            ${animeList.map(anime => `
            <div class="col">
                <div class="card h-100 bg-dark text-light">
                    <img src="${escapeHTML(anime.images.jpg.large_image_url)}"
                        class="anime-thumbnail anime-poster card-img-top" alt="${escapeHTML(anime.title)}" loading="lazy">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-info mt-1">
                            <a class="text-decoration-none anime-title-clickable"
                                data-original-title="${anime.title}">
                                ${escapeHTML(anime.title_english || anime.title)}
                            </a>
                        </h6>
                        <div>
                            ${anime.studios?.map(s => `
                                <div>
                                    <span class="badge bg-light text-dark mb-1 rounded-pill text-wrap">
                                        ${escapeHTML(s.name)}
                                    </span>
                                </div>
                            `).join("") || `
                                <div>
                                    <span class="badge bg-light text-dark mb-1 rounded-pill text-wrap">N/A</span>
                                </div>
                            `}
                        </div>
                        <div>
                            <span class="badge bg-primary text-light small mb-1 rounded-pill text-wrap">
                                ${anime.type || "N/A"}
                            </span>
                        </div>
                        <div class="mt-auto pt-2 small d-flex justify-content-between align-items-center text-secondary">
                            <a href="${anime.url}" class="text-secondary" alt="View on MAL" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                            <span>
                                <i class="bi bi-suit-heart-fill me-1 text-danger"></i><b>${anime.favorites?.toLocaleString() || "0"}</b> favorite${(anime.favorites ?? 0) === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            `).join("")}
        </div>
    `;
}

function renderScheduleHTMLInto(day, animeList) {
    const container = document.getElementById(`schedule-${day}`);
    if (!container) return;
    container.innerHTML = renderScheduleHTML(animeList);
    
    // Re-attach click handlers
    clickableAnimeTitleToSearchInput();
}

function getTodayDayString() {
    // JS Sunday = 0, so we rotate the array
    const jsDay = new Date().getDay(); // 0–6
    const reorderedDays = [...DAYS_OF_WEEK.slice(6), ...DAYS_OF_WEEK.slice(0, 6)];
    return reorderedDays[jsDay]; // gives correct string
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", renderAiringScheduleTabs);
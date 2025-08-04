const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SCHEDULE_API_BASE = "https://api.jikan.moe/v4/schedules/";
const scheduleCache = {};

// Render tab UI into #mainContent
function renderAiringScheduleTabs() {
    const container = document.getElementById("mainContent");
    if (!container) return;

    const today = getTodayDayString();
    let buttonsHTML = "";

    for (const day of DAYS_OF_WEEK) {
        const isActive = day === today ? " active" : "";
        buttonsHTML += `
            <button class="btn btn-outline-primary btn-sm${isActive}"
                data-day="${day}" type="button" style="letter-spacing: 0.1em;">
                ${uppercaseFirstChar(day)}
            </button>
        `;
    }

    container.innerHTML = `
        <h5 class="mx-1 mb-3 d-flex align-items-center gap-2 fs-3 fs-md-2 fs-lg-1">
            <i class="bi bi-broadcast"></i>
            Airing Schedule
        </h5>

        <div id="airingDayButtons" class="d-flex flex-wrap gap-2 mb-4">
            ${buttonsHTML}
        </div>

        <div id="airingScheduleContent">
            <div id="schedule-${today}" class="schedule-day-content"></div>
        </div>
    `;

    // Load today day
    loadScheduleForDay(today);

    // Handle button clicks
    const dayButtons = document.querySelectorAll("#airingDayButtons button");
    const contentWrapper = document.getElementById("airingScheduleContent");

    dayButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return; // No need to re-render if already active

            const day = btn.dataset.day;
            const scheduleDay = `schedule-${day}`;

            // Update active button styling
            dayButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Hide all day containers
            document.querySelectorAll(".schedule-day-content").forEach(div => {
                div.classList.add("d-none");
            });

            // Check if container for this day already exists
            let scheduleDiv = document.getElementById(scheduleDay);

            if (!scheduleDiv) {
                // Don't want to overwrite with innerHTML. So we do this. Create it if not yet in DOM
                scheduleDiv = document.createElement("div");
                scheduleDiv.id = scheduleDay;
                scheduleDiv.className = "schedule-day-content";
                contentWrapper.appendChild(scheduleDiv);
            }

            // Show selected day's content
            scheduleDiv.classList.remove("d-none");

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
            renderScheduleHTMLInto(day, animeList);
        } else {
            container.innerHTML = `<div class="text-warning">No anime airing on ${uppercaseFirstChar(day)}.</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="text-danger">Failed to load schedule for ${uppercaseFirstChar(day)}.</div>`;
    }
}

// Convert anime list to HTML
function renderScheduleHTML(animeList) {
    // Sort descending by favorites count (handle missing or zero)
    animeList.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));

    const rows = [];
    rows.push(`<div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3">`);

    for (const anime of animeList) {
        const imageUrl = escapeHTML(anime.images.jpg.large_image_url);
        const title = escapeHTML(anime.title_english || anime.title);
        const altTitle = escapeHTML(anime.title);
        const type = escapeHTML(anime.type || "N/A");
        const favorites = anime.favorites ?? 0;

        let studiosHTML = `<div><span class="badge badge-airing bg-light text-dark mb-1 rounded-pill text-wrap">N/A</span></div>`;
        if (anime.studios?.length) {
            const studioSpans = anime.studios.map(s => 
                `<div><span class="badge badge-airing bg-light text-dark mb-1 rounded-pill text-wrap">${escapeHTML(s.name)}</span></div>`
            );
            studiosHTML = studioSpans.join("");
        }

        rows.push(`
            <div class="col">
                <div class="card fade-in h-100 bg-dark text-light">
                    <img src="${imageUrl}" class="anime-thumbnail anime-poster card-img-top" alt="${altTitle}" title="${altTitle}" loading="lazy">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-info text-truncate mt-1">
                            <a class="text-decoration-none anime-title-clickable" title="${title}">
                                ${title}
                            </a>
                        </h6>
                        ${studiosHTML}
                        <div>
                            <span class="badge badge-airing bg-primary text-light small mb-1 rounded-pill text-wrap">${type}</span>
                        </div>
                        <div class="mt-auto pt-2 small d-flex justify-content-between align-items-center text-secondary">
                            <a href="${anime.url}" class="text-secondary" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                            <span class="airing-fav">
                                <i class="bi bi-suit-heart-fill me-1 text-danger"></i>
                                <b>${favorites.toLocaleString()}</b> <span class="airing-fav-text">favorite${favorites === 1 ? "" : "s"}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    rows.push(`</div>`);
    return rows.join("");
}

function renderScheduleHTMLInto(day, animeList) {
    const container = document.getElementById(`schedule-${day}`);
    if (!container) return;
    container.innerHTML = renderScheduleHTML(animeList);
    
    // Re-attach click handlers
    clickableAnimeTitleToSearchInput();

    // Privacy option
    toggleImageBlur(isBlurEnabled);

    // fade in when scrolling into view for these div card .fade-in
    const cards = container.querySelectorAll('.fade-in');
    cards.forEach(card => observer.observe(card));
}

function getTodayDayString() {
    // JS Sunday = 0, so we rotate the array
    const jsDay = new Date().getDay(); // 0–6
    const reorderedDays = [...DAYS_OF_WEEK.slice(6), ...DAYS_OF_WEEK.slice(0, 6)];
    return reorderedDays[jsDay]; // gives correct string
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", renderAiringScheduleTabs);
const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SCHEDULE_API_BASE = "https://api.jikan.moe/v4/schedules/";
const scheduleCache = {}; // For caching when changing day

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

        <div id="airingDayButtons" class="d-flex flex-wrap gap-2 my-4">
            ${buttonsHTML}
        </div>

        <div id="airingScheduleContent">
            <div id="schedule-${today}" class="schedule-day-content"></div>
        </div>
    `;

    // Load today day
    loadScheduleForDay(today, 1);

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
            const cached = scheduleCache[day];
            if (cached?.pages?.[1]) {
                renderScheduleHTMLInto(day, cached.pages[1], 1, cached.lastVisiblePage);
            } else {
                loadScheduleForDay(day, 1);
            }
        });
    });
}

// Fetch and render schedule for a given day
async function loadScheduleForDay(day) {
    const container = document.getElementById(`schedule-${day.toLowerCase()}`);
    console.log(day, container);
    if (!container) return;

    // Show skeleton placeholder
    showSkeleton(container);

    try {
        let allAnime = [];
        let page = 1;
        let hasNext = true;
        let seen = new Set();

        while (hasNext) {
            const res = await throttledFetch(`${SCHEDULE_API_BASE}${day.toLowerCase()}?page=${page}`);
            console.log(day, page, res.status);
            const data = await res.json();
            const animeList = data?.data || [];

            // Deduplicate while collecting
            //const seen = new Set(allAnime.map(a => a.mal_id));
            for (const anime of animeList) {
                if (!seen.has(anime.mal_id)) {
                    seen.add(anime.mal_id);
                    allAnime.push(anime);
                }
            }

            hasNext = data.pagination?.has_next_page;
            page++;
        }

        // Sort by favorites
        allAnime.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));

        // Slice into 10-per-page chunks
        const pages = {};
        const lastVisiblePage = Math.ceil(allAnime.length / 10);
        for (let i = 0; i < lastVisiblePage; i++) {
            const start = i * 10;
            pages[i + 1] = allAnime.slice(start, start + 10);
        }

        scheduleCache[day] = {
            pages,
            lastVisiblePage
        };

        // Render page 1
        renderScheduleHTMLInto(day, pages[1], 1, lastVisiblePage);

    } catch (error) {
        container.innerHTML = `<div class="text-danger">Failed to load schedule for ${uppercaseFirstChar(day)}...</div>`;
    }
}

// Placeholder for loading
function showSkeleton(container, count = 10) {
    let skeleton = container.querySelector(".skeleton-wrapper");
    if (!skeleton) {
        skeleton = document.createElement("div");
        skeleton.className = "skeleton-wrapper";
        container.prepend(skeleton);
    }

    // Build skeleton HTML
    let html = '<div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3">';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="col">
                <div class="card h-100 bg-dark text-light skeleton-card">
                    <div class="anime-thumbnail bg-secondary placeholder-glow"></div>
                    <div class="card-body">
                        <h6 class="card-title placeholder-glow">
                            <span class="bg-info placeholder col-7"></span>
                        </h6>
                        <div class="placeholder-glow">
                            <span class="bg-light placeholder col-5"></span>
                        </div>
                        <div class="placeholder-glow mb-2">
                            <span class="bg-primary placeholder col-2"></span>
                        </div>
                        <div class="mt-auto placeholder-glow d-flex justify-content-between">
                            <span class="bg-secondary placeholder col-2"></span>
                            <span class="bg-danger placeholder col-2"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    html += '</div>';

    skeleton.innerHTML = html;
    skeleton.style.display = "block";
}

function hideSkeleton(container) {
    const skeleton = container.querySelector(".skeleton-wrapper");
    if (skeleton) skeleton.style.display = "none";
}

// Convert anime list to HTML
function renderScheduleHTML(animeList) {
    const rows = [];
    rows.push(`<div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3">`);

    for (const anime of animeList) {
        const imageUrl = escapeHTML(anime.images.jpg.large_image_url);
        const title = escapeHTML(anime.title_english || anime.title);
        const altTitle = escapeHTML(anime.title);
        const score = anime.score != null ? anime.score : "N/A";
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
                        <h6 class="card-title text-info two-line-truncate mt-1">
                            <a class="text-decoration-none anime-title-clickable" title="${title}" data-original-title="${altTitle}">
                                ${title}
                            </a>
                        </h6>
                        ${studiosHTML}
                        <div>
                            <span class="badge badge-airing bg-primary text-light small mb-1 rounded-pill text-wrap">${score}</span>
                        </div>
                        <div class="mt-auto pt-2 small d-flex justify-content-between align-items-center text-secondary">
                            <a href="${anime.url}" class="text-secondary" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                            <span class="airing-fav">
                                <i class="bi bi-suit-heart-fill me-1 text-danger"></i>
                                <b title="Favorites">${favorites}</b>
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

const schedulePageDOM = {}; // For caching when changing page in a day
function renderScheduleHTMLInto(day, animeList, currentPage = 1, lastVisiblePage = 1) {
    const container = document.getElementById(`schedule-${day}`);
    if (!container) return;

    // Hide skeleton placeholder
    hideSkeleton(container);

    // Hide all previously shown pages
    container.querySelectorAll('.schedule-page').forEach(div => {
        div.style.display = 'none';
    });

    // Initialize cache for this day
    if (!schedulePageDOM[day]) {
        schedulePageDOM[day] = {};
    }

    // To hold the already created DOM so we can reuse instead of recreating
    const existingPageDiv = schedulePageDOM[day][currentPage];

    if (existingPageDiv) {
        // Show cached DOM
        existingPageDiv.style.display = 'block';

        // Re-observe fade-in elements so they animate again
        const cards = existingPageDiv.querySelectorAll('.fade-in');
        cards.forEach(card => {
            card.classList.remove('visible'); // Remove visible to reset animation
            observer.observe(card); // Re-observe to allow .visible to be re-added
        });
    } else {
        // Create and cache DOM for this page
        const pageDiv = document.createElement('div');
        pageDiv.className = 'schedule-page';
        // Append anime list
        appendAnimeListWithPagination(pageDiv, day, animeList, currentPage, lastVisiblePage);
        schedulePageDOM[day][currentPage] = pageDiv;
        container.appendChild(pageDiv);

        // Also remove visible and observe newly created cards to trigger fade-in
        const cards = pageDiv.querySelectorAll('.fade-in');
        cards.forEach(card => {
            card.classList.remove('visible');
            observer.observe(card);
        });
    }

    // Re-attach click handlers only on new DOM
    clickableAnimeTitleToSearchInput();
    // Privacy option
    toggleImageBlur(isBlurEnabled);
}

function appendAnimeListWithPagination(container, day, animeList, currentPage, lastVisiblePage) {
    // Using DOM for safer HTML insertion
    const listDiv = document.createElement('div');
    listDiv.innerHTML = renderScheduleHTML(animeList);
    container.appendChild(listDiv);

    // Build pagination HTML string
    if (lastVisiblePage >= 1) {
        // Previous
        let paginationHTML = `
            <nav aria-label="Page navigation">
                <ul class="pagination justify-content-center mt-4">
                    <li class="page-item${currentPage === 1 ? ' disabled' : ''}">
                        <a href="#" class="page-link bg-dark text-light border-secondary" data-page="${currentPage - 1}">Prev</a>
                    </li>
        `;

        // Page numbers
        for (let i = 1; i <= lastVisiblePage; i++) {
            if (i === currentPage) {
                paginationHTML += `
                    <li class="page-item active" aria-current="page">
                        <span class="page-link">${i}</span>
                    </li>
                `;
            } else {
                paginationHTML += `
                    <li class="page-item">
                        <a href="#" class="page-link bg-dark text-light border-secondary" data-page="${i}">${i}</a>
                    </li>
                `;
            }
        }

        // Next
        paginationHTML += `
                    <li class="page-item${currentPage === lastVisiblePage ? ' disabled' : ''}">
                        <a href="#" class="page-link bg-dark text-light border-secondary" data-page="${currentPage + 1}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        // Append pagination to container
        container.insertAdjacentHTML('beforeend', paginationHTML);

        // Attach event listeners for pagination links
        container.querySelectorAll('a.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = Number(e.currentTarget.dataset.page);
                // Checks that the page number is valid (between 1 and the last page) and not the current page
                if (page >= 1 && page <= lastVisiblePage && page !== currentPage) {
                    goToPage(day, page);
                }
            });
        });
    }
}

function goToPage(day, page) {
    const cached = scheduleCache[day];
    if (cached?.pages?.[page]) {
        renderScheduleHTMLInto(day, cached.pages[page], page, cached.lastVisiblePage);
    } else {
        loadScheduleForDay(day, page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getTodayDayString() {
    // JS Sunday = 0, so we rotate the array
    const jsDay = new Date().getDay(); // 0–6
    const reorderedDays = [...DAYS_OF_WEEK.slice(6), ...DAYS_OF_WEEK.slice(0, 6)];
    return reorderedDays[jsDay]; // gives correct string
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", renderAiringScheduleTabs);
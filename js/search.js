// Contains search input, autocomplete suggestions, and arrow key navigation.

const searchInput = document.getElementById('search');
const suggestions = document.getElementById('suggestions');
const clearBtn = document.getElementById('clear-btn');

let debounceTimeout;
let selectedIndex = -1 // For Up and Down arrow keys in suggestion list
let isFetching = false; // To check fetching state
let fetchController = null;
let timeoutId;
let lastNoResultQuery = '';

searchInput.addEventListener('input', () => {
    // This prevents a new search from triggering right after a suggestion is selected
    if (skipInputAfterSelection) {
        skipInputAfterSelection = false;  // Reset flag and ignore this input event
        return;
    }

    const query = searchInput.value.trim();
    clearTimeout(debounceTimeout);
    suggestions.innerHTML = '';

    // Less than 2 shows no suggestion list or stop if the same current and last query has no suggestion
    if (query.length < 2 || query === lastNoResultQuery) return;

    // Abort previous fetch if any
    if (fetchController) {
        fetchController.abort();
        //console.warn("Previous fetch aborted due to new input");
    }
    
    debounceTimeout = setTimeout(() => {
        // Recheck if the input has changed during the delay
        if (query !== searchInput.value.trim()) return;

        // AbortController allows you to cancel in-flight fetches.
        fetchController = new AbortController();
        const signal = fetchController.signal; // For fetch() to listen for abort

        isFetching = true;
        //console.log("Fetching suggestions... (pending = true)");

        // auto-timeout after 10 seconds
        timeoutId = setTimeout(() => {
            if (isFetching && fetchController) {
                fetchController.abort();
                //console.warn("Fetch manually aborted after 10 seconds");
            }
        }, 10000);

        fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=15`, {signal})
            .then(res => res.json())
            .then(data => {
                suggestions.innerHTML = ''; // To avoid a duplicated list when you enter a title and you press backspace.
                selectedIndex = -1; // to reset state
                
                renderSuggestions(data.data, query);

                // Prevent a case where the user spam a query of 2+ chars with no suggestions.
                const items = suggestions.querySelectorAll('.suggestion-item');
                if (!items.length && query.length > 1) {
                    lastNoResultQuery = query;
                    return;
                } else {
                    lastNoResultQuery = ''; // Reset if suggestions exist
                }

            }).catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Autocomplete fetch failed", err);
                }
            }).finally(() => {
                isFetching = false;
                clearTimeout(timeoutId); // Prevent zombie abort. Cancel the scheduled abort if it’s no longer needed.
                fetchController = null;
                //console.log("Fetch done. (pending = false)");
            });
    }, 400);
});

function renderSuggestions(dataList, query) {
    const seenTitles = new Set(); // To avoid duplicate anime title
    // Prioritize exact match first
    const exactMatches = [];
    const others = [];

    dataList.forEach((anime, index) => {
        // Getting different titles
        const englishTitle = anime.title_english || '';
        const originalTitle = anime.title || '';
        const displayTitle = englishTitle || originalTitle;

        if (seenTitles.has(englishTitle) && seenTitles.has(originalTitle)) return; // skip duplicate
        
        seenTitles.add(englishTitle);
        seenTitles.add(originalTitle);

        const isExactMatch = [englishTitle, originalTitle].some(
            t => t.toLowerCase() === query.toLowerCase()
        );

        const animeYear = anime.year || anime.aired?.prop?.from?.year || 'N/A';

        const li = document.createElement('li');
        li.className = 'list-group-item bg-dark text-light suggestion-item custom-suggestion-list';
        li.innerHTML = createSuggestionHTML(displayTitle, originalTitle, query, animeYear);
        li.dataset.index = index;
        li.addEventListener('click', () => {
            selectSuggestion(anime); // Do something in that function
        });

        if (isExactMatch) {
            exactMatches.push(li);
        } else {
            others.push(li);
        }

        //suggestions.appendChild(li);
    });
    // Append exact matches first, then the rest
    [...exactMatches, ...others].forEach(li => suggestions.appendChild(li));
}

function createSuggestionHTML(displayTitle, originalTitle, query, year) {
    // Highlighting
    const regex = new RegExp(`(${query})`, 'i');
    const highlighted = displayTitle.replace(regex, '<strong>$1</strong>');
    const highlightedOriginal = originalTitle.replace(regex, '<strong>$1</strong>');

    // Titles in suggestion list 
    const titleRow = (displayTitle !== originalTitle)
        ? `<div class="text-secondary small">${highlightedOriginal} <span class="text-primary">(${year})</span></div>`
        : `<div class="text-secondary small">${highlighted} <span class="text-primary">(${year})</span></div>`;

    return `${highlighted} <span class="text-primary">(${year})</span>${titleRow}`;
}

// Clear button click
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    suggestions.innerHTML = '';
    searchInput.focus();
    console.log("Clear button clicked!");
});

// Hide suggestions on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#search') && !e.target.closest('#suggestions')) {
        suggestions.innerHTML = '';
    }
});

// For moving UP and DOWN with arrow keys. 
// Esc closes the suggest. Enter select the option.
searchInput.addEventListener('keydown', (e) => {
    const items = suggestions.querySelectorAll('.suggestion-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateHighlight(items);
        scrollToViewIfNeeded(items[selectedIndex]);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex === -1) {
            selectedIndex = items.length - 1; // Jump to last if nothing is selected yet
        } else {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        }
        updateHighlight(items);
        scrollToViewIfNeeded(items[selectedIndex]);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) {
            items[selectedIndex].click(); // simulate click
        }
    } else if (e.key === 'Escape') {
        suggestions.innerHTML = '';
    }
});

// Handles Enter when no suggestions are showing. Must be separated, can't merge.
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        const hasSuggestions = suggestions.children.length > 0;

        if (query.length >= 2 && !hasSuggestions) {
            searchInput.dispatchEvent(new Event('input'));
        }
    }
});

function updateHighlight(items) {
    items.forEach((item, index) => {
        item.classList.toggle('active', index === selectedIndex);
    });
}

function scrollToViewIfNeeded(item) {
    if (!item) return;

    const container = suggestions;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;

    if (itemBottom > containerBottom) {
        // Scroll down to make item fully visible at bottom
        container.scrollTop += itemBottom - containerBottom;
    } else if (itemTop < containerTop) {
        // Scroll up to make item fully visible at top
        container.scrollTop -= containerTop - itemTop;
    }
}

let skipInputAfterSelection = false;

function selectSuggestion(anime) {
    skipInputAfterSelection = true; // Handles Enter when no suggestions are showing
    searchInput.value = anime.title_english || anime.title;
    suggestions.innerHTML = '';
    // Optional: do something with anime.mal_id
    console.log("Anime MAL id:", anime.mal_id);
    console.log("Search input:", searchInput.value);
    document.getElementById("animeCharacters").innerHTML = ""; // To clear previous characters list
    getAnimeById(anime.mal_id);
    getAnimeCharacters(anime.mal_id);

    // Important to keep the setTimeout. Happens after the current event completes.
    setTimeout(() => {
        // When users CLICK on a suggestion, then select the search input and press Enter.
        // The suggestion list will appear.
        skipInputAfterSelection = false;
    }, 0);
}

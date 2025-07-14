// Contains search input, autocomplete suggestions, and arrow key navigation.

const searchInput = document.getElementById('search');
const suggestions = document.getElementById('suggestions');
const clearBtn = document.getElementById('clear-btn');

let debounceTimeout;
let selectedIndex = -1 // For Up and Down arrow keys in suggestion list

searchInput.addEventListener('input', () => {
    // Handles Enter when no suggestions are showing
    if (ignoreNextInput) {
        ignoreNextInput = false;  // Reset flag and ignore this input event
        return;
    }

    const query = searchInput.value.trim();
    clearTimeout(debounceTimeout);
    suggestions.innerHTML = '';

    if (query.length < 2) return; // Less than 2 shows no suggestion list

    debounceTimeout = setTimeout(() => {
        fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`)
            .then(res => res.json())
            .then(data => {
                suggestions.innerHTML = ''; // To avoid a duplicated list when you enter a title and you press backspace.
                selectedIndex = -1; // to reset state
                const seenTitles = new Set(); // To avoid duplicate anime title
                
                data.data.forEach((anime, index) => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item bg-dark text-light suggestion-item custom-suggestion-list';

                    // Highlight matching part
                    const regex = new RegExp(`(${query})`, 'i');
                    const englishTitle = anime.title_english || '';
                    const originalTitle = anime.title || '';
                    const displayTitle = englishTitle || originalTitle;
                    if (seenTitles.has(englishTitle) && seenTitles.has(originalTitle)) return; // skip duplicate
                    seenTitles.add(englishTitle);
                    seenTitles.add(originalTitle);
                    // Highlighting
                    const highlighted = displayTitle.replace(regex, '<strong>$1</strong>');
                    const highlightedOriginal = originalTitle.replace(regex, '<strong>$1</strong>');
                    const animeYear = anime.year || anime.aired?.prop?.from?.year || 'N/A';
                    // Titles in suggestion list 
                    li.innerHTML = `
                        ${highlighted} <span class="text-primary">(${animeYear})</span>
                        ${englishTitle && originalTitle && englishTitle !== originalTitle
                            ? `<div class="text-secondary small">${highlightedOriginal} <span class="text-primary">(${animeYear})</span></div>`
                            : `<div class="text-secondary small">${highlighted} <span class="text-primary">(${animeYear})</span></div>`}
                    `;
                    
                    li.dataset.index = index;
                    li.addEventListener('click', () => {
                        selectSuggestion(anime); // Do something in that function
                    });
                    suggestions.appendChild(li);
                });
            });
    }, 400);
});

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
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex === -1) {
            selectedIndex = items.length - 1; // Jump to last if nothing is selected yet
        } else {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        }
        updateHighlight(items);
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

let ignoreNextInput = false;

function selectSuggestion(anime) {
    ignoreNextInput = true; // Handles Enter when no suggestions are showing
    searchInput.value = anime.title_english || anime.title;
    suggestions.innerHTML = '';
    // Optional: do something with anime.mal_id
    console.log("Anime MAL id:", anime.mal_id);
    console.log("Search input:", searchInput.value);
    document.getElementById("animeCharacters").innerHTML = ""; // To clear previous characters list
    getAnimeById(anime.mal_id);
    getAnimeCharacters(anime.mal_id);
}

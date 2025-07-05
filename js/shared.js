// HTML for the row of every characters. 
function createCharacterListHTML(charList) {
    return charList.map((char, index) => `
        <li class="d-flex align-items-center mb-2 custom-top-char-row">
            <div class="me-2 text-center" style="width: 40px; flex-shrink: 0;">
                <span class="fs-5">${index + 1}</span>
            </div>
            <img src="${char.image}" alt="${char.name}" class="me-2 rounded"
                style="width: 50px; height: 50px; object-fit: cover; flex-shrink: 0;" loading="lazy">

            <div class="flex-grow-1 text-start" style="min-width: 0;">
                <div><strong class="fs-6 text-break me-1">${char.name}</strong><span class="text-secondary small">(#${char.id})</span></div>
                <div class="text-info text-break"><em>${char.animeTitle}</em></div>
                <div class="text-warning small">❤ ${char.favorites.toLocaleString()} favorites</div>
            </div>
        </li>
    `).join('');
}

function formatName(name) {
    if (!name.includes(',')) return name; // No comma, return as-is

    const [last, first] = name.split(',').map(part => part.trim());
    return `${first} ${last}`; // First name Last name format
}

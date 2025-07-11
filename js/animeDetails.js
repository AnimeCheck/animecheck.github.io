// Logic for fetching and displaying anime info (title, studio, genre, score, etc.).

async function getAnimeById(animeId) {
    console.log("Anime by id URL: ", `https://api.jikan.moe/v4/anime/${animeId}`);
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
        const airedDates = dataJSON.data?.aired.string || ["N/A"];
        const imageURL = dataJSON.data?.images.jpg.large_image_url;
        //console.log("imageURL: ", imageURL);
        const MALscore = dataJSON.data?.score || ["N/A"];
        const MALscoreUsers = dataJSON.data?.scored_by || ["N/A"];
        const MALrank = dataJSON.data?.rank || [""];
        const MALpopularity = dataJSON.data?.popularity || ["N/A"];
        /*console.log("MALscore: ", MALscore);
        console.log("MALscoreUsers: ", MALscoreUsers);
        console.log("MALrank: ", MALrank);
        console.log("MALpopularity: ", MALpopularity);*/

        // In the JSON, get every item of "titles": [...]. We want to get each title.
        const getTitle = (type) =>
            titles.find((item) => item.type === type)?.title || "N/A";
        
        const defaultTitle = getTitle("Default");
        const synonymTitle = getTitle("Synonym");
        const foreignTitle = getTitle("Japanese");
        const englishTitle = getTitle("English");
        // To show all studios of "studios": [..., ...]
        const studioNames = studios.map(item => 
            `<span class="badge bg-light text-dark me-2 rounded-pill">${item.name}</span>`
        ).join("");
        // To show all genres of "genres": [..., ...]
        const genreNames = genres.map(item => 
            `<span class="badge bg-success me-2 rounded-pill">${item.name}</span>`
        ).join("");
        // To show all themes of "themes": [..., ...]
        const themeNames = themes.map(item => 
            `<span class="badge bg-warning text-dark me-2 rounded-pill">${item.name}</span>`
        ).join("");
        /*console.log("Default:", defaultTitle);
        console.log("Synonym:", synonymTitle);
        console.log("Foreign:", foreignTitle);
        console.log("English:", englishTitle);
        console.log("studioName:", studioName);*/
        const animeDetailsHTML = `
            <div class="row mb-3 align-items-center">
                <div class="col-md-2 text-center my-2">
                    <a href="${imageURL}" target="_blank" rel="noopener noreferrer">
                        <img src="${imageURL}" class="img-fluid rounded">
                    </a>
                </div>
                <div class="col-md-10 d-flex align-items-center">
                    <div class="w-100">
                        <div class="fs-3 fs-md-2 fs-lg-1">
                            ${foreignTitle} <span class="fs-5 fs-md-5 fs-lg-4 text-secondary">(${defaultTitle})</span>
                        </div>
                        <div class="fs-3 fs-md-2 fs-lg-1">
                            ${englishTitle} <span class="fs-5 fs-md-5 fs-lg-4 text-secondary">(${synonymTitle})</span>
                        </div>
                        <div class="mt-2">Studio: ${studioNames}</div>
                        <div>Genres: ${genreNames}</div>
                        <div>Themes: ${themeNames}</div>
                        <div>Aired: ${airedDates}</div>
                        <div class="bg-dark text-light my-2 p-2 d-flex flex-wrap gap-2 rounded">
                            <div>
                                MAL Score: <span class="badge bg-primary fs-6 rounded-pill">${MALscore}</span> 
                                <i>by ${MALscoreUsers} users</i> | 
                            </div>
                            <div>
                                Rank: <span class="badge bg-secondary fs-6 rounded-pill">#${MALrank}</span> | 
                            </div>
                            <div>
                                Popularity: <span class="badge bg-secondary fs-6 rounded-pill">#${MALpopularity}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("animeDetailsWrapper").innerHTML = animeDetailsHTML;
    } catch (error) {
        console.error("Error fetching anime data:", error.message);
    }
}

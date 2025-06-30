function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Goal is to not hit the API rate limit. Need to go a bit faster than await delay(1000)
const smartDelayTimestamps = [];
async function smartDelay() {
    const now = Date.now();

    // Remove timestamps older than 60 seconds
    while (smartDelayTimestamps.length > 0 && now - smartDelayTimestamps[0] > 60000) {
        smartDelayTimestamps.shift();
    }

    // Check and wait if over minute or second limit
    while (true) {
        const currentTime = Date.now();

        // Remove old entries again
        while (smartDelayTimestamps.length > 0 && currentTime - smartDelayTimestamps[0] > 60000) {
            smartDelayTimestamps.shift();
        }

        const requestsLastMinute = smartDelayTimestamps.length;
        const requestsLastSecond = smartDelayTimestamps.filter(t => currentTime - t <= 1000).length;

        // Log current rate usage
        console.log(`[smartDelay] 1s: ${requestsLastSecond} / 3 | 60s: ${requestsLastMinute} / 60`);

        if (requestsLastMinute < 60 && requestsLastSecond < 3) {
            break; // safe to proceed
        }

        // Calculate next safe window
        const oldestTimestamp = smartDelayTimestamps[0];
        const waitUntil = Math.max(
            requestsLastSecond >= 3 ? oldestTimestamp + 1000 : 0,
            requestsLastMinute >= 60 ? oldestTimestamp + 60000 : 0
        );

        const waitTime = Math.max(50, waitUntil - now); // minimum 50ms
        console.warn(`[smartDelay] Too fast — delaying ${waitTime}ms`);
        await delay(waitTime);
    }

    //console.log(`[smartDelay] Delay: ${delayTime}ms — 1s: ${requestsLastSecond}, 60s: ${requestsLastMinute}`);
    //await delay(delayTime);

    // Add timestamp when we actually proceed with request
    smartDelayTimestamps.push(Date.now());
}

// Goal is to not hit the API rate limit
async function throttledFetch(...args) {
    await smartDelay();
    return fetch(...args);
}

function timeAgoText(timestamp) {
    const diff = Date.now() - timestamp;

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// Toast for API Rate limit
let lastRateLimitToast = 0;

function showRateLimitToast() {
    const now = Date.now();
    if (now - lastRateLimitToast > 5000) { // Only show once every 5 seconds
        lastRateLimitToast = now;
        const toastRateLimit = document.getElementById("rateLimitToast");
        if (toastRateLimit) {
            const toast = new bootstrap.Toast(toastRateLimit);
            toast.show();
        }
    }
}

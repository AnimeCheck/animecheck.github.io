function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Goal is to not hit the API rate limit. Need to go a bit faster than await delay(1000)
const smartDelayTimestamps = [];
async function smartDelay() {
    while (true) {
        const now = Date.now();

        // Remove timestamps older than 60 seconds
        while (smartDelayTimestamps.length && now - smartDelayTimestamps[0] > 60000) {
            smartDelayTimestamps.shift();
        }

        const requestsLastMinute = smartDelayTimestamps.length;
        const requestsLastSecond = smartDelayTimestamps.filter(t => now - t <= 1000).length;

        console.log(`[smartDelay] 1s: ${requestsLastSecond} / 3 | 60s: ${requestsLastMinute} / 60`);

        if (requestsLastMinute < 60 && requestsLastSecond < 3) {
            break; // safe to proceed
        }

        let waitUntil = now + 100; // fallback minimum wait

        // If over 3/sec, wait until 1st of the last 3 drops out of the 1s window
        if (requestsLastSecond >= 3) {
            const thirdMostRecent = smartDelayTimestamps.filter(t => now - t <= 1000)[0];
            waitUntil = Math.max(waitUntil, thirdMostRecent + 1000);
        }

        // If over 60/min, wait until oldest timestamp drops off
        if (requestsLastMinute >= 60) {
            const oldest = smartDelayTimestamps[0];
            waitUntil = Math.max(waitUntil, oldest + 60000);
        }

        const waitTime = waitUntil - now;
        console.warn(`[smartDelay] Too fast — delaying ${waitTime}ms`);
        await delay(waitTime);
    }

    smartDelayTimestamps.push(Date.now());
}

// Goal is to not hit the API rate limit
let fetchLock = Promise.resolve();
async function throttledFetch(...args) {
    // Queue this request behind the last one
    const run = async () => {
        await smartDelay();
        return fetch(...args);
    };

    fetchLock = fetchLock.then(run);
    return fetchLock;
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

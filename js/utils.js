const maxRequestsPerSecond = 3;
const maxRequestsPerMinute = 60;

const requestQueue = [];
let timestamps = [];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let isProcessing = false;

async function processQueue() {
    if (isProcessing) {
        console.log("[processQueue] Already processing queue, returning");
        return;
    }
    isProcessing = true;

    while (requestQueue.length > 0) {
        console.log(`[processQueue] Requests left in queue: ${requestQueue.length}`);
        const { args, resolve, reject } = requestQueue.shift();

        // Ensure we are below rate limit
        await smartDelay();

        const url = args[0];
        console.log(`[processQueue] Executing fetch: ${url}`);

        try {
            const res = await fetch(...args);

            if (res.status === 429) {
                console.warn(`[processQueue] 429 Too Many Requests — retrying in 1000ms: ${url}`);
                await delay(1000);
                requestQueue.unshift({ args, resolve, reject });
                continue;
            }

            timestamps.push(Date.now()); // Only push if it didn’t 429
            resolve(res);
            console.log(`[processQueue] Fetch completed: ${url}`);
        } catch (err) {
            console.error(`[processQueue] Fetch failed: ${url}`, err);
            reject(err);
        }
    }

    isProcessing = false;
    console.log("[processQueue] Queue processing complete");
}

async function smartDelay() {
    while (true) {
        const now = Date.now();
        timestamps = timestamps.filter(ts => now - ts < 60000);

        const requestsLastMinute = timestamps.length;
        const requestsLastSecond = timestamps.filter(t => now - t < 1000).length;

        console.log(`[smartDelay] 1s: ${requestsLastSecond} / ${maxRequestsPerSecond} | 60s: ${requestsLastMinute} / ${maxRequestsPerMinute}`);

        if (requestsLastMinute < maxRequestsPerMinute && requestsLastSecond < maxRequestsPerSecond) {
            break;
        }

        let waitUntil = now + 100;

        if (requestsLastSecond >= maxRequestsPerSecond) {
            const oldestSecond = timestamps.filter(t => now - t < 1000)[0];
            waitUntil = Math.max(waitUntil, oldestSecond + 1000);
        }

        if (requestsLastMinute >= maxRequestsPerMinute) {
            const oldestMinute = timestamps[0];
            waitUntil = Math.max(waitUntil, oldestMinute + 60000);
        }

        const waitTime = waitUntil - now;
        console.warn(`[smartDelay] Too fast — delaying ${waitTime}ms`);
        await delay(waitTime);
    }

    // Add a small spacing to spread out requests just in case
    await delay(350); // ~3 per second safely
}

function throttledFetch(...args) {
    return new Promise((resolve, reject) => {
        console.log(`[throttledFetch] Queueing request: ${args[0]}`);
        requestQueue.push({ args, resolve, reject });

        console.log(`[throttledFetch] Queue length: ${requestQueue.length}`);

        if (!isProcessing) {
            console.log("[throttledFetch] Starting to process queue");
            processQueue();
        }
    });
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
    if (now - lastRateLimitToast > 5000) {
        lastRateLimitToast = now;
        const toastRateLimit = document.getElementById("rateLimitToast");
        if (toastRateLimit) {
            const toast = new bootstrap.Toast(toastRateLimit);
            toast.show();
        }
    }
}

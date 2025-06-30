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
        const currentTime = Date.now();

        timestamps = timestamps.filter(ts => currentTime - ts < 60000);

        if (timestamps.length >= maxRequestsPerMinute) {
            const waitTime = 60000 - (currentTime - timestamps[0]);
            console.warn(`[processQueue] Rate limit per minute hit, delaying for ${waitTime} ms`);
            await delay(waitTime);
            continue;
        }

        const lastSecondRequests = timestamps.filter(ts => currentTime - ts < 1000);
        if (lastSecondRequests.length >= maxRequestsPerSecond) {
            const waitTime = 1000 - (currentTime - lastSecondRequests[0]);
            console.warn(`[processQueue] Rate limit per second hit, delaying for ${waitTime} ms`);
            await delay(waitTime);
            continue;
        }

        const { args, resolve, reject, retryCount = 0 } = requestQueue.shift();

        await smartDelay();
        console.log(`[processQueue] Executing fetch:`, args[0]);

        try {
            const res = await fetch(...args);

            if (res.status === 429) {
                const backoff = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
                console.warn(`[processQueue] 429 Too Many Requests — retrying in ${backoff}ms:`, args[0]);

                // Requeue with increased retry count
                requestQueue.unshift({ args, resolve, reject, retryCount: retryCount + 1 });
                await delay(backoff);
                continue;
            }

            timestamps.push(Date.now());
            resolve(res);
            console.log(`[processQueue] Fetch completed:`, args[0]);
        } catch (err) {
            console.error(`[processQueue] Fetch failed:`, args[0], err);
            reject(err);
        }
    }

    isProcessing = false;
    console.log("[processQueue] Queue processing complete");
}

async function smartDelay() {
    while (true) {
        const now = Date.now();

        // Clean old entries
        timestamps = timestamps.filter(ts => now - ts < 60000);

        const requestsLastMinute = timestamps.length;
        const requestsLastSecond = timestamps.filter(t => now - t <= 1000).length;

        console.log(`[smartDelay] 1s: ${requestsLastSecond} / ${maxRequestsPerSecond} | 60s: ${requestsLastMinute} / ${maxRequestsPerMinute}`);

        if (requestsLastMinute < maxRequestsPerMinute && requestsLastSecond < maxRequestsPerSecond) {
            break;
        }

        let waitUntil = now + 100;

        if (requestsLastSecond >= maxRequestsPerSecond) {
            const thirdMostRecent = timestamps.find(t => now - t <= 1000);
            if (thirdMostRecent) waitUntil = Math.max(waitUntil, thirdMostRecent + 1000);
        }

        if (requestsLastMinute >= maxRequestsPerMinute) {
            const oldest = timestamps[0];
            waitUntil = Math.max(waitUntil, oldest + 60000);
        }

        const waitTime = waitUntil - now;
        console.warn(`[smartDelay] Too fast — delaying ${waitTime}ms`);
        await delay(waitTime);
    }
}

function throttledFetch(...args) {
    return new Promise((resolve, reject) => {
        console.log(`[throttledFetch] Queueing request:`, args[0]);
        requestQueue.push({ args, resolve, reject });
        console.log(`[throttledFetch] Queue length: ${requestQueue.length}`);

        if (!isProcessing) {
            console.log("[throttledFetch] Starting to process queue");
            processQueue();
        }
    });
}

// Optional: Fancy time formatting utility
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

// Optional: Show toast when rate limit is exceeded
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

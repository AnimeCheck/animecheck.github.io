const maxRequestsPerSecond = 3;
const maxRequestsPerMinute = 60;

const requestQueue = [];
let timestamps = [];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {
    if (requestQueue.length === 0) return;

    const currentTime = Date.now();

    // Remove timestamps older than 60 seconds
    timestamps = timestamps.filter(ts => currentTime - ts < 60000);

    // Check if max per minute reached
    if (timestamps.length >= maxRequestsPerMinute) {
        const waitTime = 60000 - (currentTime - timestamps[0]);
        await delay(waitTime);
        return processQueue();
    }

    // Check requests in last 1 second
    const lastSecondRequests = timestamps.filter(ts => currentTime - ts < 1000);
    if (lastSecondRequests.length >= maxRequestsPerSecond) {
        const earliestLastSecond = lastSecondRequests[0];
        const waitTime = 1000 - (currentTime - earliestLastSecond);
        await delay(waitTime);
        return processQueue();
    }

    // Dequeue request and execute
    const {
        args,
        resolve,
        reject
    } = requestQueue.shift();

    try {
        const res = await fetch(...args);
        timestamps.push(Date.now());
        resolve(res);
    } catch (err) {
        reject(err);
    }

    // Process next in queue
    processQueue();
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
function throttledFetch(...args) {
    return new Promise((resolve, reject) => {
        requestQueue.push({
            args,
            resolve,
            reject
        });
        if (requestQueue.length === 1) {
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
    if (now - lastRateLimitToast > 5000) { // Only show once every 5 seconds
        lastRateLimitToast = now;
        const toastRateLimit = document.getElementById("rateLimitToast");
        if (toastRateLimit) {
            const toast = new bootstrap.Toast(toastRateLimit);
            toast.show();
        }
    }
}

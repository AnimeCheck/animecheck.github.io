const maxRequestsPerSecond = 3;
const maxRequestsPerMinute = 60;

const requestQueue = [];
let timestamps = [];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let isProcessing = false;

async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    while (requestQueue.length > 0) {
        const { args, resolve, reject } = requestQueue.shift();
        await smartDelay();

        const url = args[0];
        //console.log(`[processQueue] Fetching: ${url}`);

        try {
            const res = await fetch(...args);

            if (res.status === 429) {
                showRateLimitToast();
                const now = Date.now();
                const recent = timestamps.filter(t => now - t < 1000);
                const oldestSecond = recent[0] || now;
                const waitUntil = oldestSecond + 1000;
                const waitTime = Math.max(waitUntil - now, 100);

                console.warn(`[processQueue] 429 Too Many Requests — waiting ${waitTime}ms: ${url}`);
                await delay(waitTime);
                requestQueue.unshift({ args, resolve, reject });
                continue;
            }

            timestamps.push(Date.now());  // Only push AFTER success
            resolve(res);
        } catch (err) {
            reject(err);
        }
    }

    isProcessing = false;
}

async function smartDelay() {
    while (true) {
        const now = Date.now();
        timestamps = timestamps.filter(ts => now - ts < 60000);

        const requestsLastMinute = timestamps.length;
        const requestsLastSecond = timestamps.filter(t => now - t < 1000).length;

        //console.log(`[smartDelay] Requests in last 1s: ${requestsLastSecond} / ${maxRequestsPerSecond}, last 60s: ${requestsLastMinute} / ${maxRequestsPerMinute}`);

        if (requestsLastMinute < maxRequestsPerMinute && requestsLastSecond < maxRequestsPerSecond) {
            //console.log(`[smartDelay] Under limits, proceeding with request.`);
            break;
        }

        let waitUntil = now + 100;

        if (requestsLastSecond >= maxRequestsPerSecond) {
            const oldestSecond = timestamps.filter(t => now - t < 1000)[0];
            waitUntil = Math.max(waitUntil, oldestSecond + 1000);
            //console.log(`[smartDelay] Reached per-second limit, waiting until ${new Date(waitUntil).toISOString()}`);
        }

        if (requestsLastMinute >= maxRequestsPerMinute) {
            const oldestMinute = timestamps[0];
            waitUntil = Math.max(waitUntil, oldestMinute + 60000);
            //console.log(`[smartDelay] Reached per-minute limit, waiting until ${new Date(waitUntil).toISOString()}`);
        }

        const waitTime = waitUntil - now;

        if (waitTime > 5000) {
            showRateLimitWarningToast();
        }

        //console.log(`[smartDelay] Delaying for ${waitTime} ms to avoid hitting rate limit.`);
        await delay(waitTime);
    }

    // Slight extra delay to avoid bursting right on the limit edge
    //console.log(`[smartDelay] Adding extra 500ms delay to spread out requests.`);
    const jitter = Math.floor(Math.random() * 150); // 0-149 ms. Old: 0–199 ms
    await delay(450 + jitter); // total = 450-599 ms. Old: 500–699 ms
}

function throttledFetch(...args) {
    return new Promise((resolve, reject) => {
        //console.log(`[throttledFetch] Queued: ${args[0]}`);
        requestQueue.push({ args, resolve, reject });

        //console.log(`[throttledFetch] Queue length: ${requestQueue.length}`);

        if (!isProcessing) {
            //console.log("[throttledFetch] Starting to process queue");
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
    if (days < 30) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// To sanitize string data.
function escapeHTML(str) {
    return String(str).replace(/[&<>"'`=]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#x60;',
        '=': '&#x3D;'
    })[char]);
}

function uppercaseFirstChar(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const debug = false;
function consoleWarn(...args) {
    if (debug) {
        console.warn(...args);
    }
}

// Toast for API Rate limit
let lastRateLimitToast = 0;

function showRateLimitToast() {
    const now = Date.now();
    if (now - lastRateLimitToast > 5000) {
        lastRateLimitToast = now;
        
        showToast({
            message: "Jikan API rate limit hit. Progressing slowly...",
            type: "danger",
            icon: "bi bi-exclamation-triangle-fill"
        });
    }
}

// Toast for warning about slowing down to avoid API Rate limit
let lastRateLimitWarningToast = 0;

function showRateLimitWarningToast() {
    const now = Date.now();
    if (now - lastRateLimitWarningToast > 5000) { // throttle toast to show max once every 5 sec
        lastRateLimitWarningToast = now;
        
        showToast({
            message: "Avoiding API rate limit. Slowing down...",
            type: "warning",
            icon: "bi bi-exclamation-triangle-fill"
        });
    }
}

document.getElementById('backToTopLink')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

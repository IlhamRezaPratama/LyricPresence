let ws = null;
let lastPayload = "";
let lastNoTitleLog = 0;

console.log("[RPC Bridge] Content script loaded:", window.location.href);

function connectWebSocket() {

    ws = new WebSocket("ws://localhost:8888");

    ws.onopen = () => {
        console.log("[RPC Bridge] Connected");
    };

    ws.onclose = () => {
        console.log("[RPC Bridge] Reconnecting...");
        setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => {
        try {
            ws.close();
        } catch {}
    };

}

function parseTime(str) {

    if (!str) return 0;

    const p = str.trim().split(":").map(Number);

    if (p.length === 2)
        return p[0] * 60 + p[1];

    if (p.length === 3)
        return p[0] * 3600 + p[1] * 60 + p[2];

    return 0;

}

function getTitle() {

    return (
        document.querySelector('[data-testid="context-item-info-title"] a')
            ?.innerText
            ?.trim()

        ||

        document.querySelector('[data-testid="now-playing-widget"] a')
            ?.innerText
            ?.trim()

        ||

        document.querySelector('[data-testid="now-playing-bar"] a[href*="/track/"]')
            ?.innerText
            ?.trim()

        ||

        getPlayerBarText()[0]

        ||

        ""
    );

}

function getArtist() {

    return (
        document.querySelector('[data-testid="context-item-info-subtitles"] a')
            ?.innerText
            ?.trim()

        ||

        document.querySelector('[data-testid="context-item-info-subtitle"] a')
            ?.innerText
            ?.trim()

        ||

        document.querySelector('[data-testid="now-playing-bar"] a[href*="/artist/"]')
            ?.innerText
            ?.trim()

        ||

        getPlayerBarText()[1]

        ||

        "Unknown"
    );

}

function getPlayerBarText() {

    const playerBar =
        document.querySelector('[data-testid="now-playing-bar"]')
        || document.querySelector('[data-testid="now-playing-widget"]')
        || document.querySelector("footer");

    const containerLines = (playerBar?.innerText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(isPossiblePlayerText);

    if (containerLines.length > 0) {
        return containerLines;
    }

    const visibleBottomText = [...document.querySelectorAll("body *")]
        .filter((element) => {
            const rect = element.getBoundingClientRect();
            return (
                element.children.length === 0
                && rect.width > 0
                && rect.height > 0
                && rect.bottom > window.innerHeight - 180
            );
        })
        .map((element) => element.textContent.trim())
        .filter(isPossiblePlayerText);

    return [...new Set(visibleBottomText)];

}

function isPossiblePlayerText(line) {

    return (
        line
        && line.length <= 120
        && !/^\d+:\d+$/.test(line)
        && !/^(play|pause|next|previous|shuffle|repeat|volume|queue)$/i.test(line)
    );

}

function getCover() {

    return (
        document.querySelector('[data-testid="cover-art-image"]')
            ?.src

        ||

        ""
    );

}

function getCurrentLyric() {

    const active =

        document.querySelector('[data-testid="lyrics-line-active"]')

        ||

        document.querySelector('[aria-current="true"]')

        ||

        document.querySelector(".lyrics-lyricsContent-active");

    return active?.innerText.trim() || "";

}

function getProgress() {

    const progress =
        document.querySelector('[data-testid="playback-position"]')
            ?.innerText;

    return parseTime(progress) * 1000;

}

function getDuration() {

    const duration =
        document.querySelector('[data-testid="playback-duration"]')
            ?.innerText;

    return parseTime(duration) * 1000;

}

function isPlaying() {

    const btn =
        document.querySelector('[data-testid="control-button-playpause"]');

    const label =
        btn?.getAttribute("aria-label")?.toLowerCase() || "";

    return label.includes("pause");

}

function sendData() {

    const title = getTitle();

    if (!title) {
        if (Date.now() - lastNoTitleLog > 5000) {
            console.warn("[RPC Bridge] Spotify song title not found");
            lastNoTitleLog = Date.now();
        }
        return;
    }

    const payload = {

        title,

        artist: getArtist(),

        cover: getCover(),

        progressMs: getProgress(),

        durationMs: getDuration(),

        isPlaying: isPlaying(),

        liveLyric: getCurrentLyric(),

        sentAt: Date.now()

    };

    const json = JSON.stringify(payload);

    if (json === lastPayload)
        return;

    lastPayload = json;

    if (ws?.readyState === WebSocket.OPEN) {

        ws.send(json);

        console.log("[RPC Bridge] Song sent:", payload.title, "-", payload.artist);

    }

}

connectWebSocket();

// mengirim data dengan interval 200ms, agar lebih responsif
setInterval(sendData, 200);

// backup kalau DOM berubah
const observer = new MutationObserver(() => {

    sendData();

});

observer.observe(document.body, {

    subtree: true,

    childList: true,

    characterData: true

});

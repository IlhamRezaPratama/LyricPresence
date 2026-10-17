let ws = null;
let lastPayload = "";

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

        "Unknown"

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

    if (!title) return;

    const payload = {

        title,

        artist: getArtist(),

        cover: getCover(),

        progressMs: getProgress(),

        durationMs: getDuration(),

        isPlaying: isPlaying(),

        liveLyric: getCurrentLyric()

    };

    const json = JSON.stringify(payload);

    if (json === lastPayload)
        return;

    lastPayload = json;

    if (ws?.readyState === WebSocket.OPEN) {

        ws.send(json);

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

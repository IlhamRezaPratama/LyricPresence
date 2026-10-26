const RPC = require("discord-rpc");
const WebSocket = require("ws");

const DISCORD_CLIENT_ID = "1520101897065730058"; //1520101897065730058 AKUN UTAMA | 1520428250885787678 AKUN KEDUA

const rpc = new RPC.Client({
    transport: "ipc",
});



const wss = new WebSocket.Server({
    port: 8888,
});



let laguTerkini = null;
let judulLaguTerakhir = "";
let lirikTerakhir = "";
let lirikSyncDinamis = [];
let endTimestamp = null;
let rpcReady = false;

// Untuk mengatur offset delay Discord, karena bawaan discord RPC itu delaynya sekitar 3-5 detik maka perlu dikompensasi 
// dengan menambahkan offset agar lirik sinkron dengan lagu. Nilai ini bisa diubah sesuai kebutuhan.
const DISCORD_DELAY_OFFSET = 2.8;


//bagian LRCLIB
async function tarikLirik(judul, artis) {

    try {

        const url =
            `https://lrclib.net/api/get?track_name=${encodeURIComponent(judul)}&artist_name=${encodeURIComponent(artis)}`;

        const res = await fetch(url);

        if (!res.ok) {
            return [{
                time: 0,
                text: "🎵 Memutar lagu..."
            }];
        }

        const data = await res.json();

        if (!data.syncedLyrics) {

            return [{
                time: 0,
                text: "🎵 Memutar lagu..."
            }];

        }

        const hasil = [];

        for (const line of data.syncedLyrics.split("\n")) {

            const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);

            if (!m) continue;

            hasil.push({

                time:
                    Number(m[1]) * 60 +
                    Number(m[2]),

                text:
                    m[3].trim() ||
                    "🎵 ..."

            });

        }

        console.log("[LRCLIB]", hasil.length, "baris");

        return hasil;

    } catch (err) {

        console.log(err);

        return [{
            time: 0,
            text: "🎵 Memutar lagu..."
        }];

    }

}


async function updateRPC() {

    if (!rpcReady) return;

    if (!laguTerkini) return;

    if (!laguTerkini.isPlaying) {

        rpc.clearActivity().catch(() => {});
        return;

    }

    // Gunakan progress asli dari Spotify + offset kompensasi delay Discord
    const latency = laguTerkini.sentAt
    ? Date.now() - laguTerkini.sentAt
    : 0;

    const detik =
        (laguTerkini.progressMs + latency) / 1000 + DISCORD_DELAY_OFFSET;

    let lirikAktif = "🎵 Memutar lagu...";

    // Cari lirik berdasarkan posisi + offset dari LRCLIB
    // liveLyric dari extension tidak dipakai agar offset bisa bekerja
    for (let i = lirikSyncDinamis.length - 1; i >= 0; i--) {

        if (detik >= Number(lirikSyncDinamis[i].time)) {

            lirikAktif = lirikSyncDinamis[i].text;
            break;

        }

    }

    if (
        lirikAktif === "🎵 Memutar lagu..." &&
        lirikSyncDinamis.length > 0
    ) {
        lirikAktif = lirikSyncDinamis[0].text;
    }

    // Untuk mengurangi spam log, hanya update jika lirik berubah
    if (lirikAktif === lirikTerakhir) {
        return;
    }

    lirikTerakhir = lirikAktif;

    try {

    await rpc.setActivity({

        type: 2,

        details: `${laguTerkini.title}`,

        state: lirikAktif,

        startTimestamp: new Date(Date.now() - laguTerkini.progressMs),

        endTimestamp,

        largeImageKey: laguTerkini.cover,
        largeImageText: laguTerkini.title,

        instance: false,

        buttons: [
            { label: "HAM", url: "https://github.com/IlhamRezaPratama" }
        ]

    });

        console.log("[RPC]", lirikAktif);

    } catch (err) {

        console.log("[RPC]", err.message);

    }

}

wss.on("connection", (socket) => {

    console.log("[WebSocket] Extension Connected");

    socket.on("message", async (raw) => {

        try {

            const lagu = JSON.parse(raw);

            laguTerkini = lagu;

            endTimestamp = new Date(
                Date.now() +
                (lagu.durationMs - lagu.progressMs)
            );

            if (lagu.title !== judulLaguTerakhir) {

                console.log(
                    `\n🎵 ${lagu.title} - ${lagu.artist}`
                );

                judulLaguTerakhir = lagu.title;
                lirikTerakhir = "";

                const hasil = await tarikLirik(
                    lagu.title,
                    lagu.artist
                );

                lirikSyncDinamis = hasil;
            }

            updateRPC();

        } catch (err) {

            console.error(
                "[WebSocket]",
                err.message
            );

        }

    });

    socket.on("close", () => {

        console.log(
            "[WebSocket] Extension Disconnected"
        );

    });

});

// Bagian Discord RPC
rpc.on("ready", () => {

    rpcReady = true;

    console.log("🔥 Discord RPC Ready");

    // Backup apabila extension berhenti mengirim data
    setInterval(() => {

        if (laguTerkini) {
            updateRPC();
        }

    }, 1000);

});

rpc.login({
    clientId: DISCORD_CLIENT_ID
}).catch(console.error);

console.log(
    "[Server] Listening on ws://localhost:8888"
);
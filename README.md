<p align="center">
  <img src="https://raw.githubusercontent.com/github/explore/main/topics/discord/discord.png" width="80" alt="Discord"/>
  &nbsp;&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/github/explore/main/topics/spotify/spotify.png" width="80" alt="Spotify"/>
</p>

<h1 align="center">LazyExtention — Spotify Lyrics Discord RPC</h1>

<p align="center">
  <strong>Tampilkan lirik lagu Spotify secara real-time di Discord Rich Presence kamu!</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+"/>
  <img src="https://img.shields.io/badge/Chrome-Extension%20MV3-4285F4?logo=googlechrome&logoColor=white" alt="Chrome MV3"/>
  <img src="https://img.shields.io/badge/Discord-RPC-5865F2?logo=discord&logoColor=white" alt="Discord RPC"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"/>
</p>

---

## Deskripsi

**LazyExtention** adalah tool yang menampilkan lirik lagu yang sedang diputar di Spotify Web Player langsung ke profil Discord kamu melalui Rich Presence. Lirik akan berubah secara **real-time dan sinkron** dengan lagu yang sedang diputar.

### Fitur Utama

| Fitur | Keterangan |
|---|---|
| **Lirik Real-Time** | Lirik yang sedang aktif ditampilkan di Discord dan berganti otomatis sesuai timing lagu |
| **Cover Art** | Menampilkan cover album sebagai gambar besar di Rich Presence |
| **Progress Bar** | Menampilkan elapsed time dan sisa durasi lagu di Discord |
| **Auto-Reconnect** | Extension otomatis reconnect jika koneksi WebSocket terputus |
| **Delay Compensation** | Offset delay bawaan Discord RPC dikompensasi agar lirik tetap sinkron |
| **LRCLIB Integration** | Mengambil synced lyrics dari [LRCLIB](https://lrclib.net) secara otomatis |

---

## Arsitektur

```
┌──────────────────────┐     WebSocket (ws://localhost:8888)     ┌──────────────────────┐
│   Chrome Extension   │ ──────────────────────────────────────► │   Node.js Server     │
│   (Content Script)   │    Mengirim data lagu setiap 200ms      │   (rpcspotify.js)    │
│                      │                                         │                      │
│  - Scrape judul      │                                         │  - Terima data lagu  │
│  - Scrape artis      │                                         │  - Fetch lirik LRCLIB│
│  - Scrape cover art  │                                         │  - Sinkronisasi lirik│
│  - Scrape progress   │                                         │  - Update Discord RPC│
│  - Detect play/pause │                                         │                      │
└──────────────────────┘                                         └──────────┬───────────┘
                                                                            │
        Spotify Web Player                                         Discord IPC
      (open.spotify.com)                                                    │
                                                                            ▼
                                                                 ┌──────────────────────┐
                                                                 │   Discord Client     │
                                                                 │                      │
                                                                 │  Profil kamu akan    │
                                                                 │  menampilkan lirik   │
                                                                 │  lagu yang sedang    │
                                                                 │  diputar!            │
                                                                 └──────────────────────┘
```

---

## Prasyarat

Sebelum memulai, pastikan kamu sudah memiliki:

- [**Node.js**](https://nodejs.org/) v18 atau lebih baru
- [**Discord Desktop**](https://discord.com/download) (harus dalam keadaan terbuka)
- **Google Chrome** atau browser berbasis Chromium (Edge, Brave, dll.)
- [**Discord Developer Application**](https://discord.com/developers/applications) — untuk mendapatkan Client ID

---

## Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/IlhamRezaPratama/LazyExtention.git
cd LazyExtention
```

### 2. Install Dependencies

```bash
npm install discord-rpc ws
```

### 3. Buat Discord Application

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **"New Application"**
3. Beri nama (misal: `Spotify Lyrics`)
4. Salin **Application ID** (Client ID)

### 4. Konfigurasi Client ID

Buka file `rpcspotify.js` dan isi `DISCORD_CLIENT_ID` dengan Client ID kamu:

```js
const DISCORD_CLIENT_ID = "CLIENT_ID_KAMU_DISINI";
```

### 5. Load Chrome Extension

1. Buka Chrome dan navigasi ke `chrome://extensions/`
2. Aktifkan **Developer Mode** (toggle di pojok kanan atas)
3. Klik **"Load unpacked"**
4. Pilih folder `extensions/` dari project ini

### 6. Jalankan Server

```bash
node rpcspotify.js
```

Jika berhasil, kamu akan melihat:

```
[Server] Listening on ws://localhost:8888
Discord RPC Ready
```

### 7. Buka Spotify Web Player

Buka [open.spotify.com](https://open.spotify.com) di Chrome dan mulai putar lagu. Lirik akan muncul di profil Discord kamu.

---

## Konfigurasi

### Delay Offset

Discord RPC memiliki delay bawaan sekitar 3–5 detik. Untuk mengkompensasinya, kamu bisa mengatur offset di `rpcspotify.js`:

```js
const DISCORD_DELAY_OFFSET = 2.9; // dalam detik, sesuaikan jika perlu
```

> **Tips:** Jika lirik terasa terlalu cepat, kurangi nilainya. Jika terlalu lambat, naikkan nilainya.

### WebSocket Port

Secara default, server berjalan di port `8888`. Jika ingin mengubahnya, ubah di **dua tempat**:

1. **Server** (`rpcspotify.js` baris 13):
   ```js
   const wss = new WebSocket.Server({ port: 8888 });
   ```

2. **Extension** (`extensions/content.js` baris 6):
   ```js
   ws = new WebSocket("ws://localhost:8888");
   ```

---

## Struktur Project

```
LazyExtention/
│
├── rpcspotify.js          # Server utama — Discord RPC + WebSocket + LRCLIB
├── rpcspotify copy.js     # Template/backup (Client ID kosong)
│
├── extensions/            # Chrome Extension (Manifest V3)
│   ├── manifest.json      # Konfigurasi extension
│   ├── content.js         # Script yang berjalan di Spotify Web Player
│   └── background.js      # Service worker (minimal)
│
└── README.md              # Dokumentasi
```

---

## Cara Kerja

1. **Chrome Extension** berjalan di halaman `open.spotify.com` dan melakukan scraping data lagu (judul, artis, cover, progress, status play/pause) dari DOM setiap **200ms**
2. Data dikirim melalui **WebSocket** ke server Node.js lokal
3. Ketika lagu berganti, server mengambil **synced lyrics** dari API [LRCLIB](https://lrclib.net)
4. Server menghitung posisi lirik berdasarkan progress lagu + delay offset
5. Lirik yang sedang aktif ditampilkan sebagai **state** di Discord Rich Presence
6. Discord menampilkannya di profil kamu secara real-time

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| **Lirik tidak muncul** | Pastikan lagu memiliki synced lyrics di LRCLIB. Tidak semua lagu tersedia. |
| **Extension tidak terkoneksi** | Pastikan server `rpcspotify.js` sudah berjalan sebelum membuka Spotify. |
| **RPC tidak muncul di Discord** | Pastikan Discord Desktop terbuka dan Activity Status aktif di Settings > Activity Privacy. |
| **Lirik tidak sinkron** | Sesuaikan nilai `DISCORD_DELAY_OFFSET` di `rpcspotify.js`. |
| **Error: "Could not connect"** | Pastikan tidak ada aplikasi lain yang menggunakan port 8888. |
| **Extension error setelah update Chrome** | Reload extension di `chrome://extensions/`. |

---

## Tech Stack

- **Runtime:** Node.js
- **Discord Integration:** [discord-rpc](https://www.npmjs.com/package/discord-rpc)
- **WebSocket:** [ws](https://www.npmjs.com/package/ws)
- **Lyrics API:** [LRCLIB](https://lrclib.net)
- **Browser Extension:** Chrome Extension Manifest V3
- **Data Source:** Spotify Web Player DOM Scraping



<div align="center">

# ⚡ LEDO-Beam

### Bypass cloud storage paywalls.<br>Send massive 50GB+ files directly browser-to-browser<br>with Zero-Trust AES-256-GCM encryption.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-beam.ledo--tech.com-00D4FF?style=for-the-badge&labelColor=0A0A1A)](https://beam.ledo-tech.com)

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![WebRTC](https://img.shields.io/badge/Protocol-WebRTC-FF6F00?style=flat-square&logo=webrtc&logoColor=white)](https://webrtc.org)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

<br>

**Your files never touch our servers. Ever.**

[Live Demo](https://beam.ledo-tech.com) · [Report Bug](https://github.com/ledo-tech/LedoBeam.Backend/issues) · [Request Feature](https://github.com/ledo-tech/LedoBeam.Backend/issues)

</div>

---

## 🌟 Why LEDO-Beam?

Tired of USB cables, emailing yourself, or hitting the 2GB paywall on every cloud service? LEDO-Beam is the **free, open-source alternative**.

| Use Case | How It Works |
|---|---|
| 📱 **Laptop → Phone** | Open the link on your phone, scan the QR code, and the file beams over instantly. No app install needed. |
| 💻 **Laptop → Laptop** | Share a 100GB project with a coworker across the room or across the world. |
| 🚀 **No Size Limits** | Files stream directly between devices. There are zero file size restrictions. |
| ⚡ **Blazing Fast** | On the same Wi-Fi, data never touches the internet. Expect **50–100 MB/s**. |
| 📂 **Full Folder Support** | Drag & drop entire directory trees. LEDO-Beam recreates the exact folder structure on the receiver. |
| 🔒 **Military-Grade Encryption** | Every single chunk is encrypted with **AES-256-GCM** before it leaves your browser. |

---

## 🏗️ Architecture

LEDO-Beam is a two-component system designed for maximum simplicity and security:

```
┌─────────────────────┐         ┌──────────────────────────┐         ┌─────────────────────┐
│   SENDER BROWSER    │         │   SIGNALING SERVER       │         │  RECEIVER BROWSER   │
│                     │         │   (C# SignalR Hub)       │         │                     │
│  1. Select files    │────────▶│  Routes SDP Offer/Answer │◀────────│  1. Open link       │
│  2. Generate AES key│         │  Routes ICE Candidates   │         │  2. Extract AES key │
│  3. Encrypt chunks  │         │                          │         │     from URL #hash   │
│  4. Stream via P2P  │════════════════════════════════════════════▶│  3. Decrypt chunks  │
│                     │  Direct WebRTC DataChannel (No Server!)    │  4. Stream to disk  │
└─────────────────────┘                                             └─────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| **Signaling** | C# ASP.NET Core + SignalR | Brokers WebRTC handshake (SDP/ICE). Never touches file data. |
| **P2P Transport** | WebRTC DataChannels | Direct browser-to-browser tunnel. Bypasses server entirely. |
| **Encryption** | Web Crypto API (AES-256-GCM) | Each chunk encrypted in-browser. Key lives in URL `#fragment` — never sent to server. |
| **Disk Streaming** | File System Access API | Receiver writes chunks directly to disk. A 50GB transfer uses ~64KB of RAM. |
| **Fallback** | Blob Assembly | Firefox/Safari: chunks buffered in memory, then downloaded as a single file. |

---

## 🔒 How the Security Works

1. **Key Generation** — The sender's browser generates a cryptographically random AES-256-GCM key using `crypto.getRandomValues()`.
2. **Link Creation** — The key is placed in the URL's **hash fragment** (`#RoomID#AES_KEY`). Browsers **never** send the `#fragment` in HTTP requests — not to Cloudflare, not to your server, not to anyone.
3. **Signaling** — The sender and receiver exchange WebRTC connection metadata (SDP/ICE) through SignalR. The signaling server sees **zero** file data and **zero** encryption keys.
4. **Direct Tunnel** — A peer-to-peer WebRTC DataChannel opens directly between the two browsers.
5. **Encrypted Streaming** — File chunks are encrypted with the AES key and streamed through the tunnel. The receiver decrypts and writes to disk in real-time.

> **Result:** Even if someone intercepts the network traffic, they see only encrypted gibberish. Even if someone compromises the signaling server, they have no encryption key. **Zero Trust.**

---

## 🚀 Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### 1. Clone the Repository

```bash
git clone https://github.com/ledo-tech55/ledo-beam.git
cd ledo-beam
```

### 2. Start the Signaling Backend

```bash
cd LedoBeam.Backend
dotnet run
```

The backend starts on `http://localhost:5175`.

### 3. Start the Frontend

```bash
cd ledo-beam-ui
cp .env.example .env
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`. Open it in two browser tabs (or one on your phone on the same Wi-Fi) and start beaming files!

---

## 🐳 Deploy with Docker

For production deployment, LEDO-Beam ships with Docker Compose:

```bash
# Build and launch both frontend + backend
docker compose up -d --build
```

The frontend Nginx container automatically reverse-proxies `/signaling` to the backend. Configure your reverse proxy (Traefik, Nginx Proxy Manager, etc.) to route your domain to port `80` of the frontend container.

See the `docker-compose.yml` for Traefik label examples.

---

## ⚠️ Browser Compatibility

| Browser | Support | Notes |
|---|---|---|
| Chrome / Edge / Brave / Opera | ✅ Full | Streams 50GB+ directly to disk via File System Access API |
| Firefox | ✅ Supported | Blob fallback — limited by available RAM |
| Safari | ✅ Supported | Blob fallback — limited by available RAM |
| Mobile Chrome / Edge | ✅ Supported | Perfect for laptop-to-phone transfers |

---

## 🤝 Contributing

Contributions are what make the open-source community amazing. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Free as in freedom. Free as in beer. 🍺

---

<div align="center">

## 🌐 Connect with LEDO-TECH

**Built with ❤️ by [LEDO-TECH](https://ledo-tech.com)**

[![Website](https://img.shields.io/badge/Website-ledo--tech.com-00D4FF?style=for-the-badge&logo=google-chrome&logoColor=white)](https://ledo-tech.com)
[![GitHub](https://img.shields.io/badge/GitHub-LEDO--TECH-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ledo-tech)

[![Twitter/X](https://img.shields.io/badge/X-@LEDO__TECH-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/LEDO_TECH)
[![Instagram](https://img.shields.io/badge/Instagram-@ledo.tech-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://www.instagram.com/ledo.tech)
[![TikTok](https://img.shields.io/badge/TikTok-@ledo.tech-000000?style=flat-square&logo=tiktok&logoColor=white)](https://www.tiktok.com/@ledo.tech)
[![Telegram](https://img.shields.io/badge/Telegram-LEDO__TECH-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/LEDO_TECH)

---

*Your files never touch our servers.*

</div>

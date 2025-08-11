# mess-and-jar 🫙

Live demo ➜ [chat.tohr.xyz](https://chat.tohr.xyz)

An experimental end-to-end encrypted group chat that showcases modern Web Crypto, Next.js (App Router) and a minimal Go backend.

## Features

- 🔐 **Per-room encryption** – Every chat room owns its own 256-bit AES-GCM key generated in the browser; only ciphertext ever touches the wire or disk.
- 🖊 **Signed messages** – Messages are signed with user-specific Ed25519 identity keys for tamper detection.
- 🗄 **Offline-friendly** – IndexedDB (via Dexie) caches messages and media.
- ⚡ **Next.js** (React 19, App Router, Server Components, Tailwind).
- 🏃 **Go backend** – Ultra-light HTTP API backed by SQLite and optional file storage.
- ✨ **Educational** – Built for learning; the crypto & security model is intentionally simplified.

## Project layout

```text
next-app/   # Next.js frontend (Bun, Tailwind, React-Query, WebCrypto)
server/     # Go API server (SQLite, HTTP, media uploads)
frontend/ # deprecated, was using Remix for PoC
```

## Quick start (local)

Requirements → Go, Bun (or Node ≥18), SQLite (bundled with Go driver).

```bash
# 1. backend ↑ :8090
git clone https://github.com/your-user/mess-and-jar.git
cd mess-and-jar/server
go run main.go

# 2. frontend ↑ :3000
cd ../next-app
bun install          # or npm install
bun run dev          # or npm run dev

# open http://localhost:3000
```

Create `.env` inside `next-app/`:

```env
NEXT_PUBLIC_API_BACKEND_URL=http://localhost:8090
```

## Deployment

The live instance at **chat.tohr.xyz** is deployed automatically from `main`:

- Frontend → Vercel
- Backend  → VPS

## Security disclaimer

This codebase is **experimental**. It has **not** been audited and should **not** be considered production-ready. Use it to learn; do not rely on it to protect real secrets.
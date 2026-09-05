# Minecraft Server Dashboard

A web dashboard for managing a Minecraft Forge server over RCON, built with Node.js and Express. Runs on an Oracle Cloud instance behind systemd.

## Features

- **Live console** — view server logs and send RCON commands from the browser
- **Mod management** — drag-and-drop upload/removal of `.jar` mods
- **Config editor** — edit `server.properties` through the UI, no SSH needed
- **Whitelist control** — add and remove players
- **Server controls** — start, stop, restart via the dashboard

## Security

- Token-based auth middleware on all API endpoints
- Regex-based input sanitization on RCON commands to prevent injection
- Secrets (RCON password, admin password) stored in `.env`, not in code
- Backend and Minecraft server run as a systemd service under a least-privilege user

## Setup

```bash
git clone https://github.com/abdelkafi007/mcserver-dashboard.git
cd mcserver-dashboard/backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=3000
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=your_secure_password
ADMIN_PASSWORD=your_dashboard_password
```

Start the server:

```bash
node index.js
```

Open `http://localhost:3000`.

## Project structure

- `/backend` — Express API: auth, RCON bridge, mod management, server control routes
- `/dashboard` — Static frontend: login, console, config editor
- `/forge-server` — (gitignored) The actual Minecraft Forge server instance

## Tech stack

- Node.js / Express
- Vanilla HTML, CSS, JavaScript
- RCON protocol via `rcon-client`
- Systemd on Linux (Oracle Cloud)

# Minecraft Server Security Dashboard

A secure, high-performance web dashboard for managing a Minecraft server, built with **Node.js, Express, and Vanilla JavaScript/CSS**. This project highlights my focus on secure system administration, role-based access control, and robust API development.

## 🛡️ Security First Approach

As an aspiring cybersecurity engineer, I prioritized security throughout the development lifecycle:
- **Zero-Trust Authentication:** Implemented a secure, token-based authentication middleware (`authMiddleware`) to protect all API endpoints. Only authorized personnel with the correct token can access server operations.
- **Strict Input Sanitization:** Prevented command injection vulnerabilities by implementing strict regex-based input filtering before passing data to the RCON bridge.
- **Secret Management:** Sensitive data, such as server passwords and RCON configurations, are entirely decoupled from the source code using environment variables (`.env`).
- **Process Isolation:** Configured a systemd daemon to run the backend service and the Minecraft server with least-privilege user execution, ensuring that the process runs independently from an active terminal session and auto-restarts upon failure.

## 🚀 Features

- **Real-Time Console:** View live server logs and send secure RCON commands directly from the dashboard.
- **Mod Management:** Drag-and-drop interface for uploading, managing, and removing `.jar` mods.
- **Dynamic Configuration:** Modify `server.properties` seamlessly through the web UI without SSH access.
- **Whitelist Control:** Quickly add or remove players from the server whitelist.
- **Server State Management:** Start, Stop, and Restart server operations via API requests.

## 💻 Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Integration:** RCON Protocol (`rcon-client`)
- **Infrastructure:** Systemd on Linux (Oracle Cloud Instance)

## ⚙️ Installation & Usage

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mcserver-dashboard.git
   cd mcserver-dashboard
   ```
2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=3000
   RCON_HOST=127.0.0.1
   RCON_PORT=25575
   RCON_PASSWORD=your_secure_password
   ADMIN_PASSWORD=your_dashboard_password
   ```
4. **Run the API:**
   ```bash
   node index.js
   ```
5. **Access the Dashboard:**
   Navigate to `http://localhost:3000` in your web browser.

## 📂 Architecture

- **`/backend`**: Express API handling authentication, server routes, mod management, and the RCON bridge.
- **`/dashboard`**: Static frontend files including the login screen, terminal console UI, and config manager.
- **`/forge-server`**: (Ignored in Git for security/size) The actual Minecraft Forge instance, separated logically from the control panel.

---
*Developed by a future Cybersecurity Engineer at ENSAO.*

<div align="center">
  <img src="resources/icon.png" width="80" alt="GodEye Logo" />
  <h1>GodEye</h1>
  <p>Real-time SSH server monitoring dashboard built with Electron + React</p>

  ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)
  ![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
  ![License](https://img.shields.io/badge/license-MIT-green)
</div>

---

## What is GodEye?

GodEye is a desktop app that connects to your Linux servers over SSH and gives you a live dashboard — CPU, RAM, disk, processes, logs, Docker, cron jobs, file manager, and a built-in terminal. No agent needed on the server side. Just SSH access.

![Dashboard Preview](resources/icon.png)

---

## Features

| Panel | Description |
|-------|-------------|
| **Dashboard** | Live CPU / RAM / Disk gauges with 30-point history charts |
| **Servers** | Quick-connect panel — all saved servers at a glance |
| **File Manager** | SFTP browser — upload, download, delete, preview text files |
| **Terminal** | Full xterm.js terminal with resize support |
| **Processes** | Live process list with kill support |
| **Log Viewer** | Tail system logs in real time |
| **Docker** | Container list, start/stop/restart |
| **Cron Jobs** | View and manage crontab entries |
| **Backup** | Zip and download remote directories |
| **Alerts** | Desktop notifications at CPU > 85%, RAM/Disk > 90% |

---

## Requirements

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **npm** 9+
- **Git**
- A Linux server with SSH access (Ubuntu 20/22/24 tested)

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/zaidhusain/godeye.git
cd godeye
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run dev
```

The app window opens automatically.

---

## Build a distributable

### Windows (.exe installer)

```bash
npm run build:win
```

Output: `dist/GodEye Setup x.x.x.exe`

### Linux (AppImage)

```bash
npm run build:linux
```

Output: `dist/GodEye-x.x.x.AppImage`

---

## Adding a Server

1. Click **+** at the bottom of the sidebar
2. Fill in:
   - **Display Name** — anything you like
   - **IP / Host** — server IP or hostname
   - **Port** — default `22`
   - **Username** — e.g. `root`
   - **Auth** — password or private key (`.pem` / `.key`)
3. Click **Connect** — the dot in the sidebar turns lime when online

---

## Project Structure

```
godeye/
├── resources/
│   ├── icon.png          # App logo
│   └── icon.ico          # Windows taskbar icon
├── src/
│   ├── main/
│   │   ├── index.js      # Electron main process + all IPC handlers
│   │   └── ssh-manager.js # SSH connections, SFTP, terminal, polling
│   ├── preload/
│   │   └── index.js      # contextBridge — exposes window.godeye API
│   └── renderer/
│       └── src/
│           ├── App.jsx   # Root state, panel routing
│           ├── components/
│           │   ├── ServerDashboard.jsx
│           │   ├── ServersPanel.jsx
│           │   ├── FileManager.jsx
│           │   ├── Terminal.jsx
│           │   ├── ProcessManager.jsx
│           │   ├── LogViewer.jsx
│           │   ├── DockerMonitor.jsx
│           │   ├── CronJobs.jsx
│           │   ├── SemiGauge.jsx
│           │   ├── MetricCard.jsx
│           │   ├── StatCard.jsx
│           │   ├── HistoryChart.jsx
│           │   ├── Sidebar.jsx
│           │   └── AddServerModal.jsx
│           └── assets/
│               └── logo.png
├── package.json
├── electron.vite.config.mjs
└── tailwind.config.js
```

---

## Stack

- **Electron 29** + **electron-vite** — main/preload/renderer split
- **React 18** + **Vite** — renderer UI
- **Tailwind CSS** — styling
- **ssh2** — SSH connections, SFTP, shell streams
- **xterm.js** + **xterm-addon-fit** — terminal emulator
- **recharts** — history charts
- **archiver** — backup zip creation
- **lucide-react** — icons

---

## License

MIT — use it, fork it, ship it.

<p align="center">
  <img src="https://files.catbox.moe/0hmdof.png" alt="BIGST4CK" width="100%"/>
</p>

## Table of Contents

| Section | Description |
|---------|-------------|
| [Features](#-features) | Overview of bot capabilities |
| [Prerequisites](#-prerequisites) | Required software and tools |
| [Installation](#-installation) | Step-by-step setup guide |
| [Configuration](#-configuration) | Config files and environment variables |
| [Project Structure](#-project-structure) | Folder and file layout |
| [Commands](#-commands) | Full command list with categories |
| [Usage](#-usage) | How to start and run the bot |
| [Built With](#-built-with) | Technologies and libraries used |
| [Contributing](#-contributing) | How to contribute to the project |
| [License](#-license) | License information |
| [Credits](#-credits) | Developer and contributors |
| [Connect](#-connect) | WhatsApp channel, group, and GitHub |
| [Dependencies](#-dependencies) | Full list of dependencies |
| [Troubleshooting](#-troubleshooting) | Common issues and solutions |
| [Changelog](#-changelog) | Version history |
| [Roadmap](#-roadmap) | Planned features (optional) |
| [Support / Donate](#-support--donate) | Support the developer (optional) |

---

## Features

- **Interactive Messages** – Buttons, lists, carousels, and rich cards powered by NIXCODE.
- **Group Management** – Kick, promote, demote, mute, warn, and auto-kick after 3 warnings.
- **Media Downloaders** – Download videos and audio from TikTok, Instagram, Facebook, and YouTube.
- **AI Features** – AI chatbot and AI image generation.
- **Security** – Antilink, antimention, anticall, and antidelete to protect groups.
- **Auto Features** – Autoread, autotyping, and autostatus for automated responses.
- **Welcome & Goodbye** – Customisable welcome and goodbye messages with images and group description.
- **Server Store** – Pterodactyl server plans with prices and images.
- **System Monitoring** – Ping, uptime, RAM, CPU usage, and server status.
- **Self-Update** – Update the bot directly from GitHub with one command.
- **Settings Dashboard** – Toggle features on/off with the `.settings` command.
- **Owner Controls** – Change prefix, update profile picture, reset group links, and more.
- **User Registration** – Register with a username to unlock full bot features.

---

## Prerequisites

Before installing and running the bot, make sure you have the following installed on your system:

- **Node.js** – Version 18.0.0 or higher.
  - Download from [nodejs.org](https://nodejs.org/)
  - Check version: `node -v`

- **npm** or **yarn** – Package manager for installing dependencies.
  - npm comes with Node.js
  - Check version: `npm -v`

- **ffmpeg** – Required for media processing, audio conversion, and sticker creation.
  - Ubuntu/Debian: `sudo apt install ffmpeg -y`
  - Termux: `pkg install ffmpeg -y`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - macOS: `brew install ffmpeg`
  - Check installation: `ffmpeg -version`

- **Git** – Required for cloning the repository.
  - Download from [git-scm.com](https://git-scm.com/downloads)
  - Check version: `git --version`

- **A code editor** – Optional but recommended.
  - [VS Code](https://code.visualstudio.com/) is preferred.

- **A WhatsApp account** – The bot will use your WhatsApp number for the session.

- **API Keys** – Some features require API keys (see Configuration section).
  - Catbox userhash (for `.url` command)
  - Giphy API key (for GIF commands)
  - ACRCloud credentials (for music recognition)
  - Telegram bot token (optional, for Telegram bridge)
![BIGST4CK Bot Demo](https://files.catbox.moe/0hmdof.png)

# BIGST4CK
**WhatsApp Bot**

![Version](https://img.shields.io/badge/version-8.0.3-black)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)
[![Release](https://img.shields.io/badge/Release-latest-blue)](https://github.com/bigtechs2/BIGST4CK/releases)
[![Fork](https://img.shields.io/badge/Fork-Repo-orange)](https://github.com/bigtechs2/BIGST4CK/fork)
[![Download ZIP](https://img.shields.io/badge/Download-ZIP-red)](https://github.com/bigtechs2/BIGST4CK/archive/refs/heads/main.zip)

**Advanced WhatsApp Bot with AI, Downloaders, and Group Management**

---

## Table of Contents

- [Is this bot official?](#is-this-bot-official)
- [Pricing](#pricing)
- [Features](#features)
- [Commands](#commands)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Creating Custom Commands](#creating-custom-commands)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Built With](#built-with)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [License](#license)
- [Troubleshooting](#troubleshooting)
- [Support / Contact](#support--contact)
- [Show your support](#show-your-support)
- [Site for Updates](#site-for-updates)

---

## Is this bot official?

**Yes and no.**  
This bot is developed and maintained by **bigmanj tech ™** – it is **officially supported** by the author, but it is **not an official WhatsApp product**. It is a community project that uses the WhatsApp Web protocol (via Baileys) to provide an automated assistant. **Use it responsibly** and comply with WhatsApp's Terms of Service.

> **Advice from the author:**  
> Always keep your bot updated, avoid spamming, and respect group admins. This bot is free and open‑source – if you like it, consider ⭐ starring the repo and sharing it with friends!, for updates [join our site for updates](#site-for-updates)

---

## Pricing

The source code is **free** and open source. However, if you want me to host and maintain the bot for you:

| Service | Price (TZS) | Description |
| :--- | :--- | :--- |
| Bot Hosting (Monthly) | 5,000 | I host the bot 24/7 for you |
| Premium Access (Monthly) | 1,000 | Unlock all premium features |
| Custom Commands | 500 | I add custom commands for your group |
| Donation | Any amount | Support the project ❤️ |

**Contact:** [owner](https://wa.me/255777580820)

---

## Features

- **AI Chat** – ChatGPT, DeepSeek, Gemini, Claude, Meta AI
- **Downloaders** – YouTube, Spotify, Facebook, TikTok, Instagram
- **Group Management** – Anti-bot, Warn, Kick, Promote, Demote, Mute
- **Rich UI** – AIRich messages, interactive buttons, booking cards
- **User Status** – Level, coins, badges, uptime tracking
- **Custom Commands** – Add/edit commands on-the-fly with `.addcmd`
- **Auto Features** – Autoread, autotyping, autostatus
- **Security** – Antilink, antimention, anticall, antidelete
- **Welcome & Goodbye** – Customisable with images and group description
- **Server Store** – Pterodactyl server plans with prices and images
- **System Monitoring** – Ping, uptime, RAM, CPU usage

---

## Commands

| Category | Commands |
|----------|----------|
| **AI Chat** | `.chatgpt`, `.deepseek`, `.gemini`, `.claude`, `.meta`, `.unlimitedai`, `.publicai` |
| **Downloader** | `.play`, `.facebookdl`, `.ytmp3`, `.ytmp4`, `.tiktokdl`, `.instagramdl` |
| **Group** | `.antibot`, `.warn`, `.kick`, `.promote`, `.demote`, `.mute`, `.setoption` |
| **Information** | `.about`, `.status`, `.uptime`, `.owner`, `.bizinfo` |
| **Owner** | `.addcmd`, `.reload`, `.setprefix`, `.run` |
| **Tools** | `.banana`, `.table`, `.weather`, `.poll` |

> Use `.menu` to open the interactive main menu.

---

## Prerequisites

Before installing and running the bot, make sure you have the following installed on your system:

- **Node.js** – Version 18.0.0 or higher. Download from [nodejs.org](https://nodejs.org/)
- **npm** or **yarn** – Package manager for installing dependencies
- **ffmpeg** – Required for media processing, audio conversion, and sticker creation
- **Git** – Required for cloning the repository
- **A WhatsApp account** – The bot will use your WhatsApp number for the session
- **API Keys** – Some features require API keys (see Configuration section)

---

## Installation

**Clone the repository**

- Open your terminal and run:
  ```
  git clone https://github.com/bigtechs2/BIGST4CK.git
  ```
- Navigate into the folder:
  ```
  cd BIGST4CK
  ```

**Install dependencies**

- Run the following command to install all required packages:
  ```
  npm install
  ```
- Or if you prefer yarn:
  ```
  yarn install
  ```

**Install ffmpeg**

- ffmpeg is required for media processing. Install it based on your operating system:

- **Ubuntu / Debian**
  ```
  sudo apt install ffmpeg -y
  ```

- **Termux (Android)**
  ```
  pkg install ffmpeg -y
  ```

- **Windows**
  - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Add to system PATH

- **macOS**
  ```
  brew install ffmpeg
  ```

- Verify the installation:
  ```
  ffmpeg -version
  ```

**Configure environment**

- Copy the example environment file:
  ```
  cp .env.example .env
  ```
- Open `.env` in your code editor and fill in:
  - Owner phone number
  - API keys (if needed)
  - Bot name and prefix

**Start the bot**

- Start the bot normally:
  ```
  npm start
  ```
- For better performance and lower memory usage:
  ```
  npm run start:optimized
  ```

**Pairing**

- After starting, scan the QR code shown in the terminal using:
  - WhatsApp → Settings → Linked Devices → Link a Device
- If pairing code is enabled, you will receive a code to enter instead

**Verify**

- Once connected, you will see `✅ BIGST4CK Online!` in the terminal
- Test the bot with commands like `.menu` or `.ping`

---

## Configuration

The bot uses two files:

- `config.json` – main settings (non‑sensitive)
- `.env` – API keys, tokens, secrets (never commit)

### config.json

Key fields:

| Field | Description |
|-------|-------------|
| `bot.name` | Bot display name |
| `bot.phoneNumber` | Bot's phone number (reference) |
| `bot.thumbnail` | Profile picture URL |
| `bot.groupLink` | Group invite link |
| `bot.channellink` | WhatsApp channel link |
| `msg.footer` | Global footer text |
| `owner.id` | Owner's phone (no `+`) |
| `owner.co` | Array of co‑owners |
| `system.prefix` | Command prefix (e.g., `.`) |
| `system.usePairingCode` | true/false |
| `system.customPairingCode` | Your pairing code |
| `system.timeZone` | e.g., `Africa/Dar_es_Salaam` |
| `api.*` | Giphy, ACRCloud keys |
| `pterodactyl.*` | Panel URL, API key, etc. |

For full structure, see `config.example.json`.

### .env

Sensitive data – copy `.env.example` to `.env` and fill in:

```env
BOT_NAME=BIGST4CK
PREFIX=.
OWNER_NUMBER=your_number
CATBOX_USERHASH=your_hash
GIPHY_API_KEY=your_key
ACR_ACCESS_KEY=your_key
ACR_ACCESS_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_token   # optional

---
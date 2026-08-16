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

For full structure, see `config.example.json` to `config.json`.

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
```

---

## Project Structure

```
BIGST4CK/
├── commands/          # All bot commands (.js files)
├── data/              # JSON data (warnings, settings, configs)
├── lib/               # Core libraries (NIXCODE, auth, isAdmin)
├── session/           # WhatsApp authentication session
├── tmp/               # Temporary media files (auto-cleaned)
├── config.json        # Main bot configuration
├── config.js          # Config loader with helper methods
├── .env               # Environment variables (API keys, tokens)
├── .env.example       # Example environment file
├── index.js           # Entry point – starts the bot
├── main.js            # Message handler and command router
├── package.json       # Dependencies and scripts
└── README.md          # Documentation
```

### Folder Details

| Folder | Purpose |
|--------|---------|
| `commands/` | All command files – each file is one command |
| `data/` | JSON storage for warnings, settings, user data |
| `lib/` | Core libraries – NIXCODE, auth, isAdmin, store |
| `session/` | WhatsApp session files (auto-generated) |
| `tmp/` | Temporary media files (auto-cleaned) |

### Key Files

| File | Purpose |
|------|---------|
| `config.json` | Main bot settings (name, prefix, owner, API) |
| `config.js` | Loads config, adds `isOwnerOrCo` helper |
| `.env` | Sensitive data – API keys, tokens |
| `index.js` | Entry point – connects to WhatsApp |
| `main.js` | Handles messages and routes commands |

---

## Creating Custom Commands

Anyone can add new commands to the bot. Each command is a separate `.js` file in the `commands/` folder.

### Command Template

```javascript
module.exports = {
    name: "yourcommand",        // Main command name (required)
    aliases: ["yc", "cmd"],     // Alternative names (optional)
    category: "utility",        // Category for menu (optional)
    permissions: {              // Permission flags (optional)
        coin: 0,                // Cost in coins
        group: false,           // Only in groups?
        owner: false,           // Only bot owner?
        premium: false,         // Only premium users?
        admin: false,           // Only group admins?
        botAdmin: false,        // Bot must be admin?
        private: false,         // Only private chats?
        restrict: false         // Restrictive mode?
    },
    code: async (ctx) => {      // Main function (required)
        try {
            // ── Your logic here ──
            await ctx.reply("Command executed!");
        } catch (error) {
            console.error("[yourcommand] Error:", error);
            await ctx.reply("An error occurred.");
        }
    }
};
```

### Available Permissions

| Permission | Description |
|------------|-------------|
| `coin` | Cost in coins to use the command |
| `group` | Command only works in groups |
| `owner` | Only the bot owner can use it |
| `premium` | Only premium users can use it |
| `admin` | Only group admins can use it |
| `botAdmin` | Bot must be a group admin |
| `private` | Only works in private chats |
| `restrict` | Restricted mode (for safety) |

### Where to Place

- Save the file in the `commands/` folder.
- File name must be the same as the command name: `yourcommand.js`.

### Example: Ping Command

```javascript
// commands/ping.js
module.exports = {
    name: "ping",
    aliases: ["pong"],
    category: "information",

    code: async (ctx) => {
        const start = Date.now();
        await ctx.reply("Pong!");
        const latency = Date.now() - start;
        await ctx.reply(`Latency: ${latency}ms`);
    }
};
```

### Best Practices

- Use `try/catch` in every command to handle errors gracefully.
- Keep commands focused – one command, one job.
- Use `ctx.reply()` to send messages.
- Use `ctx.used.prefix` for the current command prefix.
- Check permissions at the start of the command.
- Log errors for debugging.

### Using AIRich in Commands

For rich interactive messages:

```javascript
const { AIRich } = require('../lib/NIXCODE');

module.exports = {
    name: "example",
    category: "utility",

    code: async (ctx) => {
        await new AIRich(ctx.core)
            .setTitle("Rich Message")
            .addText("This is a rich message.")
            .addTip("Tap to interact")
            .setFooter(config.msg.footer)
            .send(ctx._msg.key.remoteJid);
    }
};
```

### Troubleshooting

**Command not showing in menu**
- Check that `category` is set.
- Restart the bot.

**Command not responding**
- Check file name matches `name`.
- Check for syntax errors in the file.
- Restart the bot.

**Permission errors**
- Verify the user has the required role (owner, admin, premium).
- Check the permissions object in the command file.

---

## Usage

### Start the Bot

| Command | Description |
|---------|-------------|
| `npm start` | Start the bot normally |
| `npm run start:optimized` | Start with memory optimization |
| `npm run start:stable` | Start with stable configuration |
| `npm run start:performance` | Start with performance tuning |
| `npm run start:low-ram` | Start with low RAM usage |

### Development Mode

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode |

### With PM2 (Production)

```bash
npm run start:pm2
pm2 logs
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the bot |
| `npm run start:optimized` | Optimized memory usage |
| `npm run start:stable` | Stable configuration |
| `npm run start:performance` | Performance tuning |
| `npm run start:low-ram` | Low RAM usage |
| `npm run cleanup` | Clean temporary files |
| `npm run reset-session` | Reset WhatsApp session |
| `npm run start:clean` | Cleanup + start optimized |
| `npm run start:fresh` | Reset session + start optimized |

### After Starting

- Scan the QR code or enter the pairing code.
- Once connected, you will see `✅ BIGST4CK Online!` in the terminal.
- Test the bot with `.menu` or `.ping`.

### Using Commands

All commands start with the prefix `.` (default). Type:

```
.menu          – Open interactive menu
.ping          – Check bot latency
.owner         – Contact the owner
```

For a full list of commands, type:

```
.menu
```

or browse the [Commands](#commands) section.

---

## Screenshots

### Main Menu

![Main Menu](https://files.catbox.moe/cbbepj.png)

---

## Built With

### Core Technologies

| Technology | Description |
|------------|-------------|
| **[Node.js](https://nodejs.org/)** | JavaScript runtime environment |
| **[Baileys](https://github.com/WhiskeySockets/Baileys)** | WhatsApp Web API library |
| **[@itsliaaa/baileys](https://github.com/itsliaaa/baileys)** | Enhanced Baileys fork with better features |

### Libraries & Packages

| Library | Purpose |
|---------|---------|
| `axios` | HTTP requests to APIs |
| `chalk` | Terminal styling and colors |
| `dotenv` | Environment variable management |
| `fluent-ffmpeg` | Media processing and conversion |
| `fs-extra` | Extended file system operations |
| `moment-timezone` | Timezone handling and formatting |
| `node-cache` | In-memory caching |
| `pino` | Fast logging |
| `pino-pretty` | Pretty log formatting |
| `qrcode` | QR code generation |
| `qrcode-terminal` | QR code display in terminal |
| `sharp` | High-performance image processing |
| `yt-search` | YouTube search functionality |
| `ytdl-core` | YouTube video downloading |

### Key Features Powered By

| Feature | Library / API |
|---------|---------------|
| **AI Chat** | OpenAI API |
| **Image Generation** | AI Imagine API |
| **Weather** | Open-Meteo API |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **Music Recognition** | ACRCloud API |
| **GIFs** | Giphy API |
| **File Uploads** | Catbox.moe API |
| **Media Downloaders** | Nayan API, Siputzx API, ruhend-scraper |

### Development Tools

| Tool | Purpose |
|------|---------|
| **PM2** | Production process manager |
| **Git** | Version control |
| **npm** / **yarn** | Package management |

### Built With ❤️

- **Node.js** – Backend runtime
- **Baileys** – WhatsApp connection
- **Sharp** – Image processing
- **FFmpeg** – Media conversion

---

**All libraries are open-source and free to use.** 🚀

---

## Dependencies

### Core Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| `@itsliaaa/baileys` | ^7.0.0-rc11 | Enhanced Baileys WhatsApp API |
| `@whiskeysockets/baileys` | ^v7.0.0-rc11 | Original WhatsApp Web API |
| `axios` | ^1.8.4 | HTTP client for API requests |
| `chalk` | ^4.1.2 | Terminal styling |
| `dotenv` | ^16.4.5 | Environment variable management |

### Media Processing

| Package | Version | Description |
|---------|---------|-------------|
| `fluent-ffmpeg` | ^2.1.3 | Media processing and conversion |
| `sharp` | ^0.32.6 | High-performance image processing |
| `ffmpeg` | ^0.0.4 | FFmpeg wrapper |

### Utilities

| Package | Version | Description |
|---------|---------|-------------|
| `fs-extra` | ^11.2.0 | Extended file system operations |
| `moment-timezone` | ^0.5.43 | Timezone handling |
| `node-cache` | ^5.1.2 | In-memory caching |
| `pino` | ^8.21.0 | Fast logging |
| `pino-pretty` | ^10.3.1 | Pretty log formatting |

### Downloaders & Scrapers

| Package | Version | Description |
|---------|---------|-------------|
| `yt-search` | ^2.13.1 | YouTube search |
| `ytdl-core` | ^4.11.5 | YouTube video downloading |
| `ruhend-scraper` | ^8.3.0 | Media downloader (Instagram, TikTok) |

### QR & Terminal

| Package | Version | Description |
|---------|---------|-------------|
| `qrcode` | ^1.5.4 | QR code generation |
| `qrcode-terminal` | ^0.12.0 | QR code display in terminal |

### Optional Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| `gifted-btns` | ^1.0.2 | Interactive buttons (fallback) |

### Install All Dependencies

```bash
npm install
```

### Update Dependencies

```bash
npm update
```

---
/**
 * BIGST4CK - WhatsApp Bot
 * Clean & Optimized Version
 */

require("dotenv").config();
const config = require("./config");
const fs = require('fs');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    delay 
} = require("@whiskeysockets/baileys");

const { handleMessages, handleGroupParticipantUpdate, handleStatus, handlePostUpdateMessage } = require("./main");
const { handleAnticall } = require("./commands/anticall");
const { getButtonId, isButtonResponse, autoDetectButtonCommand, isCommandId } = require("./lib/buttonLoader");
const store = require("./lib/lightweight_store");

// ─── Import NIXCODE builders ──────────────────────
const { Button, ButtonV2, AIRich, Carousel } = require("./lib/NIXCODE");

// ────────────────────────────────────────────────
// LOGGER
const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'warn', 
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}'
        }
    }
});

const originalLog = console.log;
console.log = function(...args) {
    originalLog(...args);
};

// ─── Global Settings (from config) ──────────────
global.botname = config.bot.name;
global.themeemoji = '›';
global.channelLink = config.bot.channellink || "https://whatsapp.com/channel/0029VbDJJY19WtC1T0Vgqp0v";

// ─── Store ──────────────────────────────────────
store.readFromFile();
setInterval(() => store.writeToFile(), config.system?.storeWriteInterval || 10000);

// ─── Memory Management ──────────────────────────
setInterval(() => {
    if (global.gc) global.gc();
}, 60000);

setInterval(() => {
    const usageMB = process.memoryUsage().rss / 1024 / 1024;
    if (usageMB > 450) {
        console.log(chalk.bgRed.white("  ⚠️  MEMORY ALERT  ⚠️  "), chalk.red(`RAM > 450MB (${usageMB.toFixed(2)}MB) → Restarting...`));
        process.exit(1);
    }
}, 30000);

// ─── Pairing ────────────────────────────────────
const pairingCode = true; 
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(config.owner.id || "255777580820");
};

async function chooseStartupMode() {
    const settingMode = config.mode?.toLowerCase() === 'telegram' ? 'telegram' : 'whatsapp';
    if (!rl) {
        console.log(chalk.yellow(`⚠️ Terminal input unavailable, using settings.js mode: ${settingMode}`));
        return settingMode;
    }

    console.log(chalk.bgBlue.white("\n  🚀  BIGST4CK STARTUP MODE  🚀  \n"));
    console.log('Chagua mode ya bot:');
    console.log('  1) WhatsApp');
    console.log('  2) Telegram');
    console.log(`  3) Tumia mode ya settings.js (${settingMode})`);

    const answer = (await question('Chagua (1/2/3) [3]: ')).trim();
    if (answer === '1') return 'whatsapp';
    if (answer === '2') return 'telegram';
    return settingMode;
}

async function startBIGST4CK() {
    try {
        console.log('\n' + chalk.bgBlue.white(`  🚀  STARTING ${config.bot.name}  🚀  `) + '\n');

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('📦 Baileys Version:'), chalk.green(version.join('.')));

        const { state, saveCreds } = await useMultiFileAuthState("./session");
        console.log(chalk.cyan('📁 Session Status:'), chalk.green('Loaded'));

        const msgRetryCounterCache = new NodeCache();
        console.log(chalk.cyan('💾 Cache Status:'), chalk.green('Initialized'));

        const newsletterJid = "120363398106360290@newsletter";

        const sock = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false, 
            generateHighQualityLinkPreview: true,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
                }
                return message;
            },
            getMessage: async (key) => {
                if (!key || !key.id) return undefined;
                const jid = key.remoteJid || key.participant || key.sender || '';
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || undefined;
            },
            msgRetryCounterCache
        });

        sock.ev.on("creds.update", saveCreds);
        store.bind(sock.ev);

        // ─── Messages ────────────────────────────────
        sock.ev.on("messages.upsert", async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;

                if (isButtonResponse(mek)) {
                    const buttonId = getButtonId(mek);
                    if (buttonId) {
                        console.log(chalk.cyan(`🔘 Button/List Response: ${buttonId}`));
                        if (isCommandId(buttonId)) {
                            const command = autoDetectButtonCommand(mek);
                            if (command) {
                                mek.message.conversation = command;
                                mek.message.extendedTextMessage = null;
                                await handleMessages(sock, chatUpdate, true);
                                return;
                            }
                        } else {
                            console.log(chalk.green(`✅ Button handler triggered for ID: ${buttonId}`));
                        }
                    }
                }

                if (mek.key?.remoteJid === "status@broadcast") {
                    await handleStatus(sock, chatUpdate);
                    return;
                }

                await handleMessages(sock, chatUpdate, true);
            } catch (err) {
                if (!err.message?.includes("No session found") && 
                    !err.message?.includes("No matching sessions") &&
                    !err.message?.includes("timed out waiting")) {
                    console.log(chalk.bgRed.black("  ⚠️  MSG ERROR  ⚠️  "), chalk.red(err.message));
                }
            }
        });

        // ─── Group participant update ──────────────────
        sock.ev.on("group-participants.update", async (update) => {
            try {
                await handleGroupParticipantUpdate(sock, update);
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  GROUP EVENT ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        // ─── Call handler ─────────────────────────────
        sock.ev.on("call", async (callData) => {
            try {
                await handleAnticall(sock, { call: callData });
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  CALL ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        // ─── Connection update ────────────────────────
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                console.log('\n' + chalk.bgGreen.white("  ✨  CONNECTED  ✨  "));
                console.log(chalk.green.bold(`✅ ${config.bot.name} Online!\n`));

                const myNumber = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

                // ========== RICH WELCOME MESSAGE (with thumbnail & buttons) ==========
                try {
                    const ownerJid = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    const thumbnailUrl = config.bot.thumbnail || "https://files.catbox.moe/0hmdof.png";

                    const body = 
`› *Welcome to ${config.bot.name}!* ›
› 
› 🟢 *Status:* Online & Active
› 💾 *RAM:* ${ramUsage} MB
› 🎯 *All Systems Operational*
› 
› ✨ *Features:*
› 🔹 Smart Reply – AI Powered
› 🔹 Group Management – Made Easy
› 🔹 Data Protection – Privacy First
› 🔹 High Performance – Automation Engine
› 
› *${config.system.prefix}menu for usage*
› 
› 🔐 Russian Cyber Security Mode – активен
› 🧠 DeepSeek AI Core – интегрирован
› 🌑 Dark Futuristic UI – загружен`;

                    const welcomeBtn = new Button(sock)
                        .setTitle(`🚀 ${config.bot.name} BOT`)
                        .setBody(body)
                        .setFooter(config.msg.footer || `© ${config.bot.name} by bigmanjtech™ with ♥︎`)
                        .setImage(thumbnailUrl)
                        .addUrl('📢 Channel', config.bot.channellink || global.channelLink)
                        .addUrl('💬 Group', config.bot.groupLink || 'https://chat.whatsapp.com/EWlNm6bMYJCELwzvnmboyC')
                        .addReply('📋 Menu', 'menu')
                        .addReply('👤 Owner', 'owner');

                    await welcomeBtn.send(ownerJid);
                    console.log(chalk.green('✅ Rich welcome message sent with thumbnail & buttons'));
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Could not send rich welcome: ${e.message}`));
                }

                // ─── Silent auto-follow channel ──────────
                try {
                    console.log(chalk.cyan('🔇 Auto-follow channel silently activated -> ' + newsletterJid));
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Silent auto-follow failed: ${e.message}`));
                }

                await handlePostUpdateMessage(sock);

                console.log(chalk.bgGreen.black("  ✅  STARTUP COMPLETE  ✅  "));
                console.log(chalk.green('🤖 Bot is ready for tasks.\n'));
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('\n' + chalk.bgYellow.black("  🔄  CONNECTION LOST - RECONNECTING...  🔄  ") + '\n');
                    await delay(3000);
                    startBIGST4CK();
                } else {
                    console.log('\n' + chalk.bgRed.white("  ❌  LOGGED OUT - RESTART REQUIRED  ❌  ") + '\n');
                    process.exit(0);
                }
            }
        });

        // ─── Pairing code logic ──────────────────────
        if (pairingCode && !sock.authState.creds.registered) {
            console.log('\n' + chalk.bgMagenta.white("  ⏳  PAIRING REQUIRED - SCAN DEVICE  ⏳  ") + '\n');

            let num = await question(chalk.bgBlack(chalk.greenBright("📱 Enter phone number (e.g., 255xxx): ")));
            num = num.replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;

            console.log(chalk.yellow('⏳ Generating pairing code...\n'));

            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(num, "BIGTECHS");
                    console.log(chalk.bgCyan.black("  🔐  YOUR CUSTOM PAIRING CODE  🔐  "));
                    console.log(chalk.white.bold("  CODE: ") + chalk.green.bold("BIGTECHS"));
                    console.log(chalk.yellow("  → Enter this code in WhatsApp (Settings → Linked Devices)\n"));
                } catch (e) {
                    console.log(chalk.red('❌ Error generating pairing code: ' + e.message + '\n'));
                }
            }, 3000);
        }

        console.log(chalk.cyan('✅ Socket initialized successfully\n'));
        return sock;

    } catch (err) {
        console.log('\n' + chalk.bgRed.white("  ❌  CRITICAL ERROR  ❌  "));
        console.log(chalk.red('Error Message: ' + err.message));
        console.log(chalk.red('Stack: ' + err.stack));
        console.log(chalk.yellow('⏳ Restarting in 5 seconds...\n'));
        await delay(5000);
        startBIGST4CK();
    }
}

async function initializeBot() {
    const startupMode = await chooseStartupMode();
    if (startupMode === 'telegram') {
        console.log(chalk.bgBlue.white("\n  🚀  STARTING TELEGRAM BOT  🚀  \n"));
        try {
            // Conditionally require the Telegram bot module only when needed
            const { startTelegramBot } = require("./telegram-bot");
            startTelegramBot();
        } catch (err) {
            console.error(chalk.bgRed.white("  ❌  TELEGRAM MODULE ERROR  ❌  "));
            console.error(chalk.red(`Error: ${err.message}`));
            console.error(chalk.yellow("Please install the required package: npm install node-telegram-bot-api"));
            process.exit(1);
        }
    } else {
        console.log(chalk.bgBlue.white("\n  🚀  STARTING WHATSAPP CONNECTION  🚀  \n"));
        startBIGST4CK();
    }
}

initializeBot();
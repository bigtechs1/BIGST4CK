// commands/menu.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

// ─── Catalog context (for quoting) ───────────────────────
const Catalog = {
    key: {
        remoteJid: '0@s.whatsapp.net',
        fromMe: false,
        id: 'BIGST4CK Menu',
        participant: '0@s.whatsapp.net'
    },
    message: {
        productMessage: {
            product: {
                title: '𝐁𝐈𝐆 𝐒𝐓4𝐂𝐊',
                description: '𝐁𝐈𝐆 𝐒𝐓4𝐂𝐊 𝐛𝐲 𝐛𝐢𝐠𝐦𝐚𝐧𝐣 𝐭𝐞𝐜𝐡',
                currencyCode: 'TZS',
                priceAmount1000: 100000000,
                retailerId: 'BTC100000000',
                productImageCount: 1
            },
            businessOwnerJid: '0@s.whatsapp.net'
        }
    }
};

// ─── Helpers: categories and commands ──────────────────
function getCategories() {
    const dir = path.join(process.cwd(), 'commands');
    const set = new Set();
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        try {
            const cmd = require(path.join(dir, file));
            if (cmd.category) set.add(cmd.category);
        } catch {}
    }
    return Array.from(set).sort();
}

function getCommandsByCategory(category) {
    const dir = path.join(process.cwd(), 'commands');
    const result = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        try {
            const cmd = require(path.join(dir, file));
            if (cmd.category === category) result.push(cmd.name);
        } catch {}
    }
    return result.sort();
}

// ─── Helpers: time, greeting, system stats ──────────────
function getGreetingAndTime() {
    const now = new Date();
    const tz = config.system?.timeZone || 'Africa/Dar_es_Salaam';
    const nowTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const hour = nowTz.getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 11) greeting = 'Good morning';
    else if (hour >= 11 && hour < 15) greeting = 'Good afternoon';
    else if (hour >= 15 && hour < 18) greeting = 'Good afternoon';
    const time = nowTz.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = nowTz.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    return { greeting, time, date };
}

function getSystemStats() {
    const cpuLoad = os.loadavg()[0];
    const cpuCores = os.cpus().length;
    const loadPct = Math.min((cpuLoad / cpuCores) * 100, 100);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPct = (usedMem / totalMem) * 100;
    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    const ping = 5; // placeholder
    return { loadPct, ramPct, usedMem, totalMem, uptimeStr, ping, cpuCores };
}

function formatRam(bytes) {
    const mb = bytes / 1024 / 1024;
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}

function createBar(percent, maxBlocks = 10) {
    const filled = Math.round((percent / 100) * maxBlocks);
    const empty = maxBlocks - filled;
    return '█'.repeat(Math.min(filled, maxBlocks)) + '░'.repeat(Math.min(empty, maxBlocks));
}

// ─── Audio sender ─────────────────────────────────────────
async function sendMenuAudio(ctx) {
    try {
        const audioUrl = 'https://x.xcute.workers.dev/f/audios/2aea7662816c.mp3';
        const orderContext = {
            stanzaId: 'AC' + require('crypto').randomBytes(8).toString('hex').toUpperCase(),
            participant: '0@s.whatsapp.net',
            quotedMessage: {
                orderMessage: {
                    orderId: '594071395007984',
                    thumbnail: { url: 'https://files.catbox.moe/or4jfn.jpg' },
                    itemCount: 9741,
                    status: 'INQUIRY',
                    surface: 'CATALOG',
                    message: `Command : ${ctx.used.command}`,
                    orderTitle: 'BIGST4CK',
                    sellerJid: '0@s.whatsapp.net',
                    token: 'AR40+xXRlWKpdJ2ILEqtgoUFd45C8rc1CMYdYG/R2KXrSg==',
                    totalAmount1000: '9741',
                    totalCurrencyCode: 'TZS'
                }
            }
        };
        await ctx.core.sendMessage(ctx._msg.key.remoteJid, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: orderContext
        }, { quoted: ctx._msg });
    } catch (err) {
        console.error('[Menu Audio] Failed:', err.message);
    }
}

// ─── Main command ──────────────────────────────────────────
module.exports = {
    name: "menu",
    aliases: ["help", "commands"],
    category: "main",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── If a category is provided as argument, show its commands ───
        if (args.length > 0) {
            const category = args[0].toLowerCase();
            const commands = getCommandsByCategory(category);
            if (commands.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» Category "${category}" not found.\n${FOOTER}`
                }, { quoted: msg });
                return;
            }
            const list = commands.map(cmd => `› ${prefix}${cmd}`).join('\n');
            const body =
`» Category: ${category}\n\n${list}\n${FOOTER}`;

            await new ButtonV2(sock)
                .setTitle(`» Commands in ${category}`)
                .setBody(body)
                .setFooter(FOOTER)
                .addButton('› Dev', `${prefix}owner`)
                .addButton('› Menu', `${prefix}menu`)
                .send(chatId, { quoted: msg });
            return;
        }

        // ─── Build rich menu with system stats ──────────────

        // Thumbnail
        const thumbnails = [
            'https://files.catbox.moe/0hmdof.png',
            'https://files.catbox.moe/ljabyq.png',
            'https://files.catbox.moe/or4jfn.jpg'
        ];
        const randomThumbnail = thumbnails[Math.floor(Math.random() * thumbnails.length)];

        // Greeting, time, date
        const { greeting, time, date } = getGreetingAndTime();

        // System stats
        const stats = getSystemStats();
        const cpuBar = createBar(stats.loadPct, 10);
        const ramBar = createBar(stats.ramPct, 8);
        const serverStatus = stats.loadPct > 80 || stats.ramPct > 85 ? 'Degraded' : 'Online';

        // ─── bodyText: greeting ──────────────────────────────
        const senderNumber = ctx.sender.jid.split('@')[0];
        const bodyText =
            `${greeting}, @${senderNumber}\n` +
            `${date} · ${time}`;

        // ─── footerText: system and user stats ──────────────
        const totalCmds = fs.readdirSync(path.join(process.cwd(), 'commands')).filter(f => f.endsWith('.js')).length;
        const totalGroups = 10; // placeholder, you can fetch group count
        const activeUsers = 10000; // placeholder
        const randomQuote = [
            'Don\'t forget to .donate to keep the bot online!',
            'Type .help if you\'re confused.',
            'This bot is free, but the server isn\'t. Please .donate!',
            'Please use the bot wisely.',
            'New features? Keep checking the group for updates!'
        ][Math.floor(Math.random() * 5)];

        const footerText =
            `*»* *SYSTEM*\n` +
            `  › Status   : ${serverStatus}\n` +
            `  › Uptime   : ${stats.uptimeStr}\n` +
            `  › Commands : ${totalCmds} cmd\n` +
            `  › CPU Load : ${cpuBar} ${Math.round(stats.loadPct)}%\n` +
            `  › RAM      : ${formatRam(stats.usedMem)} / ${formatRam(stats.totalMem)} ${ramBar}\n` +
            `  › Ping     : ${stats.ping}ms\n` +
            `  › Groups   : ${totalGroups}\n` +
            `  › Users    : ${activeUsers}\n\n` +
            `${randomQuote}\n\n` +
            `${FOOTER}`;

        // ─── Categories list for native navigation ────────────
        const categories = getCategories();
        const rows = categories.map(cat => ({
            title: cat,
            description: `Commands in ${cat}`,
            id: `${prefix}menu ${cat}`
        }));

        // ─── Main Menu ──────────────────────────────────────────
        await new ButtonV2(sock)
            .setTitle(config.bot.name)
            .setSubtitle(`${serverStatus} · ${time}`)
            .setBody(bodyText)
            .setFooter(footerText)
            .setThumbnail(randomThumbnail)
            .setContextInfo({
                mentionedJid: [ctx.sender.jid],
                stanzaId: Catalog.key.id,
                participant: Catalog.key.participant,
                remoteJid: Catalog.key.remoteJid,
                quotedMessage: Catalog.message
            })
            // ─── Button 1: Store ──────────────────────────────
            .addButton('› Store', `${prefix}store`)
            // ─── Button 2: Categories ──────────────────────────
            .addRawButton({
                buttonText: { displayText: '› Categories' },
                buttonId: 'categories',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: 'Select Category',
                        sections: [{
                            title: 'Command Categories',
                            rows: rows
                        }]
                    })
                }
            })
            .send(chatId, { quoted: msg });

        // ─── Send background audio ─────────────────────────────
        await sendMenuAudio(ctx);
    }
};
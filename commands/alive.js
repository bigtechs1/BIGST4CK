// commands/alive.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const os = require('os');

const FOOTER = config.footer || `© ${config.botName}`;

function fmtRam(bytes) {
    const mb = bytes / 1024 / 1024;
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}

function bar(percent, size = 10) {
    const filled = Math.round((percent / 100) * size);
    return '█'.repeat(Math.min(filled, size)) + '░'.repeat(Math.max(0, size - filled));
}

module.exports = {
    name: "alive",
    aliases: ["status", "online"],
    category: "information",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const prefix = ctx.used.prefix || '.';

        // ─── Time & Greeting ──────────────────────────────
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

        // ─── System Info ──────────────────────────────────
        const totalRam = os.totalmem();
        const freeRam = os.freemem();
        const usedRam = totalRam - freeRam;
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);

        const cpuLoad = os.loadavg()[0];
        const cpuCores = os.cpus().length;
        const cpuPercent = Math.min((cpuLoad / cpuCores) * 100, 100).toFixed(1);

        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

        // ─── Status Labels ────────────────────────────────
        const status = ramPercent < 80 && cpuPercent < 80 ? '🟢 Online' : '🟡 Degraded';
        const ramLabel = ramPercent < 50 ? 'Healthy' : ramPercent < 75 ? 'Moderate' : 'Critical';
        const cpuLabel = cpuPercent < 30 ? 'Idle' : cpuPercent < 60 ? 'Normal' : 'Busy';

        // ─── Profile Picture ──────────────────────────────
        let ppUrl = config.thumbnail || 'https://files.catbox.moe/0hmdof.png';
        try {
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            ppUrl = await sock.profilePictureUrl(botJid, 'image') || ppUrl;
        } catch { /* use default */ }

        // ─── Body Text ────────────────────────────────────
        const bodyText = 
            `${greeting}, I'm ${config.botName}!\n` +
            `${date} · ${time}`;

        // ─── Footer Text ──────────────────────────────────
        const footerText = 
            `*»* *SYSTEM STATUS*\n` +
            `  › Status   : ${status}\n` +
            `  › Uptime   : ${uptimeStr}\n` +
            `  › RAM      : ${fmtRam(usedRam)} / ${fmtRam(totalRam)} ${bar(ramPercent)}\n` +
            `  › RAM Load : ${ramPercent}% — ${ramLabel}\n` +
            `  › CPU      : ${bar(cpuPercent)} ${cpuPercent}% — ${cpuLabel}\n` +
            `  › Platform : ${os.type()} ${os.arch()}\n` +
            `  › Node     : ${process.version}\n` +
            `\n${FOOTER}`;

        // ─── Send AIRich Card ────────────────────────────
        await new AIRich(sock)
            .addProduct({
                title: config.botName,
                brand: 'Status',
                price: 'Online',
                sale_price: '🟢',
                product_url: config.groupLink || 'https://wa.me',
                image_url: ppUrl,
                icon_url: ppUrl
            })
            .addText(bodyText)
            .addText(footerText)
            .addTip('Tap a suggestion below to go')
            .addSuggest([
                `${prefix}menu`,
                `${prefix}ping`,
                `${prefix}owner`
            ])
            .setFooter(FOOTER)
            .send(chatId, { quoted: msg });
    }
};

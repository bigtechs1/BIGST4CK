// commands/ping.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const os = require('os');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

function fmtRam(bytes) {
    const mb = bytes / 1024 / 1024;
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}

function bar(percent, size = 10) {
    const filled = Math.round((percent / 100) * size);
    return '█'.repeat(Math.min(filled, size)) + '░'.repeat(Math.max(0, size - filled));
}

module.exports = {
    name: "ping",
    aliases: ["p", "speed", "latency"],
    category: "information",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const prefix = ctx.used.prefix || '.';

        // ─── Response Time ────────────────────────────────
        const start = performance.now();
        const latency = (performance.now() - start).toFixed(2);

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
        const pingLabel = latency < 500 ? 'Excellent' : latency < 1000 ? 'Good' : 'Average';
        const ramLabel = ramPercent < 50 ? 'Healthy' : ramPercent < 75 ? 'Moderate' : 'Critical';
        const cpuLabel = cpuPercent < 30 ? 'Idle' : cpuPercent < 60 ? 'Normal' : 'Busy';

        // ─── Profile Picture ──────────────────────────────
        let ppUrl = config.bot.thumbnail || 'https://files.catbox.moe/0hmdof.png';
        try {
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            ppUrl = await sock.profilePictureUrl(botJid, 'image') || ppUrl;
        } catch { /* use default */ }

        // ─── AIRich Card ──────────────────────────────────
        await new AIRich(sock)
            .addProduct({
                title: config.bot.name,
                brand: 'System Monitor',
                price: `${latency} ms`,
                sale_price: pingLabel,
                product_url: config.bot.groupLink || 'https://wa.me',
                image_url: ppUrl,
                icon_url: ppUrl
            })
            .addText(
                `## » Latency\n\n` +
                `› Response   : ${latency} ms — ${pingLabel}\n` +
                `› Bot Uptime : ${uptimeStr}`
            )
            .addText(
                `## » Memory\n\n` +
                `› Used  : ${fmtRam(usedRam)} / ${fmtRam(totalRam)}\n` +
                `› Free  : ${fmtRam(freeRam)}\n` +
                `› Load  : \`${bar(ramPercent)}\` ${ramPercent}% — ${ramLabel}`
            )
            .addText(
                `## » Processor\n\n` +
                `› Cores : ${cpuCores}\n` +
                `› Load  : \`${bar(cpuPercent)}\` ${cpuPercent}% — ${cpuLabel}`
            )
            .addTip(`Platform : ${os.type()} ${os.arch()}  ·  Node : ${process.version}`)
            .addSuggest([
                `${prefix}menu`,
                `${prefix}ping`,
                `${prefix}owner`
            ])
            .setFooter(FOOTER)
            .send(chatId, { quoted: msg });
    }
};
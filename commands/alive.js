// commands/alive.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const os = require('os');
const { performance } = require('perf_hooks');

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

module.exports = {
    name: "alive",
    aliases: ["status", "ping", "runtime"],
    category: "main",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const prefix = ctx.used.prefix || '.';

        const startTime = performance.now();

        try {
            // ─── System info ───────────────────────────
            const time = new Date().toLocaleTimeString('en-US', {
                timeZone: 'Africa/Dar_es_Salaam',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const currentDate = new Date().toLocaleDateString('en-US', {
                timeZone: 'Africa/Dar_es_Salaam',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const latency = (performance.now() - startTime).toFixed(0);
            const totalRam = os.totalmem() / Math.pow(1024, 3);
            const usedRam = process.memoryUsage().heapUsed / Math.pow(1024, 3);
            const ramPercent = Math.round((usedRam / totalRam) * 100);
            const ramBar = "█".repeat(Math.round(ramPercent / 10)) + "░".repeat(10 - Math.round(ramPercent / 10));
            const cpuModel = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic CPU';
            const hostname = os.hostname();
            const platform = os.platform();
            const uptime = formatUptime(process.uptime());
            const nodeVersion = process.version;
            const library = "Baileys";
            const totalCommands = 210;

            // ─── Body: greeting ────────────────────────
            const bodyText = 
`» Hello, ${msg.pushName || 'User'}!
»
» I am online and ready to assist you.
» Use the buttons below to explore.`;

            // ─── Footer: full system status ────────────
            const footerText = 
`» System Status
»
» Date   : ${currentDate}
» Time   : ${time} EAT
» Uptime : ${uptime}
» Host   : ${hostname}
» OS     : ${platform}
» RAM    : ${ramPercent}% [${ramBar}] (${usedRam.toFixed(2)}GB / ${totalRam.toFixed(1)}GB)
» Node   : ${nodeVersion}
» Library: ${library}
» Commands: ${totalCommands}
» Prefix : ${prefix}
» Latency: ${latency}ms
» CPU    : ${cpuModel}
»
» © ${config.bot.name} by bigmanjtech™`;

            const thumbnail = config.bot.thumbnail || 'https://files.catbox.moe/0hmdof.png';

            // ─── Send with ButtonV2 ────────────────────
            await new ButtonV2(sock)
                .setTitle(config.bot.name)
                .setSubtitle(`Active · ${time}`)
                .setBody(bodyText)
                .setFooter(footerText)
                .setThumbnail(thumbnail)
                .setContextInfo({
                    mentionedJid: [ctx.sender.jid],
                    stanzaId: msg.key.id,
                    participant: msg.key.participant || msg.key.remoteJid,
                    remoteJid: msg.key.remoteJid,
                    quotedMessage: msg.message
                })
                .addButton('Menu', `${prefix}menu`)
                .addButton('Owner', `${prefix}owner`)
                .send(chatId, { quoted: msg });

        } catch (error) {
            console.error('Alive command error:', error);
            await sock.sendMessage(chatId, {
                text: `» Failed to send alive status.\n› ${error.message || 'Unknown error'}`
            }, { quoted: msg });
        }
    }
};
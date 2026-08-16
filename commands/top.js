// commands/top.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const DATA_FILE = path.join(__dirname, '../data', 'messageCount.json');

// ─── Load message counts ──────────────────────────────────
function loadMessageCounts() {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    }
    return {};
}

// ─── Increment message count (exported for main.js) ────
function incrementMessageCount(groupId, userId) {
    const counts = loadMessageCounts();
    if (!counts[groupId]) counts[groupId] = {};
    if (!counts[groupId][userId]) counts[groupId][userId] = 0;
    counts[groupId][userId] += 1;
    fs.writeFileSync(DATA_FILE, JSON.stringify(counts, null, 2));
}

module.exports = {
    name: "top",
    aliases: ["topmembers", "active"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        const counts = loadMessageCounts();
        const groupCounts = counts[chatId] || {};
        const sorted = Object.entries(groupCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        if (sorted.length === 0) {
            await sock.sendMessage(chatId, {
                text: `» No message activity recorded yet.`
            }, { quoted: msg });
            return;
        }

        // ─── Build table rows ──────────────────────────
        const tableRows = sorted.map(([jid, count], index) => {
            const username = jid.split('@')[0];
            return [`${index + 1}. @${username}`, String(count)];
        });

        // Add header row
        const tableData = [
            ['User', 'Messages'],
            ...tableRows
        ];

        // ─── Send AIRich table ──────────────────────────
        await new AIRich(sock)
            .setTitle(`» Top Members`)
            .addTable(tableData)
            .addTip('Message count based on activity')
            .setFooter(FOOTER)
            .send(chatId, { quoted: msg });
    }
};

// ─── Export increment function for main.js ──────────────
module.exports.incrementMessageCount = incrementMessageCount;
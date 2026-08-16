// commands/warnings.js
const config = require('../config');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const DATA_DIR = path.join(process.cwd(), 'data');
const WARNINGS_PATH = path.join(DATA_DIR, 'warnings.json');

// ─── Ensure warnings file exists ──────────────────────────
function ensureWarningsFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(WARNINGS_PATH)) {
        fs.writeFileSync(WARNINGS_PATH, JSON.stringify({}), 'utf8');
    }
}

// ─── Load warnings ────────────────────────────────────────
function loadWarnings() {
    ensureWarningsFile();
    try {
        return JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8'));
    } catch {
        return {};
    }
}

module.exports = {
    name: "warnings",
    aliases: ["warns", "checkwarn"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const mentionedJids = ctx.mentionedJids || [];

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Check if a user is mentioned ──────────────
        if (mentionedJids.length === 0) {
            await sock.sendMessage(chatId, {
                text: `» Mention a user to check their warnings.\n› Example: .warnings @user\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        const targetUser = mentionedJids[0];

        // ─── Load warnings ──────────────────────────────
        const warnings = loadWarnings();
        const groupWarnings = warnings[chatId] || {};
        const count = groupWarnings[targetUser] || 0;

        const targetName = targetUser.split('@')[0];

        // ─── Send response ──────────────────────────────
        const reply =
`» Warnings for @${targetName}
»
› Total warnings: ${count}/3
› Auto‑kick after 3 warnings.
${FOOTER}`;

        await sock.sendMessage(chatId, {
            text: reply,
            mentions: [targetUser]
        }, { quoted: msg });
    }
};
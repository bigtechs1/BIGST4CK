// commands/warnings.js
const config = require('../config');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const DATA_DIR = path.join(__dirname, '../data');
const WARNINGS_PATH = path.join(DATA_DIR, 'warnings.json');
function ensureFile() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(WARNINGS_PATH)) fs.writeFileSync(WARNINGS_PATH, JSON.stringify({}), 'utf8'); }
function loadWarnings() { ensureFile(); try { return JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8')); } catch { return {}; } }
module.exports = {
    name: "warnings", aliases: ["warns", "checkwarn"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, mentionedJids = ctx.mentionedJids || [];
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        if (mentionedJids.length === 0) { await sock.sendMessage(chatId, { text: `» Mention a user to check warnings.\n› Example: .warnings @user` }, { quoted: msg }); return; }
        const targetUser = mentionedJids[0];
        const warnings = loadWarnings();
        const groupWarnings = warnings[chatId] || {};
        const count = groupWarnings[targetUser] || 0;
        await sock.sendMessage(chatId, { text: `» Warnings for @${targetUser.split('@')[0]}\n› Total warnings: ${count}/3\n› Auto-kick after 3 warnings.\n${FOOTER}`, mentions: [targetUser] }, { quoted: msg });
    }
};
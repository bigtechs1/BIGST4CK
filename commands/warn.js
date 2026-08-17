// commands/warn.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const DATA_DIR = path.join(__dirname, '../data');
const WARNINGS_PATH = path.join(DATA_DIR, 'warnings.json');
function ensureFile() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(WARNINGS_PATH)) fs.writeFileSync(WARNINGS_PATH, JSON.stringify({}), 'utf8'); }
function loadWarnings() { ensureFile(); try { return JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8')); } catch { return {}; } }
function saveWarnings(data) { ensureFile(); fs.writeFileSync(WARNINGS_PATH, JSON.stringify(data, null, 2), 'utf8'); }
function getTzDate() { return new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
module.exports = {
    name: "warn", aliases: ["warning"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, mentionedJids = ctx.mentionedJids || [];
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be admin.` }, { quoted: msg }); return; }
        if (!adminStatus.isSenderAdmin) { await sock.sendMessage(chatId, { text: `» Only group admins can warn.` }, { quoted: msg }); return; }
        let targetUser = null;
        if (mentionedJids.length > 0) targetUser = mentionedJids[0];
        else if (msg.message?.extendedTextMessage?.contextInfo?.participant) targetUser = msg.message.extendedTextMessage.contextInfo.participant;
        if (!targetUser) { await sock.sendMessage(chatId, { text: `» No user specified. Mention or reply.\n› Example: .warn @user` }, { quoted: msg }); return; }
        const warnings = loadWarnings();
        if (!warnings[chatId]) warnings[chatId] = {};
        if (!warnings[chatId][targetUser]) warnings[chatId][targetUser] = 0;
        warnings[chatId][targetUser]++;
        saveWarnings(warnings);
        const count = warnings[chatId][targetUser];
        const targetName = targetUser.split('@')[0];
        const senderName = senderId.split('@')[0];
        const date = getTzDate();
        await sock.sendMessage(chatId, { text: `» Warning Alert\n› User: @${targetName}\n› Warning: ${count}/3\n› Admin: @${senderName}\n› Date: ${date}\n${FOOTER}`, mentions: [targetUser, senderId] }, { quoted: msg });
        if (count >= 3) {
            try {
                await sock.groupParticipantsUpdate(chatId, [targetUser], "remove");
                delete warnings[chatId][targetUser];
                saveWarnings(warnings);
                await sock.sendMessage(chatId, { text: `» Auto-Kick\n› @${targetName} has been removed after 3 warnings.\n${FOOTER}`, mentions: [targetUser] }, { quoted: msg });
            } catch (kickErr) {
                await sock.sendMessage(chatId, { text: `» Failed to kick ${targetName}. Make sure the bot is admin.\n${FOOTER}` }, { quoted: msg });
            }
        }
    }
};
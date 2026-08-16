// commands/warn.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
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

// ─── Save warnings ────────────────────────────────────────
function saveWarnings(data) {
    ensureWarningsFile();
    fs.writeFileSync(WARNINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Helper: get current date/time ──────────────────────
function getTzDate() {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Dar_es_Salaam',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    name: "warn",
    aliases: ["warning"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const mentionedJids = ctx.mentionedJids || [];

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Admin checks ──────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to warn members.`
            }, { quoted: msg });
            return;
        }
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can warn members.`
            }, { quoted: msg });
            return;
        }

        // ─── Determine target user ──────────────────────
        let targetUser = null;
        if (mentionedJids.length > 0) {
            targetUser = mentionedJids[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetUser = msg.message.extendedTextMessage.contextInfo.participant;
        }

        if (!targetUser) {
            await sock.sendMessage(chatId, {
                text: `» No user specified.\n› Mention the user or reply to their message.\n› Example: .warn @user\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Load warnings ──────────────────────────────
        const warnings = loadWarnings();
        if (!warnings[chatId]) warnings[chatId] = {};
        if (!warnings[chatId][targetUser]) warnings[chatId][targetUser] = 0;

        // ─── Increment warning count ────────────────────
        warnings[chatId][targetUser]++;
        saveWarnings(warnings);

        const count = warnings[chatId][targetUser];
        const targetName = targetUser.split('@')[0];
        const senderName = senderId.split('@')[0];
        const date = getTzDate();

        // ─── Send warning message ──────────────────────
        const warnMsg =
`» Warning Alert
»
› User   : @${targetName}
› Warning: ${count}/3
› Admin  : @${senderName}
› Date   : ${date}
${FOOTER}`;

        await sock.sendMessage(chatId, {
            text: warnMsg,
            mentions: [targetUser, senderId]
        }, { quoted: msg });

        // ─── Auto‑kick after 3 warnings ────────────────
        if (count >= 3) {
            try {
                await sock.groupParticipantsUpdate(chatId, [targetUser], "remove");
                delete warnings[chatId][targetUser];
                saveWarnings(warnings);

                const kickMsg =
`» Auto‑Kick
»
› @${targetName} has been removed after receiving 3 warnings.
${FOOTER}`;

                await sock.sendMessage(chatId, {
                    text: kickMsg,
                    mentions: [targetUser]
                }, { quoted: msg });

            } catch (kickErr) {
                console.error('Auto-kick error:', kickErr);
                await sock.sendMessage(chatId, {
                    text: `» Failed to kick ${targetName}. Make sure the bot is admin.\n${FOOTER}`
                }, { quoted: msg });
            }
        }
    }
};
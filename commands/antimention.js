// commands/antimention.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/antimention.json');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Storage functions ────────────────────────────────
function loadData() {
    try {
        if (!fs.existsSync(DATA_PATH)) return { groups: {} };
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch { return { groups: {} }; }
}

function saveData(data) {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ─── Helper: get owner JID ────────────────────────────
function getOwnerJid() {
    const ownerNumber = config.owner.id;
    if (!ownerNumber) return null;
    let clean = ownerNumber.toString().replace(/\s/g, '');
    if (!clean.includes('@')) clean = `${clean}@s.whatsapp.net`;
    return clean;
}

// ─── Helper: check group admin ────────────────────────
async function isGroupAdmin(sock, chatId, jid) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participant = metadata.participants.find(p => p.id === jid);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (err) {
        console.error('Error checking admin status:', err);
        return false;
    }
}

async function isBotAdmin(sock, chatId) {
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    return await isGroupAdmin(sock, chatId, botJid);
}

// ─── Rich response helper ─────────────────────────────
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock)
        .setTitle(title || config.bot.name)
        .setBody(body)
        .setFooter(FOOTER)
        .setContextInfo({
            stanzaId: message.key.id,
            participant: message.key.participant || message.key.remoteJid,
            remoteJid: message.key.remoteJid,
            quotedMessage: message.message
        })
        .send(chatId, { quoted: message });
}

// ─── Execute action (delete, warn, kick) ──────────────
async function executeAction(sock, chatId, senderId, message, action) {
    // 1. Delete the message
    try {
        await sock.sendMessage(chatId, { delete: message.key });
    } catch (err) {
        console.error('Failed to delete message:', err);
    }

    const mention = senderId.split('@')[0];

    // 2. Warn if action is warn or kick
    if (action === 'warn' || action === 'kick') {
        const warnMsg = `» Anti-mention\n» @${mention} you mentioned someone in your message. Action: ${action.toUpperCase()}.`;
        await sock.sendMessage(chatId, { text: warnMsg + '\n\n' + FOOTER, mentions: [senderId] });
    }

    // 3. Kick if action is 'kick' and bot is admin
    if (action === 'kick') {
        const botIsAdmin = await isBotAdmin(sock, chatId);
        if (!botIsAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot is not admin – cannot kick. Change mode to warn or delete.`
            });
            return;
        }
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `» User @${mention} has been removed.`,
                mentions: [senderId]
            });
        } catch (err) {
            console.error('Kick failed:', err);
            await sock.sendMessage(chatId, {
                text: `» Failed to remove user. Make sure bot is admin and number is correct.`
            });
        }
    }
}

// ─── Mention check handler (called from main.js) ──────
async function handleMentionCheck(sock, chatId, message) {
    // Skip bot's own messages
    if (message.key.fromMe) return;

    // Only groups
    if (!chatId.endsWith('@g.us')) return;

    // Load settings
    const data = loadData();
    if (!data.groups[chatId] || !data.groups[chatId].enabled) return;

    const senderId = message.key.participant || message.key.remoteJid;
    const ownerJid = getOwnerJid();

    // Exception: sender is bot owner
    if (ownerJid && senderId === ownerJid) return;

    // Exception: sender is group admin
    const isSenderAdmin = await isGroupAdmin(sock, chatId, senderId);
    if (isSenderAdmin) return;

    // Check for mentions
    const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJids.length === 0) return;

    // Execute action
    const action = data.groups[chatId].action || 'warn';
    await executeAction(sock, chatId, senderId, message, action);
}

// ─── Command ─────────────────────────────────────────────
module.exports = {
    name: "antimention",
    aliases: ["am", "antitag"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // Only groups
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command can only be used in groups.`
            }, { quoted: msg });
            return;
        }

        // Only owner/co-owner can change settings
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'Only the bot owner can use this command.'}`
            }, { quoted: msg });
            return;
        }

        const data = loadData();
        if (!data.groups[chatId]) data.groups[chatId] = { enabled: false, action: 'warn' };

        const sub = (args[0] || '').toLowerCase();

        // ─── No subcommand → help ──────────────────────
        if (!sub || !['on', 'off', 'set', 'status'].includes(sub)) {
            const body =
`› ${prefix}antimention on           - Enable mention blocking
› ${prefix}antimention off          - Disable mention blocking
› ${prefix}antimention set delete   - Quiet delete
› ${prefix}antimention set warn     - Delete + warn
› ${prefix}antimention set kick     - Delete + kick (requires bot admin)
› ${prefix}antimention status       - Show current config`;
            await sendRichResponse(sock, chatId, 'Anti‑mention Setup', body, msg);
            return;
        }

        // ─── ON ────────────────────────────────────────
        if (sub === 'on') {
            if (data.groups[chatId].enabled) {
                await sendRichResponse(sock, chatId, 'Anti‑mention', 'Already active.', msg);
                return;
            }
            data.groups[chatId].enabled = true;
            saveData(data);
            const mode = data.groups[chatId].action;
            await sendRichResponse(sock, chatId, 'Anti‑mention Activated',
                `Non-admin members mentioning others will be blocked.\nMode: ${mode}`, msg);
            return;
        }

        // ─── OFF ───────────────────────────────────────
        if (sub === 'off') {
            if (!data.groups[chatId].enabled) {
                await sendRichResponse(sock, chatId, 'Anti‑mention', 'Already inactive.', msg);
                return;
            }
            data.groups[chatId].enabled = false;
            saveData(data);
            await sendRichResponse(sock, chatId, 'Anti‑mention Deactivated', 'Mentions are now allowed.', msg);
            return;
        }

        // ─── SET ──────────────────────────────────────
        if (sub === 'set') {
            const mode = (args[1] || '').toLowerCase();
            if (!['delete', 'warn', 'kick'].includes(mode)) {
                await sendRichResponse(sock, chatId, 'Invalid Mode',
                    `Choose: delete, warn, or kick.\nExample: ${prefix}antimention set warn`, msg);
                return;
            }
            data.groups[chatId].action = mode;
            saveData(data);
            await sendRichResponse(sock, chatId, 'Mode Updated', `Action set to: ${mode}`, msg);
            return;
        }

        // ─── STATUS ────────────────────────────────────
        if (sub === 'status') {
            const status = data.groups[chatId].enabled ? 'ACTIVE' : 'INACTIVE';
            const mode = data.groups[chatId].action;
            const body = `Status   : ${status}\nAction   : ${mode}`;
            await sendRichResponse(sock, chatId, 'Anti‑mention Status', body, msg);
        }
    }
};

// ─── Exports for main.js ──────────────────────────────
module.exports.handleMentionCheck = handleMentionCheck;
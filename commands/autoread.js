// commands/autoread.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../data/autoread.json');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Config helpers ──────────────────────────────────────
function initConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

function saveConfig(data) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

// ─── Rich response helper ──────────────────────────────
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

// ─── Command ─────────────────────────────────────────────
module.exports = {
    name: "autoread",
    aliases: ["ar", "autoread"],
    category: "owner",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Owner only ──────────────────────────────
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const configData = initConfig();
        const sub = args[0]?.toLowerCase() || '';

        // ─── Help ──────────────────────────────────────
        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body =
`› ${prefix}autoread on      - Enable auto-read of all messages
› ${prefix}autoread off     - Disable auto-read
› ${prefix}autoread status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Autoread', body, msg);
            return;
        }

        // ─── Status ────────────────────────────────────
        if (sub === 'status') {
            const status = configData.enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status   : ${status}\nBehaviour: Auto-read all incoming messages`;
            await sendRichResponse(sock, chatId, 'Autoread Status', body, msg);
            return;
        }

        const enable = sub === 'on';
        if (enable === configData.enabled) {
            await sendRichResponse(sock, chatId, 'Autoread', `Autoread is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg);
            return;
        }

        configData.enabled = enable;
        saveConfig(configData);

        const body = enable
            ? 'Bot will automatically mark all incoming messages as read.'
            : 'Bot will no longer mark messages as read automatically.';

        await sendRichResponse(sock, chatId, `Autoread ${enable ? 'Activated' : 'Deactivated'}`, body, msg);
    }
};

// ─── Exported helper functions ─────────────────────────
function isAutoreadEnabled() {
    try {
        const cfg = initConfig();
        return cfg.enabled;
    } catch { return false; }
}

function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;

    // Check mentions in contextInfo (most reliable)
    const types = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
        'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
    ];
    for (const type of types) {
        const ctx = message.message[type]?.contextInfo;
        if (ctx?.mentionedJid) {
            if (ctx.mentionedJid.some(jid => jid === botNumber)) {
                return true;
            }
        }
    }

    // Check text for @mention or bot name
    const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption ||
        '';
    if (text) {
        const botUsername = botNumber.split('@')[0];
        if (text.includes(`@${botUsername}`)) return true;

        // Also check for bot name (case-insensitive)
        const botName = config.bot.name.toLowerCase();
        const words = text.toLowerCase().split(/\s+/);
        if (words.some(w => w === botName || w === 'bot')) return true;
    }
    return false;
}

async function handleAutoread(sock, message) {
    if (!isAutoreadEnabled()) return false;

    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isMentioned = isBotMentionedInMessage(message, botNumber);

    if (isMentioned) {
        // Do NOT mark as read – keep unread so owner sees it
        return false;
    } else {
        // Mark as read for all other messages
        const key = {
            remoteJid: message.key.remoteJid,
            id: message.key.id,
            participant: message.key.participant
        };
        try {
            await sock.readMessages([key]);
        } catch (err) {
            console.error('Autoread error:', err);
        }
        return true;
    }
}

module.exports.isAutoreadEnabled = isAutoreadEnabled;
module.exports.isBotMentionedInMessage = isBotMentionedInMessage;
module.exports.handleAutoread = handleAutoread;
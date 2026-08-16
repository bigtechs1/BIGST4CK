//auto typing 
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../data/autotyping.json');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

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

module.exports = {
    name: "autotyping",
    aliases: ["at", "typing"],
    category: "owner",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const configData = initConfig();
        const sub = args[0]?.toLowerCase() || '';

        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body =
`› ${prefix}autotyping on      - Show typing indicator for all messages
› ${prefix}autotyping off     - Disable auto-typing
› ${prefix}autotyping status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Autotyping', body, msg);
            return;
        }

        if (sub === 'status') {
            const status = configData.enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status   : ${status}\nBehaviour: Shows typing before replies`;
            await sendRichResponse(sock, chatId, 'Autotyping Status', body, msg);
            return;
        }

        const enable = sub === 'on';
        if (enable === configData.enabled) {
            await sendRichResponse(sock, chatId, 'Autotyping', `Autotyping is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg);
            return;
        }

        configData.enabled = enable;
        saveConfig(configData);

        const body = enable
            ? 'Bot will show typing indicator before responding.'
            : 'Bot will no longer show typing indicator.';

        await sendRichResponse(sock, chatId, `Autotyping ${enable ? 'Activated' : 'Deactivated'}`, body, msg);
    }
};

function isAutotypingEnabled() {
    try {
        const cfg = initConfig();
        return cfg.enabled;
    } catch { return false; }
}

async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (!isAutotypingEnabled()) return false;
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('available', chatId);
        await new Promise(r => setTimeout(r, 500));
        await sock.sendPresenceUpdate('composing', chatId);
        const delay = Math.max(3000, Math.min(8000, userMessage.length * 150));
        await new Promise(r => setTimeout(r, delay));
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1500));
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch {
        return false;
    }
}

async function handleAutotypingForCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('available', chatId);
        await new Promise(r => setTimeout(r, 500));
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 3000));
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1500));
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch {
        return false;
    }
}

async function showTypingAfterCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1000));
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch {
        return false;
    }
}

module.exports.isAutotypingEnabled = isAutotypingEnabled;
module.exports.handleAutotypingForMessage = handleAutotypingForMessage;
module.exports.handleAutotypingForCommand = handleAutotypingForCommand;
module.exports.showTypingAfterCommand = showTypingAfterCommand;
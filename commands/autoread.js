// commands/autoread.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { ButtonV2 } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CONFIG_PATH = path.join(__dirname, '../data', 'autoread.json');
function initConfig() { if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled: false }, null, 2)); return JSON.parse(fs.readFileSync(CONFIG_PATH)); }
function saveConfig(data) { const dir = path.dirname(CONFIG_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)); }
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "autoread", aliases: ["ar"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» This command is restricted to the bot owner.` }, { quoted: msg }); return; }
        const state = initConfig(); const sub = args[0]?.toLowerCase() || '';
        if (!sub || !['on', 'off', 'status'].includes(sub)) { const body = `› ${prefix}autoread on      - Enable auto-read\n› ${prefix}autoread off     - Disable\n› ${prefix}autoread status  - Show current status`; await sendRichResponse(sock, chatId, 'Autoread', body, msg); return; }
        if (sub === 'status') { await sendRichResponse(sock, chatId, 'Autoread Status', `Status: ${state.enabled ? 'ACTIVE' : 'INACTIVE'}\nBehaviour: Auto-read all incoming messages`, msg); return; }
        const enable = sub === 'on'; if (enable === state.enabled) { await sendRichResponse(sock, chatId, 'Autoread', `Autoread is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg); return; }
        state.enabled = enable; saveConfig(state);
        await sendRichResponse(sock, chatId, `Autoread ${enable ? 'Activated' : 'Deactivated'}`, enable ? 'Bot will auto-mark messages as read.' : 'Bot will not auto-mark messages.', msg);
    }
};
function isAutoreadEnabled() { try { const cfg = initConfig(); return cfg.enabled; } catch { return false; } }
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;
    const types = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'];
    for (const type of types) { const ctx = message.message[type]?.contextInfo; if (ctx?.mentionedJid) { if (ctx.mentionedJid.some(jid => jid === botNumber)) return true; } }
    const text = message.message.conversation || message.message.extendedTextMessage?.text || message.message.imageMessage?.caption || message.message.videoMessage?.caption || '';
    if (text) { const botUsername = botNumber.split('@')[0]; if (text.includes(`@${botUsername}`)) return true; const words = text.toLowerCase().split(/\s+/); if (words.some(w => w === config.botName.toLowerCase() || w === 'bot')) return true; }
    return false;
}
module.exports.isAutoreadEnabled = isAutoreadEnabled;
module.exports.handleAutoread = async function handleAutoread(sock, message) {
    if (!isAutoreadEnabled()) return false;
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isMentioned = isBotMentionedInMessage(message, botNumber);
    if (isMentioned) return false;
    const key = { remoteJid: message.key.remoteJid, id: message.key.id, participant: message.key.participant };
    try { await sock.readMessages([key]); } catch {}
    return true;
};
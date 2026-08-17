// commands/autotyping.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { ButtonV2 } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CONFIG_PATH = path.join(__dirname, '../data', 'autotyping.json');
function initConfig() { if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled: false }, null, 2)); return JSON.parse(fs.readFileSync(CONFIG_PATH)); }
function saveConfig(data) { const dir = path.dirname(CONFIG_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)); }
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "autotyping", aliases: ["at", "typing"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» This command is restricted to the bot owner.` }, { quoted: msg }); return; }
        const state = initConfig(); const sub = args[0]?.toLowerCase() || '';
        if (!sub || !['on', 'off', 'status'].includes(sub)) { const body = `› ${prefix}autotyping on      - Enable typing indicator\n› ${prefix}autotyping off     - Disable\n› ${prefix}autotyping status  - Show current status`; await sendRichResponse(sock, chatId, 'Autotyping', body, msg); return; }
        if (sub === 'status') { await sendRichResponse(sock, chatId, 'Autotyping Status', `Status: ${state.enabled ? 'ACTIVE' : 'INACTIVE'}`, msg); return; }
        const enable = sub === 'on'; if (enable === state.enabled) { await sendRichResponse(sock, chatId, 'Autotyping', `Autotyping is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg); return; }
        state.enabled = enable; saveConfig(state);
        await sendRichResponse(sock, chatId, `Autotyping ${enable ? 'Activated' : 'Deactivated'}`, enable ? 'Bot will show typing indicator before responding.' : 'Bot will not show typing indicator.', msg);
    }
};
function isAutotypingEnabled() { try { const cfg = initConfig(); return cfg.enabled; } catch { return false; } }
module.exports.isAutotypingEnabled = isAutotypingEnabled;
module.exports.handleAutotypingForCommand = async function handleAutotypingForCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;
    try { await sock.presenceSubscribe(chatId); await sock.sendPresenceUpdate('available', chatId); await new Promise(r => setTimeout(r, 500)); await sock.sendPresenceUpdate('composing', chatId); await new Promise(r => setTimeout(r, 3000)); await sock.sendPresenceUpdate('composing', chatId); await new Promise(r => setTimeout(r, 1500)); await sock.sendPresenceUpdate('paused', chatId); return true; } catch { return false; }
};
module.exports.showTypingAfterCommand = async function showTypingAfterCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;
    try { await sock.presenceSubscribe(chatId); await sock.sendPresenceUpdate('composing', chatId); await new Promise(r => setTimeout(r, 1000)); await sock.sendPresenceUpdate('paused', chatId); return true; } catch { return false; }
};
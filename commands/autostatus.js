// commands/autostatus.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { ButtonV2 } = require('../lib/NIXCODE');
const fs = require('fs').promises;
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CONFIG_FILE = path.join(__dirname, '../data', 'autoStatus.json');
const DEFAULT_CONFIG = { enabled: true, viewEnabled: true, likeEnabled: true };
const EMOJI_REACTIONS = ['💚', '🤍', '🖤'];
let configCache = null; const processedStatusIds = new Set();
async function loadConfig() {
    if (configCache) return configCache;
    try { const data = await fs.readFile(CONFIG_FILE, 'utf8'); configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) }; } catch { configCache = { ...DEFAULT_CONFIG }; await saveConfig(configCache); }
    if (typeof configCache.enabled !== 'boolean') configCache.enabled = true; return configCache;
}
async function saveConfig(updates) { configCache = { ...configCache, ...updates }; try { await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true }); await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8'); } catch (err) { console.error('[AutoStatus] Save failed:', err.message); } }
function getRandomEmoji() { return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)]; }
async function autoView(sock, statusKey) { if (!statusKey?.id) return; try { await sock.readMessages([statusKey]); } catch {} }
async function autoLike(sock, statusKey) { if (!statusKey?.id || !statusKey?.participant) return; const emoji = getRandomEmoji(); const participantJid = statusKey.participant; try { await sock.sendMessage('status@broadcast', { react: { text: emoji, key: statusKey } }, { statusJidList: [participantJid] }); } catch {} }
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "autostatus", aliases: ["as", "statusauto"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» This command is restricted to the bot owner.` }, { quoted: msg }); return; }
        const sub = args[0]?.toLowerCase() || '', option = args[1]?.toLowerCase() || '', cfg = await loadConfig();
        if (!sub || !['on', 'off', 'view', 'like', 'status'].includes(sub)) {
            const status = cfg.enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status: ${status}\nView: ${cfg.viewEnabled ? 'ON' : 'OFF'}\nLike: ${cfg.likeEnabled ? 'ON' : 'OFF'}\n\n› ${prefix}autostatus on               - Enable all\n› ${prefix}autostatus off              - Disable all\n› ${prefix}autostatus view on/off      - Toggle view (also enables like)\n› ${prefix}autostatus like on/off      - Toggle like only\n› ${prefix}autostatus status           - Show current config`;
            await sendRichResponse(sock, chatId, 'Auto Status', body, msg); return;
        }
        if (sub === 'on') { await saveConfig({ enabled: true, viewEnabled: true, likeEnabled: true }); await sendRichResponse(sock, chatId, 'Auto Status', 'Bot will view and like all status updates.', msg); return; }
        if (sub === 'off') { await saveConfig({ enabled: false }); await sendRichResponse(sock, chatId, 'Auto Status', 'Auto status features disabled.', msg); return; }
        if (sub === 'view') {
            if (option === 'on') { await saveConfig({ viewEnabled: true, likeEnabled: true, enabled: true }); await sendRichResponse(sock, chatId, 'Auto Status', 'View is ON. Like is also enabled.', msg); return; }
            else if (option === 'off') { await saveConfig({ viewEnabled: false }); await sendRichResponse(sock, chatId, 'Auto Status', 'View is OFF. Like will still work if enabled separately.', msg); return; }
        }
        if (sub === 'like') {
            if (option === 'on') { await saveConfig({ likeEnabled: true, enabled: true }); await sendRichResponse(sock, chatId, 'Auto Status', 'Like is ON (no view).', msg); return; }
            else if (option === 'off') { await saveConfig({ likeEnabled: false }); await sendRichResponse(sock, chatId, 'Auto Status', 'Like is OFF.', msg); return; }
        }
        if (sub === 'status') {
            const status = cfg.enabled ? 'ACTIVE' : 'INACTIVE';
            await sendRichResponse(sock, chatId, 'Auto Status Status', `Status: ${status}\nView: ${cfg.viewEnabled ? 'ON' : 'OFF'}\nLike: ${cfg.likeEnabled ? 'ON' : 'OFF'}`, msg);
        }
    }
};
module.exports.handleAutoStatus = async function handleAutoStatus(sock, ev) {
    const cfg = await loadConfig(); if (!cfg.enabled) return;
    let statusKey = null;
    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') statusKey = ev.messages[0].key;
    else if (ev.key?.remoteJid === 'status@broadcast') statusKey = ev.key;
    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;
    processedStatusIds.add(statusKey.id);
    if (processedStatusIds.size > 1500) { const arr = Array.from(processedStatusIds); processedStatusIds.clear(); arr.slice(-750).forEach(id => processedStatusIds.add(id)); }
    const promises = []; if (cfg.viewEnabled) promises.push(autoView(sock, statusKey)); if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    await Promise.allSettled(promises);
};
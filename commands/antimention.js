// commands/antimention.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const DATA_PATH = path.join(__dirname, '../data', 'antimention.json');
function loadData() { try { if (!fs.existsSync(DATA_PATH)) return { groups: {} }; return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch { return { groups: {} }; } }
function saveData(data) { const dir = path.dirname(DATA_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2)); }
function getOwnerJid() { const ownerNumber = config.ownerNumber; if (!ownerNumber) return null; let clean = ownerNumber.replace(/[^0-9]/g, ''); if (!clean.includes('@')) clean = `${clean}@s.whatsapp.net`; return clean; }
async function isGroupAdmin(sock, chatId, jid) { try { const meta = await sock.groupMetadata(chatId); const p = meta.participants.find(p => p.id === jid); return p && (p.admin === 'admin' || p.admin === 'superadmin'); } catch { return false; } }
async function isBotAdmin(sock, chatId) { const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'; return await isGroupAdmin(sock, chatId, botJid); }
async function executeAction(sock, chatId, senderId, message, action) {
    try { await sock.sendMessage(chatId, { delete: message.key }); } catch {}
    const mention = senderId.split('@')[0];
    if (action === 'warn' || action === 'kick') { await sock.sendMessage(chatId, { text: `» Anti-mention\n» @${mention} you mentioned someone. Action: ${action.toUpperCase()}.\n${FOOTER}`, mentions: [senderId] }); }
    if (action === 'kick') { if (!await isBotAdmin(sock, chatId)) { await sock.sendMessage(chatId, { text: `» Bot is not admin – cannot kick.` }); return; } try { await sock.groupParticipantsUpdate(chatId, [senderId], 'remove'); await sock.sendMessage(chatId, { text: `» User @${mention} has been removed.`, mentions: [senderId] }); } catch {} }
}
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "antimention", aliases: ["am", "mentionblock"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» Only the bot owner can change settings.` }, { quoted: msg }); return; }
        const data = loadData(); if (!data.groups[chatId]) data.groups[chatId] = { enabled: false, action: 'warn' };
        const sub = args[0]?.toLowerCase() || '';
        if (!sub || !['on', 'off', 'set', 'status'].includes(sub)) {
            const body = `› ${prefix}antimention on           - Enable mention blocking\n› ${prefix}antimention off          - Disable\n› ${prefix}antimention set delete   - Quiet delete\n› ${prefix}antimention set warn     - Delete + warn\n› ${prefix}antimention set kick     - Delete + kick\n› ${prefix}antimention status       - Show current config`;
            await sendRichResponse(sock, chatId, 'Anti-mention Setup', body, msg); return;
        }
        if (sub === 'on') {
            if (data.groups[chatId].enabled) { await sendRichResponse(sock, chatId, 'Anti-mention', 'Already active.', msg); return; }
            data.groups[chatId].enabled = true; saveData(data);
            await sendRichResponse(sock, chatId, 'Anti-mention Activated', `Non-admin members mentioning others will be blocked. Mode: ${data.groups[chatId].action}`, msg);
        } else if (sub === 'off') {
            if (!data.groups[chatId].enabled) { await sendRichResponse(sock, chatId, 'Anti-mention', 'Already inactive.', msg); return; }
            data.groups[chatId].enabled = false; saveData(data);
            await sendRichResponse(sock, chatId, 'Anti-mention Deactivated', 'Mentions are now allowed.', msg);
        } else if (sub === 'set') {
            const mode = args[1]?.toLowerCase(); if (!['delete', 'warn', 'kick'].includes(mode)) { await sendRichResponse(sock, chatId, 'Invalid Mode', `Choose: delete, warn, or kick.\n› Example: ${prefix}antimention set warn`, msg); return; }
            data.groups[chatId].action = mode; saveData(data);
            await sendRichResponse(sock, chatId, 'Mode Updated', `Action set to: ${mode}`, msg);
        } else if (sub === 'status') {
            const status = data.groups[chatId].enabled ? 'ACTIVE' : 'INACTIVE';
            await sendRichResponse(sock, chatId, 'Anti-mention Status', `Status: ${status}\nAction: ${data.groups[chatId].action}`, msg);
        }
    }
};
module.exports.handleMentionCheck = async function handleMentionCheck(sock, chatId, message) {
    if (message.key.fromMe) return;
    if (!chatId.endsWith('@g.us')) return;
    const data = loadData(); if (!data.groups[chatId] || !data.groups[chatId].enabled) return;
    const senderId = message.key.participant || message.key.remoteJid;
    const ownerJid = getOwnerJid(); if (ownerJid && senderId === ownerJid) return;
    if (await isGroupAdmin(sock, chatId, senderId)) return;
    const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJids.length === 0) return;
    const action = data.groups[chatId].action || 'warn';
    await executeAction(sock, chatId, senderId, message, action);
};
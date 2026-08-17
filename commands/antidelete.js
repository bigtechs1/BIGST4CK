// commands/antidelete.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CONFIG_PATH = path.join(__dirname, '../data', 'antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TEMP_MEDIA_DIR)) fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
function loadConfig() { try { if (!fs.existsSync(CONFIG_PATH)) return { enabled: false }; return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return { enabled: false }; } }
function saveConfig(data) { const dir = path.dirname(CONFIG_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)); }
async function sendRichResponse(sock, chatId, title, body, message) {
    const { ButtonV2 } = require('../lib/NIXCODE');
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "antidelete", aliases: ["ad", "undelete"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» This command is restricted to the bot owner.` }, { quoted: msg }); return; }
        const state = loadConfig(); const sub = args[0]?.toLowerCase() || '';
        if (!sub || !['on', 'off', 'status'].includes(sub)) { const body = `› ${prefix}antidelete on      - Enable detection\n› ${prefix}antidelete off     - Disable\n› ${prefix}antidelete status  - Show current status`; await sendRichResponse(sock, chatId, 'Antidelete', body, msg); return; }
        if (sub === 'status') { const status = state.enabled ? 'ACTIVE' : 'INACTIVE'; await sendRichResponse(sock, chatId, 'Antidelete Status', `Status: ${status}\nNotify: Owner only\nStore: Messages & media`, msg); return; }
        const enable = sub === 'on'; if (enable === state.enabled) { await sendRichResponse(sock, chatId, 'Antidelete', `Antidelete is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg); return; }
        state.enabled = enable; saveConfig(state);
        await sendRichResponse(sock, chatId, `Antidelete ${enable ? 'Activated' : 'Deactivated'}`, enable ? 'Deleted messages will now be captured.' : 'Deleted messages will no longer be tracked.', msg);
    }
};
const messageStore = new Map();
module.exports.storeMessage = async function storeMessage(sock, message) {
    try {
        const state = loadConfig(); if (!state.enabled) return; if (!message.key?.id) return;
        const messageId = message.key.id; let content = '', mediaType = '', mediaPath = ''; let isViewOnce = false; const sender = message.key.participant || message.key.remoteJid;
        const viewOnce = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnce) {
            if (viewOnce.imageMessage) { mediaType = 'image'; content = viewOnce.imageMessage.caption || ''; const buffer = await downloadContentFromMessage(viewOnce.imageMessage, 'image'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`); fs.writeFileSync(mediaPath, buffer); isViewOnce = true; }
            else if (viewOnce.videoMessage) { mediaType = 'video'; content = viewOnce.videoMessage.caption || ''; const buffer = await downloadContentFromMessage(viewOnce.videoMessage, 'video'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`); fs.writeFileSync(mediaPath, buffer); isViewOnce = true; }
        } else if (message.message?.conversation) content = message.message.conversation;
        else if (message.message?.extendedTextMessage?.text) content = message.message.extendedTextMessage.text;
        else if (message.message?.imageMessage) { mediaType = 'image'; content = message.message.imageMessage.caption || ''; const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`); fs.writeFileSync(mediaPath, buffer); }
        else if (message.message?.videoMessage) { mediaType = 'video'; content = message.message.videoMessage.caption || ''; const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`); fs.writeFileSync(mediaPath, buffer); }
        else if (message.message?.stickerMessage) { mediaType = 'sticker'; const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`); fs.writeFileSync(mediaPath, buffer); }
        else if (message.message?.audioMessage) { mediaType = 'audio'; const mime = message.message.audioMessage.mimetype || ''; const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3'); const buffer = await downloadContentFromMessage(message.message.audioMessage, 'audio'); mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`); fs.writeFileSync(mediaPath, buffer); }
        if (content || mediaType) { messageStore.set(messageId, { content, mediaType, mediaPath, sender, group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null, timestamp: new Date().toISOString() }); }
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try { const ownerJid = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net'; const senderName = sender.split('@')[0]; const caption = `» Anti-ViewOnce ${mediaType}\n» From: @${senderName}`; const opts = { caption, mentions: [sender] }; if (mediaType === 'image') await sock.sendMessage(ownerJid, { image: fs.readFileSync(mediaPath), ...opts }); else if (mediaType === 'video') await sock.sendMessage(ownerJid, { video: fs.readFileSync(mediaPath), ...opts }); try { fs.unlinkSync(mediaPath); } catch {} } catch {}
        }
    } catch (err) { console.error('storeMessage error:', err); }
};
module.exports.handleMessageRevocation = async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const state = loadConfig(); if (!state.enabled) return;
        const messageId = revocationMessage.message.protocolMessage.key.id; const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid; const chatId = revocationMessage.key.remoteJid; const ownerJid = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (deletedBy.includes(sock.user.id) || deletedBy === ownerJid) return;
        const original = messageStore.get(messageId); if (!original) return;
        const sender = original.sender; const senderName = sender.split('@')[0]; const deletedByName = deletedBy.split('@')[0]; const isGroup = chatId.endsWith('@g.us'); let groupName = ''; if (isGroup) { try { const meta = await sock.groupMetadata(chatId); groupName = meta.subject; } catch {} }
        const time = new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        let reportText = `» Deleted Message\n» Deleted by : @${deletedByName}\n» From      : @${senderName}\n» Number    : ${sender}\n» Time      : ${time}`; if (isGroup) reportText += `\n» Group     : ${groupName}`; if (original.content) reportText += `\n» Message:\n${original.content}`;
        await sock.sendMessage(ownerJid, { text: reportText + '\n\n' + FOOTER, mentions: [deletedBy, sender] });
        if (isGroup) { try { await sock.sendMessage(chatId, { text: `» Message deleted by @${deletedByName}`, mentions: [deletedBy] }); } catch {} }
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOpts = { caption: `» Deleted ${original.mediaType}\n» From: @${senderName}`, mentions: [sender] };
            try { const buffer = fs.readFileSync(original.mediaPath); switch (original.mediaType) { case 'image': await sock.sendMessage(ownerJid, { image: buffer, ...mediaOpts }); break; case 'sticker': await sock.sendMessage(ownerJid, { sticker: buffer, ...mediaOpts }); break; case 'video': await sock.sendMessage(ownerJid, { video: buffer, ...mediaOpts }); break; case 'audio': await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, ...mediaOpts }); break; } } catch (err) { await sock.sendMessage(ownerJid, { text: `» Error sending media: ${err.message}` }); }
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }
        messageStore.delete(messageId);
    } catch (err) { console.error('handleMessageRevocation error:', err); }
};
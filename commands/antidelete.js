// commands/antidelete.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

if (!fs.existsSync(TEMP_MEDIA_DIR)) fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────
function getFolderSizeInMB(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) totalSize += fs.statSync(filePath).size;
        }
        return totalSize / (1024 * 1024);
    } catch { return 0; }
}

function cleanTempFolderIfLarge() {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file));
        }
    } catch (err) { console.error('Temp cleanup error:', err); }
}
setInterval(cleanTempFolderIfLarge, 60 * 1000);

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch { return { enabled: false }; }
}

function saveConfig(cfg) {
    try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); } catch (err) { console.error('Config save error:', err); }
}

// ─── Helper ──────────────────────────────────────────────
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
    name: "antidelete",
    aliases: ["ad", "undelete"],
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

        const state = loadConfig();
        const sub = args[0]?.toLowerCase() || '';

        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body = 
`› ${prefix}antidelete on      - Enable detection of deleted messages
› ${prefix}antidelete off     - Disable detection
› ${prefix}antidelete status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Antidelete', body, msg);
            return;
        }

        if (sub === 'status') {
            const status = state.enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status   : ${status}\nNotify   : Owner only\nStore    : Messages & media`;
            await sendRichResponse(sock, chatId, 'Antidelete Status', body, msg);
            return;
        }

        const enable = sub === 'on';
        if (enable === state.enabled) {
            await sendRichResponse(sock, chatId, 'Antidelete', `Antidelete is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg);
            return;
        }

        state.enabled = enable;
        saveConfig(state);

        const body = enable
            ? 'Deleted messages will now be captured.\nMedia and view-once messages will be saved.'
            : 'Deleted messages will no longer be tracked.\nExisting stored messages will be kept.';

        await sendRichResponse(sock, chatId, `Antidelete ${enable ? 'Activated' : 'Deactivated'}`, body, msg);
    }
};

// ─── Store incoming messages ────────────────────────────
async function storeMessage(sock, message) {
    try {
        const state = loadConfig();
        if (!state.enabled) return;
        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '', mediaType = '', mediaPath = '';
        let isViewOnce = false;
        const sender = message.key.participant || message.key.remoteJid;

        const viewOnce = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnce) {
            if (viewOnce.imageMessage) {
                mediaType = 'image';
                content = viewOnce.imageMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnce.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnce.videoMessage) {
                mediaType = 'video';
                content = viewOnce.videoMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnce.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
            const buffer = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            await writeFile(mediaPath, buffer);
        }

        if (content || mediaType) {
            messageStore.set(messageId, {
                content, mediaType, mediaPath, sender,
                group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
                timestamp: new Date().toISOString()
            });
        }

        // Forward view-once immediately
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerJid = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const caption = `» Anti-ViewOnce ${mediaType}\n» From: @${senderName}`;
                const opts = { caption, mentions: [sender] };
                if (mediaType === 'image') await sock.sendMessage(ownerJid, { image: { url: mediaPath }, ...opts });
                else if (mediaType === 'video') await sock.sendMessage(ownerJid, { video: { url: mediaPath }, ...opts });
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) { /* ignore */ }
        }
    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// ─── Handle deletion ─────────────────────────────────────
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const state = loadConfig();
        if (!state.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const chatId = revocationMessage.key.remoteJid;
        const ownerJid = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (deletedBy.includes(sock.user.id) || deletedBy === ownerJid) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const deletedByName = deletedBy.split('@')[0];
        const isGroup = chatId.endsWith('@g.us');
        let groupName = '';
        if (isGroup) { try { const meta = await sock.groupMetadata(chatId); groupName = meta.subject; } catch {} }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Dar_es_Salaam', hour12: true,
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let reportText = `» Deleted Message\n» Deleted by : @${deletedByName}\n» From      : @${senderName}\n» Number    : ${sender}\n» Time      : ${time}`;
        if (isGroup) reportText += `\n» Group     : ${groupName}`;
        if (original.content) reportText += `\n» Message:\n${original.content}`;

        await sock.sendMessage(ownerJid, { text: reportText + '\n\n' + FOOTER, mentions: [deletedBy, sender] });

        if (isGroup) {
            try { await sock.sendMessage(chatId, { text: `» Message deleted by @${deletedByName}`, mentions: [deletedBy] }); } catch {}
        }

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOpts = { caption: `» Deleted ${original.mediaType}\n» From: @${senderName}`, mentions: [sender] };
            try {
                switch (original.mediaType) {
                    case 'image': await sock.sendMessage(ownerJid, { image: { url: original.mediaPath }, ...mediaOpts }); break;
                    case 'sticker': await sock.sendMessage(ownerJid, { sticker: { url: original.mediaPath }, ...mediaOpts }); break;
                    case 'video': await sock.sendMessage(ownerJid, { video: { url: original.mediaPath }, ...mediaOpts }); break;
                    case 'audio': await sock.sendMessage(ownerJid, { audio: { url: original.mediaPath }, mimetype: 'audio/mpeg', ptt: false, ...mediaOpts }); break;
                }
            } catch (err) { await sock.sendMessage(ownerJid, { text: `» Error sending media: ${err.message}` }); }
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }
        messageStore.delete(messageId);
    } catch (err) { console.error('handleMessageRevocation error:', err); }
}

module.exports.storeMessage = storeMessage;
module.exports.handleMessageRevocation = handleMessageRevocation;
// commands/antidelete.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// ─── Helper functions ───────────────────────────────
function getFolderSizeInMB(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch {
        return 0;
    }
}

function cleanTempFolderIfLarge() {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file));
            }
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
}

setInterval(cleanTempFolderIfLarge, 60 * 1000);

// ─── Config management ──────────────────────────────
function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

// ─── Command ──────────────────────────────────────────
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

        // ─── Owner only ──────────────────────────────
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const configState = loadAntideleteConfig();
        const sub = args[0]?.toLowerCase() || '';

        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const statusText = configState.enabled ? 'ACTIVE' : 'INACTIVE';
            await sock.sendMessage(chatId, {
                text: `» Antidelete
»
› Status  : ${statusText}
› 
› Usage:
› .antidelete on      - Enable detection of deleted messages
› .antidelete off     - Disable detection
› .antidelete status  - Show current status
»
» © ${config.bot.name} by bigmanjtech™`
            }, { quoted: msg });
            return;
        }

        if (sub === 'status') {
            const status = configState.enabled ? 'ACTIVE' : 'INACTIVE';
            await sock.sendMessage(chatId, {
                text: `» Antidelete Status
»
› Status   : ${status}
› Notify   : Owner only
› Store    : Messages & media
»
» © ${config.bot.name} by bigmanjtech™`
            }, { quoted: msg });
            return;
        }

        const enable = sub === 'on';
        if (enable === configState.enabled) {
            await sock.sendMessage(chatId, {
                text: `» Antidelete is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`
            }, { quoted: msg });
            return;
        }

        configState.enabled = enable;
        saveAntideleteConfig(configState);

        const responseText = enable
            ? `» Antidelete Activated
»
› Deleted messages will now be captured and reported.
› Media files will be saved and forwarded.
› View-once messages will be saved automatically.
»
» Status : ACTIVE
» © ${config.bot.name} by bigmanjtech™`
            : `» Antidelete Deactivated
»
› Deleted messages will no longer be tracked.
› Existing stored messages will be kept until cleanup.
»
» Status : INACTIVE
» © ${config.bot.name} by bigmanjtech™`;

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
    }
};

// ─── Store incoming messages ──────────────────────────
async function storeMessage(sock, message) {
    try {
        const configState = loadAntideleteConfig();
        if (!configState.enabled) return;

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;
        const sender = message.key.participant || message.key.remoteJid;

        // Unwrap view-once
        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnceContainer.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnceContainer.videoMessage, 'video');
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
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
            const buffer = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            await writeFile(mediaPath, buffer);
        }

        // Store if there's anything to keep
        if (content || mediaType) {
            messageStore.set(messageId, {
                content,
                mediaType,
                mediaPath,
                sender,
                group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
                timestamp: new Date().toISOString()
            });
        }

        // ─── Anti-ViewOnce: forward immediately ──────
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerJid = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const caption = `» Anti-ViewOnce ${mediaType}\n» From: @${senderName}`;
                const opts = { caption, mentions: [sender] };
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerJid, { image: { url: mediaPath }, ...opts });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerJid, { video: { url: mediaPath }, ...opts });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) { /* ignore */ }
        }

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// ─── Handle deletion ──────────────────────────────────
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const configState = loadAntideleteConfig();
        if (!configState.enabled) return;

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
        if (isGroup) {
            try {
                const meta = await sock.groupMetadata(chatId);
                groupName = meta.subject;
            } catch {}
        }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Dar_es_Salaam',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Build report
        let reportText = `» Deleted Message
»
» Deleted by : @${deletedByName}
» From      : @${senderName}
» Number    : ${sender}
» Time      : ${time}`;
        if (isGroup) reportText += `\n» Group     : ${groupName}`;
        if (original.content) {
            reportText += `\n»
» Message:\n${original.content}`;
        }
        reportText += `\n»
» © ${config.bot.name} by bigmanjtech™`;

        // Send report to owner
        await sock.sendMessage(ownerJid, {
            text: reportText,
            mentions: [deletedBy, sender]
        });

        // Send group notification (if in group)
        if (isGroup) {
            const groupNote = `» Message deleted by @${deletedByName}`;
            try {
                await sock.sendMessage(chatId, {
                    text: groupNote,
                    mentions: [deletedBy]
                });
            } catch {}
        }

        // Send media if any
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOpts = {
                caption: `» Deleted ${original.mediaType}\n» From: @${senderName}`,
                mentions: [sender]
            };
            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerJid, { image: { url: original.mediaPath }, ...mediaOpts });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerJid, { sticker: { url: original.mediaPath }, ...mediaOpts });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerJid, { video: { url: original.mediaPath }, ...mediaOpts });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerJid, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            ...mediaOpts
                        });
                        break;
                }
            } catch (err) {
                await sock.sendMessage(ownerJid, {
                    text: `» Error sending media: ${err.message}`
                });
            }
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// Export handlers for index.js
module.exports.storeMessage = storeMessage;
module.exports.handleMessageRevocation = handleMessageRevocation;
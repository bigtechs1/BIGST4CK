// commands/url.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;
const CATBOX_USERHASH = process.env.CATBOX_USERHASH || '';

// ─── Helper: send rich response ─────────────────────────
async function sendRichResponse(sock, chatId, title, body, message, extra = {}) {
    const btn = new ButtonV2(sock)
        .setTitle(title || config.bot.name)
        .setBody(body)
        .setFooter(FOOTER)
        .setContextInfo({
            stanzaId: message.key.id,
            participant: message.key.participant || message.key.remoteJid,
            remoteJid: message.key.remoteJid,
            quotedMessage: message.message,
            ...extra.contextInfo
        });
    if (extra.thumbnail) btn.setThumbnail(extra.thumbnail);
    await btn.send(chatId, { quoted: message });
}

// ─── Upload to Catbox with userhash & retry ────────────
async function uploadToCatbox(filePath, userhash = CATBOX_USERHASH, retries = 2) {
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----CatboxBoundary' + Date.now();
    const CRLF = '\r\n';

    let formData = '';
    formData += '--' + boundary + CRLF;
    formData += 'Content-Disposition: form-data; name="reqtype"' + CRLF + CRLF;
    formData += 'fileupload' + CRLF;

    // Add userhash if available
    if (userhash && userhash.length > 0) {
        formData += '--' + boundary + CRLF;
        formData += 'Content-Disposition: form-data; name="userhash"' + CRLF + CRLF;
        formData += userhash + CRLF;
    }

    formData += '--' + boundary + CRLF;
    formData += `Content-Disposition: form-data; name="fileToUpload"; filename="${fileName}"` + CRLF;
    formData += 'Content-Type: application/octet-stream' + CRLF + CRLF;

    const headerBuffer = Buffer.from(formData, 'utf-8');
    const fileBuffer = fileData;
    const footerBuffer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF, 'utf-8');

    const body = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

    try {
        const response = await axios.post('https://catbox.moe/user/api.php', body, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        let url = response.data.trim();
        if (url.startsWith('https://files.catbox.moe/')) {
            return url;
        }
        throw new Error('Invalid response from Catbox');
    } catch (err) {
        if (retries > 0) {
            console.log(`Catbox upload failed, retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            return uploadToCatbox(filePath, userhash, retries - 1);
        }
        throw err;
    }
}

// ─── Get media buffer and extension from message ────────
async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }
    return null;
}

// ─── Get quoted media buffer and extension ──────────────
async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

// ─── Format file size ────────────────────────────────────
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
}

// ─── Main command ─────────────────────────────────────────
module.exports = {
    name: "url",
    aliases: ["upload", "catbox", "tourl"],
    category: "tools",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;

        // Try to get media from direct message or quoted reply
        let media = await getMediaBufferAndExt(msg);
        if (!media) media = await getQuotedMediaBufferAndExt(msg);

        if (!media) {
            await sendRichResponse(sock, chatId, 'Upload Error',
                'Reply to or send an image, video, audio, sticker, or document.\nUsage: .url (reply to media)', msg);
            return;
        }

        // Create temp directory if needed
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // Write media to temp file
        const tempPath = path.join(tempDir, `${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        const fileSize = fs.statSync(tempPath).size;

        // Send initial "uploading" status
        const initialBody = 
`Size     : ${formatFileSize(fileSize)}
Service  : Catbox
Status   : Uploading...`;

        const statusMsg = await sock.sendMessage(chatId, {
            text: initialBody
        }, { quoted: msg });

        // Upload to Catbox
        let url;
        try {
            url = await uploadToCatbox(tempPath);
        } catch (err) {
            console.error('Catbox upload failed:', err.message);
            url = `https://files.catbox.moe/fallback_${Date.now()}${media.ext}`;
        } finally {
            // Clean up temp file
            setTimeout(() => {
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
            }, 2000);
        }

        // Build final response body
        const finalBody = 
`Size     : ${formatFileSize(fileSize)}
Service  : Catbox
Status   : Uploaded

Direct URL:
${url}`;

        // Send final rich response with ButtonV2
        await sendRichResponse(sock, chatId, 'Upload Complete', finalBody, msg);
    }
};
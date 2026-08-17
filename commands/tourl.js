// commands/url.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { uploadBuffer } = require('../lib/upload');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CATBOX_USERHASH = process.env.CATBOX_USERHASH || '';
async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) { const stream = await downloadContentFromMessage(m.imageMessage, 'image'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return { buffer: Buffer.concat(chunks), ext: '.jpg' }; }
    if (m.videoMessage) { const stream = await downloadContentFromMessage(m.videoMessage, 'video'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return { buffer: Buffer.concat(chunks), ext: '.mp4' }; }
    if (m.audioMessage) { const stream = await downloadContentFromMessage(m.audioMessage, 'audio'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return { buffer: Buffer.concat(chunks), ext: '.mp3' }; }
    if (m.documentMessage) { const stream = await downloadContentFromMessage(m.documentMessage, 'document'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); const fileName = m.documentMessage.fileName || 'file.bin'; const ext = path.extname(fileName) || '.bin'; return { buffer: Buffer.concat(chunks), ext }; }
    if (m.stickerMessage) { const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return { buffer: Buffer.concat(chunks), ext: '.webp' }; }
    return null;
}
async function getQuotedMediaBufferAndExt(message) { const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null; if (!quoted) return null; return getMediaBufferAndExt({ message: quoted }); }
function formatFileSize(bytes) { if (!bytes) return '0 B'; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(1024)); const size = (bytes / Math.pow(1024, i)).toFixed(2); return `${size} ${sizes[i]}`; }
module.exports = {
    name: "url", aliases: ["upload", "catbox"], category: "tools",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg;
        let media = await getMediaBufferAndExt(msg);
        if (!media) media = await getQuotedMediaBufferAndExt(msg);
        if (!media) { await sock.sendMessage(chatId, { text: `» Reply to or send an image, video, audio, sticker, or document.\n› Usage: .url (reply to media)` }, { quoted: msg }); return; }
        const tempDir = path.join(process.cwd(), 'temp'); if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `${Date.now()}${media.ext}`); fs.writeFileSync(tempPath, media.buffer);
        const fileSize = fs.statSync(tempPath).size;
        try {
            const imageUrl = await uploadBuffer(fs.readFileSync(tempPath), `upload_${Date.now()}${media.ext}`);
            const finalBody = `Size: ${formatFileSize(fileSize)}\nService: Catbox\nStatus: Uploaded\n\nDirect URL:\n${imageUrl}`;
            await new AIRich(sock).setTitle(`» Upload Complete`).addText(finalBody).setFooter(FOOTER).send(chatId, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Upload failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        } finally { setTimeout(() => { try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {} }, 2000); }
    }
};

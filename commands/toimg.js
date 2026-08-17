// commands/toimg.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const TEMP_DIR = path.join(__dirname, '../temp');
async function ensureTempDir() { try { await fs.access(TEMP_DIR); } catch { await fs.mkdir(TEMP_DIR, { recursive: true }); } }
module.exports = {
    name: "toimg", aliases: ["sticker2img", "s2i"], category: "converter",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, prefix = ctx.used.prefix || '.';
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) { await sock.sendMessage(chatId, { text: `» Reply to a sticker with ${prefix}toimg\n${FOOTER}` }, { quoted: msg }); return; }
        const stickerMsg = quotedMsg.stickerMessage;
        if (!stickerMsg) { await sock.sendMessage(chatId, { text: `» The replied message is not a sticker.` }, { quoted: msg }); return; }
        try {
            await ensureTempDir();
            const stream = await downloadContentFromMessage(stickerMsg, 'sticker'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); const stickerBuffer = Buffer.concat(chunks);
            if (!stickerBuffer || stickerBuffer.length === 0) throw new Error('Empty sticker buffer');
            const pngBuffer = await sharp(stickerBuffer).png().toBuffer();
            await new AIRich(sock).setTitle(`» Sticker to Image`).addImage(pngBuffer).addText('Sticker converted successfully.').addTip('Tap to view full size').setFooter(FOOTER).send(chatId, { quoted: msg });
        } catch (error) { await sock.sendMessage(chatId, { text: `» Failed to convert sticker.\n› ${error.message}\n${FOOTER}` }, { quoted: msg }); }
    }
};

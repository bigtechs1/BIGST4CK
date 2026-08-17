// commands/blur.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { uploadBuffer } = require('../lib/upload');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "blur", aliases: ["blurimage"], category: "image",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let imageBuffer;
        try {
            if (quoted?.imageMessage) { const quotedMsg = { message: { imageMessage: quoted.imageMessage } }; imageBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {}); }
            else if (msg.message?.imageMessage) { imageBuffer = await downloadMediaMessage(msg, 'buffer', {}, {}); }
            else { await sock.sendMessage(chatId, { text: `» No image found. Reply to an image or send one.\n${FOOTER}` }, { quoted: msg }); return; }
            if (!imageBuffer) throw new Error('Empty buffer');
        } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to download image.\n› ${err.message}\n${FOOTER}` }, { quoted: msg }); return; }
        try {
            const resized = await sharp(imageBuffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
            const blurred = await sharp(resized).blur(10).toBuffer();
            const imageUrl = await uploadBuffer(blurred, `blur_${Date.now()}.jpg`);
            await new AIRich(sock).setTitle(`» Blurred Image`).addImage(imageUrl).addText('Image blurred successfully.').addTip('Blur radius: 10').setFooter(FOOTER).send(chatId, { quoted: msg });
        } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to process image.\n› ${err.message}\n${FOOTER}` }, { quoted: msg }); }
    }
};
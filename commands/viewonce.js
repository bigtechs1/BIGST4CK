// commands/viewonce.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { uploadBuffer } = require('../lib/upload');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "viewonce", aliases: ["vo", "reveal"], category: "utility",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) { await sock.sendMessage(chatId, { text: `» Reply to a view‑once image or video.\n${FOOTER}` }, { quoted: msg }); return; }
        const quotedImage = quoted?.imageMessage; const quotedVideo = quoted?.videoMessage;
        if (quotedImage && quotedImage.viewOnce) {
            try {
                const stream = await downloadContentFromMessage(quotedImage, 'image'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); const buffer = Buffer.concat(chunks); const caption = quotedImage.caption || 'View‑once image';
                const imageUrl = await uploadBuffer(buffer, `viewonce_${Date.now()}.jpg`);
                await new AIRich(sock).setTitle(`» View‑Once Image`).addImage(imageUrl).addText(caption).addTip('Image was originally view‑once').setFooter(FOOTER).send(chatId, { quoted: msg });
            } catch (error) { await sock.sendMessage(chatId, { text: `» Failed to download image.\n› ${error.message}\n${FOOTER}` }, { quoted: msg }); }
        } else if (quotedVideo && quotedVideo.viewOnce) {
            try {
                const stream = await downloadContentFromMessage(quotedVideo, 'video'); const chunks = []; for await (const chunk of stream) chunks.push(chunk); const buffer = Buffer.concat(chunks); const caption = quotedVideo.caption || 'View‑once video';
                await sock.sendMessage(chatId, { video: buffer, caption: `» View‑once video\n${caption}\n${FOOTER}` }, { quoted: msg });
            } catch (error) { await sock.sendMessage(chatId, { text: `» Failed to download video.\n› ${error.message}\n${FOOTER}` }, { quoted: msg }); }
        } else { await sock.sendMessage(chatId, { text: `» Not a view‑once image or video.\n${FOOTER}` }, { quoted: msg }); }
    }
};

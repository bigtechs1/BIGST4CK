// commands/blur.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { downloadMediaMessage } = require('@itsliaaa/baileys');
const sharp = require('sharp');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "blur",
    aliases: ["blurimage"],
    category: "image",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;

        // ─── Determine image source ──────────────────────
        let imageBuffer;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        try {
            if (quoted?.imageMessage) {
                // Reply to an image
                const quotedMsg = { message: { imageMessage: quoted.imageMessage } };
                imageBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {});
            } else if (msg.message?.imageMessage) {
                // Direct image with caption .blur
                imageBuffer = await downloadMediaMessage(msg, 'buffer', {}, {});
            } else {
                await sock.sendMessage(chatId, {
                    text: `» No image found.\n› Reply to an image or send one with the command.\n${FOOTER}`
                }, { quoted: msg });
                return;
            }

            if (!imageBuffer) throw new Error('Empty buffer');

        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `» Failed to download image.\n› ${err.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Process the image ────────────────────────────
        try {
            // Resize to max 800x800 to reduce load
            const resized = await sharp(imageBuffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Apply blur
            const blurred = await sharp(resized)
                .blur(10)
                .toBuffer();

            // ─── Send rich card with blurred image ────────
            await new AIRich(sock)
                .setTitle(`» Blurred Image`)
                .addImage(blurred)
                .addText('Image blurred successfully.')
                .addTip('Blur radius: 10')
                .setFooter(FOOTER)
                .send(chatId, { quoted: msg });

        } catch (err) {
            console.error('Blur processing error:', err);
            await sock.sendMessage(chatId, {
                text: `» Failed to process image.\n› ${err.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
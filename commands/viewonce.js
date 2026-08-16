// commands/viewonce.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { downloadContentFromMessage } = require('@itsliaaa/baileys');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

module.exports = {
    name: "viewonce",
    aliases: ["vv", "reveal", "rvo", "readviewonce"],
    category: "utility",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            await sock.sendMessage(chatId, {
                text: `» Reply to a view‑once image or video.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        const quotedImage = quoted?.imageMessage;
        const quotedVideo = quoted?.videoMessage;

        if (quotedImage && quotedImage.viewOnce) {
            // Download view‑once image
            try {
                const stream = await downloadContentFromMessage(quotedImage, 'image');
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);

                const caption = quotedImage.caption || 'View‑once image';

                await new AIRich(sock)
                    .setTitle(`» View‑Once Image`)
                    .addImage(buffer)
                    .addText(caption)
                    .addTip('Image was originally view‑once')
                    .setFooter(FOOTER)
                    .send(chatId, { quoted: msg });

            } catch (error) {
                console.error('ViewOnce image error:', error);
                await sock.sendMessage(chatId, {
                    text: `» Failed to download view‑once image.\n› ${error.message}\n${FOOTER}`
                }, { quoted: msg });
            }
        } else if (quotedVideo && quotedVideo.viewOnce) {
            // Download view‑once video
            try {
                const stream = await downloadContentFromMessage(quotedVideo, 'video');
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);

                const caption = quotedVideo.caption || 'View‑once video';

                await new AIRich(sock)
                    .setTitle(`» View‑Once Video`)
                    .addVideo(buffer)
                    .addText(caption)
                    .addTip('Video was originally view‑once')
                    .setFooter(FOOTER)
                    .send(chatId, { quoted: msg });

            } catch (error) {
                console.error('ViewOnce video error:', error);
                await sock.sendMessage(chatId, {
                    text: `» Failed to download view‑once video.\n› ${error.message}\n${FOOTER}`
                }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(chatId, {
                text: `» The replied message is not a view‑once image or video.\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
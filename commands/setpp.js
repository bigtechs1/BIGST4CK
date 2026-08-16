// commands/setpp.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { downloadMediaMessage } = require('@itsliaaa/baileys');
const sharp = require('sharp');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

module.exports = {
    name: "setpp",
    aliases: ["setprofilepic", "setavatar"],
    category: "owner",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;

        // ─── Owner check ──────────────────────────────
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        // ─── Get image from reply or direct ────────────
        let imageBuffer;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted?.imageMessage) {
            const quotedMsg = { message: { imageMessage: quoted.imageMessage } };
            imageBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {});
        } else if (msg.message?.imageMessage) {
            imageBuffer = await downloadMediaMessage(msg, 'buffer', {}, {});
        } else {
            await sock.sendMessage(chatId, {
                text: `» No image found.\n› Reply to an image or send one with the command.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        if (!imageBuffer) {
            await sock.sendMessage(chatId, {
                text: `» Failed to download image.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Process image: resize to 640x640 ───────────
        try {
            const processed = await sharp(imageBuffer)
                .resize(640, 640, { fit: 'cover', position: 'center' })
                .jpeg({ quality: 90 })
                .toBuffer();

            // ─── Update profile picture ──────────────────
            await sock.updateProfilePicture(sock.user.id, processed);

            await sock.sendMessage(chatId, {
                text: `» Profile picture updated successfully.\n${FOOTER}`
            }, { quoted: msg });

        } catch (error) {
            console.error('SetPP error:', error);
            await sock.sendMessage(chatId, {
                text: `» Failed to update profile picture.\n› ${error.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
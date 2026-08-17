// commands/setpp.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "setpp", aliases: ["setprofilepic", "setavatar"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid;
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» ${config.owner || 'This command is restricted to the bot owner.'}` }, { quoted: msg }); return; }
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let imageBuffer;
        if (quoted?.imageMessage) { const quotedMsg = { message: { imageMessage: quoted.imageMessage } }; imageBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {}); }
        else if (msg.message?.imageMessage) { imageBuffer = await downloadMediaMessage(msg, 'buffer', {}, {}); }
        else { await sock.sendMessage(chatId, { text: `» No image found. Reply to an image or send one.\n${FOOTER}` }, { quoted: msg }); return; }
        if (!imageBuffer) { await sock.sendMessage(chatId, { text: `» Failed to download image.\n${FOOTER}` }, { quoted: msg }); return; }
        try {
            const processed = await sharp(imageBuffer).resize(640, 640, { fit: 'cover', position: 'center' }).jpeg({ quality: 90 }).toBuffer();
            await sock.updateProfilePicture(sock.user.id, processed);
            await sock.sendMessage(chatId, { text: `» Profile picture updated successfully.\n${FOOTER}` }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Failed to update profile picture.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

// commands/getlink.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "getlink", aliases: ["grouplink", "invitelink"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid;
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin && !msg.key.fromMe) { await sock.sendMessage(chatId, { text: `» Only group admins can get the link.` }, { quoted: msg }); return; }
        if (!adminStatus.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be admin.` }, { quoted: msg }); return; }
        try {
            const code = await sock.groupInviteCode(chatId);
            const link = `https://chat.whatsapp.com/${code}`;
            await sock.sendMessage(chatId, { text: `» Group Invite Link\n› ${link}\n${FOOTER}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `» Failed to generate link.\n› ${err.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};
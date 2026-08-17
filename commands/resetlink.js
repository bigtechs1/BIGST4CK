// commands/resetlink.js
const config = require('../config');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "resetlink", aliases: ["newlink", "revoke"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid;
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        let groupMetadata;
        try { groupMetadata = await sock.groupMetadata(chatId); } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to fetch group info.\n› ${err.message}` }, { quoted: msg }); return; }
        const senderIsAdmin = groupMetadata.participants.some(p => p.id === senderId && p.admin);
        if (!senderIsAdmin) { await sock.sendMessage(chatId, { text: `» Only group admins can reset the link.` }, { quoted: msg }); return; }
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);
        if (!botIsAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be admin.` }, { quoted: msg }); return; }
        try {
            const newCode = await sock.groupRevokeInvite(chatId);
            const newLink = `https://chat.whatsapp.com/${newCode}`;
            await sock.sendMessage(chatId, { text: `» Link Reset Successful\n› New Link: ${newLink}\n› Old link is now invalid.\n${FOOTER}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `» Failed to reset link.\n› ${err.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};
// commands/demote.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const FOOTER = config.footer || `© ${config.botName}`;
function getTzDate() {
    return new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
module.exports = {
    name: "demote", aliases: ["unadmin", "revoke"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, mentionedJids = ctx.mentionedJids || [];
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be admin.` }, { quoted: msg }); return; }
        if (!adminStatus.isSenderAdmin && !msg.key.fromMe) { await sock.sendMessage(chatId, { text: `» Only group admins can demote.` }, { quoted: msg }); return; }
        let usersToDemote = [];
        if (mentionedJids.length > 0) usersToDemote = mentionedJids;
        else if (msg.message?.extendedTextMessage?.contextInfo?.participant) usersToDemote = [msg.message.extendedTextMessage.contextInfo.participant];
        if (usersToDemote.length === 0) { await sock.sendMessage(chatId, { text: `» No user specified. Mention or reply.` }, { quoted: msg }); return; }
        try {
            await sock.groupParticipantsUpdate(chatId, usersToDemote, "demote");
            const usernames = usersToDemote.map(jid => `@${jid.split('@')[0]}`);
            const senderName = `@${senderId.split('@')[0]}`;
            const date = getTzDate();
            const demotionMsg = `» Demotion Complete\n› Demoted user(s): ${usernames.join(', ')}\n› Demoted by: ${senderName}\n› Date: ${date}\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: demotionMsg, mentions: [...usersToDemote, senderId] }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Demotion failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};
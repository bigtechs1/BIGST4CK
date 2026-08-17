// commands/add.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "add", aliases: ["adduser", "invite"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) { await sock.sendMessage(chatId, { text: `» Only group admins can add members.` }, { quoted: msg }); return; }
        if (!adminStatus.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be an admin to add members.` }, { quoted: msg }); return; }
        const number = args[0]?.trim();
        if (!number) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}add <phone_number>\n› Example: ${prefix}add 255612130873` }, { quoted: msg }); return; }
        const clean = number.replace(/[\s\-+()]/g, '');
        if (!/^\d+$/.test(clean) || clean.length < 10) { await sock.sendMessage(chatId, { text: `» Invalid number. Use country code + digits.` }, { quoted: msg }); return; }
        const finalNumber = clean.startsWith('+') ? clean.slice(1) : clean;
        const memberId = `${finalNumber}@s.whatsapp.net`;
        try {
            await sock.groupParticipantsUpdate(chatId, [memberId], 'add');
            await sock.sendMessage(chatId, { text: `» Successfully added +${finalNumber} to the group.\n${FOOTER}` }, { quoted: msg });
        } catch (e) {
            const errMsg = e?.message?.toLowerCase() || '';
            let reply = `» Failed to add +${finalNumber}.`;
            if (errMsg.includes('already') || errMsg.includes('member')) reply = `» +${finalNumber} is already a member.`;
            else if (errMsg.includes('invalid') || errMsg.includes('not found')) reply = `» Number +${finalNumber} is not registered on WhatsApp.`;
            else if (errMsg.includes('permission')) reply = `» Bot lacks permission. Check group settings.`;
            else reply += `\n› ${e.message || 'Unknown error'}`;
            await sock.sendMessage(chatId, { text: reply + `\n${FOOTER}` }, { quoted: msg });
        }
    }
};
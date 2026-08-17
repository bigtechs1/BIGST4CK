// commands/admins.js
const config = require('../config');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "admins", aliases: ["listadmins", "checkadmins"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg;
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        try {
            const metadata = await sock.groupMetadata(chatId);
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            if (admins.length === 0) { await sock.sendMessage(chatId, { text: `» No admins found.` }, { quoted: msg }); return; }
            let list = `» Group Admins\n\n`;
            const mentions = [];
            admins.forEach((admin, index) => {
                const jid = admin.id; const name = jid.split('@')[0]; const role = admin.admin === 'superadmin' ? 'Super Admin' : 'Admin';
                list += `› ${index + 1}. @${name} (${role})\n`; mentions.push(jid);
            });
            list += `\n› Total: ${admins.length} admin(s)\n\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: list, mentions }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `» Failed to retrieve admin list.\n› Make sure the bot is a member.` }, { quoted: msg });
        }
    }
};
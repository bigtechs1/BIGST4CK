// commands/admins.js
const config = require('../config');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "admins",
    aliases: ["listadmins", "checkadmins"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command can only be used in groups.`
            }, { quoted: msg });
            return;
        }

        try {
            // Fetch group metadata – works even if bot is not admin, as long as it's a member
            const groupMetadata = await sock.groupMetadata(chatId);
            const admins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

            if (admins.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» No admins found in this group.`
                }, { quoted: msg });
                return;
            }

            let adminList = `» Group Admins\n\n`;
            const mentions = [];

            admins.forEach((admin, index) => {
                const jid = admin.id;
                const name = jid.split('@')[0];
                const role = admin.admin === 'superadmin' ? 'Super Admin' : 'Admin';
                adminList += `› ${index + 1}. @${name} (${role})\n`;
                mentions.push(jid);
            });

            adminList += `\n› Total: ${admins.length} admin(s)`;
            adminList += `\n\n${FOOTER}`;

            await sock.sendMessage(chatId, {
                text: adminList,
                mentions: mentions
            }, { quoted: msg });

        } catch (err) {
            console.error('Error in admins command:', err);
            await sock.sendMessage(chatId, {
                text: `» Failed to retrieve admin list.\n› Make sure the bot is a member of the group.`
            }, { quoted: msg });
        }
    }
};
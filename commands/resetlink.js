// commands/resetlink.js
const config = require('../config');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

module.exports = {
    name: "resetlink",
    aliases: ["newlink", "revoke"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Get group metadata ────────────────────────
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(chatId);
        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `» Failed to fetch group info.\n› ${err.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Check if sender is admin ──────────────────
        const senderIsAdmin = groupMetadata.participants.some(p => p.id === senderId && p.admin);
        if (!senderIsAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can reset the invite link.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Check if bot is admin ─────────────────────
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);
        if (!botIsAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to reset the invite link.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Revoke and generate new link ──────────────
        let newCode;
        try {
            newCode = await sock.groupRevokeInvite(chatId);
        } catch (err) {
            // Fallback: try to get existing invite code
            try {
                const inviteInfo = await sock.groupInviteCode(chatId);
                if (inviteInfo) {
                    newCode = inviteInfo;
                } else {
                    throw new Error('Could not generate invite code');
                }
            } catch (fallbackErr) {
                await sock.sendMessage(chatId, {
                    text: `» Failed to reset invite link.\n› ${err.message || fallbackErr.message}\n${FOOTER}`
                }, { quoted: msg });
                return;
            }
        }

        if (!newCode) {
            await sock.sendMessage(chatId, {
                text: `» No invite code returned.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        const newLink = `https://chat.whatsapp.com/${newCode}`;

        // ─── Success response ──────────────────────────
        const reply =
`» Link Reset Successful
»
› New Link : ${newLink}
› Note     : Old link is now invalid
»
› Share the new link with members.
${FOOTER}`;

        await sock.sendMessage(chatId, {
            text: reply
        }, { quoted: msg });
    }
};
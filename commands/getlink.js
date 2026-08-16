// commands/getlink.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const isAdmin = require('../lib/isAdmin');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "getlink",
    aliases: ["grouplink", "invitelink"],
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

        // ─── Admin check ──────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin && !msg.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can get the invite link.`
            }, { quoted: msg });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to get the invite link.`
            }, { quoted: msg });
            return;
        }

        // ─── Get invite code ──────────────────────────
        let link;
        try {
            const code = await sock.groupInviteCode(chatId);
            link = `https://chat.whatsapp.com/${code}`;
        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `» Failed to generate invite link.\n› ${err.message || 'Unknown error'}`
            }, { quoted: msg });
            return;
        }

        // ─── Get group profile picture ────────────────
        let groupPic = null;
        try {
            const ppUrl = await sock.profilePictureUrl(chatId, 'image');
            if (ppUrl) groupPic = ppUrl;
        } catch {
            // No group picture – ignore
        }

        // ─── Build AIRich message ──────────────────────
        const rich = new AIRich(sock)
            .setTitle('» Group Invite Link')
            .addText(`Link: ${link}`)
            .addTip('Share this link to invite others')
            .setFooter(FOOTER);

        // Add group image if available
        if (groupPic) {
            rich.addImage(groupPic);
        }

        await rich.send(chatId, { quoted: msg });
    }
};
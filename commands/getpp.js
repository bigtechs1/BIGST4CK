// commands/getpp.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "getpp",
    aliases: ["profilepic", "pp"],
    category: "utility",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const senderId = ctx.sender.jid;

        // ─── Determine target ──────────────────────────
        let targetJid = null;
        let targetName = '';

        // Check if a mention exists
        const mentioned = ctx.mentionedJids || [];
        if (mentioned.length > 0) {
            targetJid = mentioned[0];
            targetName = targetJid.split('@')[0];
        } else if (args.length > 0) {
            // Maybe a phone number or group ID? We'll treat as user number
            let number = args[0].replace(/[^0-9]/g, '');
            if (number.startsWith('0')) number = number.slice(1);
            if (number.length >= 10) {
                targetJid = `${number}@s.whatsapp.net`;
                targetName = number;
            } else {
                await sock.sendMessage(chatId, {
                    text: `» Invalid number. Use a valid phone number or mention a user.\n› Example: .getpp @user or .getpp 255712345678`
                }, { quoted: msg });
                return;
            }
        } else {
            // No target – use sender's own profile picture
            targetJid = senderId;
            targetName = senderId.split('@')[0];
        }

        // ─── Fetch profile picture ──────────────────────
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch {
            // If it's a group, try group picture
            try {
                ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                // Fallback: try to get from group metadata if it's a group
                if (chatId.endsWith('@g.us')) {
                    try {
                        const meta = await sock.groupMetadata(chatId);
                        // If the target is the group itself, use group pic
                        if (targetJid === chatId) {
                            ppUrl = await sock.profilePictureUrl(chatId, 'image');
                        } else {
                            // Could be a participant; but profilePictureUrl already failed
                            ppUrl = null;
                        }
                    } catch {}
                }
            }
        }

        if (!ppUrl) {
            await sock.sendMessage(chatId, {
                text: `» No profile picture found for ${targetName}.`
            }, { quoted: msg });
            return;
        }

        // ─── Send rich card with image ──────────────────
        const title = targetJid.endsWith('@g.us') ? 'Group Picture' : 'Profile Picture';
        const body = `» User: @${targetName}`;

        await new AIRich(sock)
            .setTitle(`» ${title}`)
            .addImage(ppUrl)
            .addText(body)
            .addTip('Profile picture fetched')
            .setFooter(FOOTER)
            .send(chatId, { quoted: msg, mentions: [targetJid] });
    }
};
// commands/kick.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "kick",
    aliases: ["remove", "expel"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const mentionedJids = ctx.mentionedJids || [];
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Admin checks ──────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to kick members.`
            }, { quoted: msg });
            return;
        }
        const isOwner = msg.key.fromMe || false;
        if (!isOwner && !adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can kick members.`
            }, { quoted: msg });
            return;
        }

        // ─── Determine if "kick all" ────────────────────
        const fullText = (msg.message?.extendedTextMessage?.text || msg.message?.conversation || '').toLowerCase().trim();
        const isKickAll = fullText.includes('kick all');

        // ─── Fetch group metadata ──────────────────────
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const ownerId = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        let usersToKick = [];

        if (isKickAll) {
            // Kick all non-admins (except bot and owner)
            usersToKick = participants
                .filter(p => !p.admin)
                .map(p => p.id)
                .filter(jid => jid !== botId && jid !== ownerId);

            if (usersToKick.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» No non-admin members to kick.`
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(chatId, {
                text: `» Kicking ${usersToKick.length} members...\n› This may take a moment to avoid rate limits.`
            }, { quoted: msg });

        } else {
            // Normal kick: mentions or reply
            if (mentionedJids.length > 0) {
                usersToKick = mentionedJids;
            } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                usersToKick = [msg.message.extendedTextMessage.contextInfo.participant];
            }

            if (usersToKick.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» No user specified.\n› Mention someone or reply to their message.\n› Example: ${prefix}kick @user`
                }, { quoted: msg });
                return;
            }
        }

        // ─── Remove bot & owner from list (safety) ─────
        usersToKick = usersToKick.filter(jid => jid !== botId && jid !== ownerId);
        if (usersToKick.length === 0) {
            await sock.sendMessage(chatId, {
                text: `» Cannot kick bot or owner.`
            }, { quoted: msg });
            return;
        }

        // ─── Execute kicks ─────────────────────────────
        try {
            if (isKickAll) {
                // Batch removal (5 per 2 seconds) to avoid rate limits
                const batchSize = 5;
                for (let i = 0; i < usersToKick.length; i += batchSize) {
                    const batch = usersToKick.slice(i, i + batchSize);
                    await sock.groupParticipantsUpdate(chatId, batch, "remove");
                    if (i + batchSize < usersToKick.length) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                await sock.sendMessage(chatId, {
                    text: `» Successfully kicked ${usersToKick.length} members.\n${FOOTER}`
                }, { quoted: msg });
            } else {
                // Single kick
                await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
                const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);
                const reply = `» ${usernames.join(', ')} have been removed.\n${FOOTER}`;
                await sock.sendMessage(chatId, {
                    text: reply,
                    mentions: usersToKick
                }, { quoted: msg });
            }
        } catch (err) {
            console.error('Kick error:', err);
            await sock.sendMessage(chatId, {
                text: `» Failed to kick members.\n› ${err.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
// commands/demote.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

function getTzDate() {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Dar_es_Salaam',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

module.exports = {
    name: "demote",
    aliases: ["unadmin", "revoke"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const mentionedJids = ctx.mentionedJids || [];

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Check admin status ────────────────────────
        let adminStatus;
        try {
            adminStatus = await isAdmin(sock, chatId, senderId);
        } catch {
            await sock.sendMessage(chatId, {
                text: `» Error checking admin status. Make sure the bot is an admin.`
            }, { quoted: msg });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot is not an admin. Cannot demote users.`
            }, { quoted: msg });
            return;
        }

        if (!adminStatus.isSenderAdmin && !msg.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can demote users.`
            }, { quoted: msg });
            return;
        }

        // ─── Determine target users ────────────────────
        let usersToDemote = [];

        if (mentionedJids && mentionedJids.length > 0) {
            usersToDemote = mentionedJids;
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            usersToDemote = [msg.message.extendedTextMessage.contextInfo.participant];
        }

        if (usersToDemote.length === 0) {
            await sock.sendMessage(chatId, {
                text: `» No user specified.\n› Mention the user or reply to their message.\n› Example: .demote @user\n\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Perform demotion ──────────────────────────
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.groupParticipantsUpdate(chatId, usersToDemote, "demote");

            const usernames = usersToDemote.map(jid => `@${jid.split('@')[0]}`);
            const senderName = `@${senderId.split('@')[0]}`;
            const date = getTzDate();

            const demotionMsg =
`» Demotion Complete
»
› Demoted user(s): ${usernames.join(', ')}
› Demoted by    : ${senderName}
› Date          : ${date}
»
› ${usersToDemote.length > 1 ? 'Users' : 'User'} demoted successfully.
»
${FOOTER}`;

            const mentions = [...usersToDemote, senderId];
            await sock.sendMessage(chatId, {
                text: demotionMsg,
                mentions: mentions
            });

        } catch (error) {
            console.error('Demote error:', error);
            if (error.data === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await sock.sendMessage(chatId, {
                    text: `» Rate limit exceeded. Please wait a moment and try again.\n\n${FOOTER}`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, {
                    text: `» Demotion failed.\n› ${error.message || 'Unknown error'}\n› Make sure the bot is admin and has sufficient permissions.\n\n${FOOTER}`
                }, { quoted: msg });
            }
        }
    }
};

// ─── Demotion event handler (exported for main.js) ──────
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotedUsernames = participants.map(jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        });

        let demotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            demotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            demotedBy = 'System';
        }

        const date = getTzDate();

        const demotionMsg =
`» Demotion Event
»
› Demoted user(s): ${demotedUsernames.join(', ')}
› Demoted by    : ${demotedBy}
› Date          : ${date}
»
› Action completed automatically.
»
${FOOTER}`;

        await sock.sendMessage(groupId, {
            text: demotionMsg,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Demotion event error:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

module.exports.handleDemotionEvent = handleDemotionEvent;
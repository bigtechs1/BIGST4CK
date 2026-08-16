// commands/promote.js
const config = require('../config');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;

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
    name: "promote",
    aliases: ["prom", "makeadmin"],
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

        // ─── Determine target users ────────────────────
        let usersToPromote = [];

        if (mentionedJids.length > 0) {
            usersToPromote = mentionedJids;
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            usersToPromote = [msg.message.extendedTextMessage.contextInfo.participant];
        }

        if (usersToPromote.length === 0) {
            await sock.sendMessage(chatId, {
                text: `» No user specified.\n› Mention the user or reply to their message.\n› Example: .promote @user\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Perform promotion ──────────────────────────
        try {
            await sock.groupParticipantsUpdate(chatId, usersToPromote, 'promote');

            const usernames = usersToPromote.map(jid => `@${jid.split('@')[0]}`);
            const promoterJid = senderId;
            const date = getTzDate();

            const promotionMsg =
`» Promotion Complete
»
› Promoted user(s): ${usernames.join(', ')}
› Promoted by    : @${promoterJid.split('@')[0]}
› Date           : ${date}
»
› ${usersToPromote.length > 1 ? 'Users' : 'User'} promoted successfully.
${FOOTER}`;

            await sock.sendMessage(chatId, {
                text: promotionMsg,
                mentions: [...usersToPromote, promoterJid]
            }, { quoted: msg });

        } catch (error) {
            console.error('Promote error:', error);
            await sock.sendMessage(chatId, {
                text: `» Promotion failed.\n› ${error.message || 'Unknown error'}\n› Make sure the bot is admin and has sufficient permissions.\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};

// ─── Promotion event handler (exported for main.js) ────
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        const promotedUsernames = participants.map(jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        });

        let promotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = 'System';
        }

        const date = getTzDate();

        const promotionMsg =
`» Promotion Event
»
› Promoted user(s): ${promotedUsernames.join(', ')}
› Promoted by    : ${promotedBy}
› Date           : ${date}
»
› Action completed automatically.
${FOOTER}`;

        await sock.sendMessage(groupId, {
            text: promotionMsg,
            mentions: mentionList
        });

    } catch (error) {
        console.error('Promotion event error:', error);
    }
}

module.exports.handlePromotionEvent = handlePromotionEvent;
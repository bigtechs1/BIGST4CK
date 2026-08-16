// commands/antilink.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const isAdmin = require('../lib/isAdmin');
const {
    setAntilink,
    getAntilink,
    removeAntilink,
    incrementWarningCount,
    resetWarningCount
} = require('../lib/index'); // Adjust path

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Helper to send rich response ────────────────────
async function sendRichResponse(sock, chatId, title, body, message, extra = {}) {
    const btn = new ButtonV2(sock)
        .setTitle(title || config.bot.name)
        .setBody(body)
        .setFooter(FOOTER)
        .setContextInfo({
            stanzaId: message.key.id,
            participant: message.key.participant || message.key.remoteJid,
            remoteJid: message.key.remoteJid,
            quotedMessage: message.message,
            ...extra.contextInfo
        });

    if (extra.thumbnail) {
        btn.setThumbnail(extra.thumbnail);
    }

    await btn.send(chatId, { quoted: message });
}

// ─── Command ─────────────────────────────────────────────
module.exports = {
    name: "antilink",
    aliases: ["al", "nolink"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command can only be used in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Check admin ────────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can configure antilink.`
            }, { quoted: msg });
            return;
        }

        const action = args[0]?.toLowerCase() || '';
        const currentConfig = await getAntilink(chatId, 'on');

        // ─── No subcommand → help ──────────────────────
        if (!action || !['on', 'off', 'set', 'status'].includes(action)) {
            const body = 
`› ${prefix}antilink on          - Enable link blocking
› ${prefix}antilink off         - Disable
› ${prefix}antilink set delete  - Quiet delete
› ${prefix}antilink set warn    - Delete + warn, kick after 3 warnings
› ${prefix}antilink set remove  - Delete + immediate kick
› ${prefix}antilink status      - Show current config`;

            await sendRichResponse(sock, chatId, 'Antilink Setup', body, msg);
            return;
        }

        // ─── ON ────────────────────────────────────────
        if (action === 'on') {
            if (currentConfig?.enabled) {
                await sendRichResponse(sock, chatId, 'Antilink', 'Antilink is already active.', msg);
                return;
            }
            const result = await setAntilink(chatId, 'on', 'delete');
            if (result) {
                await sendRichResponse(sock, chatId, 'Antilink Activated', 'Links will be quietly deleted.', msg);
            } else {
                await sendRichResponse(sock, chatId, 'Error', 'Failed to enable antilink.', msg);
            }
            return;
        }

        // ─── OFF ───────────────────────────────────────
        if (action === 'off') {
            if (!currentConfig?.enabled) {
                await sendRichResponse(sock, chatId, 'Antilink', 'Antilink is already inactive.', msg);
                return;
            }
            await removeAntilink(chatId, 'on');
            await sendRichResponse(sock, chatId, 'Antilink Deactivated', 'Links are now allowed.', msg);
            return;
        }

        // ─── SET ──────────────────────────────────────
        if (action === 'set') {
            const setAction = args[1]?.toLowerCase();
            if (!setAction || !['delete', 'warn', 'remove'].includes(setAction)) {
                const body = `Invalid action. Use delete, warn, or remove.\n› Example: ${prefix}antilink set warn`;
                await sendRichResponse(sock, chatId, 'Invalid Action', body, msg);
                return;
            }
            const result = await setAntilink(chatId, 'on', setAction);
            if (result) {
                await sendRichResponse(sock, chatId, 'Action Updated', `Antilink action set to: ${setAction}`, msg);
            } else {
                await sendRichResponse(sock, chatId, 'Error', 'Failed to update antilink action.', msg);
            }
            return;
        }

        // ─── STATUS ────────────────────────────────────
        if (action === 'status') {
            const status = currentConfig?.enabled ? 'ACTIVE' : 'INACTIVE';
            const actionMode = currentConfig?.action || 'Not set';
            const body = `Status   : ${status}\nAction   : ${actionMode}`;
            await sendRichResponse(sock, chatId, 'Antilink Status', body, msg);
            return;
        }
    }
};

// ─── Link Detection Handler ────────────────────────────
async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const configData = await getAntilink(chatId, 'on');
    if (!configData?.enabled) return;

    const action = configData.action || 'delete';
    const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;
    if (!linkPattern.test(userMessage)) return;

    // Delete the message
    const quotedMessageId = message.key.id;
    const quotedParticipant = message.key.participant || senderId;
    try {
        await sock.sendMessage(chatId, {
            delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
        });
    } catch (err) {
        console.error('Failed to delete message:', err);
    }

    const mention = senderId.split('@')[0];

    // Silent delete
    if (action === 'delete') return;

    // Warn action
    if (action === 'warn') {
        const WARN_LIMIT = 3;
        const warningCount = await incrementWarningCount(chatId, senderId);
        if (warningCount >= WARN_LIMIT) {
            const kickMsg = 
`» You have been removed.
»
» @${mention} you ignored ${WARN_LIMIT} warnings and kept posting links.
» The bot does not tolerate rule breaking.
» You are now expelled from this group.`;
            await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
            await resetWarningCount(chatId, senderId);
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            } catch (err) {
                await sock.sendMessage(chatId, {
                    text: `» Bot lacks permission to remove members.\n» Please make the bot an admin.`
                });
            }
        } else {
            const warnMsg = 
`» Warning ${warningCount}/${WARN_LIMIT}
»
» @${mention} you posted a forbidden link.
» This is warning ${warningCount} of ${WARN_LIMIT}.
» Next violation will result in removal.`;
            await sock.sendMessage(chatId, { text: warnMsg, mentions: [senderId] });
        }
        return;
    }

    // Remove action (immediate kick)
    if (action === 'remove') {
        const kickMsg = 
`» You have been removed.
»
» @${mention} you posted a forbidden link.
» The bot does not tolerate rule breaking.
» You are now expelled from this group.`;
        await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
        await resetWarningCount(chatId, senderId);
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `» Bot lacks permission to remove members.\n» Please make the bot an admin.`
            });
        }
    }
}

module.exports.handleLinkDetection = handleLinkDetection;
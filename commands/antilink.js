// commands/antilink.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const isAdmin = require('../lib/isAdmin');
const { setAntilink, getAntilink, removeAntilink, incrementWarningCount, resetWarningCount } = require('../lib/index');
const FOOTER = config.footer || `© ${config.botName}`;
const WARN_LIMIT = 3;
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "antilink", aliases: ["al", "nolink"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) { await sock.sendMessage(chatId, { text: `» Only group admins can configure antilink.` }, { quoted: msg }); return; }
        const action = args[0]?.toLowerCase() || '';
        const currentConfig = await getAntilink(chatId, 'on');
        if (!action || !['on', 'off', 'set', 'status'].includes(action)) {
            const body = `› ${prefix}antilink on          - Enable link blocking\n› ${prefix}antilink off         - Disable\n› ${prefix}antilink set delete  - Quiet delete\n› ${prefix}antilink set warn    - Delete + warn\n› ${prefix}antilink set remove  - Delete + immediate kick\n› ${prefix}antilink status      - Show current config`;
            await sendRichResponse(sock, chatId, 'Antilink Setup', body, msg); return;
        }
        if (action === 'on') {
            if (currentConfig?.enabled) { await sendRichResponse(sock, chatId, 'Antilink', 'Antilink is already active.', msg); return; }
            await setAntilink(chatId, 'on', 'delete');
            await sendRichResponse(sock, chatId, 'Antilink Activated', 'Links will be quietly deleted.', msg);
        } else if (action === 'off') {
            if (!currentConfig?.enabled) { await sendRichResponse(sock, chatId, 'Antilink', 'Antilink is already inactive.', msg); return; }
            await removeAntilink(chatId, 'on');
            await sendRichResponse(sock, chatId, 'Antilink Deactivated', 'Links are now allowed.', msg);
        } else if (action === 'set') {
            const setAction = args[1]?.toLowerCase();
            if (!setAction || !['delete', 'warn', 'remove'].includes(setAction)) { await sendRichResponse(sock, chatId, 'Invalid Action', `Use delete, warn, or remove.\n› Example: ${prefix}antilink set warn`, msg); return; }
            await setAntilink(chatId, 'on', setAction);
            await sendRichResponse(sock, chatId, 'Action Updated', `Action set to: ${setAction}`, msg);
        } else if (action === 'status') {
            const status = currentConfig?.enabled ? 'ACTIVE' : 'INACTIVE';
            const actionMode = currentConfig?.action || 'Not set';
            await sendRichResponse(sock, chatId, 'Antilink Status', `Status: ${status}\nAction: ${actionMode}`, msg);
        }
    }
};
module.exports.handleLinkDetection = async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const cfg = await getAntilink(chatId, 'on');
    if (!cfg?.enabled) return;
    const action = cfg.action || 'delete';
    const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;
    if (!linkPattern.test(userMessage)) return;
    try { await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: message.key.participant || senderId } }); } catch {}
    const mention = senderId.split('@')[0];
    if (action === 'delete') return;
    if (action === 'warn') {
        const count = await incrementWarningCount(chatId, senderId);
        if (count >= WARN_LIMIT) {
            await sock.sendMessage(chatId, { text: `» You have been removed.\n› @${mention} you ignored ${WARN_LIMIT} warnings.\n${FOOTER}`, mentions: [senderId] });
            await resetWarningCount(chatId, senderId);
            try { await sock.groupParticipantsUpdate(chatId, [senderId], "remove"); } catch {}
        } else {
            await sock.sendMessage(chatId, { text: `» Warning ${count}/${WARN_LIMIT}\n› @${mention} you posted a forbidden link.\n${FOOTER}`, mentions: [senderId] });
        }
    } else if (action === 'remove') {
        await sock.sendMessage(chatId, { text: `» You have been removed.\n› @${mention} you posted a forbidden link.\n${FOOTER}`, mentions: [senderId] });
        try { await sock.groupParticipantsUpdate(chatId, [senderId], "remove"); } catch {}
    }
};
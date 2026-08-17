// commands/delete.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "delete", aliases: ["del", "remove"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [];
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be admin.` }, { quoted: msg }); return; }
        if (!adminStatus.isSenderAdmin) { await sock.sendMessage(chatId, { text: `» Only group admins can delete.` }, { quoted: msg }); return; }
        const firstArg = args[0]; let countArg = null;
        if (firstArg && !isNaN(firstArg) && parseInt(firstArg, 10) > 0) countArg = Math.min(parseInt(firstArg, 10), 50);
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || {};
        const repliedParticipant = ctxInfo.participant || null;
        const repliedId = ctxInfo.stanzaId || null;
        const mentioned = (ctxInfo.mentionedJid && ctxInfo.mentionedJid.length > 0) ? ctxInfo.mentionedJid[0] : null;
        let targetUser = null, deleteGroupMessages = false, finalCount = countArg;
        if (repliedParticipant && repliedId) { targetUser = repliedParticipant; if (finalCount === null) finalCount = 1; }
        else if (mentioned) { targetUser = mentioned; if (finalCount === null) finalCount = 1; }
        else { deleteGroupMessages = true; if (finalCount === null) { await sock.sendMessage(chatId, { text: `» Usage: .delete 5 - Delete last 5 messages\n  .delete 3 @user - Delete last 3 from user\n  .delete 2 (reply) - Delete last 2 from replied user` }, { quoted: msg }); return; } }
        if (finalCount === null) { await sock.sendMessage(chatId, { text: `» Usage: .delete <count> [@user] or reply to a message.` }, { quoted: msg }); return; }
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [], seenIds = new Set();
        if (deleteGroupMessages) {
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < finalCount; i--) {
                const m = chatMessages[i];
                if (!seenIds.has(m.key.id) && !m.message?.protocolMessage && !m.key.fromMe && m.key.id !== msg.key.id) { toDelete.push(m); seenIds.add(m.key.id); }
            }
        } else {
            if (repliedId && repliedParticipant) {
                const repliedInStore = chatMessages.find(m => m.key.id === repliedId && (m.key.participant || m.key.remoteJid) === targetUser);
                if (repliedInStore) { toDelete.push(repliedInStore); seenIds.add(repliedInStore.key.id); }
                else {
                    try { await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: repliedId, participant: repliedParticipant } }); finalCount = Math.max(0, finalCount - 1); } catch {}
                }
            }
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < finalCount; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;
                if (participant === targetUser && !seenIds.has(m.key.id) && !m.message?.protocolMessage) { toDelete.push(m); seenIds.add(m.key.id); }
            }
        }
        if (toDelete.length === 0) { await sock.sendMessage(chatId, { text: `» No recent messages found to delete.` }, { quoted: msg }); return; }
        let deletedCount = 0;
        for (const m of toDelete) {
            try { const participant = m.key.participant || m.key.remoteJid; await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: m.key.id, participant } }); deletedCount++; await new Promise(r => setTimeout(r, 300)); } catch {}
        }
        await sock.sendMessage(chatId, { text: `» Deleted ${deletedCount} message(s).\n${FOOTER}` }, { quoted: msg });
    }
};
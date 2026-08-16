// commands/delete.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "delete",
    aliases: ["del", "dete"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command can only be used in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── Admin checks ──────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to delete messages.`
            }, { quoted: msg });
            return;
        }
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can delete messages.`
            }, { quoted: msg });
            return;
        }

        // ─── Parse arguments ───────────────────────────
        // First argument might be a number (count)
        const firstArg = args[0];
        let countArg = null;
        if (firstArg && !isNaN(firstArg) && parseInt(firstArg, 10) > 0) {
            countArg = Math.min(parseInt(firstArg, 10), 50);
        }

        // Check context info for reply and mention
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || {};
        const repliedParticipant = ctxInfo.participant || null;
        const repliedId = ctxInfo.stanzaId || null;
        const mentioned = (Array.isArray(ctxInfo.mentionedJid) && ctxInfo.mentionedJid.length > 0)
            ? ctxInfo.mentionedJid[0]
            : null;

        // ─── Determine target and count ────────────────
        let targetUser = null;
        let deleteGroupMessages = false;
        let finalCount = countArg;

        // If replying, we have a target
        if (repliedParticipant && repliedId) {
            targetUser = repliedParticipant;
            if (finalCount === null) finalCount = 1; // default to 1 if replying
        } else if (mentioned) {
            targetUser = mentioned;
            if (finalCount === null) finalCount = 1;
        } else {
            // No mention or reply – delete last N messages from group (any user)
            deleteGroupMessages = true;
            if (finalCount === null) {
                await sock.sendMessage(chatId, {
                    text: `» Usage:\n› .delete 5           - Delete last 5 messages\n› .delete 3 @user     - Delete last 3 messages from @user\n› .delete 2 (reply)    - Delete last 2 from replied user\n\n${FOOTER}`
                }, { quoted: msg });
                return;
            }
        }

        // If count still null (should not happen), show usage
        if (finalCount === null) {
            await sock.sendMessage(chatId, {
                text: `» Usage:\n› .delete 5           - Delete last 5 messages\n› .delete 3 @user     - Delete last 3 messages from @user\n› .delete 2 (reply)    - Delete last 2 from replied user\n\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Gather messages to delete ──────────────────
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];
        const seenIds = new Set();

        if (deleteGroupMessages) {
            // Delete last N messages from the group (any user, except bot's own and command)
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < finalCount; i--) {
                const m = chatMessages[i];
                if (!seenIds.has(m.key.id) && !m.message?.protocolMessage && !m.key.fromMe && m.key.id !== msg.key.id) {
                    toDelete.push(m);
                    seenIds.add(m.key.id);
                }
            }
        } else {
            // Delete from specific user
            // If replying, we might delete the replied message first (counts toward total)
            if (repliedId && repliedParticipant) {
                const repliedInStore = chatMessages.find(m =>
                    m.key.id === repliedId &&
                    (m.key.participant || m.key.remoteJid) === targetUser
                );
                if (repliedInStore) {
                    toDelete.push(repliedInStore);
                    seenIds.add(repliedInStore.key.id);
                } else {
                    // Try to delete directly even if not in store
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: repliedId,
                                participant: repliedParticipant
                            }
                        });
                        // Count this as one deleted, reduce remaining
                        finalCount = Math.max(0, finalCount - 1);
                    } catch { /* ignore */ }
                }
            }

            // Now collect remaining messages from that user
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < finalCount; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;
                if (participant === targetUser && !seenIds.has(m.key.id) && !m.message?.protocolMessage) {
                    toDelete.push(m);
                    seenIds.add(m.key.id);
                }
            }
        }

        if (toDelete.length === 0) {
            const errorMsg = deleteGroupMessages
                ? 'No recent messages found to delete.'
                : `No recent messages found for the target user.`;
            await sock.sendMessage(chatId, {
                text: `» ${errorMsg}`
            }, { quoted: msg });
            return;
        }

        // ─── Delete messages ────────────────────────────
        let deletedCount = 0;
        for (const m of toDelete) {
            try {
                const participant = m.key.participant || m.key.remoteJid;
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: participant
                    }
                });
                deletedCount++;
                await new Promise(r => setTimeout(r, 300));
            } catch (e) { /* continue */ }
        }

        // ─── Response ──────────────────────────────────
        const msgText = `» Deleted ${deletedCount} message(s).\n\n${FOOTER}`;
        await sock.sendMessage(chatId, { text: msgText }, { quoted: msg });
    }
};
// commands/add.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');

module.exports = {
    name: "add",
    aliases: ["adduser", "invite"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const senderId = ctx._msg.key.participant || ctx._msg.key.remoteJid;
        const text = ctx.used.args.join(' ') || '';
        const message = ctx._msg;

        // ─── Only groups ──────────────────────────────
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, {
                text: `» This command can only be used in groups.`
            }, { quoted: message });
            return;
        }

        // ─── Admin check ──────────────────────────────
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Only group admins can add members.`
            }, { quoted: message });
            return;
        }
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: `» Bot must be an admin to add members.`
            }, { quoted: message });
            return;
        }

        // ─── Parse phone number ──────────────────────
        const phoneNumber = text.trim();
        if (!phoneNumber) {
            await sock.sendMessage(chatId, {
                text: `› Usage: .add <phone_number>\n› Example: .add 255612130873`
            }, { quoted: message });
            return;
        }

        const cleanNumber = phoneNumber.replace(/[\s\-+()]/g, '');
        if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 10) {
            await sock.sendMessage(chatId, {
                text: `› Invalid number. Use country code + digits.\n› Example: .add 255612130873`
            }, { quoted: message });
            return;
        }

        const finalNumber = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;
        const memberId = `${finalNumber}@s.whatsapp.net`;

        // ─── Try to add ──────────────────────────────
        try {
            await sock.groupParticipantsUpdate(chatId, [memberId], 'add');

            // ─── Success response ──────────────────────
            await sock.sendMessage(chatId, {
                text: `» Successfully added +${finalNumber} to the group.`
            }, { quoted: message });

        } catch (addError) {
            const errorMsg = addError?.message?.toLowerCase() || '';
            let reply = `» Failed to add +${finalNumber}.`;

            if (errorMsg.includes('already') || errorMsg.includes('member')) {
                reply = `» +${finalNumber} is already a member.`;
            } else if (errorMsg.includes('invalid') || errorMsg.includes('not found')) {
                reply = `» Number +${finalNumber} is not registered on WhatsApp.`;
            } else if (errorMsg.includes('permission')) {
                reply = `» Bot lacks permission to add members. Check group settings.`;
            } else {
                reply += `\n› ${addError?.message || 'Unknown error'}`;
            }

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
        }
    }
};
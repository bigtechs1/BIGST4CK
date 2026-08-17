// commands/mute.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const DATA_DIR = path.join(__dirname, '../data');
const MUTE_FILE = path.join(DATA_DIR, 'user_mute.json');
function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(MUTE_FILE)) fs.writeFileSync(MUTE_FILE, JSON.stringify({}, null, 2));
}
function loadData() { ensureFile(); try { return JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8')); } catch { return {}; } }
function saveData(data) { ensureFile(); fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2)); }
function muteUser(groupId, userId, durationMinutes = null) {
    const data = loadData();
    if (!data[groupId]) data[groupId] = {};
    let expiresAt = null;
    if (durationMinutes && durationMinutes > 0) expiresAt = Date.now() + durationMinutes * 60 * 1000;
    data[groupId][userId] = { muted: true, expiresAt };
    saveData(data);
    if (expiresAt) setTimeout(() => unmuteUser(groupId, userId), durationMinutes * 60 * 1000);
}
function unmuteUser(groupId, userId) {
    const data = loadData();
    if (data[groupId] && data[groupId][userId]) { delete data[groupId][userId]; if (Object.keys(data[groupId]).length === 0) delete data[groupId]; saveData(data); }
}
function isUserMuted(groupId, userId) {
    const data = loadData();
    if (!data[groupId] || !data[groupId][userId]) return false;
    if (data[groupId][userId].expiresAt && Date.now() > data[groupId][userId].expiresAt) { unmuteUser(groupId, userId); return false; }
    return data[groupId][userId].muted === true;
}
async function setGroupSetting(sock, groupId, setting) { try { await sock.groupSettingUpdate(groupId, setting); return true; } catch { return false; } }
module.exports = {
    name: "mute", aliases: ["m", "unmute"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const botId = sock.user.id;
        const adminStatusBot = await isAdmin(sock, chatId, botId);
        if (!adminStatusBot.isBotAdmin) { await sock.sendMessage(chatId, { text: `» Bot must be an admin.` }, { quoted: msg }); return; }
        const adminStatus = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminStatus.isSenderAdmin;
        const isOwner = isOwnerOrCo(senderId);
        if (!isSenderAdmin && !isOwner) { await sock.sendMessage(chatId, { text: `» Only admins or the bot owner can use this.` }, { quoted: msg }); return; }
        const isUnmute = ctx.used.command === 'unmute' || (args.length > 0 && args[0].toLowerCase() === 'unmute');
        const cleanArgs = isUnmute && args.length > 0 && args[0].toLowerCase() === 'unmute' ? args.slice(1) : args;
        let durationMinutes = null, targetUser = null;
        if (cleanArgs.length > 0 && /^\d+$/.test(cleanArgs[0]) && parseInt(cleanArgs[0]) > 0) {
            durationMinutes = parseInt(cleanArgs[0]);
            const restArgs = cleanArgs.slice(1);
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) targetUser = mentionedJids[0];
            else if (restArgs.length > 0) { for (const arg of restArgs) { if (arg.startsWith('@')) { targetUser = arg.replace('@', '') + '@s.whatsapp.net'; break; } } }
        } else {
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) targetUser = mentionedJids[0];
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) targetUser = msg.message.extendedTextMessage.contextInfo.participant;
            else { for (const arg of cleanArgs) { if (arg.startsWith('@')) { targetUser = arg.replace('@', '') + '@s.whatsapp.net'; break; } } }
        }
        if (targetUser) {
            if (isUnmute) {
                if (!isUserMuted(chatId, targetUser)) { await sock.sendMessage(chatId, { text: `» @${targetUser.split('@')[0]} is not muted.`, mentions: [targetUser] }, { quoted: msg }); return; }
                unmuteUser(chatId, targetUser);
                await sock.sendMessage(chatId, { text: `» User Unmuted\n› @${targetUser.split('@')[0]} can now send messages.\n${FOOTER}`, mentions: [targetUser] }, { quoted: msg });
            } else {
                if (isUserMuted(chatId, targetUser)) { await sock.sendMessage(chatId, { text: `» @${targetUser.split('@')[0]} is already muted.`, mentions: [targetUser] }, { quoted: msg }); return; }
                muteUser(chatId, targetUser, durationMinutes);
                let reply = `» User Muted\n› User: @${targetUser.split('@')[0]}\n› All messages will be deleted.\n`;
                if (durationMinutes) reply += `› Duration: ${durationMinutes} minutes (auto-unmute).\n`;
                else reply += `› Mute is permanent.\n`;
                reply += `› Use ${prefix}mute unmute @${targetUser.split('@')[0]} to unmute.\n${FOOTER}`;
                await sock.sendMessage(chatId, { text: reply, mentions: [targetUser] }, { quoted: msg });
            }
        } else {
            if (isUnmute) {
                const success = await setGroupSetting(sock, chatId, 'not_announcement');
                if (!success) { await sock.sendMessage(chatId, { text: `» Failed to unmute group. Make sure the bot is admin.` }, { quoted: msg }); return; }
                await sock.sendMessage(chatId, { text: `» Group Unmuted\n› All members can now send messages.\n${FOOTER}` }, { quoted: msg });
            } else {
                const success = await setGroupSetting(sock, chatId, 'announcement');
                if (!success) { await sock.sendMessage(chatId, { text: `» Failed to mute group.` }, { quoted: msg }); return; }
                await sock.sendMessage(chatId, { text: `» Group Muted\n› Only admins can send messages.\n› Use ${prefix}mute unmute to allow all members.\n${FOOTER}` }, { quoted: msg });
            }
        }
    }
};
module.exports.isUserMuted = isUserMuted;
module.exports.unmuteUser = unmuteUser;
module.exports.muteUser = muteUser;
module.exports.setGroupSetting = setGroupSetting;
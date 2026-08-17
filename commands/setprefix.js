// commands/setprefix.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const CONFIG_PATH = path.join(__dirname, '../config.json');
module.exports = {
    name: "setprefix", aliases: ["prefix", "changeprefix"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» ${config.owner || 'This command is restricted to the bot owner.'}` }, { quoted: msg }); return; }
        const newPrefix = args.join(' ').trim();
        if (!newPrefix) { await sock.sendMessage(chatId, { text: `» Current prefix: ${prefix}\n› Usage: ${prefix}setprefix <new_prefix>\n› Example: ${prefix}setprefix !\n${FOOTER}` }, { quoted: msg }); return; }
        if (newPrefix.length > 5) { await sock.sendMessage(chatId, { text: `» Prefix too long. Maximum 5 characters.\n${FOOTER}` }, { quoted: msg }); return; }
        if (newPrefix.includes(' ') || newPrefix.includes('\n')) { await sock.sendMessage(chatId, { text: `» Prefix cannot contain spaces or newlines.\n${FOOTER}` }, { quoted: msg }); return; }
        try {
            const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            configData.system.prefix = newPrefix; fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
            if (global.prefix) global.prefix = newPrefix;
            await sock.sendMessage(chatId, { text: `» Prefix changed to: ${newPrefix}\n» Bot will now respond to ${newPrefix}commands.\n${FOOTER}` }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Failed to update prefix.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

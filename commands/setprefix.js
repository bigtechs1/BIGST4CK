// commands/setprefix.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const CONFIG_PATH = path.join(__dirname, '../config.json');

module.exports = {
    name: "setprefix",
    aliases: ["prefix", "changeprefix"],
    category: "owner",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Owner only ──────────────────────────────
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const newPrefix = args.join(' ').trim();

        // ─── Check if prefix is provided ──────────────
        if (!newPrefix) {
            await sock.sendMessage(chatId, {
                text: `» Current prefix: ${prefix}\n› Usage: ${prefix}setprefix <new_prefix>\n› Example: ${prefix}setprefix !\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Validate prefix ──────────────────────────
        if (newPrefix.length > 5) {
            await sock.sendMessage(chatId, {
                text: `» Prefix too long. Maximum 5 characters.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        if (newPrefix.includes(' ') || newPrefix.includes('\n')) {
            await sock.sendMessage(chatId, {
                text: `» Prefix cannot contain spaces or newlines.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Update config ────────────────────────────
        try {
            const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            configData.system.prefix = newPrefix;
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));

            // Also update the global prefix if you use one
            if (global.prefix) global.prefix = newPrefix;

            await sock.sendMessage(chatId, {
                text: `» Prefix changed to: ${newPrefix}\n» Bot will now respond to ${newPrefix}commands.\n${FOOTER}`
            }, { quoted: msg });

        } catch (error) {
            console.error('Setprefix error:', error);
            await sock.sendMessage(chatId, {
                text: `» Failed to update prefix.\n› ${error.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
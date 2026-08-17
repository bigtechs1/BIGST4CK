// commands/register.js
const config = require('../config');
const { registerUser, isRegistered } = require('../lib/auth');

const FOOTER = config.footer || `© ${config.botName}`;

module.exports = {
    name: "register",
    aliases: ["reg", "signup"],
    category: "utility",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';
        const senderId = ctx.sender.jid;

        if (isRegistered(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» You are already registered.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        const username = args.join(' ').trim();
        if (!username) {
            await sock.sendMessage(chatId, {
                text: `» Usage: ${prefix}register <username>\n› Example: ${prefix}register bigmanj\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // Check if username taken (optional)
        const users = require('../lib/auth').loadUsers();
        const taken = Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase());
        if (taken) {
            await sock.sendMessage(chatId, {
                text: `» Username "${username}" is already taken.\n› Please choose another.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        registerUser(senderId, username);
        await sock.sendMessage(chatId, {
            text: `» Registration successful.\n› Username: ${username}\n› You can now use all commands.\n${FOOTER}`
        }, { quoted: msg });
    }
};
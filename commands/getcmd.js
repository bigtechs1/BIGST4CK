// commands/getcmd.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

module.exports = {
    name: "getcmd",
    aliases: ["getc", "source"],
    category: "owner",
    permissions: { owner: true },

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Owner check ──────────────────────────────
        if (!isOwnerOrCo(ctx.sender.jid)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        // ─── Parse command name ────────────────────────
        const query = args[0]?.toLowerCase();
        if (!query) {
            await sock.sendMessage(chatId, {
                text: `» Usage: ${prefix}getcmd <command_name>\n› Example: ${prefix}getcmd menu\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Scan for the file ──────────────────────────
        let targetFile = null;
        const commandsDir = path.join(process.cwd(), 'commands');

        function scanDir(dir) {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        scanDir(fullPath);
                    } else if (entry.isFile() && entry.name.toLowerCase() === `${query}.js`) {
                        targetFile = fullPath;
                        return;
                    }
                }
            } catch (err) {
                // ignore
            }
        }
        scanDir(commandsDir);

        if (!targetFile) {
            await sock.sendMessage(chatId, {
                text: `» Command "${query}" not found.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Read file content ──────────────────────────
        const source = fs.readFileSync(targetFile, 'utf8');
        const fileName = path.basename(targetFile);
        const fileSize = (fs.statSync(targetFile).size / 1024).toFixed(2);

        // ─── Send as rich card or document ─────────────
        const maxCodeLength = 4000; // WhatsApp code block limit

        if (source.length > maxCodeLength) {
            // Send as document
            await sock.sendMessage(chatId, {
                document: fs.readFileSync(targetFile),
                mimetype: 'application/javascript',
                fileName: fileName,
                caption: `» File: ${fileName}\n» Size: ${fileSize} KB\n\n${FOOTER}`
            }, { quoted: msg });
        } else {
            // Send as AIRich code block
            await new AIRich(sock)
                .setTitle(`» ${fileName}`)
                .addCode('javascript', source)
                .addTip(`File size: ${fileSize} KB`)
                .setFooter(FOOTER)
                .send(chatId, { quoted: msg });
        }
    }
};
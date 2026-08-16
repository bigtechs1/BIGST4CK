// commands/repo.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;
const REPO_LINK = "https://github.com/brightsonnjegite-sudo/BIGMANJ-XMD";
const IMAGE_URL = "https://files.catbox.moe/0hmdof.png";

module.exports = {
    name: "repo",
    aliases: ["repository"],
    category: "information",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const prefix = ctx.used.prefix || '.';

        const body =
`» Repository
»
» ${REPO_LINK}
»
» Bot is FREE & Open Source
» Star and Fork if you liked the project!`;

        await new ButtonV2(sock)
            .setTitle('» Repository')
            .setBody(body)
            .setFooter(FOOTER)
            .setThumbnail(IMAGE_URL)
            .addButton('› Dev', `${prefix}owner`)
            .send(chatId, { quoted: msg });
    }
};
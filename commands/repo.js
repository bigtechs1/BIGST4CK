// commands/sc.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const FOOTER = config.footer || `© ${config.botName}`;
const REPO_LINK = "https://github.com/bigtechs1/BIGST4CK";
const IMAGE_URL = "https://files.catbox.moe/0hmdof.png";
module.exports = {
    name: "repo", aliases: ["script", "source", "sourcecode"], category: "information",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg;
        await new AIRich(sock)
            .setTitle(`» Source Code`)
            .addImage(IMAGE_URL)
            .addText(`» Repository\n» ${REPO_LINK}\n\n» Bot is FREE & Open Source\n» Star and Fork if you liked the project!`)
            .addTip('Tap to visit repository')
            .setFooter(FOOTER)
            .send(chatId, { quoted: msg });
    }
};

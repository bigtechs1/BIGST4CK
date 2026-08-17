// commands/owner.js
const config = require('../config');
const { getOwnerNumbers } = require('../lib/auth');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "owner", aliases: ["dev", "creator"], category: "information",
    code: async (ctx) => {
        const numbers = getOwnerNumbers();
        const body = `» Owner Contacts\n\n${numbers.map((n,i) => `${i+1}. ${n}`).join('\n')}\n\n${FOOTER}`;
        await ctx.reply(body);
    }
};
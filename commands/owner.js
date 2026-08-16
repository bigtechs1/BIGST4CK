// commands/owner.js
const config = require('../config');

module.exports = {
    name: "owner",
    aliases: ["creator", "developer"],
    category: "information",

    code: async (ctx) => {
        try {
            // Build contacts array
            const contacts = [];

            // Main owner
            if (config.owner.id && config.owner.name) {
                contacts.push({
                    displayName: config.owner.name,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.owner.name}\nORG:${config.owner.organization || ''}\nTEL;type=CELL;type=VOICE;waid=${config.owner.id}:+${config.owner.id}\nEND:VCARD`
                });
            }

            // Co-owners (skip invisible ones)
            if (config.owner.co && Array.isArray(config.owner.co)) {
                for (const co of config.owner.co) {
                    if (co.invisible) continue;
                    if (co.id && co.name) {
                        contacts.push({
                            displayName: co.name,
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${co.name}\nORG:${co.organization || ''}\nTEL;type=CELL;type=VOICE;waid=${co.id}:+${co.id}\nEND:VCARD`
                        });
                    }
                }
            }

            if (contacts.length === 0) {
                await ctx.reply(`» No contacts configured.`);
                return;
            }

            // Send as multiple contacts
            await ctx.core.sendMessage(ctx._msg.key.remoteJid, {
                contacts: {
                    displayName: `${config.bot.name} Owners`,
                    contacts
                }
            }, { quoted: ctx._msg });

        } catch (error) {
            console.error('Owner command error:', error);
            await ctx.reply(`» Failed to send contacts.`);
        }
    }
};
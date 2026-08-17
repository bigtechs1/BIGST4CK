// commands/settings.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { AIRich } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
function loadFeatureStatus(feature) {
    const filePath = path.join(__dirname, '../data', `${feature}.json`);
    try { if (!fs.existsSync(filePath)) return 'OFF'; const data = JSON.parse(fs.readFileSync(filePath, 'utf8')); return data.enabled ? 'ON' : 'OFF'; } catch { return 'OFF'; }
}
function toggleFeature(feature, enable) {
    const filePath = path.join(__dirname, '../data', `${feature}.json`);
    try { const dir = path.dirname(filePath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); let data = { enabled: false }; if (fs.existsSync(filePath)) data = JSON.parse(fs.readFileSync(filePath, 'utf8')); data.enabled = enable; fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); return true; } catch { return false; }
}
function getUptime() { const uptime = process.uptime(); const days = Math.floor(uptime / 86400); const hours = Math.floor((uptime % 86400) / 3600); const minutes = Math.floor((uptime % 3600) / 60); const parts = []; if (days > 0) parts.push(`${days}d`); if (hours > 0) parts.push(`${hours}h`); if (minutes > 0) parts.push(`${minutes}m`); return parts.join(' ') || '0m'; }
module.exports = {
    name: "settings", aliases: ["config", "set"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» ${config.owner || 'This command is restricted to the bot owner.'}` }, { quoted: msg }); return; }
        const features = { autoread: 'Auto-read messages', autotyping: 'Typing indicator', anticall: 'Block calls', antidelete: 'Detect deleted messages', antilink: 'Block links in groups', antimention: 'Block mentions in groups', autostatus: 'Auto-view + like status', chatbot: 'AI chatbot' };
        if (args.length >= 2) {
            const feature = args[0].toLowerCase(); const action = args[1].toLowerCase();
            if (!['on', 'off'].includes(action)) { await sock.sendMessage(chatId, { text: `» Use on or off.\n› Example: ${prefix}settings autoread on\n${FOOTER}` }, { quoted: msg }); return; }
            if (!features[feature]) { const available = Object.keys(features).join(', '); await sock.sendMessage(chatId, { text: `» Unknown feature.\n› Available: ${available}\n${FOOTER}` }, { quoted: msg }); return; }
            const enable = action === 'on'; const success = toggleFeature(feature, enable);
            if (success) { await sock.sendMessage(chatId, { text: `» ${feature} turned ${action.toUpperCase()}.\n${FOOTER}` }, { quoted: msg }); } else { await sock.sendMessage(chatId, { text: `» Failed to toggle ${feature}.\n${FOOTER}` }, { quoted: msg }); }
            return;
        }
        const now = new Date(); const timeEN = now.toLocaleTimeString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit', hour12: true }); const dateEN = now.toLocaleDateString('en-US', { timeZone: 'Africa/Dar_es_Salaam', weekday: 'long', day: 'numeric', month: 'long' });
        const ownerNumber = ctx.sender.jid.split('@')[0]; const greeting = 'Owner';
        const bodyText = `${greeting}, @${ownerNumber}\n${dateEN} · ${timeEN}`;
        const statuses = {}; for (const [key] of Object.entries(features)) statuses[key] = loadFeatureStatus(key);
        const footerText = `*»* *BOT SETTINGS*\n  › Name      : ${config.botName}\n  › Prefix    : ${prefix}\n  › Version   : ${config.version || '3.0.5'}\n  › Mode      : ${config.mode || 'public'}\n  › Uptime    : ${getUptime()}\n\n*»* *FEATURES*\n  › Autoread   : ${statuses.autoread}\n  › Autotyping : ${statuses.autotyping}\n  › Anticall   : ${statuses.anticall}\n  › Antidelete : ${statuses.antidelete}\n  › Antilink   : ${statuses.antilink}\n  › Antimention: ${statuses.antimention}\n  › Autostatus : ${statuses.autostatus}\n  › Chatbot    : ${statuses.chatbot}\n\n*»* *TOGGLE*\n  › ${prefix}settings <feature> on/off\n  › Available: ${Object.keys(features).join(', ')}\n\n${FOOTER}`;
        let ppUrl = config.thumbnail || 'https://files.catbox.moe/0hmdof.png';
        try { const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'; ppUrl = await sock.profilePictureUrl(botJid, 'image') || ppUrl; } catch {}
        await new AIRich(sock).setTitle(config.botName).setSubtitle(`Settings · ${timeEN}`).setBody(bodyText).setFooter(footerText).setThumbnail(ppUrl).addTip('Use .setprefix <new> to change prefix').send(chatId, { quoted: msg });
    }
};

// commands/goodbye.js
const config = require('../config');
const { Button } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const DATA_DIR = path.join(__dirname, '../data');
const CONFIG_PATH = path.join(DATA_DIR, 'goodbye_config.json');
function ensureConfig() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({}), 'utf8'); }
function loadConfig() { ensureConfig(); try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; } }
function saveConfig(data) { ensureConfig(); fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8'); }
async function getGroupDescription(sock, groupId) { try { const meta = await sock.groupMetadata(groupId); return meta.desc || 'No description set.'; } catch { return 'Could not fetch description.'; } }
module.exports = {
    name: "goodbye", aliases: ["bye"], category: "group",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!chatId.endsWith('@g.us')) { await sock.sendMessage(chatId, { text: `» This command only works in groups.` }, { quoted: msg }); return; }
        const sub = args[0]?.toLowerCase() || ''; const configData = loadConfig(); if (!configData[chatId]) configData[chatId] = { enabled: false, imageUrl: null };
        if (sub === 'on') { configData[chatId].enabled = true; saveConfig(configData); await sock.sendMessage(chatId, { text: `» Goodbye messages enabled.` }, { quoted: msg }); return; }
        if (sub === 'off') { configData[chatId].enabled = false; saveConfig(configData); await sock.sendMessage(chatId, { text: `» Goodbye messages disabled.` }, { quoted: msg }); return; }
        if (sub === 'setimage') {
            if (args.length > 1) { const url = args.slice(1).join(' ').trim(); if (url.startsWith('http')) { configData[chatId].imageUrl = url; saveConfig(configData); await sock.sendMessage(chatId, { text: `» Goodbye image set.` }, { quoted: msg }); return; } else { await sock.sendMessage(chatId, { text: `» Invalid URL.` }, { quoted: msg }); return; } }
            else { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}goodbye setimage <image_url>` }, { quoted: msg }); return; }
        }
        if (sub === 'description' || sub === 'desc') { const desc = await getGroupDescription(sock, chatId); await sock.sendMessage(chatId, { text: `» Group Description\n\n${desc}\n${FOOTER}` }, { quoted: msg }); return; }
        const status = configData[chatId].enabled ? 'ON' : 'OFF'; const image = configData[chatId].imageUrl || 'Not set';
        await sock.sendMessage(chatId, { text: `» Goodbye Settings\n› Status: ${status}\n› Image: ${image}\n› Commands: ${prefix}goodbye on/off | ${prefix}goodbye setimage <url> | ${prefix}goodbye description` }, { quoted: msg });
    }
};
module.exports.handleGoodbyeEvent = async function handleGoodbyeEvent(sock, groupId, participant, pushName) {
    const configData = loadConfig(); if (!configData[groupId] || !configData[groupId].enabled) return;
    const imageUrl = configData[groupId].imageUrl || null; const userName = pushName || participant.split('@')[0];
    let body = `» Goodbye @${userName}. We'll miss you! 👋\n\n» Respect the admins and come back soon!\n${FOOTER}`;
    const btn = new Button(sock).setBody(body).setFooter(FOOTER).addReply('📋 Group Description', `grpdesc_${groupId}`).addReply('📌 Contact Admin', `contactadmin_${groupId}`);
    if (imageUrl) btn.setImage(imageUrl);
    await btn.send(groupId, { quoted: null });
};
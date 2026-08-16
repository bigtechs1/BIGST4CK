// commands/welcome.js
const config = require('../config');
const isAdmin = require('../lib/isAdmin');
const { isOwnerOrCo } = require('../lib/auth');
const { Button } = require('../lib/NIXCODE');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'welcome_config.json');

// ─── Ensure config file exists ──────────────────────────
function ensureConfig() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({}), 'utf8');
    }
}

function loadConfig() {
    ensureConfig();
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function saveConfig(data) {
    ensureConfig();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Helper: get group description ──────────────────────
async function getGroupDescription(sock, groupId) {
    try {
        const meta = await sock.groupMetadata(groupId);
        return meta.desc || 'No description set.';
    } catch { return 'Could not fetch description.'; }
}

module.exports = {
    name: "welcome",
    aliases: ["welcome"],
    category: "group",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Only groups ──────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `» This command only works in groups.`
            }, { quoted: msg });
            return;
        }

        // ─── NO ADMIN CHECK – everyone can use ──────

        const sub = args[0]?.toLowerCase() || '';
        const configData = loadConfig();
        if (!configData[chatId]) configData[chatId] = { enabled: false, imageUrl: null };

        // ─── ON ──────────────────────────────────────
        if (sub === 'on') {
            configData[chatId].enabled = true;
            saveConfig(configData);
            await sock.sendMessage(chatId, {
                text: `» Welcome messages enabled for this group.`
            }, { quoted: msg });
            return;
        }

        // ─── OFF ──────────────────────────────────────
        if (sub === 'off') {
            configData[chatId].enabled = false;
            saveConfig(configData);
            await sock.sendMessage(chatId, {
                text: `» Welcome messages disabled for this group.`
            }, { quoted: msg });
            return;
        }

        // ─── SETIMAGE ─────────────────────────────────
        if (sub === 'setimage') {
            if (args.length > 1) {
                const url = args.slice(1).join(' ').trim();
                if (url.startsWith('http')) {
                    configData[chatId].imageUrl = url;
                    saveConfig(configData);
                    await sock.sendMessage(chatId, {
                        text: `» Welcome image set successfully.`
                    }, { quoted: msg });
                    return;
                } else {
                    await sock.sendMessage(chatId, {
                        text: `» Invalid URL. Please provide a valid image URL.`
                    }, { quoted: msg });
                    return;
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `» Usage: ${prefix}welcome setimage <image_url>`
                }, { quoted: msg });
                return;
            }
        }

        // ─── DESCRIPTION ──────────────────────────────
        if (sub === 'description' || sub === 'desc') {
            const desc = await getGroupDescription(sock, chatId);
            await sock.sendMessage(chatId, {
                text: `» Group Description\n\n${desc}\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── STATUS ───────────────────────────────────
        const status = configData[chatId].enabled ? 'ON' : 'OFF';
        const image = configData[chatId].imageUrl || 'Not set';
        await sock.sendMessage(chatId, {
            text:
`» Welcome Settings
› Status   : ${status}
› Image    : ${image}
› Commands:
  ${prefix}welcome on/off
  ${prefix}welcome setimage <url>
  ${prefix}welcome description
${FOOTER}`
        }, { quoted: msg });
    }
};

// ─── Event Handler: on participant join ──────────────
async function handleWelcomeEvent(sock, groupId, participant, pushName) {
    const configData = loadConfig();
    if (!configData[groupId] || !configData[groupId].enabled) return;

    const imageUrl = configData[groupId].imageUrl || null;
    const desc = await getGroupDescription(sock, groupId);
    const userName = pushName || participant.split('@')[0];

    let body = `» Welcome @${userName} to the group! 🎉\n\n`;
    body += `» Group Description:\n${desc}\n\n`;
    body += `» Respect the admins and enjoy your stay! 🙏\n${FOOTER}`;

    const btn = new Button(sock)
        .setBody(body)
        .setFooter(FOOTER)
        .addReply('📋 Group Description', `grpdesc_${groupId}`)
        .addReply('📌 Contact Admin', `contactadmin_${groupId}`);

    if (imageUrl) {
        btn.setImage(imageUrl);
    }

    await btn.send(groupId, { quoted: null });
}

module.exports.handleWelcomeEvent = handleWelcomeEvent;
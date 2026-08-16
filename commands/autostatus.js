// commands/autostatus.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Config defaults ─────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    viewEnabled: true,
    likeEnabled: true,
});

// ─── Reaction emojis (kept because they are necessary for WhatsApp) ──
const EMOJI_REACTIONS = ['💚', '🤍', '🖤'];

// ─── State ──────────────────────────────────────────────
let configCache = null;
const processedStatusIds = new Set();

// ─── Config helpers ──────────────────────────────────────
async function loadConfig() {
    if (configCache) return configCache;
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }
    if (typeof configCache.enabled !== 'boolean') configCache.enabled = true;
    return configCache;
}

async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8');
    } catch (err) {
        console.error('[AutoStatus] Save failed:', err.message);
    }
}

function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

// ─── Rich response helper ──────────────────────────────
async function sendRichResponse(sock, chatId, title, body, message) {
    await new ButtonV2(sock)
        .setTitle(title || config.bot.name)
        .setBody(body)
        .setFooter(FOOTER)
        .setContextInfo({
            stanzaId: message.key.id,
            participant: message.key.participant || message.key.remoteJid,
            remoteJid: message.key.remoteJid,
            quotedMessage: message.message
        })
        .send(chatId, { quoted: message });
}

// ─── Event handlers (auto view & auto like) ────────────
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        await sock.readMessages([statusKey]);
    } catch (err) {
        console.error('[AutoView] Failed:', err.message);
    }
}

async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;
    const emoji = getRandomEmoji();
    const participantJid = statusKey.participant;
    try {
        await sock.sendMessage('status@broadcast', {
            react: { text: emoji, key: statusKey }
        }, { statusJidList: [participantJid] });
    } catch (err) {
        console.error('[AutoLike] Failed:', err.message || err);
    }
}

async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    let statusKey = null;
    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }
    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;

    processedStatusIds.add(statusKey.id);
    if (processedStatusIds.size > 1500) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-750).forEach(id => processedStatusIds.add(id));
    }

    const promises = [];
    if (cfg.viewEnabled) promises.push(autoView(sock, statusKey));
    if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    await Promise.allSettled(promises);
}

// ─── Command ─────────────────────────────────────────────
module.exports = {
    name: "autostatus",
    aliases: ["as", "statusauto"],
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

        const sub = (args[0] || '').toLowerCase();
        const option = (args[1] || '').toLowerCase();
        const cfg = await loadConfig();

        // ─── No subcommand → show status ──────────────
        if (!sub) {
            const status = cfg.enabled ? 'ACTIVE' : 'INACTIVE';
            const view = cfg.viewEnabled ? 'ON' : 'OFF';
            const like = cfg.likeEnabled ? 'ON' : 'OFF';
            const body =
`Status   : ${status}
View     : ${view}
Like     : ${like}

› ${prefix}autostatus on               - Enable all
› ${prefix}autostatus off              - Disable all
› ${prefix}autostatus view on/off      - View on also enables like
› ${prefix}autostatus like on/off      - Toggle like only`;
            await sendRichResponse(sock, chatId, 'Auto Status', body, msg);
            return;
        }

        // ─── Global ON ─────────────────────────────────
        if (sub === 'on') {
            await saveConfig({ enabled: true, viewEnabled: true, likeEnabled: true });
            await sendRichResponse(sock, chatId, 'Auto Status', 'Bot will view and like all status updates.', msg);
            return;
        }

        // ─── Global OFF ────────────────────────────────
        if (sub === 'off') {
            await saveConfig({ enabled: false });
            await sendRichResponse(sock, chatId, 'Auto Status', 'Auto status features disabled.', msg);
            return;
        }

        // ─── VIEW toggle ──────────────────────────────
        if (sub === 'view') {
            if (option === 'on') {
                await saveConfig({ viewEnabled: true, likeEnabled: true, enabled: true });
                await sendRichResponse(sock, chatId, 'Auto Status',
                    'View is ON. Like is also enabled automatically.', msg);
                return;
            } else if (option === 'off') {
                await saveConfig({ viewEnabled: false });
                await sendRichResponse(sock, chatId, 'Auto Status',
                    'View is OFF. Like will still work if enabled separately.', msg);
                return;
            }
        }

        // ─── LIKE toggle ───────────────────────────────
        if (sub === 'like') {
            if (option === 'on') {
                await saveConfig({ likeEnabled: true, enabled: true });
                await sendRichResponse(sock, chatId, 'Auto Status',
                    'Like is ON (no view).', msg);
                return;
            } else if (option === 'off') {
                await saveConfig({ likeEnabled: false });
                await sendRichResponse(sock, chatId, 'Auto Status',
                    'Like is OFF.', msg);
                return;
            }
        }

        // ─── Invalid subcommand ────────────────────────
        const helpBody =
`› ${prefix}autostatus on               - Enable all
› ${prefix}autostatus off              - Disable all
› ${prefix}autostatus view on/off      - View on also enables like
› ${prefix}autostatus like on/off      - Toggle like only`;
        await sendRichResponse(sock, chatId, 'Auto Status', helpBody, msg);
    }
};

// ─── Exports for main.js ──────────────────────────────
module.exports.handleAutoStatus = handleStatusUpdate;
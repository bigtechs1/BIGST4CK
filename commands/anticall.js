// commands/anticall.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const ANTICALL_PATH = path.join(process.cwd(), 'data', 'anticall.json');
const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false, callCounts: {} };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw);
        return { enabled: data.enabled === true, callCounts: data.callCounts || {} };
    } catch {
        return { enabled: false, callCounts: {} };
    }
}

function writeState(state) {
    try {
        const dir = path.dirname(ANTICALL_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify(state, null, 2));
    } catch (err) {
        console.error(`Failed to write anticall state: ${err.message}`);
    }
}

const ALLOWED_NUMBERS = ['255715206874', '126388589871219'];

function isAllowedNumber(number) {
    const clean = number.replace(/\s/g, '');
    return ALLOWED_NUMBERS.some(a => a === clean);
}

// ─── Helper ──────────────────────────────────────────────
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

// ─── Command ─────────────────────────────────────────────
module.exports = {
    name: "anticall",
    aliases: ["ac", "callblock"],
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

        const state = readState();
        const sub = args[0]?.toLowerCase() || '';

        // ─── Help ──────────────────────────────────────
        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body = 
`› ${prefix}anticall on      - Enable call blocking
› ${prefix}anticall off     - Disable call blocking
› ${prefix}anticall status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Anticall', body, msg);
            return;
        }

        // ─── Status ────────────────────────────────────
        if (sub === 'status') {
            const status = state.enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status   : ${status}\nCalls    : ${state.enabled ? 'BLOCKED' : 'ALLOWED'}\nAuto-ban : After 3 calls`;
            await sendRichResponse(sock, chatId, 'Anticall Status', body, msg);
            return;
        }

        const enable = sub === 'on';
        if (enable === state.enabled) {
            await sendRichResponse(sock, chatId, 'Anticall', `Anticall is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg);
            return;
        }

        state.enabled = enable;
        writeState(state);

        const body = enable
            ? 'All incoming calls will be blocked.\nPlease use messages instead.'
            : 'Incoming calls are now allowed.\nYou may receive voice calls.';

        await sendRichResponse(sock, chatId, `Anticall ${enable ? 'Activated' : 'Deactivated'}`, body, msg);
    }
};

// ─── Event Handler ──────────────────────────────────────
async function handleAnticall(sock, update) {
    const state = readState();
    if (!state.enabled) return;

    try {
        const call = update.call;
        if (!call || !call[0]) return;
        const callerId = call[0].from;
        if (!callerId) return;

        const rawNumber = callerId.split('@')[0];
        if (isAllowedNumber(rawNumber)) {
            console.log(`Allowed number ${rawNumber} – ignoring anticall`);
            return;
        }

        const currentState = readState();
        const currentCount = currentState.callCounts[rawNumber] || 0;
        const newCount = currentCount + 1;
        currentState.callCounts[rawNumber] = newCount;
        writeState(currentState);

        if (typeof sock.rejectCall === 'function') {
            await sock.rejectCall(call[0].id, callerId);
        }
        console.log(`Call rejected from: ${rawNumber} (count: ${newCount})`);

        let policyMsg;
        if (newCount === 1) {
            policyMsg = `» Voice Call Policy\n» We do not accept calls. Please send a message.\n» If you call 3 times, you will be blocked.`;
        } else if (newCount === 2) {
            policyMsg = `» Warning\n» You have called ${newCount} time(s).\n» One more call and you will be permanently blocked.`;
        } else {
            policyMsg = `» You have been blocked.\n» You ignored the policy and called 3 times.\n» The bot has now blocked you permanently.`;
        }
        await sock.sendMessage(callerId, { text: policyMsg + '\n\n' + FOOTER });

        if (newCount >= 3) {
            try {
                if (typeof sock.updateBlockStatus === 'function') {
                    await sock.updateBlockStatus(callerId, 'block');
                } else if (typeof sock.blockUser === 'function') {
                    await sock.blockUser(callerId);
                }
                console.log(`User ${rawNumber} BLOCKED`);
            } catch (blockErr) {
                console.error(`Failed to block user: ${blockErr.message}`);
            }
            delete currentState.callCounts[rawNumber];
            writeState(currentState);
        }
    } catch (err) {
        console.error(`Anticall error: ${err.message}`);
    }
}

module.exports.handleAnticall = handleAnticall;
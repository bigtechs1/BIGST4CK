// commands/anticall.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const ANTICALL_PATH = path.join(process.cwd(), 'data', 'anticall.json');

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) {
            return { enabled: false, callCounts: {} };
        }
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw);
        return {
            enabled: data.enabled === true,
            callCounts: data.callCounts || {}
        };
    } catch (err) {
        console.error('Error reading anticall state:', err);
        return { enabled: false, callCounts: {} };
    }
}

function writeState(state) {
    try {
        const dir = path.dirname(ANTICALL_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify(state, null, 2));
        console.log(`Anticall state saved: enabled=${state.enabled}`);
    } catch (err) {
        console.error(`Failed to write anticall state: ${err.message}`);
    }
}

// Allowed numbers – add both phone numbers and LID numeric parts
const ALLOWED_NUMBERS = [
    '255715206874',
    '126388589871219'
];

function normalizeNumber(num) {
    return num.replace(/\s/g, '');
}

function isAllowedNumber(number) {
    const normalized = normalizeNumber(number);
    return ALLOWED_NUMBERS.some(allowed => normalizeNumber(allowed) === normalized);
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
        const args = ctx.used.args || [];
        const senderId = ctx.sender.jid;

        // ─── Owner only ──────────────────────────────
        if (!isOwnerOrCo(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const state = readState();
        const sub = args[0]?.toLowerCase() || '';

        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            await sock.sendMessage(chatId, {
                text: `» Anticall\n\n› Usage:\n› .anticall on     - Enable call blocking\n› .anticall off    - Disable call blocking\n› .anticall status - Show current status`
            }, { quoted: msg });
            return;
        }

        if (sub === 'status') {
            const status = state.enabled ? 'ACTIVE' : 'INACTIVE';
            const statusText = 
`» Anticall Status
»
» Status   : ${status}
» Calls    : ${state.enabled ? 'BLOCKED' : 'ALLOWED'}
» Messages : ALLOWED
» Auto-ban : After 3 calls
»
» © ${config.bot.name} by bigmanjtech™`;

            await sock.sendMessage(chatId, { text: statusText }, { quoted: msg });
            return;
        }

        const enable = sub === 'on';
        if (enable === state.enabled) {
            await sock.sendMessage(chatId, {
                text: `» Anticall is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`
            }, { quoted: msg });
            return;
        }

        state.enabled = enable;
        writeState(state);

        const responseText = enable
            ? `» Anticall Activated
»
» All incoming calls will be blocked.
» Please use messages instead.
»
» Status : ACTIVE
» © ${config.bot.name} by bigmanjtech™`
            : `» Anticall Deactivated
»
» Incoming calls are now allowed.
» You may receive voice calls.
»
» Status : INACTIVE
» © ${config.bot.name} by bigmanjtech™`;

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
    }
};

// ─── Event Handler ──────────────────────────────────────
async function sendCallPolicyMessage(sock, toJid, callerNumber, callCount) {
    let policyMsg;
    if (callCount === 1) {
        policyMsg = 
`» Voice Call Policy
»
» We do not accept calls. Please send a message.
» Quick replies for messages – calls are ignored.
»
» Thank you for understanding.
»
» If you call 3 times, you will be blocked.
»
» © ${config.bot.name} by bigmanjtech™`;
    } else if (callCount === 2) {
        policyMsg = 
`» Warning
»
» You have called ${callCount} time(s).
» One more call and you will be permanently blocked.
»
» © ${config.bot.name} by bigmanjtech™`;
    } else {
        policyMsg = 
`» You have been blocked.
»
» You ignored the policy and called 3 times.
» The bot has now blocked you permanently.
»
» © ${config.bot.name} by bigmanjtech™`;
    }
    await sock.sendMessage(toJid, { text: policyMsg });
}

async function handleAnticall(sock, update) {
    const state = readState();
    if (!state.enabled) return;

    try {
        const call = update.call;
        if (!call || !call[0]) return;

        const callerId = call[0].from;
        if (!callerId) return;

        let rawNumber = callerId.split('@')[0];
        if (isAllowedNumber(rawNumber)) {
            console.log(`Allowed number/LID ${rawNumber} – ignoring anticall`);
            return;
        }

        const currentState = readState();
        const currentCount = currentState.callCounts[rawNumber] || 0;
        const newCount = currentCount + 1;
        currentState.callCounts[rawNumber] = newCount;
        writeState(currentState);

        if (typeof sock.rejectCall === 'function') {
            await sock.rejectCall(call[0].id, callerId);
        } else {
            console.log('sock.rejectCall not available, call not rejected');
        }
        console.log(`Call rejected from: ${rawNumber} (count: ${newCount})`);

        await sendCallPolicyMessage(sock, callerId, rawNumber, newCount);

        if (newCount >= 3) {
            try {
                if (typeof sock.updateBlockStatus === 'function') {
                    await sock.updateBlockStatus(callerId, 'block');
                    console.log(`User ${rawNumber} BLOCKED successfully`);
                } else if (typeof sock.blockUser === 'function') {
                    await sock.blockUser(callerId);
                    console.log(`User ${rawNumber} BLOCKED successfully`);
                } else {
                    console.log('No block function available. User not blocked.');
                }
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

// Export the handler so it can be used in index.js
module.exports.handleAnticall = handleAnticall;
module.exports.readState = readState; // if needed elsewhere
// commands/anticall.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
const ANTICALL_PATH = path.join(__dirname, '../data', 'anticall.json');
function readState() {
    try { if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false, callCounts: {} }; const raw = fs.readFileSync(ANTICALL_PATH, 'utf8'); const data = JSON.parse(raw); return { enabled: data.enabled === true, callCounts: data.callCounts || {} }; } catch { return { enabled: false, callCounts: {} }; }
}
function writeState(state) { try { const dir = path.dirname(ANTICALL_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ANTICALL_PATH, JSON.stringify(state, null, 2)); } catch (err) { console.error('Failed to write anticall state:', err.message); } }
const ALLOWED_NUMBERS = ['255715206874', '126388589871219'];
function isAllowedNumber(number) { const clean = number.replace(/\s/g, ''); return ALLOWED_NUMBERS.some(a => a === clean); }
async function sendRichResponse(sock, chatId, title, body, message) {
    const { ButtonV2 } = require('../lib/NIXCODE');
    await new ButtonV2(sock).setTitle(title || config.botName).setBody(body).setFooter(FOOTER).setContextInfo({ stanzaId: message.key.id, participant: message.key.participant || message.key.remoteJid, remoteJid: message.key.remoteJid, quotedMessage: message.message }).send(chatId, { quoted: message });
}
module.exports = {
    name: "anticall", aliases: ["ac", "callblock"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId)) { await sock.sendMessage(chatId, { text: `» This command is restricted to the bot owner.` }, { quoted: msg }); return; }
        const state = readState(); const sub = args[0]?.toLowerCase() || '';
        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body = `› ${prefix}anticall on      - Enable call blocking\n› ${prefix}anticall off     - Disable\n› ${prefix}anticall status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Anticall', body, msg); return;
        }
        if (sub === 'status') {
            const status = state.enabled ? 'ACTIVE' : 'INACTIVE';
            await sendRichResponse(sock, chatId, 'Anticall Status', `Status: ${status}\nCalls: ${state.enabled ? 'BLOCKED' : 'ALLOWED'}\nAuto-ban: After 3 calls`, msg); return;
        }
        const enable = sub === 'on';
        if (enable === state.enabled) { await sendRichResponse(sock, chatId, 'Anticall', `Anticall is already ${enable ? 'ACTIVE' : 'INACTIVE'}.`, msg); return; }
        state.enabled = enable; writeState(state);
        await sendRichResponse(sock, chatId, `Anticall ${enable ? 'Activated' : 'Deactivated'}`, enable ? 'All incoming calls will be blocked. Please use messages instead.' : 'Incoming calls are now allowed.', msg);
    }
};
module.exports.handleAnticall = async function handleAnticall(sock, update) {
    const state = readState(); if (!state.enabled) return;
    try {
        const call = update.call; if (!call || !call[0]) return; const callerId = call[0].from; if (!callerId) return;
        const rawNumber = callerId.split('@')[0]; if (isAllowedNumber(rawNumber)) { console.log(`Allowed number ${rawNumber} – ignoring anticall`); return; }
        const currentState = readState(); const currentCount = currentState.callCounts[rawNumber] || 0; const newCount = currentCount + 1;
        currentState.callCounts[rawNumber] = newCount; writeState(currentState);
        if (typeof sock.rejectCall === 'function') { await sock.rejectCall(call[0].id, callerId); }
        console.log(`Call rejected from: ${rawNumber} (count: ${newCount})`);
        let policyMsg;
        if (newCount === 1) policyMsg = `» Voice Call Policy\n» We do not accept calls. Please send a message.\n» If you call 3 times, you will be blocked.`;
        else if (newCount === 2) policyMsg = `» Warning\n» You have called ${newCount} time(s).\n» One more call and you will be permanently blocked.`;
        else policyMsg = `» You have been blocked.\n» You ignored the policy and called 3 times.\n» The bot has now blocked you permanently.`;
        await sock.sendMessage(callerId, { text: policyMsg + '\n\n' + FOOTER });
        if (newCount >= 3) {
            try { if (typeof sock.updateBlockStatus === 'function') await sock.updateBlockStatus(callerId, 'block'); else if (typeof sock.blockUser === 'function') await sock.blockUser(callerId); console.log(`User ${rawNumber} BLOCKED`); } catch (blockErr) { console.error(`Failed to block user: ${blockErr.message}`); }
            delete currentState.callCounts[rawNumber]; writeState(currentState);
        }
    } catch (err) { console.error('Anticall error:', err.message); }
};
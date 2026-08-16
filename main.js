// BIGST4CK engine a bin WhatsApp bot
// main.js
const config = require('./config');
const { isOwnerOrCo } = require('./lib/auth');
const isAdmin = require('./lib/isAdmin');
const { isUserMuted } = require('./commands/mute');
const { incrementMessageCount } = require('./commands/top');
const { handleAnticall } = require('./commands/anticall');
const { handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const { handleMentionCheck } = require('./commands/antimention');
const { handleLinkDetection } = require('./commands/antilink');
const { handleWelcomeEvent } = require('./commands/welcome');
const { handleGoodbyeEvent } = require('./commands/goodbye');
const { handleAutoStatus } = require('./commands/autostatus');
const { handleAutoread } = require('./commands/autoread');
const { isAutotypingEnabled, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { handleChatbotMessage } = require('./commands/bigmanj');
const store = require('./lib/lightweight_store');
const fs = require('fs');
const path = require('path');

// ─── Load all commands ──────────────────────────────────
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');

function loadCommands() {
    const files = fs.readdirSync(commandsDir);
    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        try {
            const cmd = require(path.join(commandsDir, file));
            if (cmd.name && typeof cmd.code === 'function') {
                commands.set(cmd.name, cmd);
                if (cmd.aliases) {
                    for (const alias of cmd.aliases) {
                        commands.set(alias, cmd);
                    }
                }
            }
        } catch (err) {
            console.error(`Failed to load command ${file}:`, err);
        }
    }
    console.log(`✅ Loaded ${commands.size} commands`);
}
loadCommands();

// ─── Helper: Build ctx object ──────────────────────────
function buildCtx(sock, msg, text, prefix, command, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    return {
        core: sock,
        _msg: msg,
        sender: { jid: senderId, isOwner: isOwnerOrCo(senderId) },
        chat: { id: chatId, isGroup },
        used: { prefix, command, args },
        mentionedJids,
        reply: async (text, options = {}) => {
            return sock.sendMessage(chatId, { text, ...options }, { quoted: msg, ...options });
        },
        edit: async (key, text) => {
            return sock.sendMessage(chatId, { text, edit: key });
        }
    };
}

// ─── Handle messages ────────────────────────────────────
async function handleMessages(sock, chatUpdate, isButton = false) {
    const msg = chatUpdate.messages[0];
    if (!msg?.message) return;
    if (msg.key.fromMe) return;

    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;

    // ─── Autoread ──────────────────────────────────────
    if (chatId !== 'status@broadcast') {
        await handleAutoread(sock, msg);
    }

    // ─── Store message (for antidelete & top) ─────────
    await storeMessage(sock, msg);
    if (chatId.endsWith('@g.us')) {
        incrementMessageCount(chatId, senderId);
    }

    // ─── Antilink check ───────────────────────────────
    const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (chatId.endsWith('@g.us') && textContent) {
        await handleLinkDetection(sock, chatId, msg, textContent, senderId);
    }

    // ─── Antimention check ────────────────────────────
    if (chatId.endsWith('@g.us')) {
        await handleMentionCheck(sock, chatId, msg);
    }

    // ─── Mute check ────────────────────────────────────
    if (chatId.endsWith('@g.us') && isUserMuted(chatId, senderId)) {
        try {
            await sock.sendMessage(chatId, { delete: msg.key });
        } catch {}
        return;
    }

    // ─── Extract command ──────────────────────────────
    const fullText = textContent;
    if (!fullText) {
        // Maybe a media message – handle chatbot if enabled
        await handleChatbotMessage(sock, chatId, msg, '');
        return;
    }

    // Detect prefix
    const prefix = config.system?.prefix || '.';
    if (!fullText.startsWith(prefix)) {
        // Not a command – pass to chatbot
        await handleChatbotMessage(sock, chatId, msg, fullText);
        return;
    }

    const parts = fullText.slice(prefix.length).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // ─── Find command ──────────────────────────────────
    const cmd = commands.get(commandName);
    if (!cmd) {
        // Unknown command – maybe chatbot should respond?
        await handleChatbotMessage(sock, chatId, msg, fullText);
        return;
    }

    // ─── Permission checks ────────────────────────────
    const perms = cmd.permissions || {};
    if (perms.owner && !isOwnerOrCo(senderId)) {
        await sock.sendMessage(chatId, { text: config.msg?.owner || 'Owner only.' }, { quoted: msg });
        return;
    }
    if (perms.admin && chatId.endsWith('@g.us')) {
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: config.msg?.admin || 'Admins only.' }, { quoted: msg });
            return;
        }
    }
    if (perms.botAdmin && chatId.endsWith('@g.us')) {
        const adminStatus = await isAdmin(sock, chatId, sock.user.id);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: config.msg?.botAdmin || 'Bot must be admin.' }, { quoted: msg });
            return;
        }
    }
    if (perms.group && !chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command only works in groups.' }, { quoted: msg });
        return;
    }
    if (perms.private && chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command only works in private chats.' }, { quoted: msg });
        return;
    }

    // ─── Autotyping ──────────────────────────────────
    await handleAutotypingForCommand(sock, chatId);

    // ─── Build ctx and execute ────────────────────────
    const ctx = buildCtx(sock, msg, fullText, prefix, commandName, args);
    try {
        await cmd.code(ctx);
    } catch (err) {
        console.error(`Error executing ${commandName}:`, err);
        await sock.sendMessage(chatId, { text: 'An error occurred while executing the command.' }, { quoted: msg });
    }

    // ─── Show typing after command (if autotyping) ──
    await showTypingAfterCommand(sock, chatId);
}

// ─── Handle group participant update ──────────────────
async function handleGroupParticipantUpdate(sock, update) {
    const { id, participants, action } = update;
    if (action === 'add') {
        for (const participant of participants) {
            await handleWelcomeEvent(sock, id, participant.id, participant.pushName || 'User');
        }
    } else if (action === 'remove') {
        for (const participant of participants) {
            await handleGoodbyeEvent(sock, id, participant.id, participant.pushName || 'User');
        }
    }
}

// ─── Handle status update ─────────────────────────────
async function handleStatus(sock, chatUpdate) {
    const msg = chatUpdate.messages[0];
    if (!msg) return;
    await handleAutoStatus(sock, { messages: [msg] });
}

// ─── Handle post-update message ──────────────────────
async function handlePostUpdateMessage(sock) {
    // Run any post-update tasks (like version check)
    try {
        const flagFile = path.join(__dirname, 'data', 'update_just_done.flag');
        if (fs.existsSync(flagFile)) {
            const data = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
            const elapsed = Date.now() - data.timestamp;
            if (elapsed < 60000) {
                // Update happened within the last minute
                console.log('✅ Update flag detected – bot updated successfully');
                fs.unlinkSync(flagFile);
            }
        }
    } catch (err) {
        // ignore
    }
}

// ─── Bind events ──────────────────────────────────────
function bindEvents(sock) {
    // Messages are already handled in index.js – we use the exported handlers
    // The index.js already has the messages.upsert event, so we don't need to bind here
    // We just export the handlers for use in index.js
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus,
    handlePostUpdateMessage,
    bindEvents
};

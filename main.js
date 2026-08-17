// BIGST4CK COMMAND LOADER ENGINE - A BIN WHATSAPP BOT {CLEAN VERSION}
const config = require('./config');
const { isOwnerOrCo, isRegistered, registerUser, getUserData } = require('./lib/auth');
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
const { handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { handleChatbotMessage } = require('./commands/bigmanj');
const store = require('./lib/lightweight_store');
const fs = require('fs');
const path = require('path');

// ─── Load commands ──────────────────────────────────────
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
                    for (const alias of cmd.aliases) commands.set(alias, cmd);
                }
            }
        } catch (err) {
            console.error(`Failed to load command ${file}:`, err);
        }
    }
    console.log(`✅ Loaded ${commands.size} commands`);
}
loadCommands();

// ─── Build ctx ──────────────────────────────────────────
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

    const senderId = msg.key.participant || msg.key.remoteJid;
    const ownerJid = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    // Allow owner's own messages
    if (msg.key.fromMe && senderId !== ownerJid) return;

    const chatId = msg.key.remoteJid;

    // ─── Autoread ──────────────────────────────────────
    if (chatId !== 'status@broadcast') await handleAutoread(sock, msg);

    // ─── Store ────────────────────────────────────────
    await storeMessage(sock, msg);
    if (chatId.endsWith('@g.us')) incrementMessageCount(chatId, senderId);

    // ─── Security checks ──────────────────────────────
    const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (chatId.endsWith('@g.us') && textContent) {
        await handleLinkDetection(sock, chatId, msg, textContent, senderId);
        await handleMentionCheck(sock, chatId, msg);
    }
    if (chatId.endsWith('@g.us') && isUserMuted(chatId, senderId)) {
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}
        return;
    }

    // ─── Extract command ──────────────────────────────
    if (!textContent) {
        await handleChatbotMessage(sock, chatId, msg, '');
        return;
    }
    const prefix = config.system?.prefix || '.';
    if (!textContent.startsWith(prefix)) {
        await handleChatbotMessage(sock, chatId, msg, textContent);
        return;
    }

    const parts = textContent.slice(prefix.length).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = commands.get(commandName);
    if (!cmd) {
        await handleChatbotMessage(sock, chatId, msg, textContent);
        return;
    }

    // ─── Registration check (skip for owner/co-owner and register command) ──
    const isOwner = isOwnerOrCo(senderId);
    if (!isOwner && commandName !== 'register') {
        if (!isRegistered(senderId)) {
            await sock.sendMessage(chatId, {
                text: `» You must register first.\n› Use ${prefix}register <username>`
            }, { quoted: msg });
            return;
        }
    }

    // ─── Permissions ──────────────────────────────────
    const perms = cmd.permissions || {};
    if (perms.owner && !isOwner) {
        await sock.sendMessage(chatId, { text: config.owner || 'Owner only.' }, { quoted: msg });
        return;
    }
    if (perms.admin && chatId.endsWith('@g.us')) {
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: config.admin || 'Admins only.' }, { quoted: msg });
            return;
        }
    }
    if (perms.botAdmin && chatId.endsWith('@g.us')) {
        const adminStatus = await isAdmin(sock, chatId, sock.user.id);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: config.botAdmin || 'Bot must be admin.' }, { quoted: msg });
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

    const ctx = buildCtx(sock, msg, textContent, prefix, commandName, args);
    try {
        await cmd.code(ctx);
    } catch (err) {
        console.error(`Error executing ${commandName}:`, err);
        await sock.sendMessage(chatId, { text: 'An error occurred.' }, { quoted: msg });
    }
    await showTypingAfterCommand(sock, chatId);
}

// ─── Group participant update ──────────────────────────
async function handleGroupParticipantUpdate(sock, update) {
    const { id, participants, action } = update;
    if (action === 'add') {
        for (const p of participants) await handleWelcomeEvent(sock, id, p.id, p.pushName || 'User');
    } else if (action === 'remove') {
        for (const p of participants) await handleGoodbyeEvent(sock, id, p.id, p.pushName || 'User');
    }
}

// ─── Status update ──────────────────────────────────────
async function handleStatus(sock, chatUpdate) {
    const msg = chatUpdate.messages[0];
    if (!msg) return;
    await handleAutoStatus(sock, { messages: [msg] });
}

async function handlePostUpdateMessage(sock) {
    try {
        const flagFile = path.join(__dirname, 'data', 'update_just_done.flag');
        if (fs.existsSync(flagFile)) {
            const data = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
            if (Date.now() - data.timestamp < 60000) {
                console.log('✅ Update flag detected – bot updated successfully');
                fs.unlinkSync(flagFile);
            }
        }
    } catch {}
}

module.exports = { handleMessages, handleGroupParticipantUpdate, handleStatus, handlePostUpdateMessage };
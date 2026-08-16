// commands/bigmanj.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const fs = require('fs');
const path = require('path');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// ─── Helper: strip emojis from text ─────────────────────
function stripEmojis(text) {
    return text.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F1E0}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F400}-\u{1F4FF}\u{1F500}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F1E0}-\u{1F1FF}]/gu, ''
    );
}

// ─── Helper: send rich response ─────────────────────────
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

// ─── State management ────────────────────────────────────
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch { return { perGroup: {}, private: false }; }
}

function saveState(state) {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Memory management ──────────────────────────────────
function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        for (const id in data) {
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 600000)) {
                delete data[id];
                changed = true;
            }
        }
        if (changed) saveMemory(data);
        return data;
    } catch { return {}; }
}

function saveMemory(memory) {
    const dir = path.dirname(MEMORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

// ─── Language detection (kept for AI) ──────────────────
function detectLanguage(text) {
    const swahiliWords = [
        'habari', 'jina', 'asante', 'tafadhali', 'sawa', 'ndio', 'hapana',
        'kwaheri', 'pole', 'nzuri', 'mbaya', 'leo', 'kesho', 'jana',
        'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao', 'ni', 'na', 'wa',
        'kwangu', 'kwako', 'kwake', 'kwetu', 'kwenu', 'kwao'
    ];
    const lower = text.toLowerCase();
    const count = swahiliWords.filter(w => lower.includes(w)).length;
    return count > 0 ? 'sw' : 'en';
}

// ─── Media detection ────────────────────────────────────
function detectMediaAndText(m) {
    const msg = m.message;
    if (!msg) return { type: 'none', text: '', caption: '' };

    if (msg.stickerMessage) return { type: 'sticker', text: '[Sticker]', caption: '' };
    if (msg.videoMessage && msg.videoMessage.gifPlayback) {
        const caption = msg.videoMessage.caption || '';
        return { type: 'gif', text: caption || '[GIF]', caption, duration: msg.videoMessage.seconds || 0 };
    }
    if (msg.videoMessage && !msg.videoMessage.gifPlayback) {
        const caption = msg.videoMessage.caption || '';
        const seconds = msg.videoMessage.seconds || 0;
        return { type: 'video', text: caption || `[Video, ${Math.round(seconds)}s]`, caption, duration: seconds };
    }
    if (msg.audioMessage && msg.audioMessage.ptt === true) {
        const seconds = msg.audioMessage.seconds || 0;
        return { type: 'voice', text: `[Voice note, ${Math.round(seconds)}s]`, caption: '', duration: seconds };
    }
    if (msg.audioMessage && msg.audioMessage.ptt !== true) {
        const seconds = msg.audioMessage.seconds || 0;
        if (seconds >= 60 && seconds <= 120) {
            return { type: 'audio', text: `[Audio, ${Math.round(seconds)}s]`, caption: '', duration: seconds };
        } else {
            return { type: 'ignore', text: '', caption: '' };
        }
    }
    if (msg.imageMessage) {
        const caption = msg.imageMessage.caption || '';
        return { type: 'image', text: caption || '[Image]', caption };
    }
    const text = (msg.conversation || msg.extendedTextMessage?.text || '').trim();
    if (text) return { type: 'text', text, caption: '' };
    return { type: 'none', text: '', caption: '' };
}

// ─── AI API call ────────────────────────────────────────
async function getAIReply(prompt) {
    try {
        const url = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(prompt)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data?.response || data?.result || data?.message || data?.data || "";
    } catch { return ""; }
}

// ─── Main command ─────────────────────────────────────────
module.exports = {
    name: "bigmanj",
    aliases: ["bmj", "chatbot"],
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

        const state = loadState();
        const sub = args[0]?.toLowerCase() || '';
        const isGroup = chatId.endsWith('@g.us');

        // ─── Help ──────────────────────────────────────
        if (!sub || !['on', 'off', 'status'].includes(sub)) {
            const body = 
`› ${prefix}bigmanj on      - Enable chatbot in this chat
› ${prefix}bigmanj off     - Disable chatbot
› ${prefix}bigmanj status  - Show current status`;
            await sendRichResponse(sock, chatId, 'Chatbot', body, msg);
            return;
        }

        // ─── Status ────────────────────────────────────
        if (sub === 'status') {
            const enabled = isGroup
                ? !!(state.perGroup?.[chatId]?.enabled)
                : !!state.private;
            const status = enabled ? 'ACTIVE' : 'INACTIVE';
            const body = `Status   : ${status}\nMode     : ${isGroup ? 'Group' : 'Private'}`;
            await sendRichResponse(sock, chatId, 'Chatbot Status', body, msg);
            return;
        }

        const enable = sub === 'on';

        // ─── Toggle ────────────────────────────────────
        if (isGroup) {
            if (!state.perGroup) state.perGroup = {};
            state.perGroup[chatId] = { enabled: enable };
        } else {
            state.private = enable;
        }
        saveState(state);

        const body = enable
            ? 'Chatbot enabled. I will respond to all messages in this chat.'
            : 'Chatbot disabled. I will no longer respond here.';

        await sendRichResponse(sock, chatId, `Chatbot ${enable ? 'Activated' : 'Deactivated'}`, body, msg);
    }
};

// ─── Chatbot message handler (exported for main.js) ────
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const { type, text, caption, duration } = detectMediaAndText(m);
        if (type === 'ignore') return;

        let finalText = text;
        if (type === 'text' && userText) finalText = userText;
        if (!finalText && type !== 'none') finalText = `[${type}]`;

        // Skip commands
        if (type === 'text' && (finalText.startsWith('.') || finalText.startsWith('!') || finalText.startsWith('/'))) return;

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        const detectedLang = detectLanguage(finalText);
        const langInstruction = detectedLang === 'sw' ? 'Jibu kwa Kiswahili.' : 'Respond in English.';

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        const userName = m.pushName || 'User';

        let userDisplay = finalText;
        if (type !== 'text') {
            if (type === 'sticker') userDisplay = 'sent a sticker';
            else if (type === 'gif') userDisplay = `sent a GIF${caption ? `: "${caption}"` : ''}`;
            else if (type === 'video') userDisplay = `sent a video (${Math.round(duration)}s)${caption ? `: "${caption}"` : ''}`;
            else if (type === 'voice') userDisplay = `sent a voice note (${Math.round(duration)}s)`;
            else if (type === 'audio') userDisplay = `sent an audio file (${Math.round(duration)}s)`;
            else if (type === 'image') userDisplay = `sent an image${caption ? `: "${caption}"` : ''}`;
        }

        memory[chatId].chats.push({ role: "user", content: userDisplay, name: userName });
        memory[chatId].lastUpdate = Date.now();
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats.map(msg => `${msg.role === 'user' ? msg.name : 'BIGMANj'}: ${msg.content}`).join("\n");

        const systemPrompt = `[ROLE]: You are BIGMANj, a witty and helpful chatbot.
[TARGET]: Talking to "${userName}".
[LANGUAGE]: ${langInstruction}
[STRICT RULES]:
1. IDENTITY: You are BIGMANj, not ChatGPT or OpenAI.
2. PERSONALITY: Be friendly and conversational. Use casual language.
3. CONTEXT: Address "${userName}" when appropriate.
4. BREVITY: Keep responses short and direct.
5. OWNER: For technical issues, refer to the owner.
6. FORMAT: Reply in plain text only.`;

        const fullPrompt = `${systemPrompt}\n\nHISTORY:\n${history}\n\n${userName}: ${userDisplay}\nBIGMANj:`;
        let reply = await getAIReply(fullPrompt);

        // Fallback replies
        if (!reply) {
            if (detectedLang === 'sw') {
                if (type === 'sticker') reply = "Stika nzuri mwanangu!";
                else if (type === 'gif') reply = "Hiyo GIF inachekesha!";
                else if (type === 'video') reply = "Video poa!";
                else if (type === 'voice') reply = "Nimeelewa sauti yako.";
                else if (type === 'image') reply = "Picha nzuri!";
                else reply = "Sawa, naendelea kusikiliza.";
            } else {
                if (type === 'sticker') reply = "Nice sticker!";
                else if (type === 'gif') reply = "That GIF is funny!";
                else if (type === 'video') reply = "Cool video!";
                else if (type === 'voice') reply = "Got your voice note.";
                else if (type === 'image') reply = "Nice image!";
                else reply = "Okay, I'm listening.";
            }
        }

        // Remove any mention of other AI names
        reply = reply.replace(/ChatGPT|OpenAI|GPT-3|GPT-4/gi, "BIGMANj");

        // Strip emojis from the reply to match style
        reply = stripEmojis(reply);

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        // Append footer
        const finalReply = `${reply}\n\n${FOOTER}`;

        await sock.sendMessage(chatId, { text: finalReply }, { quoted: m });
    } catch (err) {
        console.error('Chatbot Error:', err);
        const errMsg = detectLanguage(userText || '') === 'sw'
            ? `Samahani, kuna hitilafu. Jaribu tena.\n\n${FOOTER}`
            : `Sorry, an error occurred. Try again.\n\n${FOOTER}`;
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: m });
    }
}

// ─── Exports for main.js ──────────────────────────────
module.exports.handleChatbotMessage = handleChatbotMessage;
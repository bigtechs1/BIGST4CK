// lib/lightweight_store.js
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../data', 'store.json');
const messages = {};

function readFromFile() {
    try {
        if (!fs.existsSync(STORE_PATH)) return;
        const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        Object.assign(messages, data);
    } catch {}
}

function writeToFile() {
    try {
        const dir = path.dirname(STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STORE_PATH, JSON.stringify(messages, null, 2));
    } catch {}
}

function bind(ev) {
    ev.on('messages.upsert', (chatUpdate) => {
        const mek = chatUpdate.messages[0];
        if (!mek) return;
        const jid = mek.key.remoteJid;
        if (!messages[jid]) messages[jid] = [];
        messages[jid].push(mek);
        if (messages[jid].length > 100) messages[jid].shift();
    });
}

function loadMessage(jid, id) {
    const msgs = messages[jid] || [];
    return msgs.find(m => m.key.id === id);
}

module.exports = { messages, readFromFile, writeToFile, bind, loadMessage };
// config.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('Failed to load config.json:', err.message);
    process.exit(1);
}

// ─── Helper methods ──────────────────────────────────
config.isOwnerOrCo = function(senderId) {
    const mainOwner = this.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const coOwners = (this.co || [])
        .filter(c => !c.invisible)
        .map(c => c.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    return senderId === mainOwner || coOwners.includes(senderId);
};

config.getOwnerJid = function() {
    return this.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
};

config.getOwnerNumbers = function() {
    const numbers = [this.ownerNumber.replace(/[^0-9]/g, '')];
    if (this.co) {
        for (const co of this.co) {
            if (co.id) numbers.push(co.id.replace(/[^0-9]/g, ''));
        }
    }
    return numbers;
};

module.exports = config;
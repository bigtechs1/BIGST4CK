// config.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load config.json
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('Failed to load config.json:', err.message);
    process.exit(1);
}

// Add helper methods
config.isOwnerOrCo = function(senderId) {
    const owner = this.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const coOwners = (this.owner.co || [])
        .filter(c => !c.invisible)
        .map(c => c.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    return senderId === owner || coOwners.includes(senderId);
};

// Also keep global APIs if needed
global.APIs = {
    xteam: 'https://api.xteam.xyz',
    dzx: 'https://api.dhamzxploit.my.id',
    lol: 'https://api.lolhuman.xyz',
    violetics: 'https://violetics.pw',
    neoxr: 'https://api.neoxr.my.id',
    zenzapis: 'https://zenzapis.xyz',
    akuari: 'https://api.akuari.my.id',
    akuari2: 'https://apimu.my.id',
    nrtm: 'https://fg-nrtm.ddns.net',
    bg: 'http://bochil.ddns.net',
    fgmods: 'https://api-fgmods.ddns.net'
};

global.APIKeys = {
    'https://api.xteam.xyz': 'd90a9e986e18778b',
    'https://api.lolhuman.xyz': '85faf717d0545d14074659ad',
    'https://api.neoxr.my.id': 'yourkey',
    'https://violetics.pw': 'beta',
    'https://zenzapis.xyz': 'yourkey',
    'https://api-fgmods.ddns.net': 'fg-dylux'
};

module.exports = config;
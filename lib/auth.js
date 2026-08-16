// lib/auth.js
const config = require('../config');

function isOwner(senderId) {
    const owner = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    return senderId === owner;
}

function isOwnerOrCo(senderId) {
    const owner = config.owner.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const coOwners = (config.owner.co || [])
        .filter(c => !c.invisible)
        .map(c => c.id.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    return senderId === owner || coOwners.includes(senderId);
}

// Registration helpers (if you implement registration)
function isRegistered(userId) {
    // Placeholder – you can integrate with your users.json
    return true; // For now, all users are considered registered
}

function getUserData(userId) {
    // Placeholder
    return null;
}

module.exports = { isOwner, isOwnerOrCo, isRegistered, getUserData };
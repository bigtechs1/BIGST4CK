// lib/isOwner.js
const { isOwnerOrCo } = require('./auth');

// Legacy function for compatibility
async function isOwnerOrSudo(senderId, sock, chatId) {
    return isOwnerOrCo(senderId);
}

module.exports = isOwnerOrSudo;
// lib/auth.js
const config = require('../config');
const fs = require('fs');
const path = require('path');

const USER_FILE = path.join(__dirname, '../data', 'users.json');

function loadUsers() {
    try {
        if (!fs.existsSync(USER_FILE)) return {};
        return JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
    } catch { return {}; }
}

function saveUsers(users) {
    const dir = path.dirname(USER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

function isRegistered(userId) {
    const users = loadUsers();
    return !!users[userId];
}

function registerUser(userId, username) {
    const users = loadUsers();
    if (users[userId]) return false;
    users[userId] = { username, registeredAt: new Date().toISOString() };
    saveUsers(users);
    return true;
}

function getUserData(userId) {
    const users = loadUsers();
    return users[userId] || null;
}

function isOwnerOrCo(senderId) {
    return config.isOwnerOrCo(senderId);
}

function isOwner(senderId) {
    const owner = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    return senderId === owner;
}

module.exports = { isRegistered, registerUser, getUserData, isOwnerOrCo, isOwner, loadUsers, saveUsers };
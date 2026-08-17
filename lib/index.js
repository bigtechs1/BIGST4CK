// lib/index.js
const fs = require('fs');
const path = require('path');

const ANTILINK_PATH = path.join(__dirname, '../data', 'antilink.json');
const WARN_PATH = path.join(__dirname, '../data', 'antilink_warnings.json');

function loadData(file) {
    try {
        if (!fs.existsSync(file)) return {};
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { return {}; }
}

function saveData(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function setAntilink(groupId, mode, action) {
    const data = loadData(ANTILINK_PATH);
    if (!data[groupId]) data[groupId] = {};
    data[groupId].enabled = true;
    data[groupId].action = action;
    saveData(ANTILINK_PATH, data);
    return true;
}

async function getAntilink(groupId, mode) {
    const data = loadData(ANTILINK_PATH);
    return data[groupId] || null;
}

async function removeAntilink(groupId, mode) {
    const data = loadData(ANTILINK_PATH);
    if (data[groupId]) {
        data[groupId].enabled = false;
        saveData(ANTILINK_PATH, data);
    }
    return true;
}

async function incrementWarningCount(groupId, userId) {
    const data = loadData(WARN_PATH);
    if (!data[groupId]) data[groupId] = {};
    if (!data[groupId][userId]) data[groupId][userId] = 0;
    data[groupId][userId] += 1;
    saveData(WARN_PATH, data);
    return data[groupId][userId];
}

async function resetWarningCount(groupId, userId) {
    const data = loadData(WARN_PATH);
    if (data[groupId] && data[groupId][userId]) {
        delete data[groupId][userId];
        saveData(WARN_PATH, data);
    }
}

module.exports = { setAntilink, getAntilink, removeAntilink, incrementWarningCount, resetWarningCount };
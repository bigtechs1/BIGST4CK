// lib/index.js
const fs = require('fs');
const path = require('path');

const ANTILINK_PATH = path.join(process.cwd(), 'data', 'antilink.json');

function loadAntilinkData() {
    try {
        if (!fs.existsSync(ANTILINK_PATH)) return {};
        return JSON.parse(fs.readFileSync(ANTILINK_PATH, 'utf8'));
    } catch { return {}; }
}

function saveAntilinkData(data) {
    const dir = path.dirname(ANTILINK_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ANTILINK_PATH, JSON.stringify(data, null, 2));
}

async function setAntilink(groupId, mode, action) {
    const data = loadAntilinkData();
    if (!data[groupId]) data[groupId] = {};
    data[groupId].enabled = true;
    data[groupId].action = action;
    saveAntilinkData(data);
    return true;
}

async function getAntilink(groupId, mode) {
    const data = loadAntilinkData();
    return data[groupId] || null;
}

async function removeAntilink(groupId, mode) {
    const data = loadAntilinkData();
    if (data[groupId]) {
        data[groupId].enabled = false;
        saveAntilinkData(data);
    }
    return true;
}

// Warning counters (if used by antilink)
const WARN_PATH = path.join(process.cwd(), 'data', 'antilink_warnings.json');

function loadWarnings() {
    try {
        if (!fs.existsSync(WARN_PATH)) return {};
        return JSON.parse(fs.readFileSync(WARN_PATH, 'utf8'));
    } catch { return {}; }
}

function saveWarnings(data) {
    const dir = path.dirname(WARN_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WARN_PATH, JSON.stringify(data, null, 2));
}

async function incrementWarningCount(groupId, userId) {
    const data = loadWarnings();
    if (!data[groupId]) data[groupId] = {};
    if (!data[groupId][userId]) data[groupId][userId] = 0;
    data[groupId][userId] += 1;
    saveWarnings(data);
    return data[groupId][userId];
}

async function resetWarningCount(groupId, userId) {
    const data = loadWarnings();
    if (data[groupId] && data[groupId][userId]) {
        delete data[groupId][userId];
        saveWarnings(data);
    }
}

module.exports = {
    setAntilink,
    getAntilink,
    removeAntilink,
    incrementWarningCount,
    resetWarningCount
};
// lib/myfunc.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getBuffer(url, options = {}) {
    try {
        const response = await axios({
            method: 'get',
            url,
            responseType: 'arraybuffer',
            timeout: 30000,
            ...options
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.error('getBuffer error:', err);
        return null;
    }
}

async function fetchBuffer(url, options = {}) {
    return getBuffer(url, options);
}

function convertMsToDuration(ms) {
    if (!ms || ms < 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    getBuffer,
    fetchBuffer,
    convertMsToDuration,
    formatBytes
};
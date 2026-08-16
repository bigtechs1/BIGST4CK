// commands/checkupdates.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const { isOwnerOrCo } = require('../lib/auth');
const isOwnerOrSudo = require('../lib/isOwner'); // fallback, but we'll use the new one
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Configuration ──────────────────────────────────────
const REMINDER_FILE = path.join(__dirname, '../data/updateReminder.json');
const VERSION_FILE = path.join(__dirname, '../data/currentVersion.json');
const LOCAL_MANIFEST_FILE = path.join(__dirname, '../data/localManifest.json');
const REPO_OWNER = 'bigtechs1';
const REPO_NAME = 'BIGST4CK';

let reminderCache = null;

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

// ─── Reminder helpers ────────────────────────────────────
async function loadReminder() {
    if (reminderCache) return reminderCache;
    try {
        const data = await fs.readFile(REMINDER_FILE, 'utf8');
        reminderCache = JSON.parse(data);
    } catch {
        reminderCache = { lastCheck: null, updateFound: false, updateHash: null, autoReminder: false };
        await saveReminder();
    }
    return reminderCache;
}

async function saveReminder() {
    try {
        await fs.mkdir(path.dirname(REMINDER_FILE), { recursive: true });
        await fs.writeFile(REMINDER_FILE, JSON.stringify(reminderCache, null, 2));
    } catch (err) {
        console.error('[UpdateReminder] Save failed:', err.message);
    }
}

// ─── Scan files ──────────────────────────────────────────
async function scanAllFiles(rootDir) {
    const ignoreDirs = new Set([
        'node_modules', '.git', 'data', 'auth_info', 'tmp', 'logs',
        'session', 'cache', 'uploads', 'temp', 'assets', 'public'
    ]);
    const ignoreFiles = new Set([
        '.env', '.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'thumbs.db', 'desktop.ini', '.gitignore', '.gitattributes', '.editorconfig'
    ]);
    const includeExtensions = new Set([
        '.js', '.json', '.md', '.txt', '.example', '.yml', '.yaml',
        '.html', '.css', '.xml', '.svg', '.ico', '.png', '.jpg', '.jpeg',
        '.gif', '.webp', '.ttf', '.otf', '.woff', '.woff2', '.eot',
        '.sh', '.bat', '.cmd', '.ps1', '.py', '.rb', '.go', '.java', '.c', '.cpp'
    ]);
    const alwaysInclude = new Set([
        'Procfile', '.env.example', 'Dockerfile', 'config', 'settings',
        'package.json', 'tsconfig.json', 'webpack.config.js', 'rollup.config.js'
    ]);

    const fileList = [];

    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (ignoreDirs.has(entry.name)) continue;
            if (ignoreFiles.has(entry.name)) continue;
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                const shouldInclude = includeExtensions.has(ext) || alwaysInclude.has(entry.name);
                if (shouldInclude) {
                    fileList.push(fullPath);
                }
            }
        }
    }

    await walk(rootDir);
    return fileList;
}

// ─── Compute manifest ──────────────────────────────────
async function computeManifest(files) {
    const manifest = {};
    for (const file of files) {
        try {
            const stat = await fs.stat(file);
            const content = await fs.readFile(file);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            manifest[file] = {
                hash,
                size: stat.size,
                mtime: stat.mtimeMs
            };
        } catch { /* skip */ }
    }
    return manifest;
}

// ─── Load stored manifest ──────────────────────────────
async function loadStoredManifest() {
    try {
        const data = await fs.readFile(LOCAL_MANIFEST_FILE, 'utf8');
        return JSON.parse(data);
    } catch { return null; }
}

async function saveManifest(manifest) {
    await fs.mkdir(path.dirname(LOCAL_MANIFEST_FILE), { recursive: true });
    await fs.writeFile(LOCAL_MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

// ─── Check local changes ──────────────────────────────
async function checkLocalChanges() {
    const rootDir = path.join(__dirname, '..');
    const files = await scanAllFiles(rootDir);
    const currentManifest = await computeManifest(files);
    const storedManifest = await loadStoredManifest();

    if (!storedManifest) {
        await saveManifest(currentManifest);
        return { changed: false, changedFiles: [], currentManifest };
    }

    const changedFiles = [];
    const allKeys = new Set([...Object.keys(currentManifest), ...Object.keys(storedManifest)]);
    for (const key of allKeys) {
        const current = currentManifest[key];
        const stored = storedManifest[key];
        if (!current || !stored || current.hash !== stored.hash) {
            changedFiles.push(key);
        }
    }

    return {
        changed: changedFiles.length > 0,
        changedFiles,
        currentManifest
    };
}

// ─── Remote check (GitHub) ──────────────────────────────
async function getLatestCommit() {
    const repoInfo = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: { 'User-Agent': 'BIGST4CK' },
        timeout: 5000
    });
    const defaultBranch = repoInfo.data.default_branch;
    const commitRes = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${defaultBranch}`, {
        headers: { 'User-Agent': 'BIGST4CK' },
        timeout: 5000
    });
    return { sha: commitRes.data.sha, branch: defaultBranch };
}

async function getStoredVersion() {
    try {
        const data = await fs.readFile(VERSION_FILE, 'utf8');
        return JSON.parse(data).sha;
    } catch { return null; }
}

async function saveVersion(sha) {
    await fs.mkdir(path.dirname(VERSION_FILE), { recursive: true });
    await fs.writeFile(VERSION_FILE, JSON.stringify({ sha, updatedAt: new Date().toISOString() }, null, 2));
}

async function checkRemoteUpdates() {
    try {
        const { sha: latestSha, branch } = await getLatestCommit();
        let currentSha = await getStoredVersion();
        if (!currentSha) {
            await saveVersion(latestSha);
            return { available: false, latestSha, currentSha, branch };
        }
        const available = currentSha !== latestSha;
        let changedFiles = [];
        if (available) {
            const compareRes = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/${currentSha}...${latestSha}`, {
                headers: { 'User-Agent': 'BIGST4CK' },
                timeout: 5000
            });
            changedFiles = compareRes.data.files.map(f => f.filename);
        }
        return { available, latestSha, currentSha, branch, changedFiles };
    } catch (err) {
        console.error('Remote check error:', err);
        return { available: false, error: err.message };
    }
}

// ─── Format output ──────────────────────────────────────
function formatUpdateInfo(localResult, remoteResult) {
    let output = '';

    // Local changes
    if (localResult.changed) {
        output += `» Local Changes\n`;
        output += `› Files modified: ${localResult.changedFiles.length}\n`;
        const maxShow = 20;
        const showFiles = localResult.changedFiles.slice(0, maxShow);
        for (const file of showFiles) {
            const relative = path.relative(path.join(__dirname, '..'), file);
            output += `  • ${relative}\n`;
        }
        if (localResult.changedFiles.length > maxShow) {
            output += `  • ... and ${localResult.changedFiles.length - maxShow} more\n`;
        }
        output += `\n› Use .checkupdates resetlocal after verification.\n\n`;
    } else {
        output += `» No local changes.\n\n`;
    }

    // Remote updates
    if (remoteResult.error) {
        output += `» Failed to check GitHub: ${remoteResult.error}\n\n`;
    } else if (remoteResult.available) {
        output += `» Update available from GitHub!\n`;
        output += `› Your version: ${remoteResult.currentSha?.slice(0,7) || 'unknown'}\n`;
        output += `› New version : ${remoteResult.latestSha.slice(0,7)}\n`;
        output += `› Branch     : ${remoteResult.branch}\n`;
        if (remoteResult.changedFiles && remoteResult.changedFiles.length) {
            output += `\n» Modified files:\n`;
            const maxShow = 20;
            const showFiles = remoteResult.changedFiles.slice(0, maxShow);
            for (const file of showFiles) {
                output += `  • ${file}\n`;
            }
            if (remoteResult.changedFiles.length > maxShow) {
                output += `  • ... and ${remoteResult.changedFiles.length - maxShow} more\n`;
            }
        }
        output += `\n› After updating, use .checkupdates resetlocal\n`;
    } else {
        output += `» Bot is up-to-date (remote)!\n`;
        output += `› Version: ${remoteResult.currentSha?.slice(0,7) || 'unknown'}\n`;
    }

    return output;
}

// ─── Main command ─────────────────────────────────────────
module.exports = {
    name: "checkupdates",
    aliases: ["cupdate", "cupdates"],
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

        const reminder = await loadReminder();
        const cmd = args[0]?.toLowerCase() || '';

        // ─── Auto toggle ──────────────────────────────
        if (cmd === 'auto') {
            reminder.autoReminder = !reminder.autoReminder;
            await saveReminder();
            const status = reminder.autoReminder ? 'ENABLED' : 'DISABLED';
            const body = `Auto-reminder: ${status}`;
            await sendRichResponse(sock, chatId, 'Update Reminder', body, msg);
            return;
        }

        // ─── Status ────────────────────────────────────
        if (cmd === 'status') {
            const status = reminder.autoReminder ? 'ENABLED' : 'DISABLED';
            const body = `Auto-reminder: ${status}\n\nUse .checkupdates auto to toggle.`;
            await sendRichResponse(sock, chatId, 'Update Reminder Status', body, msg);
            return;
        }

        // ─── Reset remote ─────────────────────────────
        if (cmd === 'reset') {
            try {
                const { sha, branch } = await getLatestCommit();
                await saveVersion(sha);
                const body = `Version reset (remote)\nNew version: ${sha.slice(0,7)} (branch: ${branch})`;
                await sendRichResponse(sock, chatId, 'Update Reset', body, msg);
            } catch (err) {
                await sendRichResponse(sock, chatId, 'Error', `Failed to reset: ${err.message}`, msg);
            }
            return;
        }

        // ─── Reset local ─────────────────────────────
        if (cmd === 'resetlocal') {
            try {
                const rootDir = path.join(__dirname, '..');
                const files = await scanAllFiles(rootDir);
                const manifest = await computeManifest(files);
                await saveManifest(manifest);
                await sendRichResponse(sock, chatId, 'Local Reset', 'Local manifest has been updated.', msg);
            } catch (err) {
                await sendRichResponse(sock, chatId, 'Error', `Failed: ${err.message}`, msg);
            }
            return;
        }

        // ─── Full check ──────────────────────────────
        try {
            const [localResult, remoteResult] = await Promise.all([
                checkLocalChanges(),
                checkRemoteUpdates()
            ]);

            const updateMsg = formatUpdateInfo(localResult, remoteResult);
            await sendRichResponse(sock, chatId, 'Update Check', updateMsg, msg);

            // Handle auto-reminder
            if (remoteResult.available && reminder.autoReminder) {
                const hash = remoteResult.latestSha.slice(0, 10);
                if (hash !== reminder.updateHash) {
                    reminder.updateHash = hash;
                    reminder.updateFound = true;
                    reminder.lastCheck = new Date().toISOString();
                    await saveReminder();
                    await sock.sendMessage(chatId, {
                        text: `» Reminder: Update available. Use .checkupdates reset after downloading.`
                    });
                }
            } else if (!remoteResult.available && !remoteResult.error) {
                reminder.updateFound = false;
                reminder.updateHash = null;
                await saveReminder();
            }
        } catch (err) {
            console.error('CheckUpdates failed:', err);
            await sendRichResponse(sock, chatId, 'Error', `Failed to check updates: ${err.message || err}`, msg);
        }
    }
};
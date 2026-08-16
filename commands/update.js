// commands/update.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { AIRich } = require('../lib/NIXCODE');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const MAIN_REPO = 'https://github.com/brightsonnjegite-sudo/BIGMANJ-BOT-V3';

// ─── Helper: extract phone number from JID ──────────────
function extractPhoneNumber(jid) {
    if (!jid) return null;
    const localPart = jid.split('@')[0];
    if (/^\d+$/.test(localPart) && localPart.length >= 10) return localPart;
    return null;
}

// ─── Helper: send rich status message ────────────────────
async function sendRichStatus(sock, chatId, title, body, msg, extra = {}) {
    const rich = new AIRich(sock)
        .setTitle(title)
        .addText(body)
        .setFooter(FOOTER);
    if (extra.thumbnail) rich.addImage(extra.thumbnail);
    await rich.send(chatId, { quoted: msg });
}

// ─── Helper: cycle reactions (silent, no text) ───────────
async function cycleReactions(sock, messageKey, reactions, delayMs = 2000) {
    for (const emoji of reactions) {
        await sock.sendMessage(messageKey.remoteJid, { react: { text: emoji, key: messageKey } });
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

// ─── Main command ─────────────────────────────────────────
module.exports = {
    name: "update",
    aliases: ["upgrade", "gitpull"],
    category: "owner",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const senderId = ctx.sender.jid;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        // ─── Owner check ──────────────────────────────
        const senderNumber = extractPhoneNumber(senderId);
        const isOwner = isOwnerOrCo(senderId) || msg.key.fromMe;
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: `» ${config.msg.owner || 'This command is restricted to the bot owner.'}`
            }, { quoted: msg });
            return;
        }

        const sub = args[0]?.toLowerCase() || '';

        // ─── Version subcommand ───────────────────────────
        if (sub === 'version') {
            try {
                const packageJson = require(path.join(process.cwd(), 'package.json'));
                const currentVersion = packageJson.version || '3.0.5';
                let commitInfo = '';
                try {
                    const apiUrl = 'https://api.github.com/repos/brightsonnjegite-sudo/BIGMANJ-BOT-V3/commits/main';
                    const response = await axios.get(apiUrl, { timeout: 5000 });
                    const latest = response.data;
                    commitInfo = `Latest commit: ${latest.commit.message.slice(0, 50)}...\nDate: ${new Date(latest.commit.author.date).toLocaleString()}`;
                } catch {
                    commitInfo = 'Could not fetch remote info.';
                }
                const body = `Version   : ${currentVersion}\n${commitInfo}`;
                await sendRichStatus(sock, chatId, '» Bot Version', body, msg);
            } catch (err) {
                await sock.sendMessage(chatId, { text: `» Version check failed.\n${FOOTER}` }, { quoted: msg });
            }
            return;
        }

        // ─── Update subcommand ────────────────────────────
        // Determine update source
        let updateUrl = `${MAIN_REPO}/archive/refs/heads/main.zip`;
        if (sub === 'branch' && args[1]) {
            const branch = args[1];
            updateUrl = `${MAIN_REPO}/archive/refs/heads/${branch}.zip`;
        } else if (sub && sub.startsWith('http')) {
            updateUrl = sub;
        } else if (sub === 'update') {
            // default
        } else {
            // If no args, show usage
            const usage =
`» Update Command
»
› ${prefix}update             - Update from main branch
› ${prefix}update branch <name> - Update from specific branch
› ${prefix}update <url>       - Update from custom ZIP URL
› ${prefix}version            - Check current version
${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: msg });
            return;
        }

        // ─── Start update process ─────────────────────────
        const startMsg = await sock.sendMessage(chatId, {
            text: `» Starting update from:\n› ${updateUrl}\n${FOOTER}`
        }, { quoted: msg });

        // cycle reactions silently
        cycleReactions(sock, startMsg, ['⏳', '🔄', '♻️'], 1500).catch(console.error);

        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bigmanj_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        try {
            // Clean temp dir
            if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
            fs.ensureDirSync(tmpDir);

            // Download ZIP
            const response = await axios({
                method: 'get',
                url: updateUrl,
                responseType: 'stream',
                timeout: 90000,
                headers: { 'User-Agent': 'BIGST4CK-Bot/3.0' }
            });

            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Extract ZIP
            await new Promise((resolve, reject) => {
                exec(`unzip -o ${zipPath} -d ${extractPath}`, async (err, stdout, stderr) => {
                    if (err) {
                        // Try alternative method using adm-zip
                        try {
                            const AdmZip = require('adm-zip');
                            const zip = new AdmZip(zipPath);
                            zip.extractAllTo(extractPath, true);
                            resolve();
                        } catch (zipErr) {
                            reject(new Error(`Extraction failed: ${zipErr.message}`));
                        }
                    } else {
                        resolve();
                    }
                });
            });

            // Find extracted root folder
            const folders = fs.readdirSync(extractPath);
            if (folders.length === 0) throw new Error('No files extracted');
            let rootFolder = path.join(extractPath, folders[0]);
            // Handle nested folders (some repos have extra level)
            while (fs.readdirSync(rootFolder).length === 1 &&
                   fs.statSync(path.join(rootFolder, fs.readdirSync(rootFolder)[0])).isDirectory()) {
                rootFolder = path.join(rootFolder, fs.readdirSync(rootFolder)[0]);
            }

            // Protected items (keep them)
            const protectedItems = [
                'node_modules', 'session', 'auth_info_baileys', 'sessions', '.git', '.env',
                'config.json', 'settings.js', 'database.json', 'data'
            ];

            // Copy files
            const files = fs.readdirSync(rootFolder);
            let copiedCount = 0, skippedCount = 0;

            for (const file of files) {
                const shouldProtect = protectedItems.some(protected =>
                    file === protected || file.startsWith(protected + '/')
                );
                if (!shouldProtect && file !== 'BIGMANJ-BOT-V3-main') {
                    const src = path.join(rootFolder, file);
                    const dest = path.join(process.cwd(), file);
                    if (fs.existsSync(src)) {
                        fs.copySync(src, dest, { overwrite: true });
                        copiedCount++;
                    }
                } else {
                    skippedCount++;
                }
            }

            // Update package.json scripts if needed
            const newPackagePath = path.join(rootFolder, 'package.json');
            const currentPackagePath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(newPackagePath)) {
                const newPkg = require(newPackagePath);
                const curPkg = require(currentPackagePath);
                if (newPkg.scripts && !curPkg.scripts) {
                    curPkg.scripts = newPkg.scripts;
                    fs.writeFileSync(currentPackagePath, JSON.stringify(curPkg, null, 2));
                }
            }

            // Clean temp
            fs.removeSync(tmpDir);

            // ─── Success ──────────────────────────────────
            const successBody =
`Update completed.
Copied: ${copiedCount} files, Skipped: ${skippedCount} protected items.

Bot will restart in 5 seconds.`;
            await sendRichStatus(sock, chatId, '» Update Successful', successBody, msg);

            // Flag that update just happened (for post-update tasks)
            const flagFile = path.join(process.cwd(), 'data', 'update_just_done.flag');
            fs.ensureDirSync(path.dirname(flagFile));
            fs.writeFileSync(flagFile, JSON.stringify({
                timestamp: Date.now(),
                chatId: chatId
            }));

            // Restart bot
            console.log(chalk.yellow('🔄 Restarting BIGST4CK Bot...'));
            setTimeout(() => process.exit(0), 5000);

        } catch (error) {
            console.error('Update error:', error);
            fs.removeSync(tmpDir).catch(() => {});
            const errorBody = `Update failed.\nError: ${error.message}\n\nMake sure unzip is installed or the repo URL is correct.`;
            await sendRichStatus(sock, chatId, '» Update Failed', errorBody, msg);
        }
    }
};
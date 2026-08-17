// commands/update.js
const config = require('../config');
const { isOwnerOrCo } = require('../lib/auth');
const { AIRich } = require('../lib/NIXCODE');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const FOOTER = config.footer || `© ${config.botName}`;
const REPO_OWNER = 'bigtechs1';
const REPO_NAME = 'BIGST4CK';
const MAIN_REPO = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
const DEFAULT_BRANCH = 'main';
async function sendRichStatus(sock, chatId, title, body, msg) {
    const rich = new AIRich(sock).setTitle(title).addText(body).setFooter(FOOTER);
    await rich.send(chatId, { quoted: msg });
}
module.exports = {
    name: "update", aliases: ["upgrade", "gitpull"], category: "owner",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, senderId = ctx.sender.jid, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!isOwnerOrCo(senderId) && !msg.key.fromMe) { await sock.sendMessage(chatId, { text: `» ${config.owner || 'This command is restricted to the bot owner.'}` }, { quoted: msg }); return; }
        const sub = args[0]?.toLowerCase() || '';
        if (sub === 'version') {
            try {
                const packageJson = require(path.join(process.cwd(), 'package.json'));
                const currentVersion = packageJson.version || '3.0.5';
                let commitInfo = '';
                try { const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${DEFAULT_BRANCH}`; const response = await axios.get(apiUrl, { timeout: 5000 }); const latest = response.data; commitInfo = `Latest commit: ${latest.commit.message.slice(0, 50)}...\nDate: ${new Date(latest.commit.author.date).toLocaleString()}`; } catch { commitInfo = 'Could not fetch remote info.'; }
                const body = `Version: ${currentVersion}\n${commitInfo}`;
                await sendRichStatus(sock, chatId, '» Bot Version', body, msg);
            } catch (err) { await sock.sendMessage(chatId, { text: `» Version check failed.\n${FOOTER}` }, { quoted: msg }); }
            return;
        }
        let updateUrl = `${MAIN_REPO}/archive/refs/heads/${DEFAULT_BRANCH}.zip`;
        if (sub === 'branch' && args[1]) { const branch = args[1]; updateUrl = `${MAIN_REPO}/archive/refs/heads/${branch}.zip`; }
        else if (sub && sub.startsWith('http')) { updateUrl = sub; }
        else if (sub === 'update') { /* default */ }
        else {
            const usage = `» Update Command\n› ${prefix}update             - Update from ${DEFAULT_BRANCH} branch\n› ${prefix}update branch <name> - Update from specific branch\n› ${prefix}update <url>       - Update from custom ZIP URL\n› ${prefix}version            - Check current version\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: msg }); return;
        }
        const startMsg = await sock.sendMessage(chatId, { text: `» Starting update from:\n› ${updateUrl}\n${FOOTER}` }, { quoted: msg });
        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'update.zip');
        const extractPath = path.join(tmpDir, 'extracted');
        try {
            if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir); fs.ensureDirSync(tmpDir);
            const response = await axios({ method: 'get', url: updateUrl, responseType: 'stream', timeout: 90000, headers: { 'User-Agent': 'BIGST4CK-Bot/3.0' } });
            const writer = fs.createWriteStream(zipPath); response.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            await new Promise((resolve, reject) => {
                exec(`unzip -o ${zipPath} -d ${extractPath}`, async (err, stdout, stderr) => {
                    if (err) { try { const AdmZip = require('adm-zip'); const zip = new AdmZip(zipPath); zip.extractAllTo(extractPath, true); resolve(); } catch (zipErr) { reject(new Error(`Extraction failed: ${zipErr.message}`)); } } else { resolve(); } });
            });
            const folders = fs.readdirSync(extractPath);
            if (folders.length === 0) throw new Error('No files extracted');
            let rootFolder = path.join(extractPath, folders[0]);
            while (fs.readdirSync(rootFolder).length === 1 && fs.statSync(path.join(rootFolder, fs.readdirSync(rootFolder)[0])).isDirectory()) { rootFolder = path.join(rootFolder, fs.readdirSync(rootFolder)[0]); }
            const protectedItems = ['node_modules', 'session', 'auth_info_baileys', 'sessions', '.git', '.env', 'config.json', 'settings.js', 'database.json', 'data'];
            const files = fs.readdirSync(rootFolder); let copiedCount = 0, skippedCount = 0;
            for (const file of files) {
                const shouldProtect = protectedItems.some(protected => file === protected || file.startsWith(protected + '/'));
                if (!shouldProtect && file !== `${REPO_NAME}-${DEFAULT_BRANCH}` && file !== `${REPO_NAME}-master`) {
                    const src = path.join(rootFolder, file); const dest = path.join(process.cwd(), file);
                    if (fs.existsSync(src)) { fs.copySync(src, dest, { overwrite: true }); copiedCount++; }
                } else { skippedCount++; }
            }
            const newPackagePath = path.join(rootFolder, 'package.json');
            const currentPackagePath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(newPackagePath)) { const newPkg = require(newPackagePath); const curPkg = require(currentPackagePath); if (newPkg.scripts && !curPkg.scripts) { curPkg.scripts = newPkg.scripts; fs.writeFileSync(currentPackagePath, JSON.stringify(curPkg, null, 2)); } }
            fs.removeSync(tmpDir);
            const successBody = `Update completed.\nCopied: ${copiedCount} files, Skipped: ${skippedCount} protected items.\n\nBot will restart in 5 seconds.`;
            await sendRichStatus(sock, chatId, '» Update Successful', successBody, msg);
            const flagFile = path.join(process.cwd(), 'data', 'update_just_done.flag'); fs.ensureDirSync(path.dirname(flagFile)); fs.writeFileSync(flagFile, JSON.stringify({ timestamp: Date.now(), chatId: chatId }));
            console.log(chalk.yellow('🔄 Restarting BIGST4CK Bot...')); setTimeout(() => process.exit(0), 5000);
        } catch (error) {
            console.error('Update error:', error); fs.removeSync(tmpDir).catch(() => {});
            const errorBody = `Update failed.\nError: ${error.message}\n\nMake sure unzip is installed or the repo URL is correct.`;
            await sendRichStatus(sock, chatId, '» Update Failed', errorBody, msg);
        }
    }
};

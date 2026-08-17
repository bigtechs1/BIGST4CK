// commands/tiktok.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');
const FOOTER = config.footer || `© ${config.botName}`;
const AXIOS_DEFAULTS = { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } };
async function tryRequest(getter, attempts = 3) { let lastError; for (let attempt=1; attempt<=attempts; attempt++) { try { return await getter(); } catch (err) { lastError = err; if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt)); } } throw lastError; }
async function getTiktokDownload(url) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (!res?.data?.status || !res?.data?.data) throw new Error('No response from TikTok API');
    const d = res.data.data; const videoUrl = d.video; if (!videoUrl) throw new Error('Could not find video URL');
    return { url: videoUrl, title: d.title || 'TikTok Video', nickname: d.author?.nickname || 'Unknown', thumbnail: d.thumbnail || config.thumbnail };
}
module.exports = {
    name: "tiktok", aliases: ["tt", "ttdl"], category: "downloader",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const url = args.join(' ').trim();
        if (!url || !url.includes('tiktok.com')) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}tiktok <tiktok_url>\n› Example: ${prefix}tt https://www.tiktok.com/@user/video/123` }, { quoted: msg }); return; }
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });
        try {
            const data = await getTiktokDownload(url);
            await new AIRich(sock).setTitle(`» TikTok Video`).addImage(data.thumbnail).addVideo(data.url).addText(`» Author: ${data.nickname}\n» Title: ${data.title}\n» Link: ${url}`).addTip('Tap the video to play').setFooter(FOOTER).send(chatId, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Download failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

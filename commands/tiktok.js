// commands/tiktok.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');

const FOOTER = config.msg.footer || `© ${config.bot.name}`;
const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// ─── Helper: retry on failure ────────────────────────────
async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

// ─── TikTok download API ──────────────────────────────────
async function getTiktokDownload(url) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

    if (!res?.data?.status || !res?.data?.data) {
        throw new Error('No response from TikTok API');
    }

    const d = res.data.data;
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return {
        url: videoUrl,
        title: d.title || 'TikTok Video',
        nickname: d.author?.nickname || 'Unknown',
        thumbnail: d.thumbnail || config.bot.thumbnail
    };
}

// ─── Main command ─────────────────────────────────────────
module.exports = {
    name: "tiktok",
    aliases: ["tt", "ttdl"],
    category: "downloader",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        const url = args.join(' ').trim();

        // ─── Check URL ──────────────────────────────────
        if (!url || !url.includes('tiktok.com')) {
            const usage =
`» TikTok Downloader
»
› Usage: ${prefix}tiktok <tiktok_url>
› Example: ${prefix}tt https://www.tiktok.com/@user/video/123
${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: msg });
            return;
        }

        // ─── Prevent duplicate processing (optional) ──
        // You can add a processedMessages check if needed

        // ─── React to indicate processing ──────────────
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── Download data ──────────────────────────
            const tikData = await getTiktokDownload(url);

            // ─── Send rich card ──────────────────────────
            await new AIRich(sock)
                .setTitle(`» TikTok Video`)
                .addImage(tikData.thumbnail)
                .addVideo(tikData.url)
                .addText(
                    `» Author : ${tikData.nickname}\n` +
                    `» Title  : ${tikData.title}\n` +
                    `» Link   : ${url}`
                )
                .addTip('Tap the video to play')
                .setFooter(FOOTER)
                .send(chatId, { quoted: msg });

            // ─── Success reaction ──────────────────────
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('TikTok error:', error);
            await sock.sendMessage(chatId, {
                text: `» Download failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
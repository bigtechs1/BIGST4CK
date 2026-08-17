// commands/facebook.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');
const FOOTER = config.footer || `© ${config.botName}`;
async function tryHansaAPI(url) {
    try {
        const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { timeout: 25000 });
        const data = res.data;
        if (!data.success || !data.result) throw new Error('Hansa: No result');
        const videoList = data.result.result;
        if (!Array.isArray(videoList) || videoList.length === 0) throw new Error('Hansa: No video options');
        let selectedVideo = videoList.find(v => v.quality.includes('720') || v.quality.includes('HD'));
        if (!selectedVideo) selectedVideo = videoList[0];
        return { videoUrl: selectedVideo.url, title: data.result.title || 'Facebook Video', thumbnail: data.result.thumbnail, quality: selectedVideo.quality };
    } catch (error) { throw error; }
}
module.exports = {
    name: "facebook", aliases: ["fb", "fbdl"], category: "downloader",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const url = args.join(' ').trim();
        if (!url || !url.includes('facebook.com')) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}facebook <facebook_url>\n› Example: ${prefix}fb https://fb.watch/xyz` }, { quoted: msg }); return; }
        let videoData;
        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 25000 });
            const data = res.data;
            if (!data.status || !data.data) throw new Error('ASWIN: No status or data');
            if (!data.data.high && !data.data.low) throw new Error('ASWIN: No video URLs');
            videoData = { videoUrl: data.data.high || data.data.low, title: data.data.title || 'Facebook Video', thumbnail: data.data.thumbnail };
        } catch (primaryError) {
            try { videoData = await tryHansaAPI(url); } catch (fallbackError) {
                await sock.sendMessage(chatId, { text: `» Download failed.\n› All APIs failed. Please try again later.\n${FOOTER}` }, { quoted: msg }); return;
            }
        }
        if (!videoData.videoUrl) { await sock.sendMessage(chatId, { text: `» No download link found.\n${FOOTER}` }, { quoted: msg }); return; }
        try {
            await new AIRich(sock).setTitle(`» Facebook Video`).addVideo(videoData.videoUrl).addTip('Tap to play').setFooter(FOOTER).send(chatId, { quoted: msg });
        } catch (sendError) {
            await sock.sendMessage(chatId, { text: `» Failed to send video.\n› ${sendError.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

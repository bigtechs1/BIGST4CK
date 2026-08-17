// commands/video.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');
const yts = require('yt-search');
const FOOTER = config.footer || `© ${config.botName}`;
const AXIOS_DEFAULTS = { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } };
async function tryRequest(getter, attempts = 2) { let lastErr; for (let i=1; i<=attempts; i++) { try { return await getter(); } catch (err) { lastErr = err; if (i < attempts) await new Promise(r => setTimeout(r, 2000)); } } throw lastErr; }
function extractVideoId(ytUrl) { if (ytUrl.includes('youtu.be/')) return ytUrl.split('youtu.be/')[1].split('?')[0]; else if (ytUrl.includes('youtube.com/watch')) { const params = new URLSearchParams(ytUrl.split('?')[1]); return params.get('v'); } return null; }
async function getVideoFromAllDown(ytUrl) {
    const videoId = extractVideoId(ytUrl); if (!videoId) throw new Error('Invalid YouTube URL');
    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res.data?.status === true && res.data?.data) { const data = res.data.data; const videoUrl = data.high || data.low; if (!videoUrl) throw new Error('No video URL'); const fileRes = await tryRequest(() => axios.get(videoUrl, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer' })); return { buffer: Buffer.from(fileRes.data), title: data.title, thumbnail: data.thumbnail, source: 'Nayan AllDown' }; }
    throw new Error('AllDown response invalid');
}
async function getVideoFromYoutubeAPI(ytUrl) {
    const videoId = extractVideoId(ytUrl); if (!videoId) throw new Error('Invalid YouTube URL');
    const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res.data?.status === true && res.data?.data?.data?.formats) {
        const formats = res.data.data.data.formats; const title = res.data.data.data.title; const thumbnail = res.data.data.data.thumbnail; const author = res.data.data.data.author;
        let bestVideo = null, bestScore = 0; const priority = { '2160p':100, '1440p':90, '1080p':80, '720p':70, '480p':60, '360p':50 };
        for (const format of formats) {
            if (format.type === 'video_only' || format.type === 'video_with_audio') { let p = 0; const q = format.quality || format.label || ''; for (const [k,v] of Object.entries(priority)) { if (q.includes(k)) { p = v; break; } } if (format.type === 'video_with_audio') p += 5; if (p > bestScore) { bestScore = p; bestVideo = format; } }
        }
        if (bestVideo?.url) { const fileRes = await tryRequest(() => axios.get(bestVideo.url, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer' })); return { buffer: Buffer.from(fileRes.data), title, thumbnail, author, quality: bestVideo.quality || bestVideo.label, source: 'Nayan YouTube API' }; }
    }
    throw new Error('YouTube API: no video format');
}
async function getYoutubeVideo(ytUrl) { try { return await getVideoFromAllDown(ytUrl); } catch { return await getVideoFromYoutubeAPI(ytUrl); } }
module.exports = {
    name: "video", aliases: ["ytvideo", "ytmp4"], category: "downloader",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const query = args.join(' ').trim();
        if (!query) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}video <song name or URL>\n› Example: ${prefix}video Shape of You` }, { quoted: msg }); return; }
        let videoUrl = query, videoInfo = null, thumbnailUrl = '';
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const results = await yts(query); const videos = results?.videos; if (!videos || videos.length === 0) { await sock.sendMessage(chatId, { text: `» No results found.` }, { quoted: msg }); return; }
            videoInfo = videos[0]; videoUrl = videoInfo.url; thumbnailUrl = videoInfo.thumbnail || config.thumbnail;
        } else {
            try { const results = await yts(query); if (results?.videos?.length) { const info = results.videos[0]; videoInfo = { title: info.title, author: info.author.name, duration: info.timestamp, views: info.views, thumbnail: info.thumbnail }; thumbnailUrl = info.thumbnail || config.thumbnail; } } catch {}
        }
        if (videoInfo) {
            const title = videoInfo.title || 'Video'; const author = videoInfo.author || 'Unknown'; const duration = videoInfo.duration || 'N/A'; const views = videoInfo.views ? parseInt(videoInfo.views).toLocaleString() : 'N/A';
            await new AIRich(sock).setTitle(`» ${title.substring(0, 40)}`).addImage(thumbnailUrl).addText(`» Author: ${author}\n» Duration: ${duration}\n» Views: ${views}`).addTip('Downloading video...').setFooter(FOOTER).send(chatId, { quoted: msg });
        } else { await sock.sendMessage(chatId, { text: `» Downloading video…` }, { quoted: msg }); }
        try {
            const videoData = await getYoutubeVideo(videoUrl);
            await sock.sendMessage(chatId, { video: videoData.buffer, mimetype: 'video/mp4', caption: `» ${videoData.title.substring(0, 50)}\n» Source: ${videoData.source}\n${FOOTER}`, fileName: `${videoData.title.substring(0, 40)}.mp4` }, { quoted: msg });
        } catch (error) { await sock.sendMessage(chatId, { text: `» Download failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg }); }
    }
};

// commands/play.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const FOOTER = config.footer || `© ${config.botName}`;
function formatDuration(seconds) { if (!seconds || isNaN(seconds)) return 'N/A'; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }
function formatNumber(num) { if (!num) return 'N/A'; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function extractDuration(info) { if (!info.duration) return 0; if (typeof info.duration === 'number') return info.duration; if (typeof info.duration === 'object' && info.duration.seconds) return info.duration.seconds; if (typeof info.duration === 'string') { const parts = info.duration.split(':'); if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]); if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]); } return 0; }
function extractArtist(info) { if (!info.author) return 'Unknown'; if (typeof info.author === 'string') return info.author; if (typeof info.author === 'object' && info.author.name) return info.author.name; return 'Unknown'; }
const apis = [
    { name: 'Hadi', fn: async (id) => { const url = `https://api.hadi-tech.my.id/api/download/ytmp3?url=https://youtu.be/${id}`; const res = await axios.get(url, { timeout: 15000 }); if (res.data?.status && res.data?.result?.download) { const file = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 }); return { buffer: Buffer.from(file.data), title: res.data.result.title, thumbnail: res.data.result.thumbnail, source: 'Hadi' }; } throw new Error('Hadi failed'); } },
    { name: 'SaveDo', fn: async (id) => { const url = `https://savedo.vercel.app/api/ytmp3?url=https://youtu.be/${id}`; const res = await axios.get(url, { timeout: 15000 }); if (res.data?.downloadUrl) { const file = await axios.get(res.data.downloadUrl, { responseType: 'arraybuffer', timeout: 30000 }); return { buffer: Buffer.from(file.data), title: res.data.title, thumbnail: res.data.thumbnail, source: 'SaveDo' }; } throw new Error('SaveDo failed'); } },
    { name: 'Siputzx', fn: async (id) => { const url = `https://api.siputzx.my.id/api/d/ytmp3?url=https://youtu.be/${id}`; const res = await axios.get(url, { timeout: 15000 }); if (res.data?.status && res.data?.data?.url) { const file = await axios.get(res.data.data.url, { responseType: 'arraybuffer', timeout: 30000 }); return { buffer: Buffer.from(file.data), title: res.data.data.title, thumbnail: res.data.data.thumbnail, source: 'Siputzx' }; } throw new Error('Siputzx failed'); } }
];
async function downloadWithYtdl(videoId) { const url = `https://www.youtube.com/watch?v=${videoId}`; const info = await ytdl.getInfo(url); const title = info.videoDetails.title; const thumbnail = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || ''; const stream = ytdl(url, { quality: 'lowestaudio', filter: 'audioonly' }); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return { buffer: Buffer.concat(chunks), title, thumbnail, source: 'ytdl-core' }; }
async function getYoutubeAudio(videoId) { for (const api of apis) { try { return await api.fn(videoId); } catch {} } return await downloadWithYtdl(videoId); }
module.exports = {
    name: "play", aliases: ["p", "music"], category: "downloader",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const query = args.join(' ').trim();
        if (!query) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}play <song name or URL>\n› Example: ${prefix}play Shape of You` }, { quoted: msg }); return; }
        let videoId = null, videoInfo = null;
        if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
            if (query.includes('youtu.be/')) videoId = query.split('youtu.be/')[1].split('?')[0];
            else { const params = new URLSearchParams(query.split('?')[1]); videoId = params.get('v'); }
            if (!videoId) { await sock.sendMessage(chatId, { text: `» Invalid YouTube URL.` }, { quoted: msg }); return; }
            const searchResults = await yts(`https://youtu.be/${videoId}`);
            if (searchResults?.videos?.length) { const info = searchResults.videos[0]; videoInfo = { title: info.title || 'Unknown', artist: extractArtist(info), duration: extractDuration(info), views: info.views || 0, thumbnail: info.thumbnail || '' }; }
        } else {
            const searchResults = await yts(query);
            if (!searchResults?.videos?.length) { await sock.sendMessage(chatId, { text: `» No results found for "${query}".` }, { quoted: msg }); return; }
            const info = searchResults.videos[0]; videoInfo = { title: info.title || 'Unknown', artist: extractArtist(info), duration: extractDuration(info), views: info.views || 0, thumbnail: info.thumbnail || '' }; videoId = info.videoId;
        }
        if (!videoId) { await sock.sendMessage(chatId, { text: `» Could not extract video ID.` }, { quoted: msg }); return; }
        const title = videoInfo.title; const artist = videoInfo.artist; const duration = formatDuration(videoInfo.duration); const views = formatNumber(videoInfo.views); const thumb = videoInfo.thumbnail || config.thumbnail;
        await new AIRich(sock).setTitle(`» Audio Downloader`).addImage(thumb).addText(`» Title: ${title}\n» Artist: ${artist}\n» Duration: ${duration}\n» Views: ${views}`).addTip('Downloading audio...').setFooter(FOOTER).send(chatId, { quoted: msg });
        const result = await getYoutubeAudio(videoId);
        if (result.buffer) {
            await sock.sendMessage(chatId, { audio: result.buffer, mimetype: 'audio/mpeg', ptt: false, fileName: `${(result.title || 'audio').substring(0, 40)}.mp3` });
            await sock.sendMessage(chatId, { text: `» Downloaded via ${result.source}\n${FOOTER}` }, { quoted: msg });
        } else { await sock.sendMessage(chatId, { text: `» Failed to download audio.\n${FOOTER}` }, { quoted: msg }); }
    }
};

// commands/instagram.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { igdl } = require("ruhend-scraper");
const FOOTER = config.footer || `© ${config.botName}`;
const processedMessages = new Set();
function extractUniqueMedia(mediaData) { const unique = []; const seen = new Set(); for (const media of mediaData) { if (media.url && !seen.has(media.url)) { seen.add(media.url); unique.push(media); } } return unique; }
function isVideoUrl(url) { return /\.(mp4|mov|avi|mkv|webm)$/i.test(url); }
module.exports = {
    name: "instagram", aliases: ["ig", "insta"], category: "downloader",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const url = args.join(' ').trim();
        if (!url) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}instagram <instagram_url>\n› Example: ${prefix}ig https://www.instagram.com/p/xyz` }, { quoted: msg }); return; }
        const igPatterns = [/https?:\/\/(?:www\.)?instagram\.com\//, /https?:\/\/(?:www\.)?instagr\.am\//, /https?:\/\/(?:www\.)?instagram\.com\/p\//, /https?:\/\/(?:www\.)?instagram\.com\/reel\//, /https?:\/\/(?:www\.)?instagram\.com\/tv\//];
        const isValid = igPatterns.some(p => p.test(url));
        if (!isValid) { await sock.sendMessage(chatId, { text: `» Invalid Instagram link.\n${FOOTER}` }, { quoted: msg }); return; }
        if (processedMessages.has(msg.key.id)) return; processedMessages.add(msg.key.id); setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000);
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });
        try {
            const downloadData = await igdl(url);
            if (!downloadData || !downloadData.data || downloadData.data.length === 0) { await sock.sendMessage(chatId, { text: `» No media found.\n${FOOTER}` }, { quoted: msg }); return; }
            const uniqueMedia = extractUniqueMedia(downloadData.data);
            if (uniqueMedia.length === 0) { await sock.sendMessage(chatId, { text: `» No valid media found.\n${FOOTER}` }, { quoted: msg }); return; }
            const firstVideo = uniqueMedia.find(m => isVideoUrl(m.url) || m.type === 'video');
            const selected = firstVideo || uniqueMedia[0];
            if (!selected) { await sock.sendMessage(chatId, { text: `» No media available.\n${FOOTER}` }, { quoted: msg }); return; }
            const mediaUrl = selected.url; const isVideo = isVideoUrl(mediaUrl) || selected.type === 'video';
            const isImage = !isVideo && (selected.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl));
            let thumbnail = config.thumbnail;
            if (uniqueMedia.some(m => !isVideoUrl(m.url) && m.type !== 'video')) { const img = uniqueMedia.find(m => !isVideoUrl(m.url) && m.type !== 'video'); if (img) thumbnail = img.url; }
            const description = 'Instagram Media';
            if (isVideo) {
                await new AIRich(sock).setTitle(`» Instagram Video`).addVideo(mediaUrl).addText(`» ${description}\n» Link: ${url}`).addTip('Tap the video to play').setFooter(FOOTER).send(chatId, { quoted: msg });
            } else if (isImage) {
                await new AIRich(sock).setTitle(`» Instagram Image`).addImage(mediaUrl).addText(`» ${description}\n» Link: ${url}`).addTip('Tap to view full size').setFooter(FOOTER).send(chatId, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `» Media found but unknown type.\n» Link: ${mediaUrl}\n${FOOTER}` }, { quoted: msg });
            }
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Download failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

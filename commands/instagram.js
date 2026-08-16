// commands/instagram.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { igdl } = require("ruhend-scraper");

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;
const DEFAULT_THUMBNAIL = 'https://files.catbox.moe/0hmdof.png'; // fallback

// ─── Processed message cache ──────────────────────────────
const processedMessages = new Set();

// ─── Extract unique media URLs ──────────────────────────
function extractUniqueMedia(mediaData) {
    const unique = [];
    const seen = new Set();
    for (const media of mediaData) {
        if (media.url && !seen.has(media.url)) {
            seen.add(media.url);
            unique.push(media);
        }
    }
    return unique;
}

// ─── Check if URL is video ──────────────────────────────
function isVideoUrl(url) {
    return /\.(mp4|mov|avi|mkv|webm)$/i.test(url);
}

module.exports = {
    name: "instagram",
    aliases: ["ig", "insta"],
    category: "downloader",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const url = args.join(' ').trim();

        // ─── Check if URL is provided ──────────────────
        if (!url) {
            const usage =
`» Instagram Downloader
»
› Usage: ${ctx.used.prefix}instagram <instagram_url>
› Example: ${ctx.used.prefix}ig https://www.instagram.com/p/xyz
»
${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: msg });
            return;
        }

        // ─── Validate Instagram URL ────────────────────
        const igPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//,
            /https?:\/\/(?:www\.)?instagr\.am\//,
            /https?:\/\/(?:www\.)?instagram\.com\/p\//,
            /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
            /https?:\/\/(?:www\.)?instagram\.com\/tv\//
        ];
        const isValid = igPatterns.some(p => p.test(url));
        if (!isValid) {
            await sock.sendMessage(chatId, {
                text: `» Invalid Instagram link.\n› Please provide a valid Instagram post, reel, or video link.\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // ─── Prevent duplicate processing ──────────────
        if (processedMessages.has(msg.key.id)) return;
        processedMessages.add(msg.key.id);
        setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000);

        // ─── React to indicate processing ──────────────
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        try {
            // ─── Download data ──────────────────────────
            const downloadData = await igdl(url);
            if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» No media found.\n› The post might be private or the link is invalid.\n${FOOTER}`
                }, { quoted: msg });
                return;
            }

            // ─── Deduplicate ────────────────────────────
            const uniqueMedia = extractUniqueMedia(downloadData.data);
            if (uniqueMedia.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `» No valid media found.\n${FOOTER}`
                }, { quoted: msg });
                return;
            }

            // ─── Select best media ──────────────────────
            const firstVideo = uniqueMedia.find(m => isVideoUrl(m.url) || m.type === 'video');
            const selected = firstVideo || uniqueMedia[0];
            if (!selected) {
                await sock.sendMessage(chatId, {
                    text: `» No media available.\n${FOOTER}`
                }, { quoted: msg });
                return;
            }

            const mediaUrl = selected.url;
            const isVideo = isVideoUrl(mediaUrl) || selected.type === 'video';
            const isImage = !isVideo && (selected.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl));

            // ─── Find a thumbnail (first image if any) ──
            let thumbnail = DEFAULT_THUMBNAIL;
            if (uniqueMedia.some(m => !isVideoUrl(m.url) && m.type !== 'video')) {
                const img = uniqueMedia.find(m => !isVideoUrl(m.url) && m.type !== 'video');
                if (img) thumbnail = img.url;
            }

            // ─── Build description ──────────────────────
            const description = 'Instagram Media';
            const link = url;

            // ─── Send rich card ──────────────────────────
            if (isVideo) {
                await new AIRich(sock)
                    .setTitle(`» Instagram Video`)
                    .addImage(thumbnail)
                    .addVideo(mediaUrl)
                    .addText(`» ${description}\n» Link: ${link}`)
                    .addTip('Tap the video to play')
                    .setFooter(FOOTER)
                    .send(chatId, { quoted: msg });
            } else if (isImage) {
                await new AIRich(sock)
                    .setTitle(`» Instagram Image`)
                    .addImage(mediaUrl)
                    .addText(`» ${description}\n» Link: ${link}`)
                    .addTip('Tap to view full size')
                    .setFooter(FOOTER)
                    .send(chatId, { quoted: msg });
            } else {
                // Fallback: just send as generic
                await sock.sendMessage(chatId, {
                    text: `» Media found but unknown type.\n» Link: ${mediaUrl}\n${FOOTER}`
                }, { quoted: msg });
            }

            // ─── Success reaction ──────────────────────
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('Instagram error:', error);
            await sock.sendMessage(chatId, {
                text: `» Download failed.\n› ${error.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
// commands/emojimix.js
const config = require('../config');
const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const FOOTER = config.footer || `© ${config.botName}`;
module.exports = {
    name: "emojimix", aliases: ["mix", "emoji"], category: "fun",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        if (!args[0]) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}emojimix 😎+🥰\n› Separate two emojis with a plus sign.\n${FOOTER}` }, { quoted: msg }); return; }
        const emojiInput = args[0]; if (!emojiInput.includes('+')) { await sock.sendMessage(chatId, { text: `» Invalid format.\n› Separate emojis with a + sign.\n› Example: ${prefix}emojimix 😎+🥰\n${FOOTER}` }, { quoted: msg }); return; }
        const [emoji1, emoji2] = emojiInput.split('+').map(e => e.trim());
        const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
        let response, data;
        try { response = await fetch(url); data = await response.json(); } catch (err) { await sock.sendMessage(chatId, { text: `» API error. Please try again later.\n${FOOTER}` }, { quoted: msg }); return; }
        if (!data.results || data.results.length === 0) { await sock.sendMessage(chatId, { text: `» These emojis cannot be mixed.\n› Try different emojis.\n${FOOTER}` }, { quoted: msg }); return; }
        const imageUrl = data.results[0].url;
        const tmpDir = path.join(process.cwd(), 'tmp'); if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempFile = path.join(tmpDir, `temp_${Date.now()}.png`).replace(/\\/g, '/');
        const outputFile = path.join(tmpDir, `sticker_${Date.now()}.webp`).replace(/\\/g, '/');
        let imageBuffer;
        try { const imageResponse = await fetch(imageUrl); imageBuffer = await imageResponse.buffer(); fs.writeFileSync(tempFile, imageBuffer); } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to download image.\n${FOOTER}` }, { quoted: msg }); return; }
        const ffmpegCommand = `ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" "${outputFile}"`;
        try { await new Promise((resolve, reject) => { exec(ffmpegCommand, (error) => { if (error) reject(error); else resolve(); }); }); } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to create sticker.\n› Make sure ffmpeg is installed.\n${FOOTER}` }, { quoted: msg }); try { fs.unlinkSync(tempFile); } catch {} return; }
        if (!fs.existsSync(outputFile)) { await sock.sendMessage(chatId, { text: `» Failed to create sticker file.\n${FOOTER}` }, { quoted: msg }); try { fs.unlinkSync(tempFile); } catch {} return; }
        try { const stickerBuffer = fs.readFileSync(outputFile); await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg }); } catch (err) { await sock.sendMessage(chatId, { text: `» Failed to send sticker.\n${FOOTER}` }, { quoted: msg }); }
        try { fs.unlinkSync(tempFile); fs.unlinkSync(outputFile); } catch {}
    }
};

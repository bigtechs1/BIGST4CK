// commands/imagine.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const { uploadBuffer } = require('../lib/upload');
const axios = require('axios');
const FOOTER = config.footer || `© ${config.botName}`;
function enhancePrompt(prompt) {
    const enhancers = ['high quality', 'detailed', 'masterpiece', 'best quality', 'ultra realistic', '4k', 'highly detailed', 'professional photography', 'cinematic lighting', 'sharp focus'];
    const num = Math.floor(Math.random() * 2) + 3; const selected = enhancers.sort(() => Math.random() - 0.5).slice(0, num); return `${prompt}, ${selected.join(', ')}`;
}
module.exports = {
    name: "imagine", aliases: ["img", "generate", "aiimage"], category: "ai-generate",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const prompt = args.join(' ').trim();
        if (!prompt) { await sock.sendMessage(chatId, { text: `» Usage: ${prefix}imagine <description>\n› Example: ${prefix}imagine a sunset` }, { quoted: msg }); return; }
        try {
            const statusMsg = await sock.sendMessage(chatId, { text: `» Generating image for: "${prompt}"` }, { quoted: msg });
            const enhanced = enhancePrompt(prompt);
            const apiUrl = `https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhanced)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const imageBuffer = Buffer.from(response.data);
            const imageUrl = await uploadBuffer(imageBuffer, `imagine_${Date.now()}.png`);
            try { await sock.sendMessage(chatId, { delete: statusMsg.key }); } catch {}
            await new AIRich(sock).setTitle(`» AI Image Generator`).addImage(imageUrl).addText(`Prompt: ${prompt}`).addTip('Generated with AI').setFooter(FOOTER).send(chatId, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Failed to generate image.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};
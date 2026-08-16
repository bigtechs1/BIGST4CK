// commands/imagine.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const axios = require('axios');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Enhance prompt with quality keywords ──────────────
function enhancePrompt(prompt) {
    const qualityEnhancers = [
        'high quality',
        'detailed',
        'masterpiece',
        'best quality',
        'ultra realistic',
        '4k',
        'highly detailed',
        'professional photography',
        'cinematic lighting',
        'sharp focus'
    ];
    const numEnhancers = Math.floor(Math.random() * 2) + 3;
    const selected = qualityEnhancers
        .sort(() => Math.random() - 0.5)
        .slice(0, numEnhancers);
    return `${prompt}, ${selected.join(', ')}`;
}

module.exports = {
    name: "imagine",
    aliases: ["img", "generate", "aiimage"],
    category: "ai-generate",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const args = ctx.used.args || [];
        const prefix = ctx.used.prefix || '.';

        const prompt = args.join(' ').trim();
        if (!prompt) {
            const usage =
`» AI Image Generator
»
› Usage: ${prefix}imagine <description>
› Example: ${prefix}imagine a beautiful sunset over mountains
»
${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: msg });
            return;
        }

        try {
            // ─── Show processing status ──────────────────
            const statusMsg = await sock.sendMessage(chatId, {
                text: `» Generating image for: "${prompt}"\n› Please wait...`
            }, { quoted: msg });

            // ─── Enhance prompt ──────────────────────────
            const enhancedPrompt = enhancePrompt(prompt);

            // ─── API call ────────────────────────────────
            const apiUrl = `https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`;
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });
            const imageBuffer = Buffer.from(response.data);

            // ─── Delete status message ───────────────────
            try {
                await sock.sendMessage(chatId, { delete: statusMsg.key });
            } catch { /* ignore */ }

            // ─── Send AIRich card with image ─────────────
            await new AIRich(sock)
                .setTitle(`» AI Image Generator`)
                .addImage(imageBuffer)
                .addText(`Prompt: ${prompt}`)
                .addTip('Generated with AI – tap to view full size')
                .setFooter(FOOTER)
                .send(chatId, { quoted: msg });

        } catch (error) {
            console.error('Imagine error:', error);
            await sock.sendMessage(chatId, {
                text: `» Failed to generate image.\n› ${error.message || 'Unknown error'}\n${FOOTER}`
            }, { quoted: msg });
        }
    }
};
// commands/store.js
const config = require('../config');
const { AIRich } = require('../lib/NIXCODE');
const FOOTER = config.footer || `© ${config.botName}`;
const storeList = [
    { name: "1GB RAM Server", role: "Pterodactyl", price: "1,500 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/c4wfmk.png" },
    { name: "2GB RAM Server", role: "Pterodactyl", price: "3,000 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/amux6f.png" },
    { name: "3GB RAM Server", role: "Pterodactyl", price: "4,500 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/lcw5er.png" },
    { name: "4GB RAM Server", role: "Pterodactyl", price: "6,000 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/rnbpe5.png" },
    { name: "5GB RAM Server", role: "Pterodactyl", price: "7,500 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/c64xmt.png" },
    { name: "6GB RAM Server", role: "Pterodactyl", price: "9,000 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/2g04ta.png" },
    { name: "7GB RAM Server", role: "Pterodactyl", price: "10,500 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/ehisz1.png" },
    { name: "8GB RAM Server", role: "Pterodactyl", price: "12,000 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/pzbhcb.png" },
    { name: "9GB RAM Server", role: "Pterodactyl", price: "13,500 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/xo9t0z.png" },
    { name: "10GB RAM Server", role: "Pterodactyl", price: "15,000 TZS", sale_price: "Buy Now", image: "https://files.catbox.moe/41k8cb.png" },
    { name: "Unlimited RAM Server", role: "Premium", price: "25,000 TZS", sale_price: "Best Deal", image: "https://files.catbox.moe/k8kuqu.png" }
];
module.exports = {
    name: "store", aliases: ["shop", "servers", "hosting"], category: "main",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, prefix = ctx.used.prefix || '.', groupLink = config.groupLink || 'https://wa.me/' + config.ownerNumber;
        const top = storeList[0], rest = storeList.slice(1);
        const listText = storeList.map((item, i) => { const num = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`; return `${num} *${item.name}* — ${item.price}`; }).join("\n");
        try {
            await new AIRich(sock).setTitle(`» ${config.botName} Store`).setFooter(FOOTER)
                .addProduct({ title: top.name, brand: top.role, price: top.price, sale_price: top.sale_price, url: groupLink, image: top.image, icon: top.image })
                .addProduct(rest.map(item => ({ title: item.name, brand: item.role, price: item.price, sale_price: item.sale_price, url: groupLink, image: item.image, icon: item.image })))
                .addText(`\`BIGST4CK Pterodactyl Server Store\` 🖥️\n${listText}\n\nHigh-performance Pterodactyl servers hosted on BigPanel.\nPrices starting from *1,500 TZS* to *25,000 TZS*.\n\nAll plans include:\n» Full Root Access\n» 24/7 Uptime\n» Free SSL\n» Dedicated IP\n» One-Click Apps\n» Instant Setup\n\n💡 *Upgrade anytime!* Contact the owner for custom plans.\n\nYour server, your rules. ♡`)
                .addTip(`_Regards: ${config.botName}_`)
                .addSuggest([`${prefix}buy`, `${prefix}price`, `${prefix}owner`])
                .send(chatId, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `» Failed to display store.\n› ${error.message || 'Unknown error'}\n${FOOTER}` }, { quoted: msg });
        }
    }
};

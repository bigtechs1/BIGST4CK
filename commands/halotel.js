// commands/halotel.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Configuration ──────────────────────────────────────
const PRICE_PER_GB = 1000; // TSh per GB
const PAYMENT_NUMBER = '0615944741';
const BANNER_URL = 'https://files.catbox.moe/ljabyq.png';

const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

// ─── Catalog context (like menu.js) ────────────────────
const Catalog = {
    key: {
        remoteJid: '0@s.whatsapp.net',
        fromMe: false,
        id: 'Halotel Catalog',
        participant: '0@s.whatsapp.net'
    },
    message: {
        productMessage: {
            product: {
                title: '𝐇𝐀𝐋𝐎𝐓𝐄𝐋',
                description: 'Halotel Bundles by bigmanjtech',
                currencyCode: 'TZS',
                priceAmount1000: 100000000,
                retailerId: 'HALOTEL'
            },
            businessOwnerJid: '0@s.whatsapp.net'
        }
    }
};

// ─── Build package rows for the native list ────────────
function getPackageRows() {
    return PACKAGES.map(pkg => {
        const price = pkg.gb * PRICE_PER_GB;
        return {
            title: `${pkg.gb}GB`,
            description: `${pkg.label} - TSh ${price.toLocaleString()}`,
            id: `pkg_${pkg.gb}`
        };
    });
}

module.exports = {
    name: "halotel",
    aliases: ["h", "halo"],
    category: "utility",

    code: async (ctx) => {
        const sock = ctx.core;
        const chatId = ctx._msg.key.remoteJid;
        const msg = ctx._msg;
        const prefix = ctx.used.prefix || '.';
        const userName = ctx._msg.pushName || 'Customer';
        const args = ctx.used.args || [];

        const firstArg = args[0]?.toLowerCase() || '';

        // ─── Handle package selection from the list ────
        if (firstArg.startsWith('pkg_')) {
            const gb = parseInt(firstArg.replace('pkg_', ''), 10);
            const pkg = PACKAGES.find(p => p.gb === gb);
            if (!pkg) {
                await sock.sendMessage(chatId, {
                    text: `» Package not found.`
                }, { quoted: msg });
                return;
            }
            const price = gb * PRICE_PER_GB;
            const paymentMsg =
`» Payment Instructions
»
› Customer : ${userName}
› Package  : ${gb}GB
› Price    : TSh ${price.toLocaleString()}
› Network  : Halotel
› Payment  : ${PAYMENT_NUMBER}
»
» Please send payment and reply with confirmation.
${FOOTER}`;
            await sock.sendMessage(chatId, { text: paymentMsg }, { quoted: msg });
            return;
        }

        // ─── Show main menu ────────────────────────────
        const bodyText =
`Hello ${userName},

Select a package below to get payment details.`;

        const footerText =
`» Price: ${PRICE_PER_GB} TSh per GB
» Payment: ${PAYMENT_NUMBER}
» Network: Halotel

${FOOTER}`;

        await new ButtonV2(sock)
            .setTitle(`» Halotel Bundles`)
            .setSubtitle(`Select Package · ${new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit' })}`)
            .setBody(bodyText)
            .setFooter(footerText)
            .setThumbnail(BANNER_URL)
            .setContextInfo({
                mentionedJid: [ctx.sender.jid],
                stanzaId: Catalog.key.id,
                participant: Catalog.key.participant,
                remoteJid: Catalog.key.remoteJid,
                quotedMessage: Catalog.message
            })
            // ─── Button 1: Dev (.owner) ────────────────────
            .addButton('› Dev', `${prefix}owner`)
            // ─── Button 2: Halotel (native list) ──────────
            .addRawButton({
                buttonText: { displayText: '📦 Halotel' },
                buttonId: 'halotel_menu',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: 'Select Package',
                        sections: [{
                            title: 'Halotel Bundles by bigmanjtech™',
                            rows: getPackageRows()
                        }]
                    })
                }
            })
            .send(chatId, { quoted: msg });
    }
};
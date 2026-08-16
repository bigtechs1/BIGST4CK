// commands/halotel.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');

const FOOTER = config.msg.footer || `© ${config.bot.name} by bigmanjtech™`;

// ─── Configuration ──────────────────────────────────────
const PRICE_PER_GB = 1000;
const PAYMENT_NUMBER = '0636756591';
const BANNER_URL = 'https://files.catbox.moe/ljabyq.png';

const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

// ─── Catalog context ────────────────────────────────────
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

// ─── Build package rows ──────────────────────────────────
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

        // ─── Handle package selection ──────────────────
        if (firstArg.startsWith('pkg_')) {
            const gb = parseInt(firstArg.replace('pkg_', ''), 10);
            const pkg = PACKAGES.find(p => p.gb === gb);
            if (!pkg) {
                await sock.sendMessage(chatId, {
                    text: `» Package not found.`
                }, { quoted: msg });
                return;
            }
            return await sendPaymentDetails(ctx, gb, userName);
        }

        // ─── Handle "Back" button ──────────────────────
        if (firstArg === 'back_halotel') {
            return await showMainMenu(ctx);
        }

        // ─── Handle direct GB command ──────────────────
        const gbMatch = firstArg.match(/^(\d+)gb?$/);
        if (gbMatch) {
            const gb = parseInt(gbMatch[1], 10);
            const pkg = PACKAGES.find(p => p.gb === gb);
            if (!pkg) {
                await sock.sendMessage(chatId, {
                    text: `» Package not available.\n› Available: ${PACKAGES.map(p => p.gb + 'GB').join(', ')}`
                }, { quoted: msg });
                return;
            }
            return await sendPaymentDetails(ctx, gb, userName);
        }

        // ─── Show main menu ────────────────────────────
        return await showMainMenu(ctx);
    }
};

// ─── Main Menu: Two Buttons ─────────────────────────────
async function showMainMenu(ctx) {
    const sock = ctx.core;
    const chatId = ctx._msg.key.remoteJid;
    const msg = ctx._msg;
    const prefix = ctx.used.prefix || '.';
    const userName = ctx._msg.pushName || 'Customer';

    const body =
`Hello ${userName},

Select a package below to get payment details.`;

    const footer =
`» Price: ${PRICE_PER_GB} TSh per GB
» Payment: ${PAYMENT_NUMBER}
» Network: Halotel

${FOOTER}`;

    await new ButtonV2(sock)
        .setTitle(`» Halotel Bundles`)
        .setSubtitle(`Select Package · ${new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit' })}`)
        .setBody(body)
        .setFooter(footer)
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
        // ─── Button 2: Halotel (navigation list) ──────
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

// ─── Payment Details: Two Buttons ──────────────────────
async function sendPaymentDetails(ctx, gb, userName) {
    const sock = ctx.core;
    const chatId = ctx._msg.key.remoteJid;
    const msg = ctx._msg;
    const prefix = ctx.used.prefix || '.';
    const price = gb * PRICE_PER_GB;

    const body =
`» Order Details
»
› Customer : ${userName}
› Package  : ${gb}GB
› Price    : TSh ${price.toLocaleString()}
› Network  : Halotel
› Payment  : ${PAYMENT_NUMBER}
»
» Please send payment and reply with confirmation.`;

    const footer = `${FOOTER}`;

    await new ButtonV2(sock)
        .setTitle(`» Payment Instructions`)
        .setSubtitle(`${gb}GB · TSh ${price.toLocaleString()}`)
        .setBody(body)
        .setFooter(footer)
        .setThumbnail(BANNER_URL)
        .setContextInfo({
            mentionedJid: [ctx.sender.jid],
            stanzaId: Catalog.key.id,
            participant: Catalog.key.participant,
            remoteJid: Catalog.key.remoteJid,
            quotedMessage: Catalog.message
        })
        // ─── Button 1: Copy Payment ────────────────────
        .addRawButton({
            buttonText: { displayText: '📋 Copy Payment' },
            buttonId: 'copy_payment',
            type: 1,
            nativeFlowInfo: {
                name: 'cta_copy',
                paramsJson: JSON.stringify({
                    display_text: ' Copy Payment Number',
                    copy_code: PAYMENT_NUMBER
                })
            }
        })
        // ─── Button 2: Navigation (Back) ──────────────
        .addRawButton({
            buttonText: { displayText: '☰ halotel' },
            buttonId: 'halotel_back',
            type: 1,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: JSON.stringify({
                    title: 'Navigation',
                    sections: [{
                        title: 'Halotel Bundles by bigmanjtech™',
                        rows: [
                            { title: 'Back to Packages', description: 'View all packages again', id: 'back_halotel' },
                            { title: 'Main Menu', description: 'Go to main menu', id: `${prefix}menu` }
                        ]
                    }]
                })
            }
        })
        .send(chatId, { quoted: msg });
}
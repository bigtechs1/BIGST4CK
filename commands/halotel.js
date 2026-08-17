// commands/halotel.js
const config = require('../config');
const { ButtonV2 } = require('../lib/NIXCODE');
const FOOTER = config.footer || `© ${config.botName}`;
const PRICE_PER_GB = 1000;
const PAYMENT_NUMBER = '0615944741';
const BANNER_URL = 'https://files.catbox.moe/ljabyq.png';
const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];
const Catalog = {
    key: { remoteJid: '0@s.whatsapp.net', fromMe: false, id: 'Halotel Catalog', participant: '0@s.whatsapp.net' },
    message: { productMessage: { product: { title: 'HALOTEL', description: 'Halotel Bundles by bigmanjtech', currencyCode: 'TZS', priceAmount1000: 100000000, retailerId: 'HALOTEL' }, businessOwnerJid: '0@s.whatsapp.net' } }
};
function getPackageRows() { return PACKAGES.map(pkg => { const price = pkg.gb * PRICE_PER_GB; return { title: `${pkg.gb}GB`, description: `${pkg.label} - TSh ${price.toLocaleString()}`, id: `pkg_${pkg.gb}` }; }); }
module.exports = {
    name: "halotel", aliases: ["h", "halo"], category: "utility",
    code: async (ctx) => {
        const sock = ctx.core, chatId = ctx._msg.key.remoteJid, msg = ctx._msg, args = ctx.used.args || [], prefix = ctx.used.prefix || '.';
        const firstArg = args[0]?.toLowerCase() || '';
        if (firstArg.startsWith('pkg_')) {
            const gb = parseInt(firstArg.replace('pkg_', ''), 10);
            const pkg = PACKAGES.find(p => p.gb === gb);
            if (!pkg) { await sock.sendMessage(chatId, { text: `» Package not found.` }, { quoted: msg }); return; }
            const price = gb * PRICE_PER_GB;
            const paymentMsg = `» Payment Instructions\n› Customer: ${ctx._msg.pushName || 'Customer'}\n› Package: ${gb}GB\n› Price: TSh ${price.toLocaleString()}\n› Network: Halotel\n› Payment: ${PAYMENT_NUMBER}\n\nPlease send payment and reply with confirmation.\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: paymentMsg }, { quoted: msg }); return;
        }
        const bodyText = `Hello ${ctx._msg.pushName || 'Customer'},\n\nSelect a package below to get payment details.`;
        const footerText = `» Price: ${PRICE_PER_GB} TSh per GB\n» Payment: ${PAYMENT_NUMBER}\n» Network: Halotel\n\n${FOOTER}`;
        await new ButtonV2(sock)
            .setTitle(`» Halotel Bundles`)
            .setSubtitle(`Select Package · ${new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit' })}`)
            .setBody(bodyText)
            .setFooter(footerText)
            .setThumbnail(BANNER_URL)
            .setContextInfo({ mentionedJid: [ctx.sender.jid], stanzaId: Catalog.key.id, participant: Catalog.key.participant, remoteJid: Catalog.key.remoteJid, quotedMessage: Catalog.message })
            .addButton('› Dev', `${prefix}owner`)
            .addRawButton({ buttonText: { displayText: '📦 Halotel' }, buttonId: 'halotel_menu', type: 1, nativeFlowInfo: { name: 'single_select', paramsJson: JSON.stringify({ title: 'Select Package', sections: [{ title: 'Halotel Bundles by bigmanjtech™', rows: getPackageRows() }] }) } })
            .send(chatId, { quoted: msg });
    }
};

// lib/upload.js
const axios = require('axios');
const FormData = require('form-data');

// ─── Uguu.se upload ──────────────────────────────────────
async function uploadBuffer(buffer, filename = 'file.png') {
    const form = new FormData();
    form.append('files[]', buffer, filename);

    const response = await axios.post('https://uguu.se/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'BIGST4CK/3.0'
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    // Uguu.se returns: { files: [{ name, url, size, hash }] }
    if (response.data?.files && response.data.files.length > 0) {
        const file = response.data.files[0];
        // Uguu returns URL like: https://uguu.se/xxxxx.ext
        const url = file.url || `https://uguu.se/${file.hash || file.name}`;
        if (url.startsWith('http')) {
            return url;
        }
    }

    // Try parsing as direct URL if response is a string
    if (typeof response.data === 'string' && response.data.startsWith('http')) {
        return response.data.trim();
    }

    throw new Error('Uguu.se upload failed: ' + JSON.stringify(response.data));
}

// ─── Fallback: Catbox (if you still want it) ──────────
async function uploadToCatbox(buffer, filename = 'image.png') {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);
    // If you have a userhash, you can add it here
    // form.append('userhash', process.env.CATBOX_USERHASH || '');

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'BIGST4CK/3.0' },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });
    const url = response.data.trim();
    if (url.startsWith('https://files.catbox.moe/')) return url;
    throw new Error('Catbox upload failed: ' + url);
}

// ─── Main upload function (try Uguu first, fallback to Catbox) ──
async function uploadWithFallback(buffer, filename = 'image.png') {
    try {
        console.log('📤 Uploading to Uguu.se...');
        return await uploadBuffer(buffer, filename);
    } catch (err) {
        console.warn('⚠️ Uguu.se failed, trying Catbox...', err.message);
        try {
            return await uploadToCatbox(buffer, filename);
        } catch (catErr) {
            throw new Error(`All upload services failed: ${catErr.message}`);
        }
    }
}

// ─── For backward compatibility ──────────────────────────
async function uploadBufferWithFallback(buffer, filename = 'image.png') {
    return uploadWithFallback(buffer, filename);
}

module.exports = {
    uploadBuffer,
    uploadToCatbox,
    uploadWithFallback,
    uploadBuffer: uploadWithFallback // default export
};

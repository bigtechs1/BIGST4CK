// lib/upload.js
const axios = require('axios');
const FormData = require('form-data');

const CATBOX_USERHASH = process.env.CATBOX_USERHASH || '';

async function uploadBuffer(buffer, filename = 'image.png') {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);
    if (CATBOX_USERHASH) form.append('userhash', CATBOX_USERHASH);

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

module.exports = { uploadBuffer };
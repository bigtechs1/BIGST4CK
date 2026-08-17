// lib/buttonLoader.js
function isButtonResponse(mek) {
    const msg = mek.message;
    return !!(
        msg?.buttonsResponseMessage ||
        msg?.listResponseMessage ||
        msg?.interactiveResponseMessage
    );
}

function getButtonId(mek) {
    const msg = mek.message;
    if (msg?.buttonsResponseMessage) {
        return msg.buttonsResponseMessage.selectedButtonId;
    }
    if (msg?.listResponseMessage) {
        return msg.listResponseMessage.singleSelectReply?.selectedRowId;
    }
    if (msg?.interactiveResponseMessage) {
        const native = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (native) {
            return native.name || native.paramsJson;
        }
        return msg.interactiveResponseMessage.selectedButtonId;
    }
    return null;
}

function isCommandId(id) {
    const known = ['menu', 'owner', 'ping', 'help', 'settings'];
    return known.includes(id);
}

function autoDetectButtonCommand(mek) {
    const id = getButtonId(mek);
    if (id && isCommandId(id)) return id;
    return null;
}

module.exports = { isButtonResponse, getButtonId, isCommandId, autoDetectButtonCommand };
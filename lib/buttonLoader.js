// lib/buttonLoader.js

function isButtonResponse(mek) {
    // Check if message is a button or list response
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
    // If the ID is a known command name (without prefix), treat it as a command
    // You can expand this list or make it dynamic
    const knownCommands = ['menu', 'owner', 'ping', 'help', 'settings'];
    return knownCommands.includes(id);
}

function autoDetectButtonCommand(mek) {
    const id = getButtonId(mek);
    if (id && isCommandId(id)) {
        return id;
    }
    return null;
}

module.exports = {
    isButtonResponse,
    getButtonId,
    isCommandId,
    autoDetectButtonCommand
};
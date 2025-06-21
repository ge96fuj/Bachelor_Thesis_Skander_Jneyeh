
function sendCommand(socket, code, label, lightID = '') {
    if (!socket || socket.destroyed) {
        console.log(`⚠️ Socket not available for ${lightID}`);
        global.stopLoop = true;
        return false;
    }
    console.log(`${label} Sending (${code}) to ${lightID}`);
    socket.write(Buffer.from([code]));
    return true;
}

async function goRed(socket, lightID) {
    return sendCommand(socket, 0x21, "🔴 RED →", lightID);
}

async function goYellow(socket, lightID) {
    return sendCommand(socket, 0x23, "🟡 YELLOW →", lightID);
}

async function goGreen(socket, lightID) {
    return sendCommand(socket, 0x22, "🟢 GREEN →", lightID);
}

function goBlink(socket, lightID) {
    return sendCommand(socket, 0x25, "🟡🟡🟡🟡 BLINK 🟡🟡🟡🟡 →", lightID);
}




function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { goRed, goYellow, goGreen, goBlink, sleep };

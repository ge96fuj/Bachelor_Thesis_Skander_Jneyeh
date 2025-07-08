const crypto = require('crypto');
const { buildAuthenticatedJsonCommand } = require('./security');



function sendCommand(socket, code, label, lightID = '') {
    if (!socket || socket.destroyed) {
        console.log(`Socket not available for ${lightID}`);
        global.stopLoop = true;
        return false;
    }

    let message;
    if (global.HashingOn || global.TimestampOn ) {
        message = buildAuthenticatedJsonCommand(code);
    } else {
        message = JSON.stringify({ command: code, lightID });
    }

    console.log(`${label} Sending JSON command (${code}) to ${lightID}`);
    socket.write(message);
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

module.exports = { goRed, goYellow, goGreen, goBlink, sleep, sendCommand };

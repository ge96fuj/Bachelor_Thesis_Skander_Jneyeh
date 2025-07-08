const crypto = require("crypto");


function buildAuthenticatedJsonCommand(code) {
    
    const payload = { command: code };

  

    if (global.TimestampOn) {
        payload.timestamp = Math.floor(Date.now() / 1000);
    }

    if (global.HashingOn) {
        const jsonToHash = JSON.stringify(payload);
        const hmac = crypto.createHmac('sha256', global.SECRET_KEY)
            .update(jsonToHash)
            .digest('hex');
        payload.hmac = hmac;
    }

    return JSON.stringify(payload);
}

/**
 * Verifies HMAC and timestamp 
 */
function validateMessage(dataStr) {
    let parsed;
    try {
        parsed = JSON.parse(dataStr);
    } catch (err) {
        console.error("Invalid JSON received");
        return { valid: false, reason: "Invalid JSON" };
    }

    const receivedHmac = parsed.hmac;
    const { hmac, ...msgWithoutHmac } = parsed;
    const jsonToHash = JSON.stringify(msgWithoutHmac);

    // --- HMAC Check ---
    if (global.HashingOn) {
        if (!receivedHmac) {
            return { valid: false, reason: "Missing HMAC" };
        }

        const computedHmac = crypto
            .createHmac("sha256", global.SECRET_KEY)
            .update(jsonToHash)
            .digest("hex");

        if (
            !crypto.timingSafeEqual(
                Buffer.from(receivedHmac, "hex"),
                Buffer.from(computedHmac, "hex")
            )
        ) {
            return { valid: false, reason: "HMAC mismatch" };
        }
    }

    // --- Timestamp Check ---
    if (global.TimestampOn) {
        const now = Math.floor(Date.now() / 1000);
        const timestamp = parsed.timestamp;

        if (!timestamp) {
            return { valid: false, reason: "Missing timestamp" };
        }

        const delta = Math.abs(now - timestamp);
        const allowed = global.AllowedDelay || 5;

        if (delta > allowed) {
            return { valid: false, reason: `Timestamp too old (${delta}s)` };
        }
    }

    return { valid: true, data: parsed };
}

module.exports = {
    validateMessage,
    buildAuthenticatedJsonCommand
};

const express = require("express");
const path = require("path");
const fs = require("fs");

const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

// Session directory (isolated for pair site)
const SESSION_DIR = path.join(__dirname, "session");

// Ensure session folder exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Serve static files (pair.html)
app.use(express.static(__dirname));

/**
 * Pairing endpoint
 * Example: /pair?number=2567XXXXXXXX
 */
app.get("/pair", async (req, res) => {
  try {
    const number = req.query.number;

    if (!number) {
      return res.json({ error: "Phone number is required" });
    }

    // Basic number validation
    if (!/^[0-9]{8,15}$/.test(number)) {
      return res.json({ error: "Invalid phone number format" });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["DARKCORE-XMD", "Chrome", "1.0"]
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    // If not registered, request pairing code
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      return res.json({ code });
    }

    return res.json({
      status: "Already paired",
      message: "Session already exists"
    });

  } catch (err) {
    console.error("Pair error:", err);
    return res.json({
      error: "Failed to generate pairing code"
    });
  }
});

// Home page → pair.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pair.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`DARKCORE-XMD Pair Site running on port ${PORT}`);
});

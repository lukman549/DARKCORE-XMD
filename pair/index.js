const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const Pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: Pino({ level: "silent" }),
    browser: ["DARKCORE-XMD", "Safari", "1.0"]
  });

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(process.env.NUMBER);
    res.send(`
      <h2>DARKCORE-XMD SESSION ID</h2>
      <p>Pairing Code:</p>
      <h1>${code}</h1>
      <p>Open WhatsApp → Linked Devices → Link with phone number</p>
    `);
  }

  sock.ev.on("creds.update", saveCreds);
});

app.listen(PORT, () => {
  console.log("Pair site running on port", PORT);
});

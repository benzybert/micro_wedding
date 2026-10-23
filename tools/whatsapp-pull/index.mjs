#!/usr/bin/env node
/*
 * whatsapp-pull: run on YOUR computer, not on the server.
 * Links as a WhatsApp Web device (QR), lists one-to-one chats active in the last N months, and writes
 * name + phone + time of the last message to a JSON file for micro-wedding's "Import from WhatsApp".
 * It never opens a chat or reads a message, and nothing is uploaded from here.
 *
 * Terminal output is English on purpose: many terminals render right-to-left text reversed.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import { buildExport } from "./export.mjs";

const { Client, LocalAuth } = pkg;
const here = path.dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: npm start -- [options]

  --months <n>      only chats with a message in the last n months (1-60, default 6)
  --out <file>      output file (default: whatsapp-chats.json)
  --saved-only      only numbers saved in your phone's contacts (cuts delivery people, shops, strangers)
  --keep-session    stay linked after exporting (default: unlink this device when done)
  -h, --help        show this help

Linking: WhatsApp > Settings > Linked devices > Link a device, then scan the QR code shown below.
Set WHATSAPP_PULL_NO_SANDBOX=1 if Chromium refuses to start on Linux as root.`;

let values;
try {
  ({ values } = parseArgs({
    options: {
      months: { type: "string", default: "6" },
      out: { type: "string", default: "whatsapp-chats.json" },
      "saved-only": { type: "boolean", default: false },
      "keep-session": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  }));
} catch (err) {
  console.error(`${err.message}\n\n${HELP}`);
  process.exit(2);
}
if (values.help) {
  console.log(HELP);
  process.exit(0);
}
const months = Number(values.months);
if (!Number.isInteger(months) || months < 1 || months > 60) {
  console.error(`--months must be a whole number from 1 to 60 (got "${values.months}")`);
  process.exit(2);
}
const out = path.resolve(values.out);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(here, ".session") }),
  puppeteer: { headless: true, args: process.env.WHATSAPP_PULL_NO_SANDBOX ? ["--no-sandbox"] : [] },
});

/** Phone + display name for one chat. `lid` chats (WhatsApp's privacy ids) are mapped back to a phone when possible. */
async function resolveChat(chat) {
  const contact = await chat.getContact().catch(() => null);
  let phone = chat.id.server === "c.us" ? chat.id.user : "";
  if (!phone) {
    const [mapped] = await client.getContactLidAndPhone([chat.id._serialized]).catch(() => []);
    phone = mapped?.pn ?? "";
  }
  return { phone, name: contact?.name || contact?.pushname || "", saved: Boolean(contact?.isMyContact) };
}

client.on("qr", (qr) => {
  console.log("\nScan this QR code with WhatsApp on your phone (Settings > Linked devices > Link a device):\n");
  qrcode.generate(qr, { small: true });
});
client.on("loading_screen", (percent) => console.log(`Loading WhatsApp Web… ${percent}%`));
client.on("authenticated", () => console.log("Linked."));
client.on("auth_failure", (msg) => {
  console.error(`Login failed: ${msg}`);
  process.exit(1);
});

client.once("ready", async () => {
  let code = 0;
  try {
    console.log("Connected. Reading the chat list (no messages are opened)…");
    const chats = await client.getChats();
    const { file, stats } = await buildExport(chats, { now: new Date(), months, savedOnly: values["saved-only"], resolve: resolveChat });
    // Owner-only: the file is a list of people and phone numbers.
    await writeFile(out, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });

    const skipped = [
      [stats.groups, "groups"],
      [stats.empty, "with no messages"],
      [stats.outsideWindow, `older than ${months} months`],
      [stats.noPhone, "without a resolvable phone number"],
      [stats.unsaved, "not saved in contacts"],
    ].filter(([n]) => n > 0);
    console.log(`\nWrote ${stats.kept} chats to ${out}`);
    if (skipped.length) console.log(`Skipped: ${skipped.map(([n, why]) => `${n} ${why}`).join(" · ")}`);
    console.log("Next: in micro-wedding open Guests > Import > From WhatsApp and upload this file.");

    if (!values["keep-session"]) {
      try {
        await client.logout();
        console.log("This device was unlinked from your WhatsApp account.");
      } catch {
        console.warn("Could not unlink automatically. Remove it in WhatsApp > Settings > Linked devices.");
      }
    }
  } catch (err) {
    console.error(`Failed: ${err?.message ?? err}`);
    code = 1;
  } finally {
    await client.destroy().catch(() => {});
    process.exit(code);
  }
});

process.on("SIGINT", async () => {
  await client.destroy().catch(() => {});
  process.exit(130);
});

console.log(`Pulling chats from the last ${months} months…`);
await client.initialize();

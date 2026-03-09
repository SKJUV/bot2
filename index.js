// index.js
require('dotenv').config();
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys'); 
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const db = require('./database');
const { initCookies } = require('./utils/cookies');
const { checkCooldown } = require('./utils/cooldown');
const startTime = new Date();

// Initialise les cookies YouTube si disponibles (résout le blocage sur Render/Railway)
initCookies();

const AUTH_FOLDER = path.join(__dirname, "auth_info");
const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = process.env.BOT_NAME || "WhatsBot";
const BOT_TAG = `*${BOT_NAME}* 👨🏻‍💻`;
const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);

// --- L'INTERRUPTEUR GLOBAL ---
const UNLIMITED_MODE = process.env.UNLIMITED_MODE !== "false";

const COMMAND_LIMIT = parseInt(process.env.COMMAND_LIMIT) || 3;
const BANNED_NUMBERS = (process.env.BANNED_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);

const commands = new Map();
const aliases = new Map();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'))) {
    try {
        const command = require(path.join(__dirname, 'commands', file));
        if (command.name) {
            commands.set(command.name, command);
            // Enregistrer les aliases
            if (command.aliases && Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    aliases.set(alias, command.name);
                }
            }
            console.log(`[CommandLoader] Commande chargée : ${command.name}${command.aliases ? ` (aliases: ${command.aliases.join(', ')})` : ''}`);
        } else {
            console.warn(`[CommandLoader] Fichier ignoré (pas de nom): ${file}`);
        }
    } catch (error) {
        console.error(`[CommandLoader] Erreur de chargement de la commande ${file}:`, error);
    }
}


function replyWithTag(sock, jid, quoted, text) {
    return sock.sendMessage(jid, { text: `${BOT_TAG}\n\n${text}` }, { quoted });
}

async function startBot() {
    console.log("Démarrage du bot WhatsApp...");
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys v${version.join(".")}, isLatest: ${isLatest}`);
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "warn" }),
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("------------------------------------------------");
            qrcode.generate(qr, { small: true });
            console.log("[QR Code] Scannez ce code avec WhatsApp.");
            console.log("------------------------------------------------");
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connexion fermée:", lastDisconnect.error, ", reconnexion:", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Bot WhatsApp connecté avec succès !");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" || !messages[0]?.message) return;
        const msg = messages[0];

        const m = msg.message;
        const messageContent = m.conversation || m.extendedTextMessage?.text || m.ephemeralMessage?.message?.conversation || m.ephemeralMessage?.message?.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption;

        if (!messageContent || !messageContent.startsWith(PREFIX)) {
            return;
        }

        const remoteJid = msg.key.remoteJid;
        const senderId = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : (remoteJid.endsWith('@g.us') ? msg.key.participant : remoteJid);
        
        const args = messageContent.slice(PREFIX.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const command = commands.get(commandName) || commands.get(aliases.get(commandName));
        if (!command) return;

        try {
            const senderNumber = senderId.split('@')[0];

// index.js (Version modifiée)

            if (BANNED_NUMBERS.includes(senderNumber)) {
                await replyWithTag(sock, remoteJid, msg, "🚫 Vous avez été banni(e) par le propriétaire du bot. Vous ne pouvez plus utiliser les commandes." + "\n\n" + "go causer ib avec le boss c'est pas moi qui fais 🥲🥲");
                return;
            }

            const isOwner = OWNER_NUMBERS.includes(senderNumber);
            const isAdminInDb = await db.isUserAdmin(senderId);
            const isExempt = isOwner || isAdminInDb;

            // --- Anti-spam : cooldown entre les commandes ---
            if (!isExempt) {
                const { blocked, remaining } = checkCooldown(senderNumber);
                if (blocked) {
                    const secs = (remaining / 1000).toFixed(1);
                    await replyWithTag(sock, remoteJid, msg, `⏳ Doucement ! Attends encore *${secs}s* avant d'envoyer une autre commande.`);
                    return;
                }
            }

            if (!UNLIMITED_MODE && !isExempt) {
                const user = await db.getOrRegisterUser(senderId, msg.pushName || "Unknown");

                if (user.commandCount >= COMMAND_LIMIT) {
                    if (user.commandCount === COMMAND_LIMIT) {
                        const subscriptionMessage = `🕒 Vous avez atteint votre limite de ${COMMAND_LIMIT} commandes gratuites.\n\nPour continuer à utiliser le bot sans restriction, veuillez souscrire à un forfait en contactant le développeur.`;
                        replyWithTag(sock, remoteJid, msg, subscriptionMessage);
                        await db.incrementCommandCount(senderId);
                    }
                    return;
                }
                
                if (command.name === 'play' && user.hasUsedPlay) {
                    return replyWithTag(sock, remoteJid, msg, "🎵 Vous avez déjà utilisé votre commande `.play` gratuite. Souscrivez à un forfait pour un usage illimité !");
                }
            }
            
            if (command.ownerOnly) {
                if (!isOwner) {
                    return replyWithTag(sock, remoteJid, msg, "⛔ Seul mon propriétaire peut utiliser cette commande.");
                }
            }

            if (command.adminOnly) {
                // ... (votre logique adminOnly reste la même)
            }
            
            console.log(`[EXECUTION] Tentative d'exécution de la commande "${commandName}" par ${senderId}`);

            // ⏳ Réaction "en cours" avant l'exécution
            await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            await command.run({ sock, msg, args, replyWithTag, commands, aliases, db, startTime, senderNumber, senderId }); 
            console.log(`[EXECUTION] Succès de la commande "${commandName}"`);

            // ✅ Réaction "succès" après l'exécution
            await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});

            if (!UNLIMITED_MODE && !isExempt) {
                await db.incrementCommandCount(senderId);
                if (command.name === 'play') {
                    await db.setHasUsedPlay(senderId);
                }
            }

        } catch (err) {
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error(`[ERREUR FATALE] Un crash a eu lieu dans la commande "${commandName}"`);
            console.error("Message de l'erreur:", err.message);
            console.error("Stack de l'erreur:", err.stack);
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            
            // ❌ Réaction "erreur"
            await sock.sendMessage(remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => {});

            try {
                await replyWithTag(sock, remoteJid, msg, "❌ Oups ! Une erreur critique est survenue. Le développeur a été notifié.");
            } catch (replyError) {
                console.error("[ERREUR FATALE] Impossible même de répondre à l'utilisateur. Erreur:", replyError.message);
            }
        }
    });
}

const app = express();
// --- LA CORRECTION EST ICI ---
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send({ status: "online", botName: BOT_NAME, uptime: (new Date() - startTime) / 1000 });
});
app.listen(PORT, () => {
    console.log(`[WebServer] Serveur web démarré et à l'écoute sur le port ${PORT}`);
    startBot();
});
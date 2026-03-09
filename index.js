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
const botConfig = require('./utils/config');
const { getOwnerJid, detectViewOnce, storeViewOnce, createSockProxy } = require('./utils/assistant');
const startTime = new Date();

// Initialise les cookies YouTube si disponibles
initCookies();

const AUTH_FOLDER = path.join(__dirname, "auth_info");
const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = process.env.BOT_NAME || "WhatsBot";
const BOT_TAG = `*${BOT_NAME}* 👨🏻‍💻`;
const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);
const UNLIMITED_MODE = process.env.UNLIMITED_MODE !== "false";
const COMMAND_LIMIT = parseInt(process.env.COMMAND_LIMIT) || 3;
const BANNED_NUMBERS = (process.env.BANNED_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);

// --- Chargement des commandes ---
const commands = new Map();
const aliases = new Map();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'))) {
    try {
        const command = require(path.join(__dirname, 'commands', file));
        if (command.name) {
            commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    aliases.set(alias, command.name);
                }
            }
            console.log(`[CommandLoader] Commande chargée : ${command.name}${command.aliases ? ` (aliases: ${command.aliases.join(', ')})` : ''}`);
        }
    } catch (error) {
        console.error(`[CommandLoader] Erreur de chargement de ${file}:`, error);
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
            const mode = botConfig.get('assistantMode') ? '🔒 Assistant' : '🌐 Public';
            console.log(`✅ Bot WhatsApp connecté ! Mode : ${mode}`);
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ============================================================
    //  GESTIONNAIRE PRINCIPAL DES MESSAGES
    // ============================================================
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" || !messages[0]?.message) return;
        const msg = messages[0];
        const m = msg.message;
        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const assistantMode = botConfig.get('assistantMode');
        const ownerJid = getOwnerJid();

        // ── ÉTAPE 1 : Détection des vues uniques ──────────────────
        if (botConfig.get('autoViewOnce')) {
            const voInfo = detectViewOnce(msg);
            if (voInfo) {
                const voSender = (msg.key.participant || remoteJid).split('@')[0];
                // Ne pas intercepter les vues uniques envoyées par le owner lui-même
                if (!OWNER_NUMBERS.includes(voSender) && ownerJid) {
                    let groupName = 'Chat privé';
                    if (isGroup) {
                        try { groupName = (await sock.groupMetadata(remoteJid)).subject; } catch {}
                    }
                    const senderName = msg.pushName || 'Inconnu';
                    const voId = storeViewOnce(msg, voInfo, groupName, senderName);

                    const emoji = voInfo.type === 'image' ? '🖼️' : voInfo.type === 'video' ? '🎥' : '🎵';
                    const notif = [
                        `${emoji} *Vue unique détectée !*`,
                        ``,
                        `👤 *De :* ${senderName} (${voSender})`,
                        `💬 *Dans :* ${groupName}`,
                        `📎 *Type :* ${voInfo.type}`,
                        ``,
                        `💡 Tape \`${PREFIX}vo ${voId}\` pour l'extraire en IB.`,
                        `📋 Tape \`${PREFIX}vo list\` pour voir toutes les vues uniques.`,
                    ].join('\n');
                    await sock.sendMessage(ownerJid, { text: `${BOT_TAG}\n\n${notif}` }).catch(() => {});
                }
                return; // Les vues uniques n'ont pas de texte, pas la peine de continuer
            }
        }

        // ── ÉTAPE 2 : Extraire le contenu texte ──────────────────
        const messageContent = m.conversation
            || m.extendedTextMessage?.text
            || m.ephemeralMessage?.message?.conversation
            || m.ephemeralMessage?.message?.extendedTextMessage?.text
            || m.imageMessage?.caption
            || m.videoMessage?.caption;

        if (!messageContent || !messageContent.startsWith(PREFIX)) return;

        // ── ÉTAPE 3 : Identifier l'expéditeur ────────────────────
        const senderId = msg.key.fromMe
            ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
            : (isGroup ? msg.key.participant : remoteJid);
        const senderNumber = senderId.split('@')[0];
        const isOwner = OWNER_NUMBERS.includes(senderNumber);

        // ── ÉTAPE 4 : Mode Assistant — seul le owner peut agir ───
        if (assistantMode && !isOwner) {
            return; // Ignorer silencieusement les non-owners
        }

        // ── ÉTAPE 5 : Parser la commande ─────────────────────────
        const args = messageContent.slice(PREFIX.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const command = commands.get(commandName) || commands.get(aliases.get(commandName));
        if (!command) return;

        try {
            // --- Ban check (mode public uniquement) ---
            if (!assistantMode && BANNED_NUMBERS.includes(senderNumber)) {
                await replyWithTag(sock, remoteJid, msg, "🚫 Vous avez été banni(e) par le propriétaire du bot.");
                return;
            }

            const isAdminInDb = await db.isUserAdmin(senderId);
            const isExempt = isOwner || isAdminInDb;

            // --- Cooldown (mode public, non-exempts) ---
            if (!assistantMode && !isExempt) {
                const { blocked, remaining } = checkCooldown(senderNumber);
                if (blocked) {
                    const secs = (remaining / 1000).toFixed(1);
                    await replyWithTag(sock, remoteJid, msg, `⏳ Doucement ! Attends encore *${secs}s*.`);
                    return;
                }
            }

            // --- Limites de commandes (mode public, non-exempts) ---
            if (!UNLIMITED_MODE && !assistantMode && !isExempt) {
                const user = await db.getOrRegisterUser(senderId, msg.pushName || "Unknown");
                if (user.commandCount >= COMMAND_LIMIT) {
                    if (user.commandCount === COMMAND_LIMIT) {
                        replyWithTag(sock, remoteJid, msg, `🕒 Limite de ${COMMAND_LIMIT} commandes atteinte.`);
                        await db.incrementCommandCount(senderId);
                    }
                    return;
                }
                if (command.name === 'play' && user.hasUsedPlay) {
                    return replyWithTag(sock, remoteJid, msg, "🎵 Vous avez déjà utilisé votre commande `.play` gratuite.");
                }
            }

            // --- Vérification ownerOnly ---
            if (command.ownerOnly && !isOwner) {
                return replyWithTag(sock, remoteJid, msg, "⛔ Seul mon propriétaire peut utiliser cette commande.");
            }

            // --- Vérification adminOnly (mode public) ---
            if (command.adminOnly && !assistantMode) {
                // La logique admin group reste la même
            }

            // ── ÉTAPE 6 : Préparer le contexte d'exécution ──────
            // En mode assistant + groupe : rediriger les réponses vers le DM du owner
            // SAUF pour les commandes de groupe (groupAction: true) qui doivent agir dans le groupe
            let cmdSock = sock;
            if (assistantMode && isGroup && ownerJid && !command.groupAction) {
                cmdSock = createSockProxy(sock, remoteJid, ownerJid);
            }

            const modeLabel = assistantMode ? (isGroup ? '[Assistant→IB]' : '[IB]') : '';
            console.log(`[EXEC] ${modeLabel} "${commandName}" par ${senderNumber}`);

            // Réaction ⏳ : en mode assistant + groupe, on reste discret (pas de réaction visible)
            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            }

            await command.run({ sock: cmdSock, msg, args, replyWithTag, commands, aliases, db, startTime, senderNumber, senderId });

            // Réaction ✅
            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
            }

            // Compteurs (mode public uniquement)
            if (!UNLIMITED_MODE && !assistantMode && !isExempt) {
                await db.incrementCommandCount(senderId);
                if (command.name === 'play') await db.setHasUsedPlay(senderId);
            }

        } catch (err) {
            console.error(`[ERREUR] Commande "${commandName}":`, err.message, err.stack);

            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
            }

            // En mode assistant, envoyer l'erreur en IB
            const errorJid = (assistantMode && ownerJid) ? ownerJid : remoteJid;
            try {
                await replyWithTag(sock, errorJid, msg, `❌ Erreur dans la commande *${commandName}* :\n\`\`\`\n${err.message}\n\`\`\``);
            } catch {}
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
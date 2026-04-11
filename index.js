// index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
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
const { pushMessage } = require('./utils/groupBuffer');
const startTime = new Date();
let reconnectAttempt = 0;
let pairingRetryTimer = null;
let pairingAttempt = 0;
let activePairingSession = 0;
let lastPairingRequestedAt = 0;

// --- SaaS Webhook Manager ---
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const INSTANCE_ID = process.env.INSTANCE_ID;

async function sendWebhook(event, data) {
    if (!WEBHOOK_URL || !INSTANCE_ID) return;
    try {
        await axios.post(WEBHOOK_URL, {
            instanceId: INSTANCE_ID,
            event: event,
            data: data
        });
    } catch (err) {
        console.error(`[Webhook Error] Echec de l'envoi de l'event ${event}`);
    }
}

// Initialise les cookies YouTube si disponibles
initCookies();

// Nettoyage des fichiers temporaires orphelins au démarrage
const TEMP_DIR = process.env.TEMP_DIR || '/tmp';
try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const tmpFiles = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith('temp_'));
    if (tmpFiles.length > 0) {
        tmpFiles.forEach(f => { try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch { } });
        console.log(`[CLEANUP] ${tmpFiles.length} fichier(s) temporaire(s) orphelin(s) supprimé(s).`);
    }
} catch (err) {
    console.warn(`[CLEANUP] Impossible de nettoyer ${TEMP_DIR}:`, err.message);
}

const AUTH_FOLDER = process.env.AUTH_DIR || path.join(__dirname, "auth_info");
const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = process.env.BOT_NAME || "WhatsBot";
const BOT_TAG = `*${BOT_NAME}* 👨🏻‍💻`;
const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);
const UNLIMITED_MODE = process.env.UNLIMITED_MODE !== "false";
const COMMAND_LIMIT = parseInt(process.env.COMMAND_LIMIT) || 3;
const BANNED_NUMBERS = (process.env.BANNED_NUMBERS || "").split(",").map(n => n.trim()).filter(Boolean);
const PAIRING_MODE = process.env.PAIRING_MODE === 'true';
const PAIRING_PHONE = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');
const PAIRING_RETRY_MS = parseInt(process.env.PAIRING_RETRY_MS || '120000', 10);
const PAIRING_MAX_ATTEMPTS = parseInt(process.env.PAIRING_MAX_ATTEMPTS || '5', 10);
const PAIRING_MIN_INTERVAL_MS = parseInt(process.env.PAIRING_MIN_INTERVAL_MS || '90000', 10);

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

function clearPairingRetryTimer() {
    if (pairingRetryTimer) {
        clearTimeout(pairingRetryTimer);
        pairingRetryTimer = null;
    }
}

function schedulePairingRetry(sessionId, retryFn, reason = 'retry') {
    if (!PAIRING_MODE || !PAIRING_PHONE) return;
    if (pairingAttempt >= PAIRING_MAX_ATTEMPTS) {
        console.warn(`[PAIRING] Nombre maximal de tentatives atteint (${PAIRING_MAX_ATTEMPTS}).`);
        return;
    }
    clearPairingRetryTimer();
    pairingRetryTimer = setTimeout(() => {
        if (sessionId !== activePairingSession) return;
        retryFn(reason);
    }, PAIRING_RETRY_MS);
}

async function startBot() {
    console.log("Démarrage du bot WhatsApp...");

    activePairingSession += 1;
    const sessionId = activePairingSession;
    clearPairingRetryTimer();

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys v${version.join(".")}, isLatest: ${isLatest}`);
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "warn" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        // Ne pas marquer le compte comme "en ligne" en permanence
        markOnline: false,
        // Ne pas synchroniser l'historique complet (réduit le spam de messages anciens)
        syncFullHistory: process.env.SYNC_FULL_HISTORY === 'true',
    });

    const requestPairing = async (reason = 'initial') => {
        if (sessionId !== activePairingSession) return;
        if (!PAIRING_MODE || state.creds.registered) return;
        if (!PAIRING_PHONE) {
            console.warn('[PAIRING] PHONE_NUMBER manquant. Impossible de demander un code de jumelage.');
            return;
        }

        const now = Date.now();
        const elapsed = now - lastPairingRequestedAt;
        if (elapsed < PAIRING_MIN_INTERVAL_MS) {
            const waitMs = PAIRING_MIN_INTERVAL_MS - elapsed;
            schedulePairingRetry(sessionId, requestPairing, 'throttled-too-soon');
            console.log(`[PAIRING] Demande ignorée (${reason}), prochain essai dans ~${Math.ceil(waitMs / 1000)}s.`);
            return;
        }

        pairingAttempt += 1;
        try {
            const code = await sock.requestPairingCode(PAIRING_PHONE);
            lastPairingRequestedAt = Date.now();
            console.log('------------------------------------------------');
            console.log(`[Pairing Code] Entrez ce code dans WhatsApp: ${code}`);
            console.log('------------------------------------------------');
            await sendWebhook('pairing_code', {
                code,
                phone: PAIRING_PHONE,
                attempt: pairingAttempt,
                reason
            });

            // Si le compte n'est toujours pas lié, on redemande un nouveau code après expiration probable.
            schedulePairingRetry(sessionId, requestPairing, 'expired-or-not-linked');
        } catch (err) {
            console.error('[PAIRING] Echec requestPairingCode:', err.message);
            await sendWebhook('pairing_error', {
                message: err.message,
                attempt: pairingAttempt,
                reason
            });
            schedulePairingRetry(sessionId, requestPairing, 'retry-after-error');
        }
    };

    if (PAIRING_MODE && !state.creds.registered) {
        setTimeout(() => {
            requestPairing('initial');
        }, 3000);
    }

    // --- Flag pour ignorer les anciens messages ---
    let botReady = false;
    const PROCESS_OLD = process.env.PROCESS_OLD_MESSAGES === 'true';

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !PAIRING_MODE) {
            console.log("------------------------------------------------");
            qrcode.generate(qr, { small: true });
            console.log("[QR Code] Scannez ce code avec WhatsApp.");
            console.log("------------------------------------------------");
            sendWebhook('qr', { qr });
        }
        if (connection === "close") {
            botReady = false;
            clearPairingRetryTimer();
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connexion fermée:", lastDisconnect.error, ", reconnexion:", shouldReconnect);
            sendWebhook('status', { status: 'disconnected', reason: shouldReconnect ? 'reconnecting' : 'loggedOut' });
            if (shouldReconnect) {
                reconnectAttempt += 1;
                const delayMs = Math.min(30000, 2000 * reconnectAttempt);
                console.log(`[RECONNECT] Nouvelle tentative dans ${Math.round(delayMs / 1000)}s...`);
                setTimeout(() => startBot(), delayMs);
                return;
            }
            reconnectAttempt = 0;
        } else if (connection === "open") {
            clearPairingRetryTimer();
            reconnectAttempt = 0;
            pairingAttempt = 0;
            const mode = botConfig.get('assistantMode') ? '🔒 Assistant' : '🌐 Public';
            console.log(`✅ Bot WhatsApp connecté ! Mode : ${mode}`);
            sendWebhook('status', { status: 'connected' });
            if (PROCESS_OLD) {
                botReady = true;
                console.log('[SYNC] Traitement des anciens messages activé.');
            } else {
                // Attendre 5s que le batch de messages offline se vide, puis activer
                console.log('[SYNC] Ignorer les anciens messages (5s de grâce)...');
                setTimeout(() => {
                    botReady = true;
                    console.log('[SYNC] ✅ Bot prêt — seuls les nouveaux messages seront traités.');
                }, 5000);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ============================================================
    //  GESTIONNAIRE PRINCIPAL DES MESSAGES
    // ============================================================
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" || !messages[0]?.message) return;

        // --- Ignorer les messages arrivés avant que le bot soit prêt ---
        if (!botReady) return;

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
                        try { groupName = (await sock.groupMetadata(remoteJid)).subject; } catch { }
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
                    await sock.sendMessage(ownerJid, { text: `${BOT_TAG}\n\n${notif}` }).catch(() => { });
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

        // ── ÉTAPE 2.5 : Stocker les messages de groupe pour .resume ──
        if (isGroup && messageContent && !msg.key.fromMe) {
            const gpSender = (msg.key.participant || '').split('@')[0];
            pushMessage(remoteJid, gpSender, msg.pushName || 'Inconnu', messageContent);
        }

        if (!messageContent || !messageContent.startsWith(PREFIX)) return;

        // ── ÉTAPE 3 : Identifier l'expéditeur ────────────────────
        const senderId = msg.key.fromMe
            ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
            : (isGroup ? msg.key.participant : remoteJid);
        const senderNumber = senderId.split('@')[0];
        const isOwner = OWNER_NUMBERS.includes(senderNumber);

        // ── ÉTAPE 4 : Mode Assistant — seul le owner peut agir ───
        if (assistantMode && !isOwner) {
            console.log(`[DEBUG] BLOQUÉ — pas owner en mode assistant`);
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
            // Mode assistant : rediriger les réponses vers le DM du owner
            // - Groupes : toujours (sauf groupAction)
            // - IB avec LID : redirige vers ownerJid standard (@s.whatsapp.net)
            let cmdSock = sock;
            const isLid = remoteJid.endsWith('@lid');
            if (assistantMode && ownerJid) {
                if ((isGroup && !command.groupAction) || isLid) {
                    cmdSock = createSockProxy(sock, remoteJid, ownerJid);
                }
            }

            const modeLabel = assistantMode ? (isGroup ? '[Assistant→IB]' : '[IB]') : '';
            console.log(`[EXEC] ${modeLabel} "${commandName}" par ${senderNumber}`);

            // Réaction ⏳ : en mode assistant + groupe, on reste discret (pas de réaction visible)
            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => { });
            }

            await command.run({ sock: cmdSock, msg, args, replyWithTag, commands, aliases, db, startTime, senderNumber, senderId });

            // Réaction ✅
            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => { });
            }

            // Compteurs (mode public uniquement)
            if (!UNLIMITED_MODE && !assistantMode && !isExempt) {
                await db.incrementCommandCount(senderId);
                if (command.name === 'play') await db.setHasUsedPlay(senderId);
            }

        } catch (err) {
            console.error(`[ERREUR] Commande "${commandName}":`, err.message, err.stack);

            if (!(assistantMode && isGroup)) {
                await sock.sendMessage(remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => { });
            }

            // En mode assistant, envoyer l'erreur en IB
            const errorJid = (assistantMode && ownerJid) ? ownerJid : remoteJid;
            try {
                await replyWithTag(sock, errorJid, msg, `❌ Erreur dans la commande *${commandName}* :\n\`\`\`\n${err.message}\n\`\`\``);
            } catch { }
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
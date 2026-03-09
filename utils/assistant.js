// utils/assistant.js — Logique du mode assistant personnel

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// --- Stockage des vues uniques interceptées ---
const pendingViewOnce = new Map(); // id → { type, mediaMessage, rawMsg, groupJid, groupName, senderName, senderNumber, timestamp }
let voCounter = 0;

/**
 * Retourne le JID WhatsApp du premier owner configuré.
 */
function getOwnerJid() {
    const owners = (process.env.OWNER_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean);
    return owners.length > 0 ? `${owners[0]}@s.whatsapp.net` : null;
}

/**
 * Détecte si un message contient un média vue unique.
 * @returns {{ type: string, mediaMessage: object } | null}
 */
function detectViewOnce(msg) {
    const m = msg.message;
    if (!m) return null;

    // Wrapper viewOnce (v1, v2, v2Extension)
    const vo = m.viewOnceMessage?.message
        || m.viewOnceMessageV2?.message
        || m.viewOnceMessageV2Extension?.message;

    if (vo) {
        if (vo.imageMessage) return { type: 'image', mediaMessage: vo.imageMessage };
        if (vo.videoMessage) return { type: 'video', mediaMessage: vo.videoMessage };
        if (vo.audioMessage) return { type: 'audio', mediaMessage: vo.audioMessage };
    }

    // Flag viewOnce directement sur le media
    if (m.imageMessage?.viewOnce) return { type: 'image', mediaMessage: m.imageMessage };
    if (m.videoMessage?.viewOnce) return { type: 'video', mediaMessage: m.videoMessage };
    if (m.audioMessage?.viewOnce) return { type: 'audio', mediaMessage: m.audioMessage };

    return null;
}

/**
 * Stocke une vue unique interceptée pour extraction ultérieure.
 * @returns {number} L'ID attribué à cette vue unique.
 */
function storeViewOnce(msg, info, groupName, senderName) {
    voCounter++;
    const id = voCounter;
    const remoteJid = msg.key.remoteJid;
    const senderNumber = (msg.key.participant || remoteJid).split('@')[0];

    pendingViewOnce.set(id, {
        ...info,
        rawMsg: msg,
        groupJid: remoteJid,
        groupName: groupName || 'Chat privé',
        senderName: senderName || senderNumber,
        senderNumber,
        timestamp: Date.now(),
    });

    // Auto-nettoyage après 24h
    setTimeout(() => pendingViewOnce.delete(id), 24 * 60 * 60 * 1000);
    return id;
}

function getPendingViewOnce() { return pendingViewOnce; }
function getViewOnceById(id) { return pendingViewOnce.get(id); }
function deleteViewOnce(id) { pendingViewOnce.delete(id); }

/**
 * Télécharge le buffer d'un média vue unique stocké.
 */
async function extractViewOnceBuffer(vo) {
    const stream = await downloadContentFromMessage(vo.mediaMessage, vo.type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
    return buffer;
}

/**
 * Crée un proxy sur l'objet sock qui redirige les messages
 * vers le DM du owner (mode assistant).
 * - Redirige les envois vers un groupe OU un LID vers ownerJid
 * - Les réactions restent sur le message original
 * - Les appels non-sendMessage ne sont pas affectés
 */
function createSockProxy(sock, originalJid, ownerJid) {
    return new Proxy(sock, {
        get(target, prop, receiver) {
            if (prop === 'sendMessage') {
                return function (jid, content, options) {
                    // Les réactions restent sur le message original
                    if (content?.react) {
                        return target.sendMessage(jid, content, options);
                    }
                    // Redirige les messages destinés au chat original (groupe OU LID) vers le owner
                    if (jid === originalJid || jid.endsWith('@lid')) {
                        console.log(`[PROXY] Redirection ${jid} → ${ownerJid}`);
                        return target.sendMessage(ownerJid, content);
                    }
                    return target.sendMessage(jid, content, options);
                };
            }
            const val = Reflect.get(target, prop, receiver);
            return typeof val === 'function' ? val.bind(target) : val;
        }
    });
}

module.exports = {
    getOwnerJid,
    detectViewOnce,
    storeViewOnce,
    getPendingViewOnce,
    getViewOnceById,
    deleteViewOnce,
    extractViewOnceBuffer,
    createSockProxy,
};

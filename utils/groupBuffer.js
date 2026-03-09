// utils/groupBuffer.js — Stockage des messages de groupe pour résumé IA

const MAX_MESSAGES = parseInt(process.env.GROUP_BUFFER_SIZE) || 200; // Messages max par groupe
const BUFFER_TTL = 24 * 60 * 60 * 1000; // 24h max

// groupJid → { messages: [{ sender, name, text, timestamp }], lastClean: Date }
const groupBuffers = new Map();

/**
 * Ajoute un message au buffer d'un groupe.
 */
function pushMessage(groupJid, senderNumber, senderName, text) {
    if (!text || text.trim().length === 0) return;

    let buffer = groupBuffers.get(groupJid);
    if (!buffer) {
        buffer = { messages: [], lastClean: Date.now() };
        groupBuffers.set(groupJid, buffer);
    }

    buffer.messages.push({
        sender: senderNumber,
        name: senderName || senderNumber,
        text: text.trim(),
        timestamp: Date.now(),
    });

    // Garder seulement les N derniers
    if (buffer.messages.length > MAX_MESSAGES) {
        buffer.messages = buffer.messages.slice(-MAX_MESSAGES);
    }
}

/**
 * Récupère les messages récents d'un groupe.
 * @param {string} groupJid
 * @param {number} maxAge - Age max en minutes (défaut: 360 = 6h)
 * @returns {{ messages: Array, groupJid: string }}
 */
function getMessages(groupJid, maxAge = 360) {
    const buffer = groupBuffers.get(groupJid);
    if (!buffer || buffer.messages.length === 0) {
        return { messages: [], groupJid };
    }

    const cutoff = Date.now() - (maxAge * 60 * 1000);
    const recent = buffer.messages.filter(m => m.timestamp >= cutoff);
    return { messages: recent, groupJid };
}

/**
 * Efface le buffer d'un groupe.
 */
function clearBuffer(groupJid) {
    groupBuffers.delete(groupJid);
}

/**
 * Liste tous les groupes avec des messages stockés.
 * @returns {Array<{ groupJid: string, count: number, lastMessage: number }>}
 */
function listBuffers() {
    const result = [];
    for (const [jid, buffer] of groupBuffers) {
        if (buffer.messages.length > 0) {
            const last = buffer.messages[buffer.messages.length - 1];
            result.push({
                groupJid: jid,
                count: buffer.messages.length,
                lastMessage: last.timestamp,
            });
        }
    }
    return result.sort((a, b) => b.lastMessage - a.lastMessage);
}

/**
 * Formatte les messages pour le prompt IA.
 */
function formatForAI(messages) {
    return messages.map(m => {
        const time = new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${m.name}: ${m.text}`;
    }).join('\n');
}

module.exports = { pushMessage, getMessages, clearBuffer, listBuffers, formatForAI };

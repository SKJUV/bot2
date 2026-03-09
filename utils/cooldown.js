// utils/cooldown.js — Système anti-spam / rate limiter

const COOLDOWN_MS = parseInt(process.env.COOLDOWN_MS) || 3000; // 3 secondes par défaut
const cooldowns = new Map(); // senderNumber → timestamp du dernier appel

/**
 * Vérifie si un utilisateur est en cooldown.
 * @param {string} senderNumber - Numéro de l'expéditeur (sans @s.whatsapp.net)
 * @returns {{ blocked: boolean, remaining: number }} blocked=true si en cooldown, remaining=ms restantes
 */
function checkCooldown(senderNumber) {
    const now = Date.now();
    const lastUsed = cooldowns.get(senderNumber);

    if (lastUsed && (now - lastUsed) < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - (now - lastUsed);
        return { blocked: true, remaining };
    }

    cooldowns.set(senderNumber, now);
    return { blocked: false, remaining: 0 };
}

/**
 * Réinitialise le cooldown d'un utilisateur (utile pour les owners).
 */
function resetCooldown(senderNumber) {
    cooldowns.delete(senderNumber);
}

module.exports = { checkCooldown, resetCooldown, cooldowns };

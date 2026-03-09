// utils/cookies.js
// Gestion des cookies YouTube pour yt-dlp (résout le blocage sur les hébergeurs cloud)

const fs = require('fs');
const path = require('path');
const COOKIES_PATH = path.join(__dirname, '..', 'yt_cookies.txt');

/**
 * Si la variable YT_COOKIES_BASE64 existe, décode son contenu
 * et crée un fichier cookies Netscape pour yt-dlp.
 * 
 * Pour générer cette variable :
 * 1. Installe l'extension "Get cookies.txt LOCALLY" sur Chrome
 * 2. Va sur youtube.com (connecté à un compte Google)
 * 3. Exporte les cookies au format Netscape
 * 4. Encode le fichier : base64 -w 0 cookies.txt
 * 5. Ajoute la sortie comme variable d'env YT_COOKIES_BASE64
 */
function initCookies() {
    const b64 = process.env.YT_COOKIES_BASE64;
    if (!b64) {
        console.log('[COOKIES] Aucun cookie YouTube configuré (YT_COOKIES_BASE64 absent).');
        return null;
    }
    try {
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        fs.writeFileSync(COOKIES_PATH, decoded);
        console.log('[COOKIES] Fichier cookies YouTube créé avec succès.');
        return COOKIES_PATH;
    } catch (err) {
        console.error('[COOKIES] Erreur lors du décodage des cookies:', err.message);
        return null;
    }
}

/**
 * Retourne les options yt-dlp avec cookies si disponibles.
 */
function getCookieOptions() {
    if (fs.existsSync(COOKIES_PATH)) {
        return { cookies: COOKIES_PATH };
    }
    return {};
}

/**
 * Nettoie le fichier cookies temporaire.
 */
function cleanupCookies() {
    if (fs.existsSync(COOKIES_PATH)) {
        fs.unlinkSync(COOKIES_PATH);
    }
}

module.exports = { initCookies, getCookieOptions, cleanupCookies, COOKIES_PATH };
